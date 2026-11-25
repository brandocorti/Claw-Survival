// Draws coins and hearts lying around, from pooled sprites.
export class PickupViews {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
  }

  /**
   * @param {import('../../shared/sim/entities/pickup.js').Pickup[]} pickups
   * @param {number} alpha
   * @param {number} time
   */
  sync(pickups, alpha, time) {
    pickups.forEach((p, i) => {
      const sprite = (this.pool[i] ??= this.scene.add.sprite(0, 0, 'coin', '0'));
      const x = Math.round(p.prevX + (p.x - p.prevX) * alpha);
      const y = p.prevY + (p.y - p.prevY) * alpha;
      const bob = p.targetId ? 0 : Math.round(Math.sin(time * 4 + p.id) * 1.5);
      if (p.kind === 'coin') sprite.setTexture('coin', String(Math.floor(time * 6 + p.id) % 4));
      else sprite.setTexture('heart', 'full');
      sprite.setVisible(true).setPosition(x, Math.round(y) - 4 + bob).setDepth(y);
    });
    for (let i = pickups.length; i < this.pool.length; i++) this.pool[i].setVisible(false);
  }
}
