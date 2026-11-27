// Arena snapshots: what the server sends each client about the one arena it plays
// in (config.net.snapshotRate times per second). Everything the client draws, and
// nothing more, packed as arrays of whole numbers: msgpack (the Colyseus wire format)
// stores small integers in 1-3 bytes but every float in 9, so positions travel in
// tenths of a pixel and times in milliseconds.
//
// encodeSnapshot() runs on the server, decodeSnapshot() in the browser; a unit test
// checks that a decoded snapshot draws the same as the world it came from.

const POS = 10; // tenths of a pixel
const MS = 1000;
const ANGLE = 100; // hundredths of a radian
/** Hit flashes and blinks only look at recent hits; older ones are sent as this age (ms). */
const MAX_HIT_AGE_MS = 5000;

const PHASES = ['waves', 'wavesOver', 'bossIntro', 'boss', 'won'];
const TEAMS = ['player', 'enemy'];
const PICKUP_KINDS = ['coin', 'heart'];

// Player flags
const P_ALIVE = 1;
const P_MOVING = 2;
const P_ROLLING = 4;
const P_ROLL_LEFT = 8;
const P_SHOP_OPEN = 16;
// Enemy flags
const E_FACE_LEFT = 1;
const E_FACE_RIGHT = 2;
const E_TELEGRAPH = 4;

const q = (v, scale) => Math.round(v * scale);
const hitAge = (time, last) => Math.min(MAX_HIT_AGE_MS, Math.max(0, Math.round((time - last) * MS)));

/**
 * Packs one arena for the network.
 * @param {object} world - from createWorld()
 * @param {import('../protocol.js').SimEvent[]} events - events since the last snapshot
 * @returns {object} plain arrays and numbers, ready for client.send()
 */
export function encodeSnapshot(world, events) {
  const { time, config } = world;
  const enemyTypes = Object.keys(config.enemies);
  return {
    t: q(time, MS),
    k: world.tick,
    m: [PHASES.indexOf(world.match.phase), world.match.round, q(world.match.elapsed, MS)],
    p: world.players.map((p) => [
      p.id, q(p.x, POS), q(p.y, POS), q(p.aim, ANGLE),
      (p.alive ? P_ALIVE : 0) | (p.moving ? P_MOVING : 0) | (p.rolling ? P_ROLLING : 0) | (p.rollDirX < 0 ? P_ROLL_LEFT : 0)
        | (p.shopOpen ? P_SHOP_OPEN : 0),
      p.health, p.maxHealth, p.level, p.xp, p.kills, p.pendingLevelUps,
      q(p.rollTime, MS), q(p.invulnerableTime, MS), hitAge(time, p.lastHitTime),
      p.abilities, p.cardChoice, q(p.cardOpenedAt, MS), p.targetId,
      // The salesman (shared/sim/systems/shop.js): what the shop panel needs.
      p.coins, p.rollsBought, p.rollRound, p.rollsThisRound, p.lastRoll,
    ]),
    e: world.enemies.filter((e) => !e.dead).map((e) => [
      e.id, enemyTypes.indexOf(e.type), q(e.x, POS), q(e.y, POS),
      (e.vx < -1 ? E_FACE_LEFT : 0) | (e.vx > 1 ? E_FACE_RIGHT : 0) | (e.telegraph ? E_TELEGRAPH : 0),
      q(e.spawnDelay, MS), q(e.spawnDuration, MS), hitAge(time, e.lastHitTime),
      // Health only matters for the boss bar: per mille of max, 0 for others.
      e.boss ? Math.ceil((1000 * Math.max(0, e.hp)) / e.maxHp) : 0,
    ]),
    b: world.bullets.map((b) => [b.id, TEAMS.indexOf(b.team), q(b.x, POS), q(b.y, POS)]),
    g: world.gems.map((g) => [g.id, g.value, q(g.x, POS), q(g.y, POS), g.targetId ? 1 : 0]),
    f: world.fires.map((f) => [f.id, q(f.x, POS), q(f.y, POS), q(f.life, MS)]),
    u: world.pickups.map((u) => [u.id, PICKUP_KINDS.indexOf(u.kind), q(u.x, POS), q(u.y, POS), u.targetId ? 1 : 0]),
    v: events,
  };
}

/**
 * Unpacks a snapshot into objects shaped like the simulation's, so the same views
 * can draw them. prevX / prevY are set to x / y; the interpolation fills them in.
 * @param {object} data - from encodeSnapshot()
 * @param {object} config - the game config (enemy sizes and kinds are not sent)
 * @returns {{ time: number, tick: number, match: object, players: object[], enemies: object[],
 *   bullets: object[], gems: object[], fires: object[], pickups: object[], events: object[] }}
 */
export function decodeSnapshot(data, config) {
  const time = data.t / MS;
  const enemyTypes = Object.keys(config.enemies);
  const [phase, round, elapsed] = data.m;
  return {
    time,
    tick: data.k,
    match: { phase: PHASES[phase], round, elapsed: elapsed / MS },
    players: data.p.map(([id, x, y, aim, flags, health, maxHealth, level, xp, kills, pendingLevelUps,
      rollTime, invulnerableTime, hitAgeMs, abilities, cardChoice, cardOpenedAt, targetId,
      coins, rollsBought, rollRound, rollsThisRound, lastRoll]) => ({
      id, ...pos(x, y), aim: aim / ANGLE,
      alive: Boolean(flags & P_ALIVE), moving: Boolean(flags & P_MOVING), rolling: Boolean(flags & P_ROLLING),
      rollDirX: flags & P_ROLL_LEFT ? -1 : 1,
      health, maxHealth, level, xp, kills, pendingLevelUps,
      rollTime: rollTime / MS, invulnerableTime: invulnerableTime / MS, lastHitTime: time - hitAgeMs / MS,
      abilities, cardChoice, cardOpenedAt: cardOpenedAt / MS, targetId,
      shopOpen: Boolean(flags & P_SHOP_OPEN), coins, rollsBought, rollRound, rollsThisRound, lastRoll,
    })),
    enemies: data.e.map(([id, typeIndex, x, y, flags, spawnDelay, spawnDuration, hitAgeMs, hpPermille]) => {
      const type = enemyTypes[typeIndex];
      const stats = config.enemies[type];
      return {
        id, type, ...pos(x, y),
        vx: flags & E_FACE_LEFT ? -2 : flags & E_FACE_RIGHT ? 2 : 0,
        telegraph: Boolean(flags & E_TELEGRAPH),
        spawnDelay: spawnDelay / MS, spawnDuration: spawnDuration / MS, lastHitTime: time - hitAgeMs / MS,
        radius: stats.radius, flying: Boolean(stats.flying), boss: Boolean(stats.boss),
        hp: hpPermille, maxHp: 1000, dead: false,
      };
    }),
    bullets: data.b.map(([id, team, x, y]) => ({ id, team: TEAMS[team], ...pos(x, y) })),
    gems: data.g.map(([id, value, x, y, targeted]) => ({ id, value, ...pos(x, y), targetId: targeted ? 1 : null })),
    fires: data.f.map(([id, x, y, life]) => ({ id, ...pos(x, y), life: life / MS })),
    // The value is not drawn; targetId only says whether it is flying to the player.
    pickups: data.u.map(([id, kind, x, y, targeted]) => ({ id, kind: PICKUP_KINDS[kind], value: 0, ...pos(x, y), targetId: targeted ? 1 : null })),
    events: data.v,
  };
}

function pos(x, y) {
  const px = x / POS;
  const py = y / POS;
  return { x: px, y: py, prevX: px, prevY: py };
}
