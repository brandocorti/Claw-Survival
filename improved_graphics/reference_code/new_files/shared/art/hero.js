// Upgrade H1/H2 prototype: bigger, higher-contrast castaway (18 x 23 before outline)
// with 4-frame walks in 3 directions, idle breathing + blink, hurt, and a tuck-roll.
// Pure color grids (no canvas), like chibi.js, so the server can reuse it for skins.

export const HERO_W = 18;
export const HERO_H = 23;

export const HERO_TRAITS = Object.freeze({
  skin: '#f2c29b', skinShade: '#d9966a', skinLight: '#ffe0c2',
  hair: '#5a3520', hairLight: '#80502c', hairDark: '#3a2012',
  bandana: '#d9452b', bandanaDark: '#9e2a18', bandanaLight: '#ff7a55',
  shirt: '#f4e9d0', shirtShade: '#c9b892',
  vest: '#2f7f9e', vestLight: '#55b4cc', vestDark: '#1d5468',
  shorts: '#2b3a5c', shortsShade: '#1c2640',
  rope: '#c9a45c', feet: '#8a5a3a', eyes: '#1a1212', white: '#ffffff', blush: '#e8857a', mouth: '#a0523a',
});

function blank(w = HERO_W, h = HERO_H) {
  return Array.from({ length: h }, () => Array(w).fill(null));
}

function painter(g) {
  const px = (x, y, c) => { if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = c; };
  const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) px(x, y, c); };
  return { px, rect };
}

/** Walk cycle: contact, pass, contact (other leg), pass. Body drops 1 px on contacts. */
const WALK = [
  { lift: 'L', drop: 1, arm: 1 },
  { lift: null, drop: 0, arm: 0 },
  { lift: 'R', drop: 1, arm: -1 },
  { lift: null, drop: 0, arm: 0 },
];

/**
 * @param {Partial<typeof HERO_TRAITS>} traits
 * @param {'down'|'up'|'side'} dir
 * @param {{ walk?: number, idle?: number, blink?: boolean, hurt?: boolean, tail?: number }} pose
 */
export function heroFrame(traits, dir, pose = {}) {
  const t = { ...HERO_TRAITS, ...traits };
  const g = blank();
  const { px, rect } = painter(g);
  const w = pose.walk != null ? WALK[pose.walk] : { lift: null, drop: 0, arm: 0 };
  const breathe = pose.idle === 1 ? 1 : 0;
  const d = w.drop; // upper body offset
  const tail = pose.tail ?? 0;

  // ---------- legs (fixed at the bottom: rows 20-22) ----------
  const leg = (x0, lifted, sandalExtra) => {
    if (lifted) { rect(x0, 20, x0 + 1, 20, t.skin); rect(x0 - sandalExtra, 21, x0 + 1 + (sandalExtra ? 0 : 0), 21, t.feet); }
    else { rect(x0, 20, x0 + 1, 21, t.skin); px(x0 + 1, 21, t.skinShade); rect(x0 - sandalExtra, 22, x0 + 1, 22, t.feet); }
  };
  if (dir === 'side') {
    if (w.lift === 'L') { rect(11, 20, 12, 21, t.skin); rect(11, 22, 13, 22, t.feet); rect(5, 20, 6, 20, t.skinShade); rect(4, 21, 6, 21, t.feet); }
    else if (w.lift === 'R') { rect(5, 20, 6, 21, t.skinShade); rect(5, 22, 7, 22, t.feet); rect(11, 20, 12, 20, t.skin); rect(11, 21, 13, 21, t.feet); }
    else { rect(7, 20, 8, 21, t.skinShade); rect(9, 20, 10, 21, t.skin); rect(7, 22, 11, 22, t.feet); }
  } else {
    leg(6, w.lift === 'L', 0);
    leg(10, w.lift === 'R', 0);
  }

  // ---------- shorts + torso (rows 12-19, shifted by d) ----------
  const y = (v) => v + d;
  if (dir === 'side') {
    rect(6, y(18), 12, y(19), t.shorts); rect(6, y(19), 12, y(19), t.shortsShade);
    rect(6, y(13) - breathe, 12, y(16), t.shirt);
    rect(6, y(13) - breathe, 8, y(16), t.vest); px(6, y(13) - breathe, t.vestLight); rect(6, y(16), 8, y(16), t.vestDark);
    rect(12, y(14), 12, y(16), t.shirtShade);
    rect(6, y(17), 12, y(17), t.rope);
    // front arm swings
    const ax = 9 + w.arm;
    rect(ax, y(14), ax + 1, y(16), t.skin); px(ax + 1, y(16), t.skinShade); rect(ax, y(17), ax + 1, y(17), t.skin);
    px(9, y(12), t.skinShade); px(10, y(12), t.skinShade);
  } else {
    rect(5, y(18), 12, y(19), t.shorts); rect(5, y(19), 12, y(19), t.shortsShade); px(8, y(19), t.shortsShade); px(9, y(19), null);
    rect(5, y(13) - breathe, 12, y(16), t.shirt);
    if (dir === 'down') {
      rect(5, y(13) - breathe, 7, y(16), t.vest); rect(10, y(13) - breathe, 12, y(16), t.vest);
      px(5, y(13) - breathe, t.vestLight); rect(5, y(14), 5, y(15), t.vestLight); rect(12, y(14), 12, y(16), t.vestDark);
      px(7, y(16), t.vestDark); px(10, y(16), t.vestDark);
      px(8, y(16), t.shirtShade); px(9, y(16), t.shirtShade); px(9, y(14), t.shirtShade);
    } else {
      rect(5, y(13) - breathe, 12, y(16), t.vest); px(5, y(13) - breathe, t.vestLight); rect(8, y(13), 9, y(16), t.vestDark); rect(12, y(14), 12, y(16), t.vestDark);
    }
    rect(5, y(17), 12, y(17), t.rope); px(9, y(17), t.bandanaDark);
    // arms (swing opposite to legs)
    const la = -w.arm;
    const ra = w.arm;
    rect(3, y(13) + la, 4, y(16) + la, t.skin); px(4, y(15) + la, t.skinShade); rect(3, y(17) + la, 4, y(17) + la, t.skinShade);
    rect(13, y(13) + ra, 14, y(16) + ra, t.skin); px(14, y(14) + ra, t.skinShade); px(14, y(15) + ra, t.skinShade); rect(13, y(17) + ra, 14, y(17) + ra, t.skinShade);
    rect(7, y(12), 10, y(12), t.skinShade);
  }

  // ---------- head (rows 0-11, shifted by d) ----------
  const H = (v) => v + d;
  if (dir === 'down') {
    rect(5, H(0), 12, H(0), t.hair);
    rect(3, H(1), 14, H(1), t.hair); rect(5, H(1), 7, H(1), t.hairLight);
    rect(2, H(2), 15, H(2), t.hair); rect(4, H(2), 6, H(2), t.hairLight);
    rect(2, H(3), 15, H(3), t.bandana); rect(4, H(3), 6, H(3), t.bandanaLight); px(15, H(3), t.bandanaDark);
    rect(3, H(4), 14, H(10), t.skin);
    rect(2, H(4), 10, H(4), t.hair); rect(4, H(4), 6, H(4), t.hairLight); rect(14, H(4), 15, H(4), t.hair);
    rect(2, H(5), 3, H(5), t.hair); rect(8, H(5), 10, H(5), t.hair); px(10, H(5), t.hairDark);
    rect(2, H(6), 2, H(8), t.hair); rect(15, H(5), 15, H(8), t.hairDark);
    rect(14, H(5), 14, H(10), t.skinShade); rect(4, H(11), 13, H(11), t.skinShade);
    px(4, H(5), t.skinLight);
    if (pose.hurt) {
      px(5, H(6), t.eyes); px(6, H(7), t.eyes); px(5, H(8), t.eyes);
      px(12, H(6), t.eyes); px(11, H(7), t.eyes); px(12, H(8), t.eyes);
      rect(8, H(9), 9, H(10), t.mouth);
    } else if (pose.blink) {
      rect(5, H(8), 6, H(8), t.eyes); rect(11, H(8), 12, H(8), t.eyes);
      rect(8, H(10), 9, H(10), t.mouth);
    } else {
      rect(5, H(6), 6, H(8), t.eyes); px(5, H(6), t.white);
      rect(11, H(6), 12, H(8), t.eyes); px(11, H(6), t.white);
      rect(8, H(10), 9, H(10), t.mouth);
    }
    px(4, H(9), t.blush); px(13, H(9), t.blush);
    // bandana tails flutter on the right
    px(16, H(3) + tail, t.bandana); px(17, H(4) + tail, t.bandanaDark); px(16, H(4), t.bandanaDark);
  } else if (dir === 'up') {
    rect(5, H(0), 12, H(0), t.hair);
    rect(3, H(1), 14, H(1), t.hair); rect(5, H(1), 7, H(1), t.hairLight);
    rect(2, H(2), 15, H(9), t.hair); rect(3, H(10), 14, H(10), t.hair); rect(4, H(2), 6, H(2), t.hairLight);
    rect(2, H(3), 15, H(3), t.bandana); rect(4, H(3), 6, H(3), t.bandanaLight);
    rect(8, H(3), 9, H(4), t.bandanaDark); // knot
    px(7, H(5), t.bandana); px(6, H(6) + tail, t.bandanaDark); px(10, H(5), t.bandana); px(11, H(6) + tail, t.bandanaDark);
    rect(4, H(5), 5, H(6), t.hairLight); px(4, H(7), t.hairLight); rect(14, H(5), 15, H(9), t.hairDark); rect(13, H(10), 14, H(10), t.hairDark);
    rect(5, H(11), 12, H(11), t.skinShade);
    px(2, H(7), t.skinShade); px(15, H(7), t.skinShade); // ears
  } else {
    // side, facing right
    rect(6, H(0), 12, H(0), t.hair);
    rect(4, H(1), 13, H(1), t.hair); rect(7, H(1), 9, H(1), t.hairLight);
    rect(3, H(2), 14, H(2), t.hair);
    rect(3, H(3), 14, H(3), t.bandana); rect(9, H(3), 11, H(3), t.bandanaLight);
    rect(4, H(4), 14, H(10), t.skin);
    rect(3, H(4), 7, H(8), t.hair); rect(3, H(9), 5, H(9), t.hair); rect(4, H(6), 5, H(8), t.hairDark); rect(5, H(4), 6, H(4), t.hairLight);
    rect(8, H(4), 9, H(4), t.hair); rect(12, H(4), 14, H(4), t.hair); px(14, H(5), t.hair);
    px(8, H(7), t.skinShade); px(8, H(8), t.skinShade); // ear
    px(15, H(8), t.skin); // nose
    rect(5, H(11), 13, H(11), t.skinShade); rect(4, H(10), 8, H(10), t.skinShade);
    if (pose.hurt) { px(12, H(6), t.eyes); px(13, H(7), t.eyes); px(12, H(8), t.eyes); rect(13, H(10), 14, H(10), t.mouth); }
    else if (pose.blink) { rect(12, H(8), 13, H(8), t.eyes); px(13, H(10), t.mouth); }
    else { rect(12, H(6), 13, H(8), t.eyes); px(12, H(6), t.white); px(13, H(10), t.mouth); }
    px(11, H(9), t.blush);
    // tails stream behind
    px(2, H(3), t.bandanaDark); px(1, H(4) + tail, t.bandana); px(0, H(5) + tail, t.bandanaDark); px(2, H(4), t.bandana);
  }
  return g;
}

/** Tucked ball for the roll; the client rotates it in 90-degree steps. */
export function heroRollBall(traits) {
  const t = { ...HERO_TRAITS, ...traits };
  const g = blank(16, 16);
  const { px, rect } = painter(g);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const dx = x - 7.5;
    const dy = y - 7.5;
    if (dx * dx + dy * dy > 56) continue;
    let c = dy < -1 ? t.hair : dy < 1 ? t.bandana : dy < 5 ? t.vest : t.shorts;
    if (dy < -4 && dx < -1) c = t.hairLight;
    if (dx > 4) c = dy < 1 ? t.hairDark : t.vestDark;
    g[y][x] = c;
  }
  rect(9, 9, 11, 11, t.skin); px(11, 11, t.skinShade); // knees
  rect(3, 11, 4, 12, t.skin); // hand
  px(2, 6, t.bandana); px(1, 7, t.bandanaDark);
  return g;
}

/** Rotates a square grid by 90 degrees clockwise, `times` times. */
export function rotateGrid(g, times) {
  let out = g;
  for (let k = 0; k < times; k++) {
    const n = out.length;
    out = Array.from({ length: n }, (_, y) => Array.from({ length: n }, (_, x) => out[n - 1 - x][y]));
  }
  return out;
}
