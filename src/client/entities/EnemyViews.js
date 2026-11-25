// Draws all enemies from pooled sprites: shadow, body (2-frame wobble),
// spawn swirl while appearing, white flash when hit, yellow blink while
// winding up an attack (so every attack is readable before it lands).
import { DEPTH } from '../systems/depth.js';
import { GFX } from '../gfx/flags.js';
import { EmperorView } from '../gfx/boss.js';

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
        view = this.acquire(e.type);
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
    if (view.emperor) {
      const p = this.scene.transport.getLocalPlayer();
      const dt = view.lastTime != null ? Math.max(0, time - view.lastTime) : 0;
      view.lastTime = time;
      view.emperor.update(e, x, y, time, p && p.alive ? p : null, dt);
      return;
    }
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

    if (GFX.juice) {
      // Squash on hit, pop in after spawning, idle breathing
      const sinceHit = time - e.lastHitTime;
      let sx = 1;
      let sy = 1;
      if (sinceHit < 0.14) { const k = 1 - sinceHit / 0.14; sx += 0.3 * k; sy -= 0.25 * k; }
      else if (e.spawnDelay <= 0 && view.wasSpawning) view.popT = 0.18;
      view.wasSpawning = e.spawnDelay > 0;
      if (view.popT > 0) { view.popT -= this.scene.game.loop.delta / 1000; const k = view.popT / 0.18; sx -= 0.2 * k; sy += 0.35 * k; }
      if (e.type !== 'coconut') sy += Math.sin(time * 5 + e.id) * 0.04;
      sprite.setScale(sx, sy);
    }
    if (time - e.lastHitTime < HIT_FLASH_SECONDS) sprite.setTintFill(0xffffff);
    else if (e.telegraph && Math.floor(time * 14) % 2 === 0) sprite.setTintFill(TELEGRAPH_TINT);
    else sprite.clearTint();
  }

  acquire(type) {
    const pool = this.pools.get(type) ?? [];
    this.pools.set(type, pool);
    const view = pool.pop() ?? this.create(type);
    if (GFX.boss && type === 'crabEmperor') {
      view.emperor ??= new EmperorView(this.scene, this.scene.config.enemies.crabEmperor);
      view.emperor.reset();
      view.emperor.setVisible(true);
      view.sprite.setVisible(false);
      view.shadow.setVisible(false);
      view.lastTime = null;
      return view;
    }
    view.sprite.setVisible(true).clearTint().setRotation(0).setFlipX(false);
    view.shadow.setVisible(true);
    view.spin = 0;
    view.popT = 0;
    view.wasSpawning = false;
    return view;
  }

  create(type) {
    const key = `enemy-${type}`;
    const sprite = this.scene.add.sprite(0, 0, key, '0').setOrigin(0.5, 1);
    const frames = this.scene.textures.get(key).getFrameNames().length;
    const scale = sprite.width / 12;
    const shadow = this.scene.add.image(0, 0, 'shadow').setDepth(DEPTH.SHADOW).setScale(scale, Math.max(1, scale * 0.8));
    const mark = this.scene.add.image(0, 0, 'spawnMark').setDepth(DEPTH.SHADOW + 1).setScale(Math.max(1, scale * 0.8));
    return { type, sprite, shadow, mark, frames, spin: 0 };
  }

  release(view) {
    view.emperor?.setVisible(false);
    view.sprite.setVisible(false);
    view.shadow.setVisible(false);
    view.mark.setVisible(false);
    this.pools.get(view.type).push(view);
  }
}
