// Draws ability effects: coconuts circling players and burning ground.
import { DEPTH } from '../systems/depth.js';
import { GFX } from '../gfx/flags.js';
import { addGlow } from '../gfx/lighting.js';
import { orbitPositions } from '../../shared/content/abilities/orbitCoconuts.js';

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
      if (GFX.light) {
        const glow = (image.glow ??= addGlow(this.scene, 0xff8a2a, 1.3, 0.5));
        glow.setVisible(true).setPosition(Math.round(f.x), Math.round(f.y) - 3).setDepth(f.y - 2)
          .setAlpha(Math.min(1, f.life * 3) * (flicker ? 0.5 : 0.4));
      }
    });
    for (let i = world.fires.length; i < this.fires.length; i++) { this.fires[i].setVisible(false); this.fires[i].glow?.setVisible(false); }
  }
}
