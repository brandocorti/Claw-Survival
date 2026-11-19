// Draws XP gems from a pool of images; they bob gently on the sand.
export class GemViews {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    this.scene = scene;
    this.active = new Map();
    this.pools = new Map();
    this.seen = new Set();
  }

  /**
   * @param {import('../../shared/sim/entities/gem.js').Gem[]} gems
   * @param {number} alpha
   * @param {number} time - world time
   */
  sync(gems, alpha, time) {
    this.seen.clear();
    for (const g of gems) {
      this.seen.add(g.id);
      let view = this.active.get(g.id);
      if (!view) {
        view = this.acquire(g.value);
        this.active.set(g.id, view);
      }
      const x = g.prevX + (g.x - g.prevX) * alpha;
      const y = g.prevY + (g.y - g.prevY) * alpha;
      const bob = g.targetId ? 0 : Math.round(Math.sin(time * 4 + g.id) * 1.2);
      view.image.setPosition(Math.round(x), Math.round(y - 3 + bob)).setDepth(y);
    }
    for (const [id, view] of this.active) {
      if (this.seen.has(id)) continue;
      view.image.setVisible(false);
      this.pools.get(view.value).push(view);
      this.active.delete(id);
    }
  }

  acquire(value) {
    const pool = this.pools.get(value) ?? [];
    this.pools.set(value, pool);
    const view = pool.pop() ?? { value, image: this.scene.add.image(0, 0, `gem${value}`) };
    view.image.setVisible(true);
    return view;
  }
}
