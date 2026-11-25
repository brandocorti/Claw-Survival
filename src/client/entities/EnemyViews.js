// Draws all enemies from pooled sprites: shadow, body (2-frame wobble),
// spawn swirl while appearing, white flash when hit, yellow blink while
// winding up an attack (so every attack is readable before it lands).
// Elites use the gold-outlined texture (`enemy-<type>-elite`).
import { DEPTH } from '../systems/depth.js';

const HIT_FLASH_SECONDS = 0.07;
const TELEGRAPH_TINT = 0xffe066;
const FLYING_HEIGHT = 7;

export class EnemyViews {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    this.scene = scene;
    /** @type {Map<number, object>} */
    this.active = new Map();
    /** @type {Map<string, object[]>} pools by enemy type */
    this.pools = new Map();
    this.seen = new Set();
  }

  /**
   * @param {import('../../shared/sim/entities/enemy.js').Enemy[]} enemies
   * @param {number} alpha - interpolation between ticks
   * @param {number} time - world time, seconds
   */
  sync(enemies, alpha, time) {
    this.seen.clear();
    for (const e of enemies) {
      if (e.dead) continue;
      this.seen.add(e.id);
      let view = this.active.get(e.id);
      if (!view) {
        view = this.acquire(e.elite ? `${e.type}-elite` : e.type);
        this.active.set(e.id, view);
      }
      this.draw(view, e, alpha, time);
    }
    for (const [id, view] of this.active) {
      if (this.seen.has(id)) continue;
      this.release(view);
      this.active.delete(id);
    }
  }

  /** Screen position of an enemy's body center (for the target marker). */
  bodyCenter(e, alpha) {
    const x = e.prevX + (e.x - e.prevX) * alpha;
    const y = e.prevY + (e.y - e.prevY) * alpha;
    const h = this.scene.textures.getFrame(`enemy-${e.type}`, '0').height;
    return { x: Math.round(x), y: Math.round(y + e.radius * 0.6 - h / 2 - (e.flying ? FLYING_HEIGHT : 0)) };
  }

  draw(view, e, alpha, time) {
    const x = e.prevX + (e.x - e.prevX) * alpha;
    const y = e.prevY + (e.y - e.prevY) * alpha;
    const rx = Math.round(x);
    const ry = Math.round(y);
    const { sprite, shadow, mark } = view;

    shadow.setPosition(rx, ry + 2);
    const bob = e.flying ? FLYING_HEIGHT + Math.round(Math.sin(time * 3 + e.id) * 2) : 0;
    sprite.setPosition(rx, Math.round(y + e.radius * 0.6) - bob).setDepth(y);

    // Appearing: sand swirl on the ground, body fades in.
    if (e.spawnDelay > 0) {
      const t = 1 - e.spawnDelay / e.spawnDuration;
      mark.setVisible(true).setPosition(rx, ry + 2).setAlpha(0.5 + 0.5 * Math.sin(time * 20));
      sprite.setAlpha(t * 0.6);
      shadow.setAlpha(t);
    } else {
      mark.setVisible(false);
      sprite.setAlpha(1);
      shadow.setAlpha(1);
    }

    // Animation: coconuts spin with their movement, others alternate two frames.
    if (e.type === 'coconut') {
      view.spin += (e.x - e.prevX) / e.radius;
      sprite.setRotation(view.spin);
      sprite.setY(ry - 1).setOrigin(0.5, 0.5);
    } else if (view.frames > 1) {
      sprite.setFrame(String(Math.floor(time * 6 + e.id * 0.37) % view.frames));
    }
    if (e.vx < -1) sprite.setFlipX(true);
    else if (e.vx > 1) sprite.setFlipX(false);

    if (time - e.lastHitTime < HIT_FLASH_SECONDS) sprite.setTintFill(0xffffff);
    else if (e.telegraph && Math.floor(time * 14) % 2 === 0) sprite.setTintFill(TELEGRAPH_TINT);
    else sprite.clearTint();
  }

  acquire(type) {
    const pool = this.pools.get(type) ?? [];
    this.pools.set(type, pool);
    const view = pool.pop() ?? this.create(type);
    view.sprite.setVisible(true).clearTint().setRotation(0).setFlipX(false);
    view.shadow.setVisible(true);
    view.spin = 0;
    return view;
  }

  create(type) {
    const key = `enemy-${type}`;
    const elite = type.endsWith('-elite');
    const sprite = this.scene.add.sprite(0, 0, key, '0');
    // Elite textures have one extra pixel all round: keep the feet where the normal sprite has them.
    sprite.setOrigin(0.5, elite ? 1 - 1 / sprite.height : 1);
    const frames = this.scene.textures.get(key).getFrameNames().length;
    const scale = (sprite.width - (elite ? 2 : 0)) / 12;
    const shadow = this.scene.add.image(0, 0, 'shadow').setDepth(DEPTH.SHADOW).setScale(scale, Math.max(1, scale * 0.8));
    const mark = this.scene.add.image(0, 0, 'spawnMark').setDepth(DEPTH.SHADOW + 1).setScale(Math.max(1, scale * 0.8));
    return { type, sprite, shadow, mark, frames, spin: 0 };
  }

  release(view) {
    view.sprite.setVisible(false);
    view.shadow.setVisible(false);
    view.mark.setVisible(false);
    this.pools.get(view.type).push(view);
  }
}
