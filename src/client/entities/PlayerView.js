// Draws one player: shadow, body (facing the aim), slingshot in hand. Flashes when hurt,
// flickers while invulnerable after a hit, lies down when dead.
import { DEPTH } from '../systems/depth.js';
import { GFX } from '../gfx/flags.js';
import { createHeroTextures } from '../gfx/hero.js';

const WALK_FPS = 8;
const HURT_FLASH_SECONDS = 0.12;
/** Ring under the feet. One color per player in multiplayer; never purple (curses). */
const RING_COLOR = 0x4de1ff;

export class PlayerView {
  /**
   * @param {Phaser.Scene} scene
   * @param {{ handHeight: number, roll: { duration: number } }} playerCfg
   */
  constructor(scene, playerCfg) {
    this.cfg = playerCfg;
    this.shadow = scene.add.image(0, 0, 'shadow').setDepth(DEPTH.SHADOW);
    this.scene = scene;
    if (GFX.hud) {
      // Player marker ring: keeps the hero readable inside a horde (and colours players in multiplayer)
      this.ring = scene.add.ellipse(0, 0, 18, 8).setStrokeStyle(1, RING_COLOR, 0.9).setDepth(DEPTH.SHADOW + 1);
      this.dust = scene.add.particles(0, 0, 'px', {
        speed: { min: 4, max: 14 }, lifespan: 300, scale: { start: 0.8, end: 0 }, alpha: { start: 0.8, end: 0 },
        tint: [0xf6dfa8, 0xd4ad6a], gravityY: -10, emitting: false,
      }).setDepth(DEPTH.GROUND_FX);
      this.lastStep = 0;
    }
    if (GFX.hero) createHeroTextures(scene);
    this.body = GFX.hero ? scene.add.sprite(0, 0, 'hero', 'down_idle0') : scene.add.sprite(0, 0, 'castaway', 'down_0');
    this.weapon = GFX.hero ? scene.add.sprite(0, 0, 'sling2', 'rest').setOrigin(0.2, 0.5) : scene.add.image(0, 0, 'slingshot').setOrigin(0.2, 0.5);
    this.shotT = 9;
    this.idleClock = 0;
    this.walkClock = 0;
  }

  /**
   * @param {import('../../shared/sim/entities/player.js').Player} p
   * @param {number} alpha - interpolation between the previous and current tick
   * @param {number} dtSeconds - frame time, for animation
   * @param {number} time - world time, for blinking
   */
  update(p, alpha, dtSeconds, time) {
    const x = p.prevX + (p.x - p.prevX) * alpha;
    const y = p.prevY + (p.y - p.prevY) * alpha;
    const rx = Math.round(x);
    const ry = Math.round(y);
    const c = Math.cos(p.aim);
    const s = Math.sin(p.aim);

    this.shadow.setPosition(rx, ry + 3);
    this.ring?.setPosition(rx, ry + 3).setVisible(p.alive).setStrokeStyle(1, RING_COLOR, 0.55 + 0.35 * Math.sin(time * 5));

    if (!p.alive) {
      if (GFX.hero) this.body.setTexture('hero', 'down_hurt');
      else this.body.setFrame('down_0');
      this.body.setOrigin(0.5, 0.5).setPosition(rx, ry).setRotation(Math.PI / 2).setAlpha(0.8).setScale(1);
      this.body.setTint(0x9a8a8a).setDepth(y);
      this.weapon.setVisible(false);
      return;
    }

    // Facing: up / down / side, from the aim direction.
    let dir = 'down';
    if (s < -0.65) dir = 'up';
    else if (Math.abs(c) > 0.75) dir = 'side';

    this.walkClock = p.moving ? this.walkClock + dtSeconds : 0;
    const step = Math.floor(this.walkClock * WALK_FPS) % 2;
    if (GFX.hero) {
      this.idleClock += dtSeconds;
      const sinceHitH = time - p.lastHitTime;
      let frame;
      if (sinceHitH < 0.35) frame = `${dir}_hurt`;
      else if (p.moving) frame = `${dir}_walk${Math.floor(this.walkClock * 10) % 4}`;
      else if (this.idleClock % 3.2 > 3.05) frame = dir === 'up' ? `${dir}_idle0` : `${dir}_blink`;
      else frame = `${dir}_idle${Math.floor(this.idleClock * 2) % 2}`;
      this.body.setTexture('hero', frame);
      this.shotT += dtSeconds;
      this.weapon.setFrame(this.shotT < 0.06 ? 'pull' : 'rest');
    } else {
      this.body.setFrame(`${dir}_${step}`);
    }
    this.body.setFlipX(dir === 'side' && c < 0).setDepth(y);

    // Hurt: red flash, then blink while invulnerable (not during a roll: the spin shows it).
    const sinceHit = time - p.lastHitTime;
    if (sinceHit < HURT_FLASH_SECONDS) this.body.setTintFill(GFX.hero ? 0xffffff : 0xff4040);
    else this.body.clearTint();
    const blinking = p.invulnerableTime > 0 && !p.rolling && sinceHit < 2;
    if (GFX.hero) {
      // i-frames: flicker a light tint instead of going transparent (stays readable)
      this.body.setAlpha(1);
      if (blinking && sinceHit >= HURT_FLASH_SECONDS && Math.floor(time * 16) % 2 === 0) this.body.setTint(0xffb0a0);
    } else this.body.setAlpha(blinking && Math.floor(time * 16) % 2 === 0 ? 0.35 : 1);

    if (p.rolling) {
      // Spin and squash while rolling; the weapon is put away.
      const t = 1 - p.rollTime / this.cfg.roll.duration;
      const spin = (p.rollDirX < 0 ? -1 : 1) * t * Math.PI * 2;
      if (GFX.hero) {
        // real tuck-and-roll frames instead of spinning the standing sprite
        const k = Math.floor(t * 8) % 4;
        this.body.setTexture('heroRoll', String(p.rollDirX < 0 ? (4 - k) % 4 : k)).setOrigin(0.5, 1).setPosition(rx, ry + 4 - Math.round(Math.sin(t * Math.PI) * 4)).setRotation(0).setScale(1);
      } else this.body.setOrigin(0.5, 0.5).setPosition(rx, ry - 4).setRotation(spin).setScale(1, 0.85);
      this.weapon.setVisible(false);
    } else {
      this.body.setOrigin(0.5, 1).setPosition(rx, ry + 4).setRotation(0).setScale(1, 1);
      if (GFX.hud && GFX.hero) {
        // The new walk frames already bounce; only the dust is added.
        if (p.moving && step !== this.lastStep) this.dust.explode(2, rx, ry + 3);
        this.lastStep = step;
      } else if (GFX.hud) {
        // Walk bounce, idle breathing, lean into movement, dust on each step
        const bounce = p.moving && step === 1 ? -1 : 0;
        const breathe = p.moving ? 1 : 1 + Math.sin(time * 4) * 0.04;
        const lean = p.moving ? (p.x - p.prevX > 0.05 ? 0.07 : p.x - p.prevX < -0.05 ? -0.07 : 0) : 0;
        this.body.setPosition(rx, ry + 4 + bounce).setScale(p.moving && step === 1 ? 1.06 : 1, (p.moving && step === 1 ? 0.94 : 1) * (2 - breathe)).setRotation(lean);
        if (p.moving && step !== this.lastStep) this.dust.explode(2, rx, ry + 3);
        this.lastStep = step;
      }
      // Hand position, slightly toward the aim side; weapon behind the body when aiming up.
      this.weapon
        .setVisible(true)
        .setPosition(Math.round(x + c * (GFX.hero ? (this.shotT < 0.06 ? 2 : 4) : 3)), Math.round(y - this.cfg.handHeight + (GFX.hero ? 0 : 1)))
        .setRotation(p.aim)
        .setFlipY(c < 0)
        .setDepth(dir === 'up' ? y - 0.1 : y + 0.1);
    }
  }

  /** Slingshot kick: band pulled for a moment, hand recoils. */
  onShot() {
    this.shotT = 0;
  }

  destroy() {
    this.shadow.destroy();
    this.ring?.destroy();
    this.dust?.destroy();
    this.body.destroy();
    this.weapon.destroy();
  }
}
