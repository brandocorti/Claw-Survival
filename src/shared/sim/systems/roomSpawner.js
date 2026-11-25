// Enemies of one fight room: a fixed budget (not continuous spawning), split
// into waves. The next wave comes after the wave gap, or right away once
// everything alive is dead. The room is cleared when the budget is spent and
// no enemy is alive (rooms.js checks that with isRoomSpent()).
import { difficultyAt } from './difficulty.js';
import { spawnEnemy, pickEnemyType, findSpawnPoint } from './spawner.js';

/**
 * Spawn state of the current room, stored on world.run.spawn.
 * @typedef {object} RoomSpawn
 * @property {number[]} waveSizes - enemies per wave, adds up to the budget
 * @property {number} wave - index of the next wave to start
 * @property {number} queued - enemies of started waves not placed yet (no room, or the alive cap)
 * @property {number} budgetLeft - enemies of the budget not placed yet
 * @property {number} nextWaveIn - seconds until the next wave starts
 * @property {number} waveGap - seconds between waves
 * @property {number} eliteChance
 * @property {number} depth
 * @property {boolean} bossPending - the Crab King has yet to appear
 * @property {number} bossDepth - depth the boss scales with
 */

/**
 * Splits a budget into waves; later waves get the leftovers, so they are never smaller.
 * @param {number} budget
 * @param {number} waves
 * @returns {number[]}
 */
export function splitBudget(budget, waves) {
  const n = Math.max(1, Math.min(waves, budget));
  const base = Math.floor(budget / n);
  const extra = budget - base * n;
  return Array.from({ length: n }, (_, i) => base + (i >= n - extra ? 1 : 0));
}

/**
 * Spawn state for a new fight room.
 * @param {object} config
 * @param {number} depth
 * @param {{ boss?: boolean, bossDepth?: number }} [options]
 * @returns {RoomSpawn}
 */
export function createRoomSpawn(config, depth, { boss = false, bossDepth = depth } = {}) {
  const diff = difficultyAt(config, depth);
  return {
    waveSizes: splitBudget(diff.budget, diff.waves),
    wave: 0,
    queued: 0,
    budgetLeft: diff.budget,
    nextWaveIn: config.rooms.firstWaveDelay,
    waveGap: diff.waveGap,
    eliteChance: diff.eliteChance,
    depth,
    bossPending: boss,
    bossDepth,
  };
}

/**
 * Starts waves and places queued enemies. Does nothing once every player is dead.
 * @param {object} world
 * @param {number} dt
 */
export function updateRoomSpawner(world, dt) {
  const s = world.run.spawn;
  if (!s || !world.players.some((p) => p.alive)) return;

  s.nextWaveIn -= dt;
  const alive = countAlive(world);
  const moreWaves = s.wave < s.waveSizes.length;
  const roomEmpty = s.wave > 0 && alive === 0 && s.queued === 0;
  if (moreWaves && (s.nextWaveIn <= 0 || roomEmpty)) {
    s.queued += s.waveSizes[s.wave];
    s.wave++;
    s.nextWaveIn = s.waveGap;
    world.events.push({ type: 'waveStarted', wave: s.wave, waves: s.waveSizes.length });
  }
  if (s.bossPending && s.wave > 0) spawnBoss(world, s); // with the first wave
  placeQueued(world, s, alive);
}

/**
 * True when every enemy of the room has been placed (budget spent, boss out).
 * @param {RoomSpawn|null} s
 */
export function isRoomSpent(s) {
  return !s || (s.budgetLeft === 0 && s.queued === 0 && !s.bossPending);
}

function placeQueued(world, s, alive) {
  const { config } = world;
  while (s.queued > 0 && alive < config.spawning.maxAlive) {
    const type = pickEnemyType(world, s.depth);
    const point = findSpawnPoint(world, config.enemies[type]);
    if (!point) return; // try again next tick
    const elite = s.eliteChance > 0 && world.rng.next() < s.eliteChance;
    spawnEnemy(world, type, point.x, point.y, undefined, { elite, depth: s.depth });
    s.queued--;
    s.budgetLeft--;
    alive++;
  }
}

function spawnBoss(world, s) {
  const point = findSpawnPoint(world, world.config.enemies.crabKing);
  if (!point) return; // stays pending, tried again with the next wave or tick
  const boss = spawnEnemy(world, 'crabKing', point.x, point.y, undefined, { depth: s.bossDepth });
  s.bossPending = false;
  world.run.kingsMet++;
  world.events.push({ type: 'bossSpawned', id: boss.id, enemyType: 'crabKing' });
}

function countAlive(world) {
  let n = 0;
  for (const e of world.enemies) if (!e.dead) n++;
  return n;
}
