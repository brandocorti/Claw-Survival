// Villain prototype: the Crab Emperor as separate parts (body, claws, legs, eye
// stalks, crown, phase-2 cracks) so the client can animate them independently.
// Navy armour + crimson claws + gold crown. Purple stays reserved for curses.

export const EMP = Object.freeze({
  deep: '#0f1828', navy: '#1f3352', mid: '#2f4d78', light: '#4f78a8', hi: '#8fb4e0',
  gold: '#f0c040', goldDark: '#b8862a', goldLight: '#ffe27a',
  red: '#c8322a', redDark: '#8a1e1a', redLight: '#ff6a4a',
  barn: '#e8e0cc', barnShade: '#a89c84', fang: '#f6efe0', mouth: '#2a0c0c',
  gemRed: '#ff3a3a', gemTeal: '#3ad8d0', crack: '#ff7a2a', crackCore: '#ffe08a', white: '#ffffff',
});

const grid = (w, h) => Array.from({ length: h }, () => Array(w).fill(null));
function P(g) {
  const px = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = c; };
  const disc = (cx, cy, r, c) => {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) px(x, y, typeof c === 'function' ? c(x, y) : c);
  };
  return { px, disc };
}
const hash = (x, y) => {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

/** Carapace seen in 3/4: domed top, gold filigree band, front face with fanged mouth. */
export function empBody(phase2 = false) {
  const W = 52;
  const H = 32;
  const g = grid(W, H);
  const { px, disc } = P(g);
  const cx = 25.5;
  const cy = 14;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = (x - cx) / 25;
    const dy = (y - cy) / 13;
    const d = dx * dx + dy * dy;
    // front face: a band below the dome
    const faceTop = cy + Math.sqrt(Math.max(0, 1 - dx * dx)) * 9;
    const inFace = Math.abs(dx) < 0.86 && y >= faceTop - 1 && y <= faceTop + 8 - Math.abs(dx) * 4;
    if (d > 1 && !inFace) continue;
    let c;
    if (inFace && d > 0.55) {
      c = y > faceTop + 5 ? EMP.deep : EMP.navy;
    } else {
      const light = dx + dy * 1.2; // top-left lit
      c = light < -0.95 ? EMP.hi : light < -0.45 ? EMP.light : light < 0.35 ? EMP.mid : light < 0.9 ? EMP.navy : EMP.deep;
      if (d > 0.88) c = EMP.deep;
      // gold filigree band
      const band = Math.abs(Math.sqrt(d) - 0.78);
      if (band < 0.05 && dy > -0.2) c = (x + y) % 4 === 0 ? EMP.goldDark : EMP.gold;
      if (band < 0.05 && dy > -0.2 && dy < 0.1 && x % 6 === 0) c = EMP.goldLight;
    }
    g[y][x] = c;
  }
  // ridge spikes along the top
  for (const sx of [12, 19, 26, 33, 40]) {
    const h = sx === 26 ? 4 : 3;
    for (let k = 0; k < h; k++) for (let w = -Math.floor((h - k) / 2); w <= Math.floor((h - k) / 2); w++) {
      const y = cy - 13 + 1 - k + Math.round(Math.abs(sx - cx) / 9);
      px(sx + w, y, k === h - 1 ? EMP.hi : EMP.light);
    }
  }
  // barnacles
  for (const [bx, by, r] of [[36, 6, 1.6], [39, 9, 1.2], [33, 8, 1], [14, 10, 1.2], [42, 12, 1]]) {
    disc(bx, by, r, (x, y) => (x + y < bx + by ? EMP.barn : EMP.barnShade));
  }
  // mouth with fangs on the front face
  for (let x = 18; x <= 33; x++) {
    const y0 = 24 + Math.round(Math.abs(x - 25.5) / 6);
    px(x, y0, EMP.mouth); px(x, y0 + 1, EMP.mouth);
    if (x % 3 === 0) px(x, y0, EMP.fang);
  }
  px(17, 24, EMP.redDark); px(34, 24, EMP.redDark); // mandible hinges
  if (phase2) {
    const crack = (pts) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[i + 1];
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
        for (let s = 0; s <= n; s++) {
          const x = x0 + ((x1 - x0) * s) / n;
          const y = y0 + ((y1 - y0) * s) / n;
          px(x, y, EMP.crackCore); px(x + 1, y, EMP.crack);
        }
      }
    };
    crack([[22, 3], [20, 7], [24, 10], [21, 15]]);
    crack([[31, 4], [34, 8], [31, 12], [35, 17]]);
    crack([[12, 13], [16, 16], [13, 19]]);
  }
  return g;
}

/** Right claw (left = mirrored). `open` 0..2 = closed / half / wide open. */
export function empClaw(open = 0) {
  const W = 30;
  const H = 26;
  const g = grid(W, H);
  const { disc } = P(g);
  const shade = (x, y, cx, cy) => (x - cx + (y - cy) < -3 ? EMP.redLight : x - cx + (y - cy) > 4 ? EMP.redDark : EMP.red);
  // arm + palm
  for (let i = 0; i <= 6; i++) disc(2 + i, 22 - i * 0.8, 2.6, (x, y) => shade(x, y, 5, 19));
  disc(12, 15, 7.5, (x, y) => shade(x, y, 12, 15));
  // pincers: arcs from the palm
  const pincer = (baseAng, len, thick, tipGold) => {
    for (let s = 0; s <= 1.0001; s += 0.04) {
      const a = baseAng + s * 0.55;
      const x = 15 + Math.cos(a) * len * s;
      const y = 12 + Math.sin(a) * len * s;
      const r = thick * (1 - s * 0.65);
      disc(x, y, r, (px, py) => (s > 0.78 && tipGold ? (px + py < x + y ? EMP.goldLight : EMP.gold) : shade(px, py, x, y)));
    }
  };
  const spread = [0.12, 0.5, 0.9][open];
  pincer(-1.15 - spread, 15, 3.6, true); // upper (moving) pincer
  pincer(-0.45 + spread * 0.25, 13, 3.2, true); // lower pincer
  // knuckle studs
  disc(10, 12, 1.1, EMP.gold);
  disc(13, 18, 1, EMP.gold);
  return g;
}

export function empLeg() {
  const g = grid(16, 6);
  const { disc } = P(g);
  for (let s = 0; s <= 1.0001; s += 0.05) {
    const x = 1 + s * 14;
    const y = 1.5 + s * s * 3.5;
    disc(x, y, 1.6 * (1 - s * 0.6), s > 0.45 && s < 0.55 ? EMP.navy : s > 0.85 ? EMP.gold : EMP.redDark);
  }
  return g;
}

export function empStalk() {
  const g = grid(8, 14);
  const { disc, px } = P(g);
  for (let y = 7; y < 14; y++) { px(3, y, EMP.mid); px(4, y, EMP.navy); }
  disc(3.5, 3.5, 3.5, (x, y) => (x + y < 5 ? EMP.white : '#d8dce6'));
  return g;
}

export function empCrown() {
  const g = grid(22, 13);
  const { px, disc } = P(g);
  for (let x = 1; x <= 20; x++) for (let y = 8; y <= 12; y++) px(x, y, y === 8 ? EMP.goldLight : y === 12 ? EMP.goldDark : EMP.gold);
  for (const [tx, h] of [[2, 4], [6, 6], [11, 8], [16, 6], [20, 4]]) {
    for (let k = 0; k < h; k++) {
      const w = Math.max(0, Math.floor((h - k) / 3));
      for (let o = -w; o <= w; o++) px(tx + o, 8 - k, o < 0 ? EMP.goldLight : EMP.gold);
    }
    disc(tx, 8 - h, 0.8, EMP.goldLight);
  }
  disc(11, 10, 1.6, EMP.gemRed);
  px(10, 9, EMP.white);
  disc(5, 10, 1, EMP.gemTeal);
  disc(17, 10, 1, EMP.gemTeal);
  return g;
}

export { hash as empHash };
