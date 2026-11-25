// Draws one room: floor/cliffs/water/doors as a Phaser tilemap, rocks, the
// campfire and the Salesman as y-sorted sprites (so the player can stand behind
// or in front of them), and the icons above open doors. Built again for every
// room: call destroy() before building the next one.
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
    this.scene = scene;
    this.map = map;
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

    /** Everything else this view created, destroyed with it. */
    this.objects = [];
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if (tileAt(map, x, y) !== TILE.ROCK) continue;
        const bottom = (y + 1) * ts;
        this.objects.push(scene.add.image((x + 0.5) * ts, bottom, 'rock').setOrigin(0.5, 1).setDepth(bottom));
      }
    }

    const fire = map.markers.campfire;
    if (fire) {
      const glow = scene.add.circle(fire.x, fire.y, 34, 0xff8a2a, 0.16).setDepth(DEPTH.GROUND_FX).setBlendMode('ADD');
      const sprite = scene.add.sprite(fire.x, fire.y + 6, 'campfire', '0').setOrigin(0.5, 1).setDepth(fire.y + 6);
      this.objects.push(glow, sprite);
      this.fireTimer = scene.time.addEvent({
        delay: 140, loop: true, callback: () => sprite.setFrame(sprite.frame.name === '0' ? '1' : '0'),
      });
      scene.tweens.add({ targets: glow, alpha: 0.24, scale: 1.08, yoyo: true, repeat: -1, duration: 420 });
    }

    const salesman = map.markers.salesman;
    if (salesman) {
      const shadow = scene.add.image(salesman.x, salesman.y + 6, 'shadow').setDepth(DEPTH.SHADOW).setScale(1.4, 1.2);
      const sprite = scene.add.image(salesman.x, salesman.y + 7, 'salesman').setOrigin(0.5, 1).setDepth(salesman.y + 7);
      scene.tweens.add({ targets: sprite, scaleY: 0.94, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.easeInOut' });
      this.objects.push(shadow, sprite);
    }
    this.doorIcons = [];
  }

  /**
   * Redraws door tiles (after they open) and shows what is behind each door.
   * @param {import('../../shared/sim/systems/rooms.js').Door[]} doors
   * @param {boolean} reveal - config.rooms.revealDoorTypes
   */
  openDoors(doors, reveal) {
    const ts = this.map.tileSize;
    for (const door of doors) {
      for (const t of door.tiles) this.layer.putTileAt(artIndexFor(this.map, t.tx, t.ty), t.tx, t.ty);
      if (this.doorIcons.some((i) => i.door === door)) continue;
      const cx = (door.tiles.reduce((s, t) => s + t.tx, 0) / door.tiles.length + 0.5) * ts;
      const cy = (door.tiles.reduce((s, t) => s + t.ty, 0) / door.tiles.length + 0.5) * ts;
      const inward = { N: [0, 1.4], S: [0, -1.6], W: [1.4, -0.4], E: [-1.4, -0.4] }[door.side];
      const key = reveal ? `door-${door.dest}` : 'door-hidden';
      const icon = this.scene.add.image(cx + inward[0] * ts, cy + inward[1] * ts, key).setDepth(DEPTH.FX).setScale(0);
      this.scene.tweens.add({ targets: icon, scale: 1, duration: 260, ease: 'Back.easeOut' });
      this.scene.tweens.add({ targets: icon, y: icon.y - 2, yoyo: true, repeat: -1, duration: 500, delay: 260 });
      this.doorIcons.push({ door, icon });
    }
  }

  /** Removes everything this view drew. */
  destroy() {
    this.fireTimer?.remove();
    for (const o of [...this.objects, ...this.doorIcons.map((i) => i.icon)]) {
      this.scene.tweens.killTweensOf(o);
      o.destroy();
    }
    this.layer.destroy();
    this.tilemap.destroy();
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
    case TILE.DOOR_LOCKED:
      return TILE_ART.DOOR_LOCKED;
    case TILE.DOOR_OPEN:
      return TILE_ART.DOOR_OPEN;
    case TILE.ROCK:
    case TILE.CAMPFIRE:
      return TILE_ART.SAND_0; // drawn as a y-sorted sprite on top
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
