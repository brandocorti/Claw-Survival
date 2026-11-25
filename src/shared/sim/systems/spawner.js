// Creating enemies: which type, where, and how strong. The room spawner
// (roomSpawner.js) decides when and how many. All scaling comes from
// difficultyAt() in difficulty.js; this file has no formulas of its own.
import { createEnemy } from '../entities/enemy.js';
import { boxBlocked } from '../map.js';
import { difficultyAt } from './difficulty.js';

/**
 * Creates an enemy (with its warning delay) and adds it to the world.
 * Health, damage, speed and XP scale with the depth of the current room.
 * @param {object} world
 * @param {string} type - key into config.enemies
 * @param {number} x
 * @param {number} y
 * @param {number} [delay] - warning time; defaults to the enemy's or config.spawning.spawnDelay
 * @param {{ elite?: boolean, depth?: number }} [options] - depth defaults to world.run.depth
 * @returns {import('../entities/enemy.js').Enemy}
 */
export function spawnEnemy(world, type, x, y, delay, { elite = false, depth = world.run.depth } = {}) {
  const { config } = world;
  const stats = config.enemies[type];
  const diff = difficultyAt(config, depth);
  const e = config.difficulty.elite;
  const scales = {
    health: diff.healthScale * (elite ? e.healthScale : 1),
    damage: diff.damageScale,
    speed: diff.speedScale,
    xp: diff.xpScale * (elite ? e.xpScale : 1),
    elite,
  };
  const enemy = createEnemy(world.nextId++, type, x, y, stats, scales, delay ?? stats.spawnDelay ?? config.spawning.spawnDelay);
  world.enemies.push(enemy);
  world.events.push({ type: 'enemySpawning', id: enemy.id, enemyType: type, x, y, elite });
  return enemy;
}

/**
 * Weighted random pick from the enemy mix of this depth (difficulty.enemyWeightsByDepth).
 * @param {object} world
 * @param {number} depth
 * @returns {string} enemy type
 */
export function pickEnemyType(world, depth) {
  const entries = Object.entries(difficultyAt(world.config, depth).enemyWeights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = world.rng.range(0, total);
  for (const [type, w] of entries) {
    roll -= w;
    if (roll < 0) return type;
  }
  return entries[entries.length - 1][0];
}

/**
 * A free spot anywhere in the room, at least config.spawning.minDistance from
 * every living player. Walkers must be able to reach the player (flow field),
 * flyers only need open air.
 * @param {object} world
 * @param {{ radius: number, flying?: boolean }} stats
 * @returns {{ x: number, y: number } | null} null if the room has no such spot
 */
export function findSpawnPoint(world, stats) {
  const { map, rng, config } = world;
  const alive = world.players.filter((p) => p.alive);
  if (alive.length === 0) return null;
  const minD2 = config.spawning.minDistance ** 2;
  const flying = Boolean(stats.flying);
  const ts = map.tileSize;

  for (let attempt = 0; attempt < 80; attempt++) {
    const x = (rng.int(1, map.width - 2) + 0.5) * ts;
    const y = (rng.int(1, map.height - 2) + 0.5) * ts;
    if (alive.some((p) => (p.x - x) ** 2 + (p.y - y) ** 2 < minD2)) continue;
    if (boxBlocked(map, x, y, stats.radius, flying)) continue;
    if (!flying && world.flowField.stepsAt(x, y) === 0xffff) continue;
    return { x, y };
  }
  return null;
}
