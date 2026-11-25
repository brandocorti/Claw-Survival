// Draws all bullets with reusable sprites (no garbage per shot). Each bullet
// has a ground shadow; the bullet itself is drawn raised. Player shots are
// yellow pebbles, enemy shots are bigger red orbs.
import { DEPTH } from '../systems/depth.js';
import { GFX } from '../gfx/flags.js';
import { addGlow } from '../gfx/lighting.js';

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
      const depth = DEPTH.BULLET + y * 0.1;
      view.sprite.setPosition(x, y - this.height).setDepth(depth);
      view.shadow.setPosition(x, y);
      if (view.glow) view.glow.setPosition(x, y - this.height).setDepth(depth - 0.01);
      if (view.trail) {
        view.hist.unshift([x, y - this.height]);
        if (view.hist.length > 7) view.hist.pop();
        view.trail.forEach((t, k) => {
          const h = view.hist[Math.min(view.hist.length - 1, (k + 1) * 2)];
          t.setVisible(view.hist.length > (k + 1) * 2 - 1).setPosition(h[0], h[1]).setDepth(depth - 0.02);
        });
      }
    }
    for (const [id, view] of this.active) {
      if (this.seen.has(id)) continue;
      view.sprite.setVisible(false);
      view.shadow.setVisible(false);
      view.glow?.setVisible(false);
      view.trail?.forEach((t) => t.setVisible(false));
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
    if (GFX.light && !view.glow) view.glow = addGlow(this.scene, team === 'player' ? 0xffc84a : 0xff3d4a, team === 'player' ? 0.7 : 0.9, team === 'player' ? 0.5 : 0.6);
    if (GFX.juice && !view.trail && team === 'player') {
      view.trail = [0.75, 0.5, 0.25].map((a, k) => this.scene.add.image(0, 0, 'px').setScale(k === 0 ? 1 : 0.5).setTint(k === 0 ? 0xfff7c2 : 0xffb52e).setAlpha(a));
    }
    if (view.hist) view.hist.length = 0; else view.hist = [];
    view.glow?.setVisible(true);
    view.trail?.forEach((t) => t.setVisible(false));
    view.sprite.setVisible(true);
    view.shadow.setVisible(true);
    return view;
  }
}
