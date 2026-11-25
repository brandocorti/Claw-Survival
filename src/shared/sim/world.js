// The game simulation: one world per arena, advanced one fixed tick at a time.
// Pure JavaScript (no Phaser, no DOM), so it runs in the browser now and on the
// Node server from milestone 5, and it can be unit tested.
import { parseArena } from './map.js';
import { createRng } from './rng.js';
import { SpatialGrid } from './spatialGrid.js';
import { FlowField } from './flowField.js';
import { createPlayer } from './entities/player.js';
import { updatePlayerMovement } from './systems/movement.js';
import { updatePlayerWeapon, updateBullets } from './systems/combat.js';
import { updateEnemies, removeDeadEnemies } from './systems/enemies.js';
import { processExplosions } from './systems/damage.js';
import { updateGems } from './systems/xp.js';
import { createMatchState, updateSpawner } from './systems/spawner.js';
import { refreshStats, updateAbilities } from './systems/abilities.js';
import { updateCards } from './systems/cards.js';
import { updateShop } from './systems/shop.js';
import { updatePickups } from './systems/pickups.js';
import { createEmptyInput } from '../protocol.js';
import { ENEMY_TYPES } from '../content/enemies/index.js';
import { ABILITY_TYPES } from '../content/abilities/index.js';

const NO_INPUT = Object.freeze(createEmptyInput());

/**
 * Creates a world for one arena.
 * @param {object} options
 * @param {typeof import('../config.js').CONFIG} options.config
 * @param {{ id: string, rows: string[] }} options.arena
 * @param {number} [options.seed]
 * @param {boolean} [options.spawning] - false = no automatic waves (tests, sandbox)
 * @param {boolean} [options.cards] - false = level-ups never open the card choice (tests)
 * @param {object} [options.enemyTypes] - behaviour registry (tests can inject their own)
 * @param {object} [options.abilityTypes] - ability registry
 */
export function createWorld({
  config, arena, seed = 1, spawning = true, cards = true, enemyTypes = ENEMY_TYPES, abilityTypes = ABILITY_TYPES,
}) {
  const map = parseArena(arena, config.display.tileSize);
  return {
    config,
    map,
    rng: createRng(seed),
    enemyTypes,
    abilityTypes,
    spawning,
    cards,
    /** True while a player in this arena is choosing a card or shopping: nothing moves. */
    paused: false,
    tick: 0,
    time: 0,
    nextId: 1,
    match: createMatchState(),
    /** @type {import('./entities/player.js').Player[]} */
    players: [],
    /** @type {import('./entities/enemy.js').Enemy[]} */
    enemies: [],
    /** @type {import('./entities/bullet.js').Bullet[]} */
    bullets: [],
    /** @type {import('./entities/gem.js').Gem[]} */
    gems: [],
    /** @type {import('./entities/pickup.js').Pickup[]} coins and hearts */
    pickups: [],
    /** Status rows of players in other arenas, filled by the server (milestone 5). */
    remotePlayers: [],
    /** Burning ground patches (fire-trail roll). */
    fires: [],
    pendingExplosions: [],
    grid: new SpatialGrid(map.width * map.tileSize, map.height * map.tileSize, 32),
    flowField: new FlowField(map),
    /** Events from the last ticks, read and cleared by drainEvents(). */
    /** @type {import('../protocol.js').SimEvent[]} */
    events: [],
  };
}

/**
 * Adds a player at the arena spawn (or at x, y).
 * @returns {import('./entities/player.js').Player}
 */
export function addPlayer(world, id, x = world.map.spawn.x, y = world.map.spawn.y) {
  const player = createPlayer(id, x, y, world.config);
  refreshStats(world, player);
  world.players.push(player);
  return player;
}

/**
 * Advances the world by one tick.
 * @param {object} world
 * @param {Record<string, import('../protocol.js').PlayerInput>} inputs - by player id; missing = nothing pressed
 * @param {number} [dt] - seconds, defaults to 1 / config.sim.tickRate
 */
export function stepWorld(world, inputs, dt = 1 / world.config.sim.tickRate) {
  for (const list of [world.players, world.enemies, world.bullets, world.gems, world.pickups]) {
    for (const o of list) {
      o.prevX = o.x;
      o.prevY = o.y;
    }
  }

  // Level-up cards and the salesman. In PvE every player has their own arena, so freezing this
  // world pauses the game for that player only.
  updateShop(world, inputs);
  updateCards(world, inputs);
  world.paused = world.players.some((p) => p.cardChoice || p.shopOpen);
  if (world.paused) return;

  world.tick++;
  world.time += dt;
  if (world.spawning) updateSpawner(world, dt);
  for (const p of world.players) updatePlayerMovement(world, p, inputs[p.id] ?? NO_INPUT, dt);
  updateEnemies(world, dt);
  updateAbilities(world, dt);
  for (const p of world.players) updatePlayerWeapon(world, p, dt);
  updateBullets(world, dt);
  processExplosions(world);
  updateGems(world, dt);
  updatePickups(world, dt);
  removeDeadEnemies(world);
}

/** True when every player in this world is dead (solo: game over). */
export function allPlayersDead(world) {
  return world.players.length > 0 && world.players.every((p) => !p.alive);
}

/**
 * Returns and clears the events produced since the last call.
 * @returns {import('../protocol.js').SimEvent[]}
 */
export function drainEvents(world) {
  const events = world.events;
  world.events = [];
  return events;
}
