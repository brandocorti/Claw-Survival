// A run is a chain of rooms. This system owns the run state (world.run): the
// match clock, building each room from a template, locking and opening doors,
// clearing fight rooms, and moving the player through a door to the next room.
//
// Words used here:
//   depth       fight rooms cleared this run (break rooms do not count); drives difficulty
//   fightStreak fight rooms entered since the last break room
//   socket      N/E/S/W marks on a template edge; each becomes a door or a wall
import { parseArena, setTile } from '../map.js';
import { SpatialGrid } from '../spatialGrid.js';
import { FlowField } from '../flowField.js';
import { TILE } from '../../content/tiles.js';
import { FIGHT_ROOMS, BREAK_ROOMS, SOCKETS, OPPOSITE } from '../../content/rooms/index.js';
import { isDangerStep } from './difficulty.js';
import { createRoomSpawn, updateRoomSpawner, isRoomSpent } from './roomSpawner.js';
import { onRoomEntered } from './effects.js';

/** Match clock, stored on world.match. */
export function createMatchState() {
  return { elapsed: 0 };
}

/**
 * @typedef {object} Door
 * @property {'N'|'E'|'S'|'W'} side
 * @property {'fight'|'break'} dest - what is behind it
 * @property {{ tx: number, ty: number }[]} tiles
 * @property {boolean} open
 */

/**
 * @typedef {object} Room
 * @property {'fight'|'break'|'sandbox'} kind - sandbox: a test arena with no doors that never clears
 * @property {number} number - shown on the HUD as "ROOM n" (fight rooms: depth + 1 on entry)
 * @property {string} templateId
 * @property {string|null} entrance - socket the player came in by (walled off)
 * @property {Door[]} doors
 * @property {boolean} cleared - doors are open
 * @property {boolean} boss - a Crab King room
 */

/** Run state, stored on world.run. */
export function createRunState() {
  return {
    /** Rooms entered, break rooms included. */
    roomCount: 0,
    depth: 0,
    fightStreak: 0,
    /** Crab Kings met so far: the first one is not scaled by depth. */
    kingsMet: 0,
    /** @type {Room|null} */
    room: null,
    /** @type {import('./roomSpawner.js').RoomSpawn|null} */
    spawn: null,
    /** Walking through a door: { door, timer } until the next room loads. */
    transition: null,
    /** The Salesman already sold something in this break room. */
    salesmanSold: false,
    /** The match clock ran out: PvE is over (the final PvP comes in milestone 8). */
    pveOver: false,
    lastTemplateId: null,
  };
}

/**
 * Starts a run: sets the starting depth (dev options) and loads the first room.
 * @param {object} world
 * @param {{ depth?: number, startIn?: 'fight'|'break' }} [options]
 */
export function startRun(world, { depth = 0, startIn = 'fight' } = {}) {
  const cfg = world.config.rooms;
  const run = world.run;
  run.depth = depth;
  // So that ?room=8 meets the Crab King: the counter is where it would be at this depth.
  run.fightStreak = depth % cfg.mandatoryBreakAfter;
  run.kingsMet = Math.floor(depth / cfg.bossAtFightRoom);
  enterRoom(world, startIn, null);
}

/**
 * Turns a template into a sandbox room (tests, or an arena with no doors).
 * @param {object} world
 */
export function startSandbox(world) {
  world.run.room = { kind: 'sandbox', number: 1, templateId: world.map.id, entrance: null, doors: [], cleared: false, boss: false };
  world.run.spawn = world.spawning ? createRoomSpawn(world.config, 0) : null;
}

/**
 * Where the exit of the current room leads. Called for each exit on its own.
 * @param {object} world
 * @param {'fight'|'break'} roomKind - the room the exit belongs to
 * @returns {'fight'|'break'}
 */
export function rollDestination(world, roomKind) {
  const cfg = world.config.rooms;
  if (roomKind === 'break') return 'fight'; // never a break right after a break
  if (world.run.fightStreak >= cfg.mandatoryBreakAfter) return 'break';
  return world.rng.next() < cfg.breakChance ? 'break' : 'fight';
}

/**
 * Picks a template, the exits (1-3 sockets, not the entrance) and what is behind
 * each one, and writes the final rows: exits become locked doors 'D', every other
 * socket becomes cliff '#'.
 * @param {object} world
 * @param {'fight'|'break'} kind
 * @param {string|null} entrance
 * @returns {{ template: { id: string, rows: string[] }, rows: string[], exits: { side: string, dest: string }[] }}
 */
export function planRoom(world, kind, entrance) {
  const { rng } = world;
  const list = world.roomTemplates[kind];
  const choices = list.length > 1 ? list.filter((t) => t.id !== world.run.lastTemplateId) : list;
  const template = choices[rng.int(0, choices.length - 1)];

  const free = SOCKETS.filter((s) => s !== entrance);
  const count = Math.min(free.length, pickExitCount(world));
  for (let i = free.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [free[i], free[j]] = [free[j], free[i]];
  }
  const exits = free.slice(0, count).map((side) => ({ side, dest: rollDestination(world, kind) }));
  const exitSides = new Set(exits.map((e) => e.side));
  const rows = template.rows.map((row) =>
    row.replace(/[NESW]/g, (s) => (exitSides.has(s) ? 'D' : '#')),
  );
  return { template, rows, exits };
}

/**
 * Number of exits, weighted by config.rooms.exitWeights.
 * @param {object} world
 * @returns {number}
 */
export function pickExitCount(world) {
  const entries = Object.entries(world.config.rooms.exitWeights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = world.rng.range(0, total);
  for (const [n, w] of entries) {
    roll -= w;
    if (roll < 0) return Number(n);
  }
  return Number(entries[entries.length - 1][0]);
}

/**
 * Loads the next room and puts the players at its entrance.
 * @param {object} world
 * @param {'fight'|'break'} kind
 * @param {string|null} entrance - socket the player comes in by, null for the first room
 */
export function enterRoom(world, kind, entrance) {
  const { config } = world;
  const run = world.run;
  run.roomCount++;
  let boss = false;
  if (kind === 'fight') {
    run.fightStreak++;
    boss = run.fightStreak === config.rooms.bossAtFightRoom;
  } else {
    run.fightStreak = 0;
    run.salesmanSold = false;
  }

  const plan = planRoom(world, kind, entrance);
  run.lastTemplateId = plan.template.id;
  loadMap(world, { id: plan.template.id, rows: plan.rows });
  const doors = plan.exits.map((e) => ({ ...e, tiles: socketTiles(plan.template.rows, e.side), open: false }));
  run.room = {
    kind,
    number: kind === 'fight' ? run.depth + 1 : run.depth,
    templateId: plan.template.id,
    entrance,
    doors,
    cleared: false,
    boss,
  };
  run.spawn = kind === 'fight'
    ? createRoomSpawn(config, run.depth, { boss, bossDepth: run.kingsMet === 0 ? 0 : run.depth })
    : null;

  const start = entrance ? entrancePoint(world, plan.template.rows, entrance) : world.map.spawn;
  for (const p of world.players) {
    p.x = p.prevX = start.x;
    p.y = p.prevY = start.y;
    p.rolling = false;
    p.targetId = null;
    p.invulnerableTime = Math.max(p.invulnerableTime, config.rooms.spawnProtection);
    onRoomEntered(world, p, kind);
  }
  if (kind === 'break') openDoors(world);

  world.events.push({
    type: 'roomEntered',
    kind,
    number: run.room.number,
    depth: run.depth,
    boss,
    templateId: plan.template.id,
    danger: kind === 'fight' && isDangerStep(config, run.depth),
  });
}

/**
 * The run's part of one tick: match clock, the walk between rooms, spawning.
 * @param {object} world
 * @param {number} dt
 */
export function updateRun(world, dt) {
  const run = world.run;
  if (run.pveOver || !world.players.some((p) => p.alive)) return;

  world.match.elapsed += dt;
  if (world.match.elapsed >= world.config.match.durationSeconds) {
    endPve(world);
    return;
  }

  if (run.transition) {
    run.transition.timer -= dt;
    if (run.transition.timer <= 0) {
      const { door } = run.transition;
      run.transition = null;
      enterRoom(world, door.dest, OPPOSITE[door.side]);
    }
    return;
  }
  if (world.spawning && run.room && run.room.kind !== 'break') updateRoomSpawner(world, dt);
}

/**
 * End of tick: clears the room when the last enemy is gone, and starts the walk
 * to the next room when a player steps into an open door.
 * @param {object} world
 */
export function updateRoomState(world) {
  const run = world.run;
  const room = run.room;
  if (!room || run.pveOver || run.transition) return;
  const someoneAlive = world.players.some((p) => p.alive);

  if (!room.cleared && room.kind === 'fight' && someoneAlive && isRoomSpent(run.spawn) && world.enemies.every((e) => e.dead)) {
    clearRoom(world);
  }
  if (!room.cleared && room.kind !== 'break') return;
  for (const p of world.players) {
    if (!p.alive) continue;
    const door = doorTouched(world, p);
    if (door) {
      run.transition = { door, timer: world.config.rooms.transitionSeconds };
      world.events.push({ type: 'roomLeaving', side: door.side, dest: door.dest });
      return;
    }
  }
}

/**
 * Clears the current fight room: depth +1, doors open, leftover gems fly to the player.
 * @param {object} world
 */
export function clearRoom(world) {
  const run = world.run;
  run.room.cleared = true;
  run.spawn = null;
  if (run.room.kind === 'fight') run.depth++;
  openDoors(world);
  const alive = world.players.filter((p) => p.alive);
  for (const g of world.gems) {
    let best = null;
    let bestD = Infinity;
    for (const p of alive) {
      const d = (p.x - g.x) ** 2 + (p.y - g.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    if (best) g.targetId = best.id;
  }
  world.events.push({ type: 'roomCleared', number: run.room.number, depth: run.depth });
}

/**
 * Opens every door of the current room.
 * @param {object} world
 */
export function openDoors(world) {
  const room = world.run.room;
  room.cleared = true;
  for (const door of room.doors) {
    door.open = true;
    for (const t of door.tiles) setTile(world.map, t.tx, t.ty, TILE.DOOR_OPEN);
  }
  world.events.push({ type: 'doorsOpened', doors: room.doors.map((d) => ({ side: d.side, dest: d.dest })) });
}

/**
 * The PvE clock ran out: enemies leave (no XP), the run stops.
 * @param {object} world
 */
export function endPve(world) {
  const run = world.run;
  run.pveOver = true;
  run.spawn = null;
  run.transition = null;
  world.match.elapsed = world.config.match.durationSeconds;
  for (const e of world.enemies) e.dead = true;
  world.enemies.length = 0;
  world.bullets.length = 0;
  world.events.push({ type: 'pveOver', number: run.room ? run.room.number : 0, depth: run.depth });
}

/** Replaces the map and empties the room (enemies, bullets, gems). */
function loadMap(world, arena) {
  const map = parseArena(arena, world.config.display.tileSize);
  world.map = map;
  world.grid = new SpatialGrid(map.width * map.tileSize, map.height * map.tileSize, 32);
  world.flowField = new FlowField(map);
  world.enemies = [];
  world.bullets = [];
  world.gems = [];
  world.pendingExplosions = [];
}

/**
 * Tile coordinates of one socket in a template.
 * @param {string[]} rows
 * @param {string} side - 'N' | 'E' | 'S' | 'W'
 * @returns {{ tx: number, ty: number }[]}
 */
export function socketTiles(rows, side) {
  const tiles = [];
  rows.forEach((row, ty) => {
    for (let tx = 0; tx < row.length; tx++) if (row[tx] === side) tiles.push({ tx, ty });
  });
  return tiles;
}

/**
 * Where the player appears when entering through a socket: its middle,
 * config.rooms.entranceInset tiles inside the room.
 * @param {object} world
 * @param {string[]} rows - template rows
 * @param {string} side
 */
export function entrancePoint(world, rows, side) {
  const ts = world.config.display.tileSize;
  const tiles = socketTiles(rows, side);
  const cx = (tiles.reduce((s, t) => s + t.tx, 0) / tiles.length + 0.5) * ts;
  const cy = (tiles.reduce((s, t) => s + t.ty, 0) / tiles.length + 0.5) * ts;
  const inset = world.config.rooms.entranceInset * ts;
  const dir = { N: [0, 1], S: [0, -1], W: [1, 0], E: [-1, 0] }[side];
  return { x: cx + dir[0] * inset, y: cy + dir[1] * inset };
}

/** The open door a player's collision box overlaps, if any. */
function doorTouched(world, p) {
  const ts = world.map.tileSize;
  const r = world.config.player.radius;
  for (const door of world.run.room.doors) {
    if (!door.open) continue;
    for (const t of door.tiles) {
      const overlapX = p.x + r > t.tx * ts && p.x - r < (t.tx + 1) * ts;
      const overlapY = p.y + r > t.ty * ts && p.y - r < (t.ty + 1) * ts;
      if (overlapX && overlapY) return door;
    }
  }
  return null;
}

/** Default templates (tests inject their own through createWorld). */
export const DEFAULT_ROOM_TEMPLATES = Object.freeze({ fight: FIGHT_ROOMS, break: BREAK_ROOMS });
