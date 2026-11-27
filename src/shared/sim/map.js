// Arena map: a grid of tile types parsed from an ASCII layout,
// plus collision queries used by movement, bullets, line of sight and spawning.
import { TILE, TILE_CHARS, TILE_RULES } from '../content/tiles.js';
import { layoutProps, propSolid } from './props.js';

/**
 * @typedef {object} ArenaMap
 * @property {string} id
 * @property {number} width - in tiles
 * @property {number} height - in tiles
 * @property {number} tileSize - in pixels
 * @property {Uint8Array} tiles - row-major tile types
 * @property {import('./props.js').Prop[]} props - set dressing (empty unless the arena has `props: true`)
 * @property {Map<number, object[]>} solids - rectangles that block walking, by tile index
 * @property {{ x: number, y: number } | null} vendor - where the salesman stands ('V' tile)
 * @property {{ x: number, y: number }} spawn - world pixels (center of the 'P' tile)
 */

/**
 * Parses an arena definition ({ id, rows }) into a map.
 * Throws if rows differ in length, contain unknown characters, or have no single 'P'.
 * @param {{ id: string, rows: string[], props?: boolean }} arena
 * @param {number} tileSize
 * @returns {ArenaMap}
 */
export function parseArena(arena, tileSize) {
  const height = arena.rows.length;
  const width = arena.rows[0].length;
  const tiles = new Uint8Array(width * height);
  let spawn = null;
  let vendor = null;

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
      if (ch === 'V') vendor = { x: (x + 0.5) * tileSize, y: (y + 0.5) * tileSize };
      if (ch === 'P') {
        if (spawn) throw new Error(`Arena "${arena.id}": more than one 'P' spawn tile`);
        spawn = { x: (x + 0.5) * tileSize, y: (y + 0.5) * tileSize };
      }
    }
  });

  if (!spawn) throw new Error(`Arena "${arena.id}": no 'P' spawn tile`);
  const map = { id: arena.id, width, height, tileSize, tiles, spawn, vendor, props: [], solids: new Map() };
  if (arena.props) {
    map.props = layoutProps(map, (tx, ty) => tileAt(map, tx, ty));
    map.props.forEach((prop) => addSolid(map, propSolid(prop)));
  }
  return map;
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

/** Registers a rectangle under every tile it touches. */
function addSolid(map, box) {
  const ts = map.tileSize;
  for (let ty = Math.floor(box.y0 / ts); ty <= Math.floor(box.y1 / ts); ty++) {
    for (let tx = Math.floor(box.x0 / ts); tx <= Math.floor(box.x1 / ts); tx++) {
      const i = ty * map.width + tx;
      if (!map.solids.has(i)) map.solids.set(i, []);
      map.solids.get(i).push(box);
    }
  }
}

/** True if a walker standing in the middle of this tile would be blocked. */
export function walkBlocks(map, tx, ty) {
  if (tileBlocks(map, tx, ty)) return true;
  if (!map.solids.has(ty * map.width + tx)) return false;
  return boxBlocked(map, (tx + 0.5) * map.tileSize, (ty + 0.5) * map.tileSize, 5);
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
      // Props only stop walkers: spirits float over them and bosses step over them.
      if (travel !== 'walk') continue;
      const boxes = map.solids.get(ty * map.width + tx);
      if (boxes?.some((b) => x - r < b.x1 && x + r > b.x0 && y - r < b.y1 && y + r > b.y0)) return true;
    }
  }
  return false;
}

/**
 * The position itself if you can walk there, otherwise the center of the nearest
 * walkable tile. Keeps drops (e.g. from a spirit over water) reachable.
 * @param {ArenaMap} map
 */
export function openSpotNear(map, x, y) {
  const ts = map.tileSize;
  const tx = Math.floor(x / ts);
  const ty = Math.floor(y / ts);
  if (!walkBlocks(map, tx, ty)) return { x, y };
  let best = { x, y };
  let bestD = Infinity;
  for (let r = 1; r <= 8 && bestD === Infinity; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (walkBlocks(map, tx + dx, ty + dy)) continue;
        const c = { x: (tx + dx + 0.5) * ts, y: (ty + dy + 0.5) * ts };
        const d = Math.hypot(c.x - x, c.y - y);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
    }
  }
  return best;
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
        // Props are not on the tile grid, so there is nothing to snap to: just stop.
        x = wallAhead(map, x, y, sx, 0, r, travel) ? snapToWall(map, x, sx, r) : x;
        hitX = true;
      } else {
        x += sx;
      }
    }
    if (!hitY && sy !== 0) {
      if (boxBlocked(map, x, y + sy, r, travel)) {
        y = wallAhead(map, x, y, 0, sy, r, travel) ? snapToWall(map, y, sy, r) : y;
        hitY = true;
      } else {
        y += sy;
      }
    }
  }
  return { x, y, hitX, hitY };
}

/** True if the box, moved by (dx, dy), would touch a blocking tile (as opposed to a prop). */
function wallAhead(map, x, y, dx, dy, r, travel) {
  const ts = map.tileSize;
  for (const cx of [x + dx - r, x + dx + r - 0.001]) {
    for (const cy of [y + dy - r, y + dy + r - 0.001]) {
      if (tileBlocks(map, Math.floor(cx / ts), Math.floor(cy / ts), travel)) return true;
    }
  }
  return false;
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
