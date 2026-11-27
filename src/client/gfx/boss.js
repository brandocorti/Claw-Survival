// The Crab Emperor (final boss) as an animated rig, with per-attack
// telegraphs on the ground, a phase-2 look below half health
// and a death sequence. View-only: the simulation still drives the boss.
import * as Phaser from 'phaser';
import { empBody, empClaw, empLeg, empStalk, empCrown } from '../../shared/art/emperor.js';
import { addOutline, createTextureFromGrid, createSpritesheet } from '../art/pixelArt.js';
import { DEPTH } from '../systems/depth.js';

const O = '#1a1212';
const RED = 0xff3d4a;

export function createEmperorTextures(scene) {
  if (scene.textures.exists('emp-body')) return;
  createTextureFromGrid(scene, 'emp-body', addOutline(empBody(false), O));
  createTextureFromGrid(scene, 'emp-body2', addOutline(empBody(true), O));
  createSpritesheet(scene, 'emp-claw', [0, 1, 2].map((k) => ({ name: String(k), grid: addOutline(empClaw(k), O) })));
  createTextureFromGrid(scene, 'emp-leg', addOutline(empLeg(), O));
  createTextureFromGrid(scene, 'emp-stalk', addOutline(empStalk(), O));
  createTextureFromGrid(scene, 'emp-crown', addOutline(empCrown(), O));
}

export class EmperorView {
  /** @param {Phaser.Scene} scene @param {object} stats - config.enemies.crabEmperor */
  constructor(scene, stats) {
    createEmperorTextures(scene);
    this.scene = scene;
    this.stats = stats;
    const add = (key, frame) => scene.add.image(0, 0, key, frame);
    this.shadow = scene.add.ellipse(0, 0, 70, 16, 0x1a1212, 0.35).setDepth(DEPTH.SHADOW);
    this.tele = scene.add.graphics().setDepth(DEPTH.SHADOW + 3);
    this.c = scene.add.container(0, 0);
    this.legs = [];
    for (let i = 0; i < 3; i++) {
      this.legs.push(add('emp-leg').setOrigin(0, 0.5));
      this.legs.push(add('emp-leg').setOrigin(1, 0.5).setFlipX(true));
    }
    this.body = add('emp-body').setOrigin(0.5, 1);
    this.stalkL = add('emp-stalk').setOrigin(0.5, 1);
    this.stalkR = add('emp-stalk').setOrigin(0.5, 1);
    this.pupilL = scene.add.rectangle(0, 0, 2, 2, 0x1a1212).setOrigin(0);
    this.pupilR = scene.add.rectangle(0, 0, 2, 2, 0x1a1212).setOrigin(0);
    this.crown = add('emp-crown').setOrigin(0.5, 1);
    this.clawR = add('emp-claw', '0').setOrigin(0.1, 0.85);
    this.clawL = add('emp-claw', '0').setOrigin(0.9, 0.85).setFlipX(true);
    this.c.add([...this.legs, this.body, this.stalkL, this.stalkR, this.pupilL, this.pupilR, this.crown, this.clawL, this.clawR]);
    this.parts = [...this.legs, this.body, this.stalkL, this.stalkR, this.crown, this.clawL, this.clawR];
    this.steam = scene.add.particles(0, 0, 'px', {
      speed: { min: 6, max: 18 }, angle: { min: 250, max: 290 }, lifespan: 700, scale: { start: 1, end: 2 },
      alpha: { start: 0.5, end: 0 }, tint: [0xd8dce6, 0xff7a2a], frequency: 90, emitting: false,
    });
    this.charge = scene.add.particles(0, 0, 'px', {
      speed: { min: -40, max: -20 }, lifespan: 260, scale: { start: 0.5, end: 1 }, alpha: { start: 0, end: 1 },
      tint: [0xffe27a, 0xff6a4a], emitting: false, blendMode: 'ADD',
      emitZone: { type: 'edge', source: new Phaser.Geom.Circle(0, 0, 12), quantity: 12 },
    });
    this.phase2 = false;
    this.lastHitSeen = -1;
    this.flashStart = -9;
    this.wasState = null;
    this.stateT = 0;
  }

  /** A pooled view is used for a new boss: forget the old one. */
  reset() {
    this.phase2 = false;
    this.lastHitSeen = -1;
    this.flashStart = -9;
    this.body.setTexture('emp-body');
    this.steam.emitting = false;
  }

  setVisible(v) {
    [this.c, this.shadow, this.tele].forEach((o) => o.setVisible(v));
    if (!v) { this.steam.emitting = false; this.charge.emitting = false; this.tele.clear(); }
  }

  /** @param {object} e enemy @param {number} x @param {number} y @param {number} time @param {{x:number,y:number}|null} target */
  update(e, x, y, time, target, dt) {
    const rx = Math.round(x);
    const ry = Math.round(y);
    if (e.state !== this.wasState) { this.wasState = e.state; this.stateT = 0; }
    this.stateT += dt;
    const spawning = e.spawnDelay > 0;
    const moving = Math.hypot(e.vx, e.vy) > 2;
    const windup = e.state && e.state.endsWith('Windup');
    const charging = e.state === 'charge';

    // body bob and stance
    const bob = spawning ? 0 : Math.round(Math.sin(time * (moving ? 10 : 3)) * (moving ? 1 : 1));
    const rise = spawning ? Math.round((e.spawnDelay / e.spawnDuration) * 30) : 0; // burrows up out of the sand
    this.c.setPosition(rx, ry + 4 + rise).setDepth(y);
    this.c.setAlpha(spawning ? 1 - (e.spawnDelay / e.spawnDuration) * 0.6 : 1);
    this.shadow.setPosition(rx, ry + 4).setScale(spawning ? 0.6 : 1, 1);
    const lean = charging ? Math.sign(e.dirX || 1) * 0.12 : 0;
    this.c.setRotation(lean);

    this.body.setPosition(0, -2 + bob);
    // legs scuttle
    this.legs.forEach((leg, i) => {
      const side = i % 2 === 0 ? 1 : -1;
      const row = Math.floor(i / 2);
      const swing = moving || charging ? Math.sin(time * (charging ? 30 : 14) + row * 2 + (side > 0 ? 0 : Math.PI)) * 0.35 : 0;
      leg.setPosition(side * 15, -10 + row * 4 + bob).setRotation(side * (0.25 + row * 0.25 + swing));
    });
    // eye stalks + pupils that track the hero
    const sway = Math.sin(time * 2.2) * 1.5;
    this.stalkL.setPosition(-13, -24 + bob).setRotation(-0.15 + sway * 0.04);
    this.stalkR.setPosition(13, -24 + bob).setRotation(0.15 - sway * 0.04);
    let lx = 0;
    let ly = 0;
    if (target) {
      const a = Math.atan2(target.y - y, target.x - x);
      lx = Math.round(Math.cos(a) * 1.4);
      ly = Math.round(Math.sin(a) * 1.4);
    }
    this.pupilL.setPosition(-14 + lx, -37 + bob + ly);
    this.pupilR.setPosition(12 + lx, -37 + bob + ly);
    const angry = this.phase2 || windup;
    this.pupilL.setFillStyle(angry ? RED : 0x1a1212);
    this.pupilR.setFillStyle(angry ? RED : 0x1a1212);
    this.crown.setPosition(0, -27 + bob).setRotation(this.phase2 ? -0.18 : Math.sin(time * 1.5) * 0.04);

    // claws: idle snapping, raised and wide open while winding up, forward while charging
    const snap = Math.floor(time * 2.5) % 4 === 0 ? 1 : 0;
    let clawFrame = String(snap);
    let raise = 0;
    let clawRot = Math.sin(time * 2) * 0.05;
    if (windup) {
      const k = Math.min(1, this.stateT / 0.25);
      raise = Math.round(10 * k);
      clawFrame = '2';
      clawRot = -0.35 * k + Math.sin(time * 40) * 0.03;
    } else if (charging) {
      clawFrame = '1';
      clawRot = 0.3;
    } else if (this.stateT < 0.15 && (this.wasState === 'walk')) {
      clawFrame = '0'; // snap shut right after firing
      clawRot = 0.15;
    }
    this.clawR.setFrame(clawFrame).setPosition(20, -12 - raise + bob).setRotation(clawRot);
    this.clawL.setFrame(clawFrame).setPosition(-20, -12 - raise + bob).setRotation(-clawRot);

    // phase 2
    const p2 = e.hp <= e.maxHp / 2;
    if (p2 !== this.phase2) {
      this.phase2 = p2;
      if (p2) this.scene.hitStop = 4; // the picture freezes for an instant when it cracks
      this.body.setTexture(p2 ? 'emp-body2' : 'emp-body');
      this.steam.emitting = p2;
    }
    if (p2) this.steam.setPosition(rx + Math.sin(time * 7) * 14, ry - 22);

    // hit flash / telegraph flash on all parts
    // throttled hit flash: at most one short flash every 0.3 s, so a stream of pebbles never turns it into a white blob
    if (e.lastHitTime > this.lastHitSeen) {
      this.lastHitSeen = e.lastHitTime;
      if (time - this.flashStart > 0.3) this.flashStart = time;
    }
    const hit = time - this.flashStart < 0.035;
    this.c.setScale(hit ? 1.04 : 1, hit ? 0.96 : 1);
    for (const p of this.parts) {
      if (hit) p.setTintFill(0xffffff);
      else if (windup && Math.floor(time * 14) % 2 === 0) p.setTint(0xffd0a0);
      else p.clearTint();
    }
    // charge sparks converge on the claws during the wind-up
    this.charge.emitting = windup && e.state !== 'chargeWindup';
    if (this.charge.emitting) this.charge.setPosition(rx + 26 * (Math.floor(time * 20) % 2 ? 1 : -1), ry - 20 - raise);

    this.drawTelegraph(e, x, y, time, target);
  }

  drawTelegraph(e, x, y, time, target) {
    const g = this.tele;
    g.clear();
    if (!e.state || !e.state.endsWith('Windup')) return;
    const s = this.stats;
    const pulse = 0.18 + 0.14 * Math.sin(time * 18);
    const fill = Math.min(1, this.stateT / (s[e.state.replace('Windup', '')]?.windup ?? 0.6));
    if (e.state === 'chargeWindup') {
      const len = s.charge.speed * s.charge.duration;
      const a = Math.atan2(e.dirY, e.dirX);
      const w = e.radius * 2 + 10;
      const pts = (l, off) => {
        const cx = x + Math.cos(a) * l;
        const cy = y + Math.sin(a) * l;
        return { x: cx - Math.sin(a) * off, y: cy + Math.cos(a) * off };
      };
      const quad = (l0, l1) => [pts(l0, -w / 2), pts(l1, -w / 2), pts(l1, w / 2), pts(l0, w / 2)];
      g.fillStyle(RED, pulse).fillPoints(quad(0, len), true);
      g.fillStyle(RED, 0.35).fillPoints(quad(0, len * fill), true);
      g.lineStyle(1, RED, 0.9).strokePoints(quad(0, len), true);
      for (let k = 0; k < 4; k++) { // moving chevrons
        const l = ((time * 120 + k * (len / 4)) % len);
        const p0 = pts(l - 6, -w / 3); const p1 = pts(l, 0); const p2 = pts(l - 6, w / 3);
        g.lineStyle(2, 0xffe27a, 0.8).beginPath().moveTo(p0.x, p0.y).lineTo(p1.x, p1.y).lineTo(p2.x, p2.y).strokePath();
      }
    } else if (e.state === 'fanWindup' && target) {
      const a = Math.atan2(target.y - y, target.x - x);
      const r = 110;
      g.fillStyle(RED, pulse).slice(x, y, r, a - s.fan.spread / 2, a + s.fan.spread / 2, false).fillPath();
      g.fillStyle(RED, 0.3).slice(x, y, r * fill, a - s.fan.spread / 2, a + s.fan.spread / 2, false).fillPath();
      g.lineStyle(1, RED, 0.9).slice(x, y, r, a - s.fan.spread / 2, a + s.fan.spread / 2, false).strokePath();
    } else if (e.state === 'spiralWindup') {
      // One curved arm per bullet stream, bending the way the spiral will turn.
      const from = target ? Math.atan2(target.y - y, target.x - x) : 0;
      g.fillStyle(RED, pulse * 0.6).fillCircle(x, y, 26);
      g.lineStyle(1, RED, 0.9).strokeCircle(x, y, 26);
      for (let k = 0; k < s.spiral.arms; k++) {
        g.lineStyle(2, RED, 0.9).beginPath();
        for (let d = 24; d <= 24 + fill * 70; d += 4) {
          const a = from + (k / s.spiral.arms) * Math.PI * 2 + (d - 24) * 0.02 + time * 1.5;
          const px = x + Math.cos(a) * d;
          const py = y + Math.sin(a) * d;
          if (d === 24) g.moveTo(px, py);
          else g.lineTo(px, py);
        }
        g.strokePath();
      }
    } else if (e.state === 'ringWindup') {
      g.lineStyle(2, RED, 0.9).strokeCircle(x, y, 14 + fill * 50);
      g.fillStyle(RED, pulse * 0.8).fillCircle(x, y, 14 + fill * 50);
      for (let k = 0; k < s.ring.count; k++) {
        const a = (k / s.ring.count) * Math.PI * 2;
        g.fillStyle(0xffe27a, 0.9).fillRect(Math.round(x + Math.cos(a) * (18 + fill * 46)), Math.round(y + Math.sin(a) * (18 + fill * 46)), 2, 2);
      }
    }
  }

  destroy() {
    [this.c, this.shadow, this.tele, this.steam, this.charge].forEach((o) => o.destroy());
  }
}

/** Death: chain explosions, then the crown pops off and lands (it stays as a trophy). */
export function emperorDeath(scene, x, y, shake) {
  for (let k = 0; k < 7; k++) {
    scene.time.delayedCall(k * 120, () => {
      const ex = x + Math.sin(k * 2.3) * 18;
      const ey = y - 14 + Math.cos(k * 1.7) * 10;
      const ring = scene.add.image(ex, ey, 'ring').setTint(k % 2 ? 0xffe27a : 0xff6a4a).setScale(0.2).setDepth(DEPTH.FX);
      scene.tweens.add({ targets: ring, scale: 1.1, alpha: 0, duration: 300, onComplete: () => ring.destroy() });
      const flash = scene.add.image(ex, ey, 'muzzle').setScale(3).setDepth(DEPTH.FX).setBlendMode('ADD');
      scene.time.delayedCall(60, () => flash.destroy());
      shake(120, 0.008);
    });
  }
  const crown = scene.add.image(x, y - 28, 'emp-crown').setOrigin(0.5, 1).setDepth(y + 1);
  scene.tweens.add({ targets: crown, y: y - 70, angle: 200, duration: 450, ease: 'Quad.Out', delay: 700,
    onComplete: () => scene.tweens.add({ targets: crown, y: y + 6, angle: 340, duration: 420, ease: 'Bounce.Out' }) });
}
