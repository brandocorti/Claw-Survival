// Snapshots: a decoded snapshot must draw the same as the world it came from.
import { describe, it, expect } from 'vitest';
import { encodeSnapshot, decodeSnapshot } from '../../../src/shared/net/snapshot.js';
import { createWorld, addPlayer, stepWorld, drainEvents } from '../../../src/shared/sim/world.js';
import { grantXp } from '../../../src/shared/sim/systems/xp.js';
import { createPickup } from '../../../src/shared/sim/entities/pickup.js';
import { BIG_ROOM, TEST_CONFIG, TEST_ENEMY_TYPES, TICK, placeEnemy, placeSturdyEnemy } from '../helpers/fixtures.js';

/** A busy online world: enemies, bullets, gems, an open card choice. */
function busyWorld() {
  // No card choices while it fills up (a choice freezes the world); one is opened at the end.
  const world = createWorld({
    config: TEST_CONFIG, arena: BIG_ROOM, seed: 4, spawning: true, enemyTypes: TEST_ENEMY_TYPES, cards: false,
  });
  const player = addPlayer(world, 'p1');
  player.pveImmune = true;
  for (let i = 0; i < 4 * 60; i++) stepWorld(world, { p1: { moveX: 0.6, moveY: 0.3, roll: i % 50 === 0 } }, TICK);
  // Targets close by (not touching, or pebbles hit on the tick they are fired), so pebbles
  // are in the air when the snapshot is taken, and a boss a little farther away.
  for (let i = 0; i < 4; i++) placeSturdyEnemy(world, 'dummy', player.x - 40 - i * 14, player.y - 30);
  placeEnemy(world, 'crabKing', player.x - 150, player.y - 80).hp -= 7;
  for (let i = 0; i < 20; i++) stepWorld(world, {}, TICK);
  world.cards = true;
  grantXp(world, player, 40);
  stepWorld(world, {}, TICK);
  return world;
}
/** JSON round trip, like the network (no shared object references survive). */
const overTheWire = (data) => JSON.parse(JSON.stringify(data));

describe('arena snapshots', () => {
  it('keep everything the views draw, to a tenth of a pixel', () => {
    const world = busyWorld();
    expect(world.enemies.length).toBeGreaterThan(3);
    expect(world.bullets.length).toBeGreaterThan(0);
    const events = drainEvents(world);
    const s = decodeSnapshot(overTheWire(encodeSnapshot(world, events)), TEST_CONFIG);

    expect(s.time).toBeCloseTo(world.time, 3); // no server time given: the world's
    expect(s.worldTime).toBeCloseTo(world.time, 3);
    expect(s.match).toEqual({ phase: world.match.phase, round: world.match.round, elapsed: expect.closeTo(world.match.elapsed, 3) });
    const [p] = world.players;
    const [sp] = s.players;
    expect(sp).toMatchObject({
      id: 'p1', alive: true, health: p.health, maxHealth: p.maxHealth, level: p.level, xp: p.xp, kills: p.kills,
      pendingLevelUps: p.pendingLevelUps, abilities: p.abilities, cardChoice: p.cardChoice, moving: p.moving, rolling: p.rolling,
    });
    expect(sp.cardChoice).not.toBe(null);
    expect(Math.abs(sp.x - p.x)).toBeLessThanOrEqual(0.05);
    expect(Math.abs(sp.aim - p.aim)).toBeLessThanOrEqual(0.005);

    const alive = world.enemies.filter((e) => !e.dead);
    expect(s.enemies.map((e) => e.id)).toEqual(alive.map((e) => e.id));
    alive.forEach((e, i) => {
      const d = s.enemies[i];
      expect(d.type).toBe(e.type);
      expect(Math.abs(d.x - e.x)).toBeLessThanOrEqual(0.05);
      expect(Math.abs(d.y - e.y)).toBeLessThanOrEqual(0.05);
      expect(d.radius).toBe(e.radius);
      expect(d.boss).toBe(e.boss);
      expect(d.telegraph).toBe(e.telegraph);
    });
    const boss = s.enemies.find((e) => e.boss);
    const realBoss = world.enemies.find((e) => e.boss);
    expect(boss.hp / boss.maxHp).toBeCloseTo(realBoss.hp / realBoss.maxHp, 2);

    expect(s.bullets.map((b) => [b.id, b.team])).toEqual(world.bullets.map((b) => [b.id, b.team]));
    expect(s.gems.map((g) => [g.id, g.value])).toEqual(world.gems.map((g) => [g.id, g.value]));
    expect(s.events).toEqual(overTheWire(events));
  });

  it('carry the salesman state and the coins and hearts on the ground', () => {
    const world = busyWorld();
    const [p] = world.players;
    Object.assign(p, { coins: 37, shopOpen: true, rollsBought: 2, rollRound: 3, rollsThisRound: 1, lastRoll: { abilityId: 'x', level: 2 } });
    world.pickups.push(createPickup(world.nextId++, 'coin', 1, p.x + 30, p.y, 0, 0));
    const heart = createPickup(world.nextId++, 'heart', 2, p.x - 30.04, p.y + 12.36, 0, 0);
    heart.targetId = p.id;
    world.pickups.push(heart);

    const s = decodeSnapshot(overTheWire(encodeSnapshot(world, [])), TEST_CONFIG);

    expect(s.players[0]).toMatchObject({
      coins: 37, shopOpen: true, rollsBought: 2, rollRound: 3, rollsThisRound: 1, lastRoll: { abilityId: 'x', level: 2 },
    });
    expect(s.pickups.map((u) => [u.id, u.kind, Boolean(u.targetId)])).toEqual(
      world.pickups.map((u) => [u.id, u.kind, Boolean(u.targetId)]),
    );
    expect(Math.abs(s.pickups[1].x - heart.x)).toBeLessThanOrEqual(0.05);
    expect(Math.abs(s.pickups[1].y - heart.y)).toBeLessThanOrEqual(0.05);
  });

  it('keep recent hit times exact enough for the hit flash', () => {
    const world = busyWorld();
    const [p] = world.players;
    p.lastHitTime = world.time - 0.05;
    const s = decodeSnapshot(overTheWire(encodeSnapshot(world, [])), TEST_CONFIG);
    expect(s.players[0].lastHitTime).toBeCloseTo(p.lastHitTime, 3);
  });

  it('are made of whole numbers only (except event positions), so they pack small', () => {
    const data = encodeSnapshot(busyWorld(), []);
    const floats = [];
    const walk = (v, path) => {
      if (typeof v === 'number' && !Number.isInteger(v)) floats.push(path);
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
    };
    walk({ ...data, v: [] }, 'snapshot');
    expect(floats).toEqual([]);
  });
});
