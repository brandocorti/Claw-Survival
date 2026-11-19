// Draws all bullets with reusable sprites (no garbage per shot). Each bullet
// has a ground shadow; the bullet itself is drawn raised. Player shots are
// yellow pebbles, enemy shots are bigger red orbs.
import { DEPTH } from '../systems/depth.js';

const TEXTURE = { player: 'pebble', enemy: 'enemyBullet' };

export class BulletViews {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} height - pixels above the ground the bullets are drawn
   */
  constructor(scene, height) {
    this.scene = scene;
    this.height = height;
    /** @type {Map<number, object>} */
    this.active = new Map();
    this.pools = { player: [], enemy: [] };
    this.seen = new Set();
  }

  /**
   * @param {import('../../shared/sim/entities/bullet.js').Bullet[]} bullets
   * @param {number} alpha
   */
  sync(bullets, alpha) {
    this.seen.clear();
    for (const b of bullets) {
      this.seen.add(b.id);
      let view = this.active.get(b.id);
      if (!view) {
        view = this.acquire(b.team);
        this.active.set(b.id, view);
      }
      const x = Math.round(b.prevX + (b.x - b.prevX) * alpha);
      const y = Math.round(b.prevY + (b.y - b.prevY) * alpha);
      view.sprite.setPosition(x, y - this.height).setDepth(y);
      view.shadow.setPosition(x, y);
    }
    for (const [id, view] of this.active) {
      if (this.seen.has(id)) continue;
      view.sprite.setVisible(false);
      view.shadow.setVisible(false);
      this.pools[view.team].push(view);
      this.active.delete(id);
    }
  }

  acquire(team) {
    const view = this.pools[team].pop() ?? {
      team,
      sprite: this.scene.add.image(0, 0, TEXTURE[team]),
      shadow: this.scene.add.image(0, 0, 'bulletShadow').setDepth(DEPTH.SHADOW),
    };
    view.sprite.setVisible(true);
    view.shadow.setVisible(true);
    return view;
  }
}
