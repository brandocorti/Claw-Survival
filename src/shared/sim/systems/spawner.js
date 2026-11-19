// Match clock, rounds and enemy spawning.
// The match (config.match.durationSeconds) is split into config.rounds.count
// equal rounds. Each round spawns enemies at a rate that rises within the round
// and from round to round; boss rounds add a mini-boss near their end.
import { createEnemy } from '../entities/enemy.js';
import { boxBlocked } from '../map.js';
import { clamp } from '../math.js';

/** Match clock state, stored on world.match. */
export function createMatchState() {
  return { started: false, elapsed: 0, round: 1, roundElapsed: 0, bossSpawned: false, spawnBudget: 0 };
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
 * Advances the match clock and spawns enemies. Does nothing once every player is dead.
 * @param {object} world
 * @param {number} dt
 */
export function updateSpawner(world, dt) {
  const { config } = world;
  const m = world.match;
  if (!world.players.some((p) => p.alive)) return;

  if (!m.started) {
    m.started = true;
    world.events.push({ type: 'roundStarted', round: m.round });
  }

  m.elapsed += dt;
  m.roundElapsed += dt;
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

function spawnBoss(world, type) {
  const point = findSpawnPoint(world, world.config.enemies[type], 0.6);
  if (!point) return;
  const boss = spawnEnemy(world, type, point.x, point.y);
  world.events.push({ type: 'bossSpawned', id: boss.id, enemyType: type });
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
 * Walkers must be able to reach the player (flow field), flyers only need open air.
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
  const flying = Boolean(stats.flying);
  const ok = (x, y) =>
    !boxBlocked(map, x, y, stats.radius, flying) && (flying || world.flowField.stepsAt(x, y) !== 0xffff);

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
