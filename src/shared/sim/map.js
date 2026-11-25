// Arena map: a grid of tile types parsed from an ASCII layout,
// plus collision queries used by movement, bullets, line of sight and spawning.
import { TILE, TILE_CHARS, TILE_RULES } from '../content/tiles.js';

/**
 * @typedef {object} ArenaMap
 * @property {string} id
 * @property {number} width - in tiles
 * @property {number} height - in tiles
 * @property {number} tileSize - in pixels
 * @property {Uint8Array} tiles - row-major tile types
 * @property {{ x: number, y: number }} spawn - world pixels (center of the 'P' tile)
 */

/**
 * Parses an arena definition ({ id, rows }) into a map.
 * Throws if rows differ in length, contain unknown characters, or have no single 'P'.
 * @param {{ id: string, rows: string[] }} arena
 * @param {number} tileSize
 * @returns {ArenaMap}
 */
export function parseArena(arena, tileSize) {
  const height = arena.rows.length;
  const width = arena.rows[0].length;
  const tiles = new Uint8Array(width * height);
  let spawn = null;

  arena.rows.forEach((row, y) => {
    if (row.length !== width) {
      throw new Error(`Arena "${arena.id}": row ${y} has ${row.length} tiles, expected ${width}`);
    }
    for (let x = 0; x < width; x++) {
      const ch = row[x];
      const type = TILE_CHARS[ch];
      if (type === undefined) {
        throw new Error(`Arena "${arena.id}": unknown tile '${ch}' at ${x},${y}`);
      }
      tiles[y * width + x] = type;
      if (ch === 'P') {
        if (spawn) throw new Error(`Arena "${arena.id}": more than one 'P' spawn tile`);
        spawn = { x: (x + 0.5) * tileSize, y: (y + 0.5) * tileSize };
      }
    }
  });

  if (!spawn) throw new Error(`Arena "${arena.id}": no 'P' spawn tile`);
  return { id: arena.id, width, height, tileSize, tiles, spawn };
}

/**
 * Tile type at a tile coordinate. Outside the map counts as cliff (solid).
 * @param {ArenaMap} map
 * @param {number} tx
 * @param {number} ty
 */
export function tileAt(map, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return TILE.CLIFF;
  return map.tiles[ty * map.width + tx];
}

/** How something travels -> the tile rule that stops it. */
const BLOCK_RULE = { walk: 'blocksMove', fly: 'blocksFlying', giant: 'blocksGiant' };

/**
 * True if a tile stops something that travels this way.
 * @param {ArenaMap} map
 * @param {'walk'|'fly'|'giant'} [travel]
 */
export function tileBlocks(map, tx, ty, travel = 'walk') {
  return TILE_RULES[tileAt(map, tx, ty)][BLOCK_RULE[travel]];
}

/**
 * True if a box (center x,y, half-size r) overlaps any blocking tile.
 * @param {ArenaMap} map
 * @param {'walk'|'fly'|'giant'} [travel]
 */
export function boxBlocked(map, x, y, r, travel = 'walk') {
  const ts = map.tileSize;
  const x0 = Math.floor((x - r) / ts);
  const x1 = Math.floor((x + r - 0.001) / ts);
  const y0 = Math.floor((y - r) / ts);
  const y1 = Math.floor((y + r - 0.001) / ts);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (tileBlocks(map, tx, ty, travel)) return true;
    }
  }
  return false;
}

/**
 * True if a point is inside a tile that stops bullets.
 * @param {ArenaMap} map
 */
export function pointBlocksBullet(map, x, y) {
  const ts = map.tileSize;
  return TILE_RULES[tileAt(map, Math.floor(x / ts), Math.floor(y / ts))].blocksBullets;
}

/**
 * True if a bullet flying from (x0,y0) to (x1,y1) would hit a wall or rock.
 * Samples every 4 px, which is finer than any wall.
 * @param {ArenaMap} map
 */
export function lineBlocked(map, x0, y0, x1, y1) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(dist / 4));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (pointBlocksBullet(map, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return true;
  }
  return false;
}

/**
 * Moves a box by (dx, dy), one axis at a time, stopping flush against walls.
 * Sub-steps keep fast movement (rolls, charges) from tunneling through thin walls.
 * @param {ArenaMap} map
 * @param {'walk'|'fly'|'giant'} [travel]
 * @returns {{ x: number, y: number, hitX: boolean, hitY: boolean }}
 */
export function moveBox(map, x, y, r, dx, dy, travel = 'walk') {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / (r * 0.9)));
  const sx = dx / steps;
  const sy = dy / steps;
  let hitX = false;
  let hitY = false;
  for (let i = 0; i < steps; i++) {
    if (!hitX && sx !== 0) {
      if (boxBlocked(map, x + sx, y, r, travel)) {
        x = snapToWall(map, x, sx, r);
        hitX = true;
      } else {
        x += sx;
      }
    }
    if (!hitY && sy !== 0) {
      if (boxBlocked(map, x, y + sy, r, travel)) {
        y = snapToWall(map, y, sy, r);
        hitY = true;
      } else {
        y += sy;
      }
    }
  }
  return { x, y, hitX, hitY };
}

/** Puts the box edge exactly against the tile boundary it was moving toward. */
function snapToWall(map, pos, delta, r) {
  const ts = map.tileSize;
  // Never move backwards: if already touching, stay put.
  if (delta > 0) {
    const edge = Math.floor((pos + r + delta) / ts) * ts;
    return Math.max(pos, edge - r);
  }
  const edge = (Math.floor((pos - r + delta) / ts) + 1) * ts;
  return Math.min(pos, edge + r);
}
