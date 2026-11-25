// Where the set dressing stands (palms, shipwreck, crates, barrels). Decided here, not in
// the client, because wreck, crates, barrels and palm trunks block movement. The picture of
// each prop is in src/client/gfx/props.js.
import { TILE } from '../content/tiles.js';
import { hash2 } from './hash.js';

/** Half size (px) of the part of each prop that blocks walking, measured from its foot. */
const SOLID = {
  wreck: { halfW: 36, height: 14 },
  crate: { halfW: 6, height: 8 },
  barrel: { halfW: 5, height: 7 },
  palm: { halfW: 3, height: 6 },
};

/** Tall props stay out of this many tiles around the spawn, where the boss duel usually starts. */
const CLEAR_X = 8;
const CLEAR_Y = 6;

/**
 * @typedef {{ kind: 'wreck'|'crate'|'barrel'|'palm', x: number, y: number, flip: boolean }} Prop
 *   x, y: center and foot of the prop in world pixels
 */

/**
 * Places the props of an arena. Always the same for the same map.
 * @param {import('./map.js').ArenaMap} map
 * @param {(tx: number, ty: number) => number} tile - tile type at a coordinate
 * @returns {Prop[]}
 */
export function layoutProps(map, tile) {
  const ts = map.tileSize;
  const sand = (x, y) => tile(x, y) === TILE.SAND;
  const near = (x, y, type, r) => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (tile(x + dx, y + dy) === type) return true;
    return false;
  };
  const sx = Math.floor(map.spawn.x / ts);
  const sy = Math.floor(map.spawn.y / ts);
  const props = [];
  const add = (kind, x, y, flip = false) => props.push({ kind, x, y, flip });
  const vendorClose = (x, y) => map.vendor && Math.abs(x - map.vendor.x) < 40 && Math.abs(y - map.vendor.y) < 34;

  // The castaways' boat, beside the spawn, with its cargo.
  const wx = (sx - 11) * ts;
  const wy = (sy + 2) * ts + 8;
  add('wreck', wx, wy);
  for (const [ox, oy, kind] of [[-46, 6, 'crate'], [-34, 10, 'barrel'], [30, 16, 'crate']]) add(kind, wx + ox, wy + oy);

  // Palms near cliffs, rarely near water, far apart.
  const palms = [];
  for (let y = 2; y < map.height - 2; y++) {
    for (let x = 2; x < map.width - 2; x++) {
      if (!sand(x, y) || !sand(x, y - 1) || near(x, y, TILE.ROCK, 1)) continue;
      const byCliff = near(x, y, TILE.CLIFF, 2);
      if (!byCliff && !near(x, y, TILE.WATER, 2)) continue;
      if (Math.abs(x - sx) < CLEAR_X && Math.abs(y - sy) < CLEAR_Y) continue;
      if (Math.abs(x - (sx - 11)) < 5 && Math.abs(y - (sy + 2)) < 4) continue;
      if (vendorClose((x + 0.5) * ts, (y + 0.8) * ts)) continue;
      if (!byCliff && hash2(x, y, 78) > 0.35) continue;
      if (hash2(x, y, 77) > 0.25) continue;
      if (palms.some((p) => Math.abs(p.x - x) + Math.abs(p.y - y) < 10)) continue;
      palms.push({ x, y });
    }
  }
  for (const p of palms) {
    add('palm', (p.x + 0.5) * ts + Math.round((hash2(p.x, p.y, 1) - 0.5) * 8), Math.round((p.y + 0.8) * ts), hash2(p.x, p.y, 2) < 0.5);
  }

  // A few crates and barrels lying around.
  for (let y = 1; y < map.height - 1; y++) {
    for (let x = 1; x < map.width - 1; x++) {
      if (!sand(x, y) || hash2(x, y, 300) <= 0.985 || (x === sx && y === sy)) continue;
      const kind = ['', '', 'crate', 'barrel'][Math.floor(hash2(x, y, 305) * 4)];
      const px = x * ts + Math.floor(hash2(x, y, 301) * 12) + 2;
      const py = y * ts + Math.floor(hash2(x, y, 302) * 12) + 4;
      if (kind && !vendorClose(px, py)) add(kind, px, py);
    }
  }
  return props;
}

/**
 * The rectangle a prop blocks.
 * @param {Prop} prop
 * @returns {{ x0: number, y0: number, x1: number, y1: number }}
 */
export function propSolid(prop) {
  const { halfW, height } = SOLID[prop.kind];
  return { x0: prop.x - halfW, x1: prop.x + halfW, y0: prop.y - height, y1: prop.y };
}
