// The game simulation: one world per player instance, advanced one fixed tick
// at a time. A world holds the current room; rooms.js swaps the room's map and
// contents when the player walks through a door.
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
import { updateEffects } from './systems/effects.js';
import { updateInteraction } from './systems/breakRoom.js';
import {
  createMatchState, createRunState, startRun, startSandbox, updateRun, updateRoomState, DEFAULT_ROOM_TEMPLATES,
} from './systems/rooms.js';
import { createEmptyInput } from '../protocol.js';
import { ENEMY_TYPES } from '../content/enemies/index.js';
import { EmptyRivalSource } from '../rivals/RivalStatusSource.js';

const NO_INPUT = Object.freeze(createEmptyInput());

/**
 * Creates a world.
 * - With `arena`: a sandbox room with no doors that never clears (tests, experiments).
 * - Without: a run of rooms. Call startRun() after adding the players.
 * @param {object} options
 * @param {typeof import('../config.js').CONFIG} options.config
 * @param {{ id: string, rows: string[] }} [options.arena]
 * @param {number} [options.seed]
 * @param {boolean} [options.spawning] - false = no enemies spawn by themselves (tests, sandbox)
 * @param {object} [options.enemyTypes] - behaviour registry (tests can inject their own)
 * @param {{ fight: object[], break: object[] }} [options.roomTemplates] - templates to build rooms from
 * @param {import('../rivals/RivalStatusSource.js').RivalStatusSource} [options.rivals] - for the Salesman's gossip
 */
export function createWorld({
  config, arena, seed = 1, spawning = true, enemyTypes = ENEMY_TYPES,
  roomTemplates = DEFAULT_ROOM_TEMPLATES, rivals = new EmptyRivalSource(),
}) {
  // Until the first room loads, a sandbox arena (or a 1-tile placeholder) keeps every field valid.
  const map = parseArena(arena ?? { id: 'none', rows: ['P'] }, config.display.tileSize);
  const world = {
    config,
    map,
    rng: createRng(seed),
    enemyTypes,
    roomTemplates,
    rivals,
    spawning,
    tick: 0,
    time: 0,
    nextId: 1,
    match: createMatchState(),
    run: createRunState(),
    /** @type {import('./entities/player.js').Player[]} */
    players: [],
    /** @type {import('./entities/enemy.js').Enemy[]} */
    enemies: [],
    /** @type {import('./entities/bullet.js').Bullet[]} */
    bullets: [],
    /** @type {import('./entities/gem.js').Gem[]} */
    gems: [],
    pendingExplosions: [],
    grid: new SpatialGrid(map.width * map.tileSize, map.height * map.tileSize, 32),
    flowField: new FlowField(map),
    /** Events from the last ticks, read and cleared by drainEvents(). */
    /** @type {import('../protocol.js').SimEvent[]} */
    events: [],
  };
  if (arena) startSandbox(world);
  return world;
}

export { startRun };

/**
 * Adds a player at the room spawn (or at x, y).
 * @returns {import('./entities/player.js').Player}
 */
export function addPlayer(world, id, x = world.map.spawn.x, y = world.map.spawn.y) {
  const player = createPlayer(id, x, y, world.config);
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
  world.tick++;
  world.time += dt;

  for (const list of [world.players, world.enemies, world.bullets, world.gems]) {
    for (const o of list) {
      o.prevX = o.x;
      o.prevY = o.y;
    }
  }

  updateRun(world, dt);
  const walking = !world.run.transition;
  for (const p of world.players) {
    const input = walking ? inputs[p.id] ?? NO_INPUT : NO_INPUT;
    updatePlayerMovement(world, p, input, dt);
    updateInteraction(world, p, input);
  }
  updateEnemies(world, dt);
  for (const p of world.players) updatePlayerWeapon(world, p, dt);
  updateBullets(world, dt);
  processExplosions(world);
  updateGems(world, dt);
  removeDeadEnemies(world);
  updateEffects(world, dt);
  updateRoomState(world);
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
