// Upgrade 2 - set dressing: swaying palm trees, the beached shipwreck at the spawn,
// grass tufts, shells, starfish, driftwood, crates, barrels and bones.
// Decorative only in this prototype (no collision).
import { TILE } from '../../shared/content/tiles.js';
import { tileAt } from '../../shared/sim/map.js';
import { addOutline, createTextureFromGrid } from '../art/pixelArt.js';
import { DEPTH } from '../systems/depth.js';
import { hash2 } from './noise.js';

const OUT = '#1a1212';

function canvas(w, h) {
  const g = Array.from({ length: h }, () => Array(w).fill(null));
  const px = (x, y, c) => {
    x = Math.round(x); y = Math.round(y);
    if (x >= 0 && y >= 0 && x < w && y < h) g[y][x] = c;
  };
  const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) px(x, y, c); };
  const ellipse = (cx, cy, rx, ry, c) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) px(x, y, typeof c === 'function' ? c(x, y) : c);
  };
  const line = (x0, y0, x1, y1, c, th = 1) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1;
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      const y = y0 + ((y1 - y0) * i) / n;
      for (let k = 0; k < th; k++) px(x, y + k, c);
    }
  };
  return { g, px, rect, ellipse, line, w, h };
}

function makeTextures(scene) {
  if (scene.textures.exists('palmTrunk')) return;

  // Palm trunk: curved, segmented, lit from the left
  {
    const c = canvas(12, 42);
    for (let y = 0; y < 42; y++) {
      const t = 1 - y / 41;
      const cx = 4 + Math.round(t * t * 5);
      const wdt = y > 34 ? 3 : 2;
      for (let x = cx - wdt; x <= cx + wdt - 1; x++) {
        let col = x === cx - wdt ? '#c88a50' : x >= cx + wdt - 2 ? '#6e3d1a' : '#a0612d';
        if (y % 4 === 0) col = '#5a3216';
        else if (y % 4 === 1 && x === cx - wdt) col = '#e0a868';
        c.px(x, y, col);
      }
    }
    createTextureFromGrid(scene, 'palmTrunk', addOutline(c.g, OUT));
  }
  // Palm crown: drooping fronds + coconuts
  {
    const c = canvas(50, 30);
    const cx = 25;
    const cy = 11;
    const fronds = [[-2.9, 20], [-2.3, 17], [-1.6, 12], [-0.85, 17], [-0.25, 20], [0.4, 15], [2.7, 14], [3.35, 13]];
    for (const [a, L] of fronds) {
      for (let s = 0; s <= 1.0001; s += 0.02) {
        const x = cx + Math.cos(a) * L * s;
        const y = cy + Math.sin(a) * L * s * 0.55 + s * s * L * 0.55;
        const th = s < 0.15 ? 2 : s < 0.75 ? 3 : 2;
        for (let k = 0; k < th; k++) c.px(x, y + k, k === 0 ? '#5a9a48' : k === th - 1 ? '#2c5a2c' : '#3e7a3a');
        if (s > 0.2 && Math.round(s * 50) % 3 === 0) { c.px(x, y + th, '#2c5a2c'); c.px(x + 1, y + th + 1, '#3e7a3a'); }
        if (s > 0.3 && s < 0.8 && Math.round(s * 50) % 4 === 0) c.px(x, y - 1, '#7fbf5a');
      }
    }
    c.ellipse(cx, cy, 5, 3, (x, y) => (y < cy - 1 ? '#7fbf5a' : y < cy + 1 ? '#5a9a48' : '#3e7a3a'));
    for (const [ox, oy] of [[-3, 4], [1, 5], [4, 3]]) c.ellipse(cx + ox, cy + oy, 1.8, 1.8, (x, y) => (x < cx + ox && y < cy + oy ? '#a06a3c' : '#6b4020'));
    createTextureFromGrid(scene, 'palmCrown', addOutline(c.g, OUT));
  }
  // Palm shadow (frond blob), soft
  {
    const c = canvas(44, 14);
    c.ellipse(22, 7, 20, 5.5, 'rgba(40,24,16,0.26)');
    for (const [ox, r] of [[-14, 5], [14, 5], [-7, 6], [8, 6]]) c.ellipse(22 + ox, 7 + (r - 5), r, 3, 'rgba(40,24,16,0.26)');
    createTextureFromGrid(scene, 'palmShadow', c.g);
  }
  // Shipwreck: broken hull half-buried in sand, snapped mast, torn sail
  {
    const W = 84;
    const c = canvas(W, 56);
    const top = (x) => 22 + Math.round((x - 42) ** 2 / 180) + (x > 52 && x < 62 ? 4 + ((x * 7) % 3) : 0) + (x < 14 ? 2 : 0);
    const bot = (x) => 40 + Math.round(Math.sin((Math.PI * (x - 4)) / 76) * 7);
    for (let x = 4; x < 80; x++) {
      for (let y = top(x); y <= bot(x); y++) {
        const r = y - top(x);
        let col = r < 2 ? '#c08048' : ((y >> 2) % 2 ? '#a0612d' : '#8a5126');
        if (r >= 2 && r < 7 && x > 10 && x < 72) col = x % 9 === 0 ? '#7a4a26' : '#3a2414'; // inside, ribs
        if (y === bot(x)) col = '#5a3216';
        if ((x + y * 3) % 23 === 0 && r > 7) col = '#5a3216';
        c.px(x, y, col);
      }
    }
    // planks sticking up (broken ribs)
    for (const [x, h] of [[18, 7], [27, 9], [36, 6], [66, 8]]) c.rect(x, top(x) - h, x + 1, top(x), '#7a4a26');
    // snapped mast + sail
    c.line(34, 30, 50, 4, '#5a3216', 2);
    c.line(35, 30, 51, 4, '#8a5126', 1);
    for (let y = 6; y < 26; y++) {
      const x0 = 50 - (y - 6) * 0.45;
      const x1 = x0 + 4 + (y - 6) * 0.9 - (y > 18 ? (y - 18) * 1.6 : 0);
      for (let x = Math.round(x0) + 2; x < x1; x++) {
        if (hash2(x, y, 3) < 0.06) continue; // holes
        c.px(x, y, (x + y) % 7 === 0 ? '#c9b892' : y % 5 === 0 ? '#d9cba8' : '#efe3c4');
      }
    }
    const og = addOutline(c.g, OUT);
    // sand drifted against the hull (no outline, so it melts into the beach)
    const sandC = canvas(86, 58);
    sandC.g = og;
    const mound = (cx, cy, rx, ry) => {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (d > 1 || y < 0 || y >= og.length || x < 0 || x >= og[0].length) continue;
        og[y][x] = d > 0.75 && hash2(x, y, 6) < 0.5 ? null : y < cy - ry * 0.3 ? '#f6dfa8' : '#e8c98a';
      }
    };
    mound(22, 50, 20, 6);
    mound(62, 51, 19, 5);
    createTextureFromGrid(scene, 'wreck', og);
  }
  // Small props
  const small = (key, w, h, draw, outline = OUT) => {
    const c = canvas(w, h);
    draw(c);
    createTextureFromGrid(scene, key, outline ? addOutline(c.g, outline) : c.g);
  };
  for (let v = 0; v < 3; v++) {
    small(`tuft${v}`, 9, 7, (c) => {
      const blades = [[1, 3], [3, 6], [4, 4], [6, 5], [7, 2]].slice(v, v + 4);
      for (const [x, h] of blades) for (let k = 0; k < h; k++) c.px(x + (k > h - 2 ? (v % 2 ? 1 : -1) : 0), 6 - k, k > h - 3 ? '#7fbf5a' : k > 1 ? '#5a9a48' : '#3e7a3a');
    }, '#244a26');
  }
  small('shell', 4, 3, (c) => { c.rect(0, 1, 3, 2, '#f0a8a0'); c.px(1, 0, '#ffd6cf'); c.px(2, 0, '#ffd6cf'); c.px(1, 2, '#c97870'); }, null);
  small('starfish', 5, 5, (c) => { c.rect(2, 0, 2, 4, '#ff8a50'); c.rect(0, 2, 4, 2, '#ff8a50'); c.px(1, 4, '#ff8a50'); c.px(3, 4, '#ff8a50'); c.px(2, 2, '#ffd0a0'); }, '#8a3a1a');
  small('driftwood', 20, 5, (c) => { c.rect(0, 1, 19, 3, '#b99a78'); c.rect(0, 1, 19, 1, '#d8c2a2'); c.rect(4, 3, 16, 3, '#8f7458'); c.rect(14, 0, 16, 0, '#b99a78'); });
  small('crate', 12, 12, (c) => {
    c.rect(0, 0, 11, 3, '#c88a50'); c.rect(0, 4, 11, 11, '#a0612d');
    c.rect(0, 4, 11, 4, '#6e3d1a'); c.line(0, 5, 11, 11, '#6e3d1a'); c.rect(0, 7, 11, 7, '#8a5126'); c.px(1, 1, '#e0a868');
  });
  small('barrel', 10, 13, (c) => {
    c.ellipse(4.5, 2, 4.5, 2, '#c88a50'); c.rect(0, 2, 9, 11, '#a0612d'); c.rect(0, 2, 1, 11, '#c88a50'); c.rect(8, 2, 9, 11, '#6e3d1a');
    c.rect(0, 4, 9, 4, '#4a4a55'); c.rect(0, 9, 9, 9, '#4a4a55'); c.ellipse(4.5, 2, 3, 1, '#5a3216');
  });
  small('bones', 9, 4, (c) => { c.rect(1, 1, 7, 1, '#f2ead8'); c.px(0, 0, '#f2ead8'); c.px(0, 2, '#f2ead8'); c.px(8, 0, '#f2ead8'); c.px(8, 2, '#f2ead8'); c.px(4, 2, '#c9bfa8'); }, '#6b5f50');
}

/**
 * Places props deterministically around the arena.
 * @param {Phaser.Scene} scene
 * @param {{ width: number, height: number, tileSize: number, spawn: { x: number, y: number } }} map
 */
export function createProps(scene, map) {
  makeTextures(scene);
  const ts = map.tileSize;
  const t = (x, y) => tileAt(map, x, y);
  const sand = (x, y) => t(x, y) === TILE.SAND;
  const near = (x, y, type, r) => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (t(x + dx, y + dy) === type) return true;
    return false;
  };
  const sx = Math.floor(map.spawn.x / ts);
  const sy = Math.floor(map.spawn.y / ts);
  const objs = [];

  // Shipwreck beside the spawn (the castaways' boat)
  const wx = (sx - 11) * ts;
  const wy = (sy + 2) * ts + 8;
  objs.push(scene.add.image(wx + 30, wy + 2, 'palmShadow').setScale(2.2, 1.3).setDepth(DEPTH.SHADOW));
  objs.push(scene.add.image(wx, wy, 'wreck').setOrigin(0.5, 1).setDepth(wy));
  for (const [ox, oy, key, fl] of [[-46, 6, 'crate', false], [-34, 10, 'barrel', false], [44, 4, 'driftwood', true], [30, 16, 'crate', false], [-20, 22, 'driftwood', false]]) {
    objs.push(scene.add.image(wx + ox + 2, wy + oy, 'shadow').setDepth(DEPTH.SHADOW));
    objs.push(scene.add.image(wx + ox, wy + oy, key).setOrigin(0.5, 1).setFlipX(fl).setDepth(wy + oy));
  }

  // Palms near cliffs and water
  const palms = [];
  for (let y = 2; y < map.height - 2; y++) {
    for (let x = 2; x < map.width - 2; x++) {
      if (!sand(x, y) || !sand(x, y - 1)) continue;
      if (!(near(x, y, TILE.CLIFF, 2) || near(x, y, TILE.WATER, 2))) continue;
      if (near(x, y, TILE.ROCK, 1)) continue;
      if (Math.abs(x - sx) < 5 && Math.abs(y - sy) < 4) continue;
      if (Math.abs(x - (sx - 11)) < 5 && Math.abs(y - (sy + 2)) < 3) continue;
      if (!near(x, y, TILE.CLIFF, 2) && hash2(x, y, 78) > 0.35) continue;
      if (hash2(x, y, 77) > 0.25) continue;
      if (palms.some((p) => Math.abs(p.x - x) + Math.abs(p.y - y) < 10)) continue;
      palms.push({ x, y });
    }
  }
  palms.forEach((p, i) => {
    const bx = (p.x + 0.5) * ts + Math.round((hash2(p.x, p.y, 1) - 0.5) * 8);
    const by = (p.y + 0.8) * ts;
    const flip = hash2(p.x, p.y, 2) < 0.5;
    objs.push(scene.add.image(bx + 14, by + 1, 'palmShadow').setDepth(DEPTH.SHADOW));
    objs.push(scene.add.image(bx, by, 'palmTrunk').setOrigin(0.5, 1).setFlipX(flip).setDepth(by));
    const topX = bx + (flip ? -4 : 4);
    const crown = scene.add.image(topX, by - 41, 'palmCrown').setOrigin(0.5, 0.4).setFlipX(flip).setDepth(by + 0.5);
    scene.tweens.add({ targets: crown, angle: { from: -2.5, to: 2.5 }, duration: 1600 + i * 97, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: i * 131 });
    objs.push(crown);
  });

  // Scatter
  for (let y = 1; y < map.height - 1; y++) {
    for (let x = 1; x < map.width - 1; x++) {
      if (!sand(x, y)) continue;
      const h = hash2(x, y, 300);
      const px = x * ts + Math.floor(hash2(x, y, 301) * 12) + 2;
      const py = y * ts + Math.floor(hash2(x, y, 302) * 12) + 4;
      const byCliff = near(x, y, TILE.CLIFF, 1);
      const byWater = near(x, y, TILE.WATER, 1);
      if ((byCliff && h < 0.55) || h < 0.025) {
        objs.push(scene.add.image(px, py, `tuft${Math.floor(hash2(x, y, 303) * 3)}`).setOrigin(0.5, 1).setDepth(py));
        if (byCliff && h < 0.3) objs.push(scene.add.image(px + 6, py - 2, `tuft${Math.floor(hash2(x, y, 304) * 3)}`).setOrigin(0.5, 1).setDepth(py - 2));
      } else if (byWater && h < 0.35) {
        objs.push(scene.add.image(px, py, h < 0.08 ? 'starfish' : 'shell').setDepth(DEPTH.SHADOW + 2));
      } else if (h > 0.985) {
        const key = ['driftwood', 'bones', 'crate', 'barrel'][Math.floor(hash2(x, y, 305) * 4)];
        if (key === 'crate' || key === 'barrel') objs.push(scene.add.image(px + 1, py, 'shadow').setDepth(DEPTH.SHADOW));
        objs.push(scene.add.image(px, py, key).setOrigin(0.5, 1).setDepth(key === 'bones' || key === 'driftwood' ? DEPTH.SHADOW + 2 : py));
      }
    }
  }
  return objs;
}
