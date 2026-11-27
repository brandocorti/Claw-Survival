// Small map in the bottom right corner, one pixel per tile: terrain, you (white),
// the salesman (blinking gold), bosses (big red) and other enemies (small red).
import { TILE } from '../../shared/content/tiles.js';
import { PALETTE as P, hexToInt } from '../art/palette.js';
import { DEPTH } from '../systems/depth.js';
import { settings } from '../settings.js';

const TERRAIN = {
  [TILE.SAND]: '#b89a66', [TILE.CLIFF]: '#2c4a2c', [TILE.ROCK]: '#7d715f', [TILE.WATER]: '#1f7f80',
};
const KEY = 'minimap';

export class Minimap {
  /**
   * @param {Phaser.Scene} scene
   * @param {import('../../shared/sim/map.js').ArenaMap} map
   * @param {{ width: number, height: number }} display
   */
  constructor(scene, map, display) {
    this.map = map;
    this.x = display.width - map.width - 5;
    this.y = display.height - map.height - 5;
    if (!scene.textures.exists(KEY)) {
      const tex = scene.textures.createCanvas(KEY, map.width, map.height);
      const ctx = tex.getContext();
      map.tiles.forEach((t, i) => {
        ctx.fillStyle = TERRAIN[t] ?? '#000000';
        ctx.fillRect(i % map.width, Math.floor(i / map.width), 1, 1);
      });
      tex.refresh();
    }
    const fixed = (obj) => obj.setScrollFactor(0).setDepth(DEPTH.HUD);
    this.frame = fixed(scene.add.rectangle(this.x - 1, this.y - 1, map.width + 2, map.height + 2, hexToInt(P.outline)).setOrigin(0));
    this.image = fixed(scene.add.image(this.x, this.y, KEY).setOrigin(0).setAlpha(0.9));
    this.dots = fixed(scene.add.graphics());
  }

  /**
   * @param {object} world
   * @param {{ x: number, y: number, alive: boolean }} player
   * @param {boolean} vendorOpen
   * @param {number} time
   */
  update(world, player, vendorOpen, time) {
    for (const obj of [this.frame, this.image, this.dots]) obj.setVisible(settings.minimap);
    if (!settings.minimap) return;
    const g = this.dots;
    const ts = this.map.tileSize;
    const dot = (at, size, color) => {
      const half = Math.floor(size / 2);
      const x = Math.max(0, Math.min(this.map.width - size, Math.floor(at.x / ts) - half));
      const y = Math.max(0, Math.min(this.map.height - size, Math.floor(at.y / ts) - half));
      g.fillStyle(color).fillRect(this.x + x, this.y + y, size, size);
    };
    g.clear();
    for (const e of world.enemies) if (e.spawnDelay <= 0) dot(e, e.boss ? 3 : 1, hexToInt(P.enemyShot));
    if (vendorOpen) {
      dot(this.map.vendor, 5, hexToInt(P.outline));
      dot(this.map.vendor, 3, hexToInt(Math.floor(time * 3) % 2 === 0 ? '#ffd23a' : P.shotCore));
    }
    if (player.alive) dot(player, 2, 0xffffff);
  }
}
