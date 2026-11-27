// Test fixtures: small arenas, a fixed config and a world factory, so tests do
// not depend on the real arena layout or on tuning values changing in config.js.
import { createWorld, addPlayer, stepWorld, drainEvents } from '../../../src/shared/sim/world.js';
import { spawnEnemy } from '../../../src/shared/sim/systems/spawner.js';
import { ENEMY_TYPES } from '../../../src/shared/content/enemies/index.js';

/** Fixed config for tests (deliberately separate from the game's config.js). */
export const TEST_CONFIG = Object.freeze({
  sim: { tickRate: 60, maxTicksPerFrame: 8 },
  display: { width: 480, height: 270, tileSize: 16 },
  camera: { followLerp: 0.12, moveLookAhead: 16 },
  match: { durationSeconds: 100 },
  finalBoss: { type: 'crabEmperor', introSeconds: 2, healBefore: 0 },
  rounds: {
    count: 5,
    breakSeconds: 3,
    bossRounds: [3, 5],
    bossAtSecondsLeft: 5,
    enemyWeights: [{ crab: 1 }, { crab: 1, coconut: 1 }],
  },
  spawning: {
    baseRate: 1, ratePerRound: 0.5, rampWithinRound: 1, maxAlive: 10,
    minDistance: 40, maxDistance: 80, spawnDelay: 0.5, healthPerRound: 0.5,
  },
  player: {
    radius: 5,
    hurtRadius: 4,
    maxHealth: 6,
    moveSpeed: 90,
    hitInvulnerability: 1,
    handHeight: 8,
    roll: { speed: 200, duration: 0.3, invulnerableTime: 0.25, cooldown: 0.5 },
    startingWeapon: 'test',
  },
  autoAim: { range: 120, lineOfSightChecks: 4 },
  weapons: {
    test: { fireRate: 4, damage: 1, bulletSpeed: 240, range: 240, spread: 0, bulletRadius: 2, muzzleDistance: 8 },
  },
  enemies: {
    /** Stands still, never attacks: a target dummy. */
    dummy: { hp: 100, speed: 0, radius: 5, contactDamage: 1, xp: 3 },
    crab: {
      hp: 3, speed: 40, radius: 5, contactDamage: 1, xp: 1,
      charge: { intervalMin: 2, intervalMax: 2, maxDistance: 150, windup: 0.4, speed: 170, duration: 0.4 },
    },
    coconut: {
      hp: 2, speed: 30, radius: 5, contactDamage: 1, xp: 1, maxSpeed: 80, acceleration: 30,
      explosion: { radius: 26, playerDamage: 1, enemyDamage: 4 },
    },
    skeleton: {
      hp: 6, speed: 30, radius: 5, contactDamage: 1, xp: 3, preferredRange: 100,
      fire: { interval: 2, windup: 0.4, bulletSpeed: 70, damage: 1, range: 260 },
    },
    tiki: {
      hp: 8, speed: 20, radius: 6, contactDamage: 1, xp: 4, flying: true, preferredRange: 60,
      ring: { interval: 3, windup: 0.5, count: 8, rotateStep: 0.4, bulletSpeed: 55, damage: 1, range: 300 },
    },
    crabKing: {
      hp: 90, speed: 28, radius: 12, contactDamage: 2, xp: 25, boss: true, spawnDelay: 1,
      pattern: ['fan', 'charge', 'fan', 'ring'], attackPause: 1,
      charge: { windup: 0.7, speed: 160, duration: 0.7 },
      fan: { windup: 0.5, count: 5, spread: 0.9, bulletSpeed: 75, damage: 1, range: 280 },
      ring: { windup: 0.6, count: 14, bulletSpeed: 60, damage: 1, range: 300 },
    },
    crabEmperor: {
      hp: 100, speed: 30, radius: 15, contactDamage: 2, xp: 30, boss: true, spawnDelay: 1,
      pattern: ['fan', 'charge', 'ring'], enragedPattern: ['spiral'], attackPause: 1,
      charge: { windup: 0.6, speed: 190, duration: 0.8 },
      fan: { windup: 0.5, count: 7, spread: 1.2, bulletSpeed: 85, damage: 1, range: 300 },
      ring: { windup: 0.6, count: 16, bulletSpeed: 65, damage: 1, range: 320 },
      spiral: { windup: 0.7, duration: 2, interval: 0.2, arms: 3, turn: 0.2, bulletSpeed: 70, damage: 1, range: 320 },
    },
  },
  enemyBullets: { radius: 3 },
  xp: {
    pickupRadius: 30,
    magnetAcceleration: 600,
    magnetMaxSpeed: 220,
    curve: { base: 5, growth: 3, exponent: 1.25 },
    gemValues: [20, 5, 1],
  },
  drops: { coinChance: 0, heartChance: 0, heartHeal: 2 },
  shop: { interactRadius: 28, basePrice: 8, priceStep: 4, rollsPerRound: 1 },
  cards: { choices: 3 },
  net: {
    defaultPort: 2567, minPlayers: 2, maxPlayers: 6, maxBots: 5, roomCodeLength: 4, maxNameLength: 12,
    reconnectGraceSeconds: 10, snapshotRate: 20, spectateDelaySeconds: 2, spectateSwitchSeconds: 1.5, summaryRate: 5,
    maxMessagesPerSecond: 40, winScreenSeconds: 8,
    bot: { turnIntervalMin: 0.5, turnIntervalMax: 1, idleChance: 0.1, rollChance: 0.3, pickDelayMin: 0.2, pickDelayMax: 0.5 },
  },
  abilities: {
    damage: { maxLevel: 5, damagePerLevel: 1 },
    fireRate: { maxLevel: 5, ratePerLevel: 0.25 },
    moveSpeed: { maxLevel: 5, speedPerLevel: 0.1 },
    maxHearts: { maxLevel: 4, healthPerLevel: 2 },
    multishot: { maxLevel: 3, shotsPerLevel: 1, spread: 0.2 },
    piercing: { maxLevel: 3, piercePerLevel: 1 },
    orbitCoconuts: { maxLevel: 4, perLevel: 1, orbitRadius: 36, angularSpeed: 2.6, radius: 5, damage: 2, hitCooldown: 0.5 },
    fireTrail: {
      maxLevel: 3, spacing: 10, radius: 8, hitCooldown: 0.4,
      baseDamage: 1, damagePerLevel: 1, baseDuration: 1, durationPerLevel: 0.5,
    },
  },
});

/** Behaviours used in tests: the real ones plus a do-nothing dummy. */
export const TEST_ENEMY_TYPES = { ...ENEMY_TYPES, dummy: { update() {} } };

/** Open 12x8 room with walls all around; spawn near the middle. */
export const OPEN_ROOM = {
  id: 'open-room',
  rows: [
    '############',
    '#..........#',
    '#..........#',
    '#....P.....#',
    '#..........#',
    '#..........#',
    '#..........#',
    '############',
  ],
};

/** Room with a rock 2 tiles right of the spawn, and a water strip 2 rows below. */
export const OBSTACLE_ROOM = {
  id: 'obstacle-room',
  rows: [
    '################',
    '#..............#',
    '#.P.o..........#',
    '#..............#',
    '#...~~.........#',
    '#..............#',
    '################',
  ],
};

/** Long room split by a pond with one gap at the bottom: walkers must go around. */
export const POND_ROOM = {
  id: 'pond-room',
  rows: [
    '################',
    '#.......~......#',
    '#.......~......#',
    '#..P....~......#',
    '#.......~......#',
    '#.......~......#',
    '#..............#',
    '################',
  ],
};

/** Big open room for spawning tests. */
export const BIG_ROOM = {
  id: 'big-room',
  rows: [
    '##############################',
    ...Array.from({ length: 6 }, () => '#............................#'),
    '#..............P.............#',
    ...Array.from({ length: 6 }, () => '#............................#'),
    '##############################',
  ],
};

export const TICK = 1 / TEST_CONFIG.sim.tickRate;

/** Input with nothing pressed, overridable. */
export function input(overrides = {}) {
  return { moveX: 0, moveY: 0, roll: false, ...overrides };
}

/**
 * World with one player 'p1' at the spawn. No automatic waves unless spawning is true,
 * and level-ups do not open the card choice unless cards is true.
 * @param {object} [options]
 */
export function makeWorld({ arena = OPEN_ROOM, seed = 1, spawning = false, cards = false, config = TEST_CONFIG } = {}) {
  const world = createWorld({ config, arena, seed, spawning, cards, enemyTypes: TEST_ENEMY_TYPES });
  const player = addPlayer(world, 'p1');
  return { world, player };
}

/** Puts an enemy at (x, y), already active (no spawn delay). */
export function placeEnemy(world, type, x, y) {
  return spawnEnemy(world, type, x, y, 0);
}

/**
 * Same, but it cannot die: the player's auto-fire would otherwise kill it
 * in the middle of a behaviour test.
 */
export function placeSturdyEnemy(world, type, x, y) {
  const e = placeEnemy(world, type, x, y);
  e.hp = 1e9;
  e.maxHp = 1e9;
  return e;
}

/** Steps the world n ticks with the same input for p1. */
export function run(world, n, inp = input()) {
  for (let i = 0; i < n; i++) stepWorld(world, { p1: inp }, TICK);
}

/** Steps n ticks and returns every event produced (and clears them). */
export function runCollect(world, n, inp = input()) {
  const events = [];
  for (let i = 0; i < n; i++) {
    stepWorld(world, { p1: inp }, TICK);
    events.push(...drainEvents(world));
  }
  return events;
}
