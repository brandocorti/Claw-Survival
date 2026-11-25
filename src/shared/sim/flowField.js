// Flow field: for every walkable tile, how many steps it is to the nearest player.
// Walking enemies follow it downhill, so they go around ponds and rocks instead
// of getting stuck. One breadth-first search per update, ~2000 tiles: very cheap.
import { tileBlocks } from './map.js';

const UNREACHABLE = 0xffff;
const NEIGHBORS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

export class FlowField {
  /** @param {import('./map.js').ArenaMap} map */
  constructor(map) {
    this.map = map;
    this.dist = new Uint16Array(map.width * map.height);
    this.queue = new Int32Array(map.width * map.height);
    this.sourceKey = '';
  }

  /**
   * Recomputes distances from the given positions (players). Skips the work if
   * none of them changed tile since the last call.
   * @param {{ x: number, y: number }[]} sources - world pixels
   */
  update(sources) {
    const { map } = this;
    const ts = map.tileSize;
    const tiles = sources.map((s) => [Math.floor(s.x / ts), Math.floor(s.y / ts)]);
    const key = tiles.map((t) => t.join(',')).join(';');
    if (key === this.sourceKey) return;
    this.sourceKey = key;

    const { dist, queue } = this;
    dist.fill(UNREACHABLE);
    let head = 0;
    let tail = 0;
    for (const [tx, ty] of tiles) {
      const i = ty * map.width + tx;
      if (dist[i] === 0) continue;
      dist[i] = 0;
      queue[tail++] = i;
    }
    while (head < tail) {
      const i = queue[head++];
      const x = i % map.width;
      const y = (i - x) / map.width;
      const d = dist[i] + 1;
      for (const [dx, dy] of NEIGHBORS) {
        const nx = x + dx;
        const ny = y + dy;
        if (tileBlocks(map, nx, ny)) continue;
        // No cutting corners diagonally past a wall.
        if (dx !== 0 && dy !== 0 && (tileBlocks(map, x + dx, y) || tileBlocks(map, x, y + dy))) continue;
        const ni = ny * map.width + nx;
        if (dist[ni] <= d) continue;
        dist[ni] = d;
        queue[tail++] = ni;
      }
    }
  }

  /** Forces a recompute on the next update (the map changed). */
  invalidate() {
    this.sourceKey = '';
  }

  /**
   * Direction (unit vector) a walker at (x, y) should move to get closer to a player,
   * or null if it is already in a player's tile or no path exists.
   * @returns {{ x: number, y: number } | null}
   */
  directionFrom(x, y) {
    const { map, dist } = this;
    const ts = map.tileSize;
    const tx = Math.floor(x / ts);
    const ty = Math.floor(y / ts);
    if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return null;
    const here = dist[ty * map.width + tx];
    if (here === 0 || here === UNREACHABLE) return null;

    let best = here;
    let bx = 0;
    let by = 0;
    for (const [dx, dy] of NEIGHBORS) {
      const nx = tx + dx;
      const ny = ty + dy;
      if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue;
      if (dx !== 0 && dy !== 0 && (tileBlocks(map, tx + dx, ty) || tileBlocks(map, tx, ty + dy))) continue;
      const d = dist[ny * map.width + nx];
      if (d < best) {
        best = d;
        bx = nx;
        by = ny;
      }
    }
    if (best === here) return null;
    const ax = (bx + 0.5) * ts - x;
    const ay = (by + 0.5) * ts - y;
    const len = Math.hypot(ax, ay) || 1;
    return { x: ax / len, y: ay / len };
  }

  /** Steps from a tile to the nearest player (UNREACHABLE = 65535). */
  stepsAt(x, y) {
    const ts = this.map.tileSize;
    const tx = Math.floor(x / ts);
    const ty = Math.floor(y / ts);
    if (tx < 0 || ty < 0 || tx >= this.map.width || ty >= this.map.height) return UNREACHABLE;
    return this.dist[ty * this.map.width + tx];
  }
}
