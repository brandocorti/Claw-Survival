// Draws an arena map: floor/cliffs/water as a Phaser tilemap, rocks as
// y-sorted sprites (so the player can stand behind or in front of them).
import { TILE } from '../../shared/content/tiles.js';
import { tileAt } from '../../shared/sim/map.js';
import { TILE_ART } from '../art/tileArt.js';
import { DEPTH } from '../systems/depth.js';

export class MapView {
  /**
   * @param {Phaser.Scene} scene
   * @param {import('../../shared/sim/map.js').ArenaMap} map
   * @param {string} tilesetKey
   */
  constructor(scene, map, tilesetKey) {
    const ts = map.tileSize;
    const data = [];
    for (let y = 0; y < map.height; y++) {
      const row = [];
      for (let x = 0; x < map.width; x++) row.push(artIndexFor(map, x, y));
      data.push(row);
    }

    this.tilemap = scene.make.tilemap({ data, tileWidth: ts, tileHeight: ts });
    const tileset = this.tilemap.addTilesetImage(tilesetKey, tilesetKey, ts, ts, 0, 0);
    this.layer = this.tilemap.createLayer(0, tileset, 0, 0).setDepth(DEPTH.FLOOR);

    /** @type {Map<string, Phaser.GameObjects.Image>} by 'tx,ty' */
    this.rocks = new Map();
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if (tileAt(map, x, y) !== TILE.ROCK) continue;
        const bottom = (y + 1) * ts;
        this.rocks.set(`${x},${y}`, scene.add.image((x + 0.5) * ts, bottom, 'rock').setOrigin(0.5, 1).setDepth(bottom));
      }
    }
  }

  /** Removes rocks crushed by a boss. */
  handle(events) {
    for (const e of events) {
      if (e.type !== 'rockCrushed') continue;
      this.rocks.get(`${e.tx},${e.ty}`)?.destroy();
      this.rocks.delete(`${e.tx},${e.ty}`);
    }
  }
}

/** Picks the tile image: cliff faces where a cliff meets open ground below it, etc. */
function artIndexFor(map, x, y) {
  const type = tileAt(map, x, y);
  switch (type) {
    case TILE.CLIFF:
      return y + 1 < map.height && tileAt(map, x, y + 1) !== TILE.CLIFF ? TILE_ART.CLIFF_FACE : TILE_ART.CLIFF_TOP;
    case TILE.WATER:
      return tileAt(map, x, y - 1) !== TILE.WATER ? TILE_ART.WATER_EDGE : TILE_ART.WATER;
    case TILE.ROCK:
      return TILE_ART.SAND_0; // the rock itself is a y-sorted sprite
    default: {
      // Sand (also under rocks): stable pseudo-random variant per tile
      const h = (x * 73856093) ^ (y * 19349663);
      const r = Math.abs(h) % 20;
      if (r === 0) return TILE_ART.SAND_SHELL;
      if (r < 6) return TILE_ART.SAND_1;
      if (r < 9) return TILE_ART.SAND_2;
      return TILE_ART.SAND_0;
    }
  }
}
