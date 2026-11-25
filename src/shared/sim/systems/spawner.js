// Match clock, rounds and enemy spawning.
// The match (config.match.durationSeconds) is split into config.rounds.count
// equal rounds. Each round spawns enemies at a rate that rises within the round
// and from round to round; boss rounds add a mini-boss near their end.
// When the time is up the enemies vanish and the final boss duel starts:
//   phase 'waves' -> 'bossIntro' -> 'boss' -> 'won'
import { createEnemy, travelOf } from '../entities/enemy.js';
import { boxBlocked } from '../map.js';
import { clamp, EPSILON } from '../math.js';

/** Match clock state, stored on world.match. The clock stops when the waves end. */
export function createMatchState() {
  return { phase: 'waves', introLeft: 0, bossId: null, started: false, elapsed: 0, round: 1, roundElapsed: 0, bossSpawned: false, spawnBudget: 0 };
}

/** Seconds per round. */
export function roundLength(config) {
  return config.match.durationSeconds / config.rounds.count;
}

/**
 * Enemies per second:
 *   (baseRate + ratePerRound * (round - 1)) * (1 + rampWithinRound * progress)
 * @param {object} config
 * @param {number} round - 1-based
 * @param {number} progress - 0..1 through the round
 */
export function spawnRate(config, round, progress) {
  const s = config.spawning;
  return (s.baseRate + s.ratePerRound * (round - 1)) * (1 + s.rampWithinRound * progress);
}

/** Enemy health multiplier: 1 + healthPerRound * (round - 1). */
export function healthScale(config, round) {
  return 1 + config.spawning.healthPerRound * (round - 1);
}

/**
 * Advances the match: waves, then the final boss. Does nothing once every player is dead,
 * so dying together with the boss is not a win.
 * @param {object} world
 * @param {number} dt
 */
export function updateSpawner(world, dt) {
  const { config } = world;
  const m = world.match;
  if (!world.players.some((p) => p.alive)) return;

  if (m.phase !== 'waves') {
    updateFinalBoss(world, dt);
    return;
  }

  if (!m.started && m.elapsed < config.match.durationSeconds) {
    m.started = true;
    world.events.push({ type: 'roundStarted', round: m.round });
  }

  m.elapsed += dt;
  m.roundElapsed += dt;
  if (m.elapsed >= config.match.durationSeconds - EPSILON) {
    startFinalBossIntro(world);
    return;
  }
  const len = roundLength(config);
  const round = Math.min(config.rounds.count, Math.floor(m.elapsed / len) + 1);
  if (round !== m.round) {
    m.round = round;
    m.roundElapsed = m.elapsed - (round - 1) * len;
    m.bossSpawned = false;
    world.events.push({ type: 'roundStarted', round });
  }

  if (m.roundElapsed < config.rounds.breakSeconds) return;

  if (config.rounds.bossRounds.includes(round) && !m.bossSpawned && len - m.roundElapsed <= config.rounds.bossAtSecondsLeft) {
    m.bossSpawned = true;
    spawnBoss(world, 'crabKing');
  }

  const progress = clamp(m.roundElapsed / len, 0, 1);
  m.spawnBudget += spawnRate(config, round, progress) * dt;
  let alive = world.enemies.length;
  while (m.spawnBudget >= 1) {
    if (alive >= config.spawning.maxAlive) {
      m.spawnBudget = 1; // spawn as soon as there is room again, no burst
      break;
    }
    const type = pickEnemyType(world, round);
    const point = findSpawnPoint(world, config.enemies[type]);
    if (!point) break;
    spawnEnemy(world, type, point.x, point.y);
    alive++;
    m.spawnBudget -= 1;
  }
}

/**
 * Creates an enemy (with its warning delay) and adds it to the world.
 * @returns {import('../entities/enemy.js').Enemy}
 */
export function spawnEnemy(world, type, x, y, delay) {
  const stats = world.config.enemies[type];
  const enemy = createEnemy(
    world.nextId++,
    type,
    x,
    y,
    stats,
    healthScale(world.config, world.match.round),
    delay ?? stats.spawnDelay ?? world.config.spawning.spawnDelay,
  );
  world.enemies.push(enemy);
  world.events.push({ type: 'enemySpawning', id: enemy.id, enemyType: type, x, y });
  return enemy;
}

/** @returns {import('../entities/enemy.js').Enemy | null} null if there was no free spot */
function spawnBoss(world, type) {
  const point = findSpawnPoint(world, world.config.enemies[type], 0.6);
  if (!point) return null;
  const boss = spawnEnemy(world, type, point.x, point.y);
  world.events.push({ type: 'bossSpawned', id: boss.id, enemyType: type });
  return boss;
}

/** Time is up: clear the field so the duel is one against one. */
function startFinalBossIntro(world) {
  const { match: m, config } = world;
  m.elapsed = config.match.durationSeconds;
  m.phase = 'bossIntro';
  m.introLeft = config.finalBoss.introSeconds;
  for (const e of world.enemies) world.events.push({ type: 'enemyDespawned', x: e.x, y: e.y });
  world.enemies.length = 0;
  clearEnemyBullets(world);
  for (const p of world.players) {
    if (p.alive) p.health = Math.min(p.maxHealth, p.health + config.finalBoss.healBefore);
  }
  world.events.push({ type: 'finalBossIntro' });
}

function updateFinalBoss(world, dt) {
  const { match: m, config } = world;
  if (m.phase === 'bossIntro') {
    m.introLeft -= dt;
    if (m.introLeft > EPSILON) return;
    const boss = spawnBoss(world, config.finalBoss.type);
    if (!boss) return; // no free spot this tick: try again on the next one
    m.bossId = boss.id;
    m.phase = 'boss';
  } else if (m.phase === 'boss' && !world.enemies.some((e) => e.id === m.bossId)) {
    m.phase = 'won';
    clearEnemyBullets(world);
    world.events.push({ type: 'matchWon' });
  }
}

function clearEnemyBullets(world) {
  world.bullets = world.bullets.filter((b) => b.team !== 'enemy');
}

/** Weighted random pick from config.rounds.enemyWeights for this round. */
export function pickEnemyType(world, round) {
  const table = world.config.rounds.enemyWeights;
  const weights = table[Math.min(round, table.length) - 1];
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = world.rng.range(0, total);
  for (const [type, w] of entries) {
    roll -= w;
    if (roll < 0) return type;
  }
  return entries[entries.length - 1][0];
}

/**
 * A free spot between minDistance and maxDistance from a random living player.
 * Walkers must be able to reach the player (flow field); flyers and giants go straight.
 * @param {number} [distanceScale] - spawn closer (bosses) or farther
 * @returns {{ x: number, y: number } | null}
 */
export function findSpawnPoint(world, stats, distanceScale = 1) {
  const { map, rng, config } = world;
  const alive = world.players.filter((p) => p.alive);
  if (alive.length === 0) return null;
  const anchor = alive[rng.int(0, alive.length - 1)];
  const minD = config.spawning.minDistance * distanceScale;
  const maxD = config.spawning.maxDistance * distanceScale;
  const travel = travelOf(stats);
  const ok = (x, y) =>
    !boxBlocked(map, x, y, stats.radius, travel) && (travel !== 'walk' || world.flowField.stepsAt(x, y) !== 0xffff);

  for (let attempt = 0; attempt < 24; attempt++) {
    const angle = rng.range(0, Math.PI * 2);
    const dist = rng.range(minD, maxD);
    const x = anchor.x + Math.cos(angle) * dist;
    const y = anchor.y + Math.sin(angle) * dist;
    if (ok(x, y)) return { x, y };
  }
  // Small arena or crowded edges: any open tile far enough away.
  const ts = map.tileSize;
  for (let attempt = 0; attempt < 60; attempt++) {
    const x = (rng.int(0, map.width - 1) + 0.5) * ts;
    const y = (rng.int(0, map.height - 1) + 0.5) * ts;
    if (Math.hypot(x - anchor.x, y - anchor.y) >= minD * 0.6 && ok(x, y)) return { x, y };
  }
  return null;
}
