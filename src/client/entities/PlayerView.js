// Draws one player: shadow, chibi body (facing the aim), slingshot in hand.
// Blinks while invulnerable after a hit, flashes red when hurt, lies down when dead.
import { DEPTH } from '../systems/depth.js';

const WALK_FPS = 8;
const HURT_FLASH_SECONDS = 0.12;

export class PlayerView {
  /**
   * @param {Phaser.Scene} scene
   * @param {{ handHeight: number, roll: { duration: number } }} playerCfg
   */
  constructor(scene, playerCfg) {
    this.cfg = playerCfg;
    this.shadow = scene.add.image(0, 0, 'shadow').setDepth(DEPTH.SHADOW);
    this.body = scene.add.sprite(0, 0, 'castaway', 'down_0');
    this.weapon = scene.add.image(0, 0, 'slingshot').setOrigin(0.2, 0.5);
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

    if (!p.alive) {
      this.body.setFrame('down_0').setOrigin(0.5, 0.5).setPosition(rx, ry).setRotation(Math.PI / 2).setAlpha(0.8);
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
    this.body.setFrame(`${dir}_${step}`).setFlipX(dir === 'side' && c < 0).setDepth(y);

    // Hurt: red flash, then blink while invulnerable (not during a roll: the spin shows it).
    const sinceHit = time - p.lastHitTime;
    if (sinceHit < HURT_FLASH_SECONDS) this.body.setTintFill(0xff4040);
    else this.body.clearTint();
    const blinking = p.invulnerableTime > 0 && !p.rolling && sinceHit < 2;
    this.body.setAlpha(blinking && Math.floor(time * 16) % 2 === 0 ? 0.35 : 1);

    if (p.rolling) {
      // Spin and squash while rolling; the weapon is put away.
      const t = 1 - p.rollTime / this.cfg.roll.duration;
      const spin = (p.rollDirX < 0 ? -1 : 1) * t * Math.PI * 2;
      this.body.setOrigin(0.5, 0.5).setPosition(rx, ry - 4).setRotation(spin).setScale(1, 0.85);
      this.weapon.setVisible(false);
    } else {
      this.body.setOrigin(0.5, 1).setPosition(rx, ry + 4).setRotation(0).setScale(1, 1);
      // Hand position, slightly toward the aim side; weapon behind the body when aiming up.
      this.weapon
        .setVisible(true)
        .setPosition(Math.round(x + c * 3), Math.round(y - this.cfg.handHeight + 1))
        .setRotation(p.aim)
        .setFlipY(c < 0)
        .setDepth(dir === 'up' ? y - 0.1 : y + 0.1);
    }
  }

  destroy() {
    this.shadow.destroy();
    this.body.destroy();
    this.weapon.destroy();
  }
}
