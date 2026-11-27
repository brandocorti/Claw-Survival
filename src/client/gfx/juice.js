// Upgrade 4 - combat juice and persistent debris: enemies burst into chunks that
// arc, bounce and stay on the ground (Gungeon-style), scorch marks after
// explosions, death "poof" rings, footprints in the sand.
import { DEPTH } from '../systems/depth.js';
import { hash2 } from './noise.js';

const CHUNKS = {
  crab: ['#e2553a', '#ff9b70', '#b8341f', '#ffffff'],
  coconut: ['#7a4a26', '#a06a3c', '#f2ead8', '#5a3216'],
  skeleton: ['#f2ead8', '#c9bfa8', '#2b2420', '#f2ead8'],
  tiki: ['#b0703a', '#5a9a48', '#ffcf3a', '#6e3d1a'],
  crabKing: ['#e2553a', '#f0c040', '#ffffff', '#b8341f'],
  crabEmperor: ['#2f4d78', '#4f78a8', '#c8322a', '#f0c040'],
};
const STAIN = { crab: '#c9a06a', coconut: '#f7eed8', skeleton: '#cbb48a', tiki: '#c39a62', crabKing: '#c9a06a', crabEmperor: '#c9a06a' };

/** This many explosions at once count as a big one (hit-stop). */
const BIG_CHAIN = 3;

function ensureTextures(scene) {
  if (scene.textures.exists('chunk2')) return;
  for (const [k, w, h] of [['chunk2', 2, 2], ['chunk3', 3, 2], ['chunk1', 1, 1]]) {
    const t = scene.textures.createCanvas(k, w, h);
    const ctx = t.getContext();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    t.refresh();
  }
  // irregular stain blob (white, tinted when stamped)
  {
    const t = scene.textures.createCanvas('stain', 14, 8);
    const ctx = t.getContext();
    ctx.fillStyle = '#ffffff';
    for (let y = 0; y < 8; y++) for (let x = 0; x < 14; x++) {
      const d = ((x - 6.5) / 7) ** 2 + ((y - 3.5) / 4) ** 2;
      if (d < 0.55 || (d < 1 && hash2(x, y, 9) < 0.45)) ctx.fillRect(x, y, 1, 1);
    }
    t.refresh();
  }
  {
    const t = scene.textures.createCanvas('scorch', 40, 24);
    const ctx = t.getContext();
    for (let y = 0; y < 24; y++) for (let x = 0; x < 40; x++) {
      const ang = Math.atan2((y - 11.5) * 1.6, x - 19.5);
      const jag = 0.75 + 0.25 * Math.sin(ang * 7) + (hash2(Math.round(ang * 9), 0, 4) - 0.5) * 0.2;
      const d = Math.sqrt(((x - 19.5) / 20) ** 2 + ((y - 11.5) / 12) ** 2) / jag;
      if (d > 1) continue;
      ctx.fillStyle = d < 0.45 ? 'rgba(40,22,14,0.75)' : d < 0.8 ? 'rgba(70,40,20,0.55)' : 'rgba(110,70,35,0.4)';
      ctx.fillRect(x, y, 1, 1);
    }
    t.refresh();
  }
  {
    const t = scene.textures.createCanvas('footprint', 2, 2);
    const ctx = t.getContext();
    ctx.fillStyle = 'rgba(150,110,60,0.55)';
    ctx.fillRect(0, 0, 2, 2);
    t.refresh();
  }
}

export class Juice {
  constructor(scene, map, localPlayerId) {
    this.scene = scene;
    this.localPlayerId = localPlayerId;
    ensureTextures(scene);
    const W = map.width * map.tileSize;
    const H = map.height * map.tileSize;
    this.decals = scene.add.renderTexture(0, 0, W, H).setOrigin(0).setDepth(DEPTH.SHADOW - 20);
    // Invisible brush for drawing onto the ground.
    this.stamp = scene.make.image({ x: 0, y: 0, key: 'chunk2', add: false });
    this.chunks = [];
    this.pool = [];
    this.rings = [];
    this.n = 0;
    this.lastFoot = null;
    this.footSide = 1;
    this.footprints = [];
  }

  rand() {
    this.n++;
    return hash2(this.n, 17, 5);
  }

  /**
   * @param {object[]} events
   * @returns {number} frames the picture should freeze (hit-stop), 0 for none
   */
  handle(events) {
    let explosions = 0;
    let bossDied = false;
    for (const e of events) {
      if (e.type === 'explosion') explosions++;
      if (e.type === 'enemyDied' && e.boss) bossDied = true;
      if (e.type === 'enemyDied') this.burst(e);
      else if (e.type === 'explosion') this.drawDecal('scorch', e.x, e.y, 0xffffff, Math.min(0.7, e.radius / 40), 0.85);
    }
    if (bossDied) return 4;
    return explosions >= BIG_CHAIN ? 3 : 0;
  }

  drawDecal(key, x, y, tint, scale = 1, alpha = 1, angle = 0) {
    this.stamp.setTexture(key).setTint(tint).setScale(scale).setAlpha(alpha).setAngle(angle).setOrigin(0.5);
    this.decals.draw(this.stamp, Math.round(x), Math.round(y));
  }

  burst(e) {
    const colors = CHUNKS[e.enemyType] ?? CHUNKS.crab;
    const n = e.boss ? 30 : 5;
    this.drawDecal('stain', e.x, e.y + 1, parseInt((STAIN[e.enemyType] ?? '#c9a06a').slice(1), 16), e.boss ? 2.4 : 0.8, 0.4);
    for (let i = 0; i < n; i++) {
      const c = this.pool.pop() ?? this.scene.add.image(0, 0, 'chunk2');
      const r = this.rand();
      c.setTexture(r < 0.3 ? 'chunk3' : r < 0.8 ? 'chunk2' : 'chunk1')
        .setTint(parseInt(colors[i % colors.length].slice(1), 16)).setVisible(true).setAlpha(1);
      const a = this.rand() * Math.PI * 2;
      const sp = (e.boss ? 60 : 30) + this.rand() * 60;
      this.chunks.push({ img: c, x: e.x, y: e.y, z: 6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: 60 + this.rand() * 90, bounces: 0 });
    }
    // white death poof
    const ring = this.rings.pop() ?? this.scene.add.image(0, 0, 'ring').setDepth(DEPTH.FX);
    ring.setPosition(Math.round(e.x), Math.round(e.y - 6)).setVisible(true).setAlpha(0.9).setScale(0.15).setTint(0xffffff);
    this.scene.tweens.add({
      targets: ring, scale: e.boss ? 2 : 0.7, alpha: 0, duration: 220, ease: 'Quad.Out',
      onComplete: () => { ring.setVisible(false); this.rings.push(ring); },
    });
  }

  update(dt, player) {
    const g = 420;
    for (let i = this.chunks.length - 1; i >= 0; i--) {
      const c = this.chunks[i];
      c.vz -= g * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.z += c.vz * dt;
      if (c.z <= 0) {
        c.z = 0;
        c.bounces++;
        c.vz = -c.vz * 0.35;
        c.vx *= 0.5;
        c.vy *= 0.5;
        if (c.bounces >= 2) {
          this.decals.draw(c.img.setPosition(Math.round(c.x), Math.round(c.y)), Math.round(c.x), Math.round(c.y));
          c.img.setVisible(false);
          this.pool.push(c.img);
          this.chunks.splice(i, 1);
          continue;
        }
      }
      c.img.setPosition(Math.round(c.x), Math.round(c.y - c.z)).setDepth(c.y);
    }

    // Footprints in the sand
    if (player && player.alive && !player.rolling) {
      const p = { x: player.x, y: player.y };
      if (!this.lastFoot) this.lastFoot = p;
      const dx = p.x - this.lastFoot.x;
      const dy = p.y - this.lastFoot.y;
      const d = Math.hypot(dx, dy);
      if (d > 7) {
        this.footSide *= -1;
        const nx = (-dy / d) * 2 * this.footSide;
        const ny = (dx / d) * 2 * this.footSide;
        const f = this.footprints.pop() ?? this.scene.add.image(0, 0, 'footprint').setDepth(DEPTH.SHADOW - 5);
        f.setPosition(Math.round(p.x + nx), Math.round(p.y + 3 + ny)).setAlpha(1).setVisible(true);
        this.scene.tweens.add({ targets: f, alpha: 0, delay: 1200, duration: 1600, onComplete: () => { f.setVisible(false); this.footprints.push(f); } });
        this.lastFoot = p;
      }
    } else if (player) this.lastFoot = { x: player.x, y: player.y };
  }
}
