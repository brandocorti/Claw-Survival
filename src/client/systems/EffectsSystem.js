// Turns simulation events into particles, flashes, shockwaves and screen shake.
// Visual only: nothing here changes the game state.
import { DEPTH } from './depth.js';
import { PALETTE as P, hexToInt } from '../art/palette.js';

/** Debris colors per enemy type, for death bursts. */
const DEBRIS = {
  crab: ['#e2553a', '#ff9b70', '#ffffff'],
  coconut: ['#7a4a26', '#a06a3c', '#f2ead8'],
  skeleton: ['#f2ead8', '#c9bfa8', '#2b2420'],
  tiki: ['#b0703a', '#5a9a48', '#ffcf3a'],
  crabKing: ['#e2553a', '#f0c040', '#ffffff'],
  crabEmperor: ['#2f4a5e', '#f0c040', '#ffb52e'],
};

export class EffectsSystem {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} options
   * @param {number} options.shotHeight - player bullets fly this many pixels above the ground
   * @param {string} options.localPlayerId
   * @param {(ms: number, intensity: number) => void} options.shake
   */
  constructor(scene, { shotHeight, localPlayerId, shake }) {
    this.scene = scene;
    this.shotHeight = shotHeight;
    this.localPlayerId = localPlayerId;
    this.shake = shake;
    const ints = (colors) => colors.map(hexToInt);

    const burst = (tints, extra = {}) => scene.add.particles(0, 0, 'px', {
      speed: { min: 30, max: 90 },
      lifespan: { min: 150, max: 320 },
      scale: { start: 1, end: 0 },
      tint: ints(tints),
      emitting: false,
      ...extra,
    }).setDepth(DEPTH.FX);

    this.sparks = burst([P.shotCore, P.shotRim]);
    this.redSparks = burst([P.enemyShot, P.white]);
    this.fire = burst([P.explosion, P.shotRim, P.shotCore], { speed: { min: 40, max: 140 }, lifespan: { min: 200, max: 450 } });
    this.debris = Object.fromEntries(
      Object.entries(DEBRIS).map(([type, colors]) => [
        type,
        burst(colors, { speed: { min: 20, max: 80 }, lifespan: { min: 250, max: 500 }, gravityY: 120 }),
      ]),
    );
    this.rubble = burst([P.rockLight, P.rock, P.rockDeep], { lifespan: { min: 250, max: 550 }, gravityY: 120 });
    this.dust = scene.add.particles(0, 0, 'px', {
      speed: { min: 8, max: 35 },
      lifespan: { min: 200, max: 420 },
      scale: { start: 1, end: 0.5 },
      alpha: { start: 0.9, end: 0 },
      tint: ints([P.sandLight, P.sandDark]),
      gravityY: -12,
      emitting: false,
    }).setDepth(DEPTH.GROUND_FX);

    this.flashes = [];
    this.rings = [];
  }

  /** @param {import('../../shared/protocol.js').SimEvent[]} events */
  handle(events) {
    for (const e of events) {
      switch (e.type) {
        case 'shot':
          this.flash(e.x, e.y - this.shotHeight, 0xffffff);
          break;
        case 'enemyShot':
          this.flash(e.x, e.y - 8, hexToInt(P.enemyShot));
          break;
        case 'bulletHit':
          (e.team === 'enemy' ? this.redSparks : this.sparks).explode(5, e.x, e.y - this.shotHeight);
          this.dust.explode(2, e.x, e.y);
          break;
        case 'bulletExpired':
          this.dust.explode(2, e.x, e.y);
          break;
        case 'roll':
          this.dust.explode(7, e.x, e.y + 3);
          break;
        case 'rockCrushed':
          this.rubble.explode(12, e.x, e.y);
          this.shake(120, 0.004);
          break;
        case 'enemyDespawned':
        case 'enemySpawning':
          this.dust.explode(4, e.x, e.y);
          break;
        case 'enemyHit':
          this.sparks.explode(2, e.x, e.y - 6);
          break;
        case 'enemyDied':
          (this.debris[e.enemyType] ?? this.debris.crab).explode(e.boss ? 40 : 8, e.x, e.y - 6);
          this.dust.explode(e.boss ? 20 : 4, e.x, e.y);
          if (e.boss) this.shake(400, 0.012);
          break;
        case 'explosion':
          this.fire.explode(16, e.x, e.y - 4);
          this.shockwave(e.x, e.y - 2, e.radius);
          this.shake(140, 0.006);
          break;
        case 'playerHit':
          if (e.playerId === this.localPlayerId) this.shake(160, 0.008);
          this.redSparks.explode(8, e.x, e.y - 8);
          break;
        case 'playerDied':
          if (e.playerId === this.localPlayerId) this.shake(350, 0.014);
          this.redSparks.explode(20, e.x, e.y - 8);
          break;
        case 'bossSpawned':
          this.shake(500, 0.006);
          break;
        case 'pickupCollected':
          this.sparks.explode(10, e.x, e.y - 4);
          break;
        default:
          break;
      }
    }
  }

  flash(x, y, tint) {
    const img = this.flashes.pop() ?? this.scene.add.image(0, 0, 'muzzle').setDepth(DEPTH.FX);
    img.setPosition(Math.round(x), Math.round(y)).setTint(tint).setVisible(true);
    this.scene.time.delayedCall(50, () => {
      img.setVisible(false);
      this.flashes.push(img);
    });
  }

  /** Expanding ring that shows exactly how far an explosion reaches. */
  shockwave(x, y, radius) {
    const ring = this.rings.pop() ?? this.scene.add.image(0, 0, 'ring').setDepth(DEPTH.FX);
    ring.setPosition(Math.round(x), Math.round(y)).setVisible(true).setAlpha(1).setScale(0.2)
      .setTint(hexToInt(P.explosion));
    this.scene.tweens.add({
      targets: ring,
      scale: radius / 16,
      alpha: 0,
      duration: 260,
      ease: 'Quad.Out',
      onComplete: () => {
        ring.setVisible(false);
        this.rings.push(ring);
      },
    });
  }
}
