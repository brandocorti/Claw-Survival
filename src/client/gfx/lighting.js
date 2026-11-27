// Upgrade 3 - light and atmosphere: golden-hour grade, dithered vignette, warm sun
// bloom from the top-left, drifting cloud shadows, additive glows, floating motes.
import * as Phaser from 'phaser';
import { DEPTH } from '../systems/depth.js';
import { bayer, valueNoise } from './noise.js';

function makeTex(scene, key, w, h, fn) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  const ctx = tex.getContext();
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = fn(x, y);
    if (!c) continue;
    const i = (y * w + x) * 4;
    img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = c[3];
  }
  ctx.putImageData(img, 0, 0);
  tex.refresh();
}

export function createGlowTextures(scene) {
  // Stepped (pixel-art) radial glow, white, tinted per use.
  makeTex(scene, 'glow', 24, 24, (x, y) => {
    const d = Math.hypot(x - 11.5, y - 11.5) / 12;
    if (d > 1) return null;
    const a = d < 0.3 ? 200 : d < 0.55 ? 120 : d < 0.8 ? 60 : bayer(x, y) < 0.5 ? 30 : 0;
    return [255, 255, 255, a];
  });
}

export class Lighting {
  /** @param {Phaser.Scene} scene @param {{ width: number, height: number }} display @param {object} map */
  constructor(scene, display, map) {
    this.scene = scene;
    const { width: w, height: h } = display;
    createGlowTextures(scene);

    makeTex(scene, 'vignette', w, h, (x, y) => {
      const dx = (x - w / 2) / (w / 2);
      const dy = (y - h / 2) / (h / 2);
      const d = Math.hypot(dx * 0.85, dy);
      let a = Math.max(0, (d - 0.6) / 0.62);
      a = Math.min(1, a) ** 1.3 * 0.7;
      return a > 0 ? [26, 12, 20, Math.round(a * 255)] : null;
    });
    makeTex(scene, 'sunwash', w, h, (x, y) => {
      const d = Math.hypot(x / w, (y / h) * 0.7);
      const a = Math.max(0, 1 - d * 1.25) ** 1.3;
      return a > 0 ? [255, 196, 110, Math.round(a * 255)] : null;
    });
    makeTex(scene, 'cloud', 200, 110, (x, y) => {
      const dx = (x - 100) / 100;
      const dy = (y - 55) / 55;
      const n = 1 - Math.hypot(dx, dy) + (valueNoise(x, y, 18, 4) - 0.5) * 0.7;
      const a = Math.max(0, Math.min(1, (n - 0.2) / 0.35));
      return a > 0 ? [20, 30, 60, Math.round(a * 255)] : null;
    });

    const fixed = (o) => o.setScrollFactor(0).setOrigin(0);
    this.sun = fixed(scene.add.image(0, 0, 'sunwash')).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.08).setDepth(DEPTH.FX + 50);
    this.vignette = fixed(scene.add.image(0, 0, 'vignette')).setDepth(DEPTH.FX + 51);

    // Colour grade (WebGL only): a little more saturation and contrast.
    try {
      const cm = scene.cameras.main.postFX.addColorMatrix();
      cm.saturate(0.15);
      cm.contrast(0.05, true);
      cm.brightness(0.95, true);
    } catch { /* canvas renderer: skip */ }

    const W = map.width * map.tileSize;
    const H = map.height * map.tileSize;
    this.clouds = [0, 1, 2].map((i) => scene.add.image((i * 330) % W, (i * 210 + 60) % H, 'cloud')
      .setAlpha(0.08).setScale(1.4 + (i % 2) * 0.5).setDepth(DEPTH.FX - 10));
    this.W = W;
    this.H = H;

    this.motes = scene.add.particles(0, 0, 'px', {
      x: { min: 0, max: w }, y: { min: 0, max: h },
      lifespan: 4000, speedY: { min: -6, max: -2 }, speedX: { min: 2, max: 8 },
      scale: 0.5, alpha: { onEmit: () => 0, onUpdate: (p, k, t) => 0.7 * Math.sin(t * Math.PI) }, tint: 0xfff1b0,
      frequency: 160, blendMode: 'ADD',
    }).setScrollFactor(0).setDepth(DEPTH.FX + 49);
  }

  update(dt) {
    for (const c of this.clouds) {
      c.x += 7 * dt;
      c.y += 2 * dt;
      if (c.x > this.W + 200) c.x = -200;
      if (c.y > this.H + 120) c.y = -120;
    }
  }
}

/** Adds an additive glow sprite. */
export function addGlow(scene, tint, scale = 1, alpha = 0.55) {
  createGlowTextures(scene);
  return scene.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(tint).setScale(scale).setAlpha(alpha);
}
