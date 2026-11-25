// Draws ability effects: coconuts circling players and burning ground.
import { DEPTH } from '../systems/depth.js';
import { orbitPositions } from '../../shared/content/abilities/orbitCoconuts.js';
import { shieldPositions } from '../../shared/content/abilities/orbitShield.js';
import { PALETTE as P, hexToInt } from '../art/palette.js';

export class AbilityViews {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} config
   */
  constructor(scene, config) {
    this.scene = scene;
    this.config = config;
    this.coconuts = [];
    this.fires = [];
    this.shields = [];
    this.bombs = [];
    this.hazards = [];
  }

  /**
   * @param {object} world
   * @param {number} alpha - interpolation between ticks
   * @param {number} time - interpolated world time
   */
  sync(world, alpha, time) {
    const cfg = this.config.abilities.orbitCoconuts;
    let used = 0;
    for (const p of world.players) {
      const level = p.abilities.orbitCoconuts ?? 0;
      if (!p.alive || level === 0) continue;
      const center = { x: p.prevX + (p.x - p.prevX) * alpha, y: p.prevY + (p.y - p.prevY) * alpha };
      for (const at of orbitPositions(center, time, level, cfg)) {
        const view = (this.coconuts[used] ??= {
          image: this.scene.add.image(0, 0, 'orbitCoconut'),
          shadow: this.scene.add.image(0, 0, 'bulletShadow').setDepth(DEPTH.SHADOW).setScale(2, 1),
        });
        view.image.setVisible(true).setPosition(Math.round(at.x), Math.round(at.y) - 4).setDepth(at.y);
        view.shadow.setVisible(true).setPosition(Math.round(at.x), Math.round(at.y) + 3);
        used++;
      }
    }
    for (let i = used; i < this.coconuts.length; i++) {
      this.coconuts[i].image.setVisible(false);
      this.coconuts[i].shadow.setVisible(false);
    }

    world.fires.forEach((f, i) => {
      const image = (this.fires[i] ??= this.scene.add.image(0, 0, 'card-fireTrail').setOrigin(0.5, 0.8));
      const flicker = Math.floor(time * 10 + f.id) % 2 === 0;
      image.setVisible(true)
        .setPosition(Math.round(f.x), Math.round(f.y))
        .setDepth(f.y - 1)
        .setFlipX(flicker)
        .setAlpha(Math.min(1, f.life * 3)); // fades out at the end
    });
    for (let i = world.fires.length; i < this.fires.length; i++) this.fires[i].setVisible(false);

    const shieldCfg = this.config.abilities?.orbitShield;
    let shieldsUsed = 0;
    if (shieldCfg) {
      for (const p of world.players) {
        const level = p.abilities.orbitShield ?? 0;
        if (!p.alive || level === 0) continue;
        const center = { x: p.prevX + (p.x - p.prevX) * alpha, y: p.prevY + (p.y - p.prevY) * alpha };
        for (const at of shieldPositions(center, time, level, shieldCfg)) {
          const view = (this.shields[shieldsUsed] ??= {
            image: this.scene.add.image(0, 0, 'orbitShield'),
            shadow: this.scene.add.image(0, 0, 'bulletShadow').setDepth(DEPTH.SHADOW).setScale(2, 1),
          });
          view.image.setVisible(true).setPosition(Math.round(at.x), Math.round(at.y) - 4).setDepth(at.y);
          if (level >= shieldCfg.bounceFromLevel) {
            view.image.setTint(hexToInt(P.xpBar));
          } else {
            view.image.clearTint();
          }
          view.shadow.setVisible(true).setPosition(Math.round(at.x), Math.round(at.y) + 3);
          shieldsUsed++;
        }
      }
    }
    for (let i = shieldsUsed; i < this.shields.length; i++) {
      this.shields[i].image.setVisible(false);
      this.shields[i].shadow.setVisible(false);
    }

    const bombs = world.bombs ?? [];
    bombs.forEach((b, i) => {
      const view = (this.bombs[i] ??= {
        image: this.scene.add.image(0, 0, 'bomb'),
        shadow: this.scene.add.image(0, 0, 'bulletShadow').setDepth(DEPTH.SHADOW).setScale(2, 1),
        target: this.scene.add.image(0, 0, 'ring').setDepth(DEPTH.GROUND_FX),
      });
      const x = b.prevX + (b.x - b.prevX) * alpha;
      const y = b.prevY + (b.y - b.prevY) * alpha;
      const t = Math.min(1, b.elapsed / (b.flightTime || 1));
      const arc = Math.sin(t * Math.PI) * 28;

      view.image.setVisible(true)
        .setPosition(Math.round(x), Math.round(y - 4 - arc))
        .setDepth(y);
      view.shadow.setVisible(true)
        .setPosition(Math.round(x), Math.round(y) + 2);
      view.target.setVisible(true)
        .setPosition(Math.round(b.targetX), Math.round(b.targetY))
        .setScale(b.radius / 16)
        .setTint(hexToInt(P.explosion))
        .setAlpha(0.45)
        .setDepth(DEPTH.GROUND_FX);
    });
    for (let i = bombs.length; i < this.bombs.length; i++) {
      this.bombs[i].image.setVisible(false);
      this.bombs[i].shadow.setVisible(false);
      this.bombs[i].target.setVisible(false);
    }

    const hazards = world.hazards ?? [];
    hazards.forEach((h, i) => {
      const view = (this.hazards[i] ??= {
        ring: this.scene.add.image(0, 0, 'ring').setDepth(DEPTH.GROUND_FX),
        rock: this.scene.add.image(0, 0, 'rock').setScale(0.55),
      });
      const progress = Math.max(0, Math.min(1, h.remaining / (h.duration || 1)));
      const rockY = Math.round(h.y - 3 - 40 * progress);

      view.ring.setVisible(true)
        .setPosition(Math.round(h.x), Math.round(h.y))
        .setScale(h.radius / 16)
        .setTint(hexToInt(P.enemyShot))
        .setAlpha(0.55)
        .setDepth(DEPTH.GROUND_FX);
      view.rock.setVisible(true)
        .setPosition(Math.round(h.x), rockY)
        .setDepth(h.y);
    });
    for (let i = hazards.length; i < this.hazards.length; i++) {
      this.hazards[i].ring.setVisible(false);
      this.hazards[i].rock.setVisible(false);
    }
  }
}
