// Draws timed buff pickups from pooled sprites; they bob on the sand and blink before despawning.
import { DEPTH } from '../systems/depth.js';

export class PickupViews {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    this.scene = scene;
    this.active = new Map();
    this.pool = [];
    this.seen = new Set();
  }

  /**
   * @param {import('../../shared/sim/entities/pickup.js').Pickup[]} pickups
   * @param {number} alpha
   * @param {number} time - world time
   */
  sync(pickups, alpha, time) {
    this.seen.clear();
    for (const p of pickups) {
      this.seen.add(p.id);
      let view = this.active.get(p.id);
      if (!view) {
        view = this.acquire(p.effectId);
        this.active.set(p.id, view);
      }
      const x = Math.round(p.prevX + (p.x - p.prevX) * alpha);
      const y = Math.round(p.prevY + (p.y - p.prevY) * alpha);
      const bob = Math.round(Math.sin(time * 4 + p.id) * 1.5);
      const blink = p.life < 3 && Math.floor(time * 10) % 2 === 0 ? 0.35 : 1;

      view.shadow.setPosition(x, y + 3).setAlpha(blink);
      view.backdrop.setPosition(x, y - 5 + bob).setDepth(y).setAlpha(blink);
      view.icon.setPosition(x, y - 5 + bob).setDepth(y + 0.1).setAlpha(blink);
    }

    for (const [id, view] of this.active) {
      if (this.seen.has(id)) continue;
      view.shadow.setVisible(false);
      view.backdrop.setVisible(false);
      view.icon.setVisible(false);
      this.pool.push(view);
      this.active.delete(id);
    }
  }

  acquire(effectId) {
    const view = this.pool.pop() ?? {
      shadow: this.scene.add.image(0, 0, 'bulletShadow').setDepth(DEPTH.SHADOW).setScale(3, 1.5),
      backdrop: this.scene.add.image(0, 0, 'pickupBuff'),
      icon: this.scene.add.image(0, 0, `effect-${effectId}`),
    };
    view.icon.setTexture(`effect-${effectId}`);
    view.shadow.setVisible(true);
    view.backdrop.setVisible(true);
    view.icon.setVisible(true);
    return view;
  }
}
