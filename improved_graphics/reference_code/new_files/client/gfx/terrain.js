// Upgrade 1 - baked terrain: organic shorelines with foam and depth, wet sand,
// tall shaded 3/4 cliff faces with vines, cast shadows, dithered sand with ripples.
// Collision is still the tile grid; only the picture changes.
import { TILE } from '../../shared/content/tiles.js';
import { tileAt } from '../../shared/sim/map.js';
import { valueNoise, bayer, boxBlur, hexRgb, hash2 } from './noise.js';

const C = Object.fromEntries(Object.entries({
  sand: '#e8c98a', sandMid: '#dfbd7d', sandDark: '#d4ad6a', sandLight: '#f6dfa8', ripple: '#d6b273',
  wet1: '#c9a265', wet2: '#b38a55', wet3: '#a07746', bank1: '#8f6a40', bank2: '#6e5032',
  shallow: '#56cfc2', water: '#22a7a6', waterDark: '#1b8a8e', deep: '#167683', waterLight: '#8debdd', foam: '#e6fff8',
  j0: '#244a26', j1: '#2c5a2c', j2: '#3e7a3a', j3: '#5a9a48', j4: '#7fbf5a', jEdge: '#1b331d',
  face0: '#97836b', face1: '#7d6b58', face2: '#66574a', strata: '#5a4c40', crack: '#3f352d', base: '#2a221d', faceHi: '#b3a088',
  vine: '#2c5a2c', vineHi: '#4f8f42',
}).map(([k, v]) => [k, hexRgb(v)]));

const FACE = 26; // cliff face height in pixels (taller than one tile)

/**
 * Bakes the arena floor into `frames` textures (water animates between them).
 * @returns {string[]} texture keys
 */
export function bakeTerrain(scene, map, keyPrefix = 'terrain', frames = 3) {
  const ts = map.tileSize;
  const W = map.width * ts;
  const H = map.height * ts;
  const tileOf = (x, y) => tileAt(map, Math.floor(x / ts), Math.floor(y / ts));

  const waterMask = new Float32Array(W * H);
  const cliff = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const t = tileOf(x, y);
      if (t === TILE.WATER) waterMask[y * W + x] = 1;
      if (t === TILE.CLIFF) cliff[y * W + x] = 1;
    }
  }
  const wf = boxBlur(boxBlur(waterMask, W, H, 5), W, H, 4);
  const wv = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    wv[i] = cliff[i] ? 0 : wf[i] + (valueNoise(x, y, 7, 3) - 0.5) * 0.14;
  }
  const isWater = (x, y) => x >= 0 && y >= 0 && x < W && y < H && wv[y * W + x] > 0.5;

  // Distance (down) from each cliff pixel to the open ground below it, per column.
  const dDown = new Int16Array(W * H).fill(999);
  const dUp = new Int16Array(W * H).fill(999); // sand: distance up to the cliff
  for (let x = 0; x < W; x++) {
    let d = 999;
    for (let y = H - 1; y >= 0; y--) {
      const i = y * W + x;
      d = cliff[i] ? d + 1 : 0;
      dDown[i] = cliff[i] ? d : 0;
    }
    d = 999;
    for (let y = 0; y < H; y++) {
      const i = y * W + x;
      d = cliff[i] ? 0 : d + 1;
      dUp[i] = d;
    }
  }
  // Rows where a column's face is actually long enough to be a face (bottom open).
  const base = new Uint8ClampedArray(W * H * 4);
  const put = (i, c) => { base[i * 4] = c[0]; base[i * 4 + 1] = c[1]; base[i * 4 + 2] = c[2]; base[i * 4 + 3] = 255; };
  const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const b = bayer(x, y);
      if (cliff[i]) {
        const dd = dDown[i];
        const openBelow = dd < 999;
        const sideOpen = (x > 0 && !cliff[i - 1]) || (x < W - 1 && !cliff[i + 1]);
        if (openBelow && dd <= FACE) {
          const fy = FACE - dd; // 0 = top of the face
          const vineLen = hash2(x >> 1, 7) < 0.3 ? 2 + Math.floor(hash2(x >> 1, 8) * 9) : 0;
          let c;
          if (fy <= 1) c = fy === 0 ? C.j3 : C.j2;
          else if (fy - 2 < vineLen) c = (fy + (x >> 1)) % 3 === 0 ? C.vineHi : C.vine;
          else if (dd <= 2) c = dd === 1 ? C.base : C.crack;
          else {
            const t = fy / FACE;
            const wob = Math.round(valueNoise(x, 0, 9, 4) * 4);
            const strata = (fy + wob) % 7 === 0;
            const aboveStrata = (fy + wob + 1) % 7 === 0;
            const crack = hash2(x >> 0, 99) < 0.06 && ((fy + Math.floor(hash2(x, 98) * 20)) % 20) < 7;
            if (strata || crack) c = crack ? C.crack : C.strata;
            else if (aboveStrata && hash2(x, fy, 5) < 0.5) c = C.faceHi;
            else c = t + (b - 0.5) * 0.35 < 0.45 ? C.face0 : t + (b - 0.5) * 0.35 < 0.8 ? C.face1 : C.face2;
          }
          if (sideOpen) c = C.crack;
          put(i, c);
        } else {
          // Canopy seen from above: round leafy bush clumps, lit from the top-left
          const cell = 10;
          const gx = Math.floor(x / cell);
          const gy = Math.floor(y / cell);
          let best = 1e9;
          let bdx = 0;
          let bdy = 0;
          let rad = 7;
          for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
            const cx = (gx + ox) * cell + hash2(gx + ox, gy + oy, 31) * cell;
            const cy = (gy + oy) * cell + hash2(gx + ox, gy + oy, 32) * cell;
            const r = 6 + hash2(gx + ox, gy + oy, 33) * 4;
            // prefer the clump whose surface is "highest" (lower on screen draws on top)
            const d = Math.hypot(x - cx, y - cy) / r - cy * 0.002;
            if (d < best) { best = d; bdx = x - cx; bdy = y - cy; rad = r; }
          }
          const rel = (bdx + bdy * 1.1) / rad + (b - 0.5) * 0.35;
          let c;
          if (best > 0.95) c = C.j0;
          else if (best > 0.8) c = bdy > 0 ? C.j0 : C.j1;
          else if (rel < -0.55) c = C.j4;
          else if (rel < -0.1) c = C.j3;
          else if (rel < 0.45) c = C.j2;
          else c = C.j1;
          if (hash2(x, y, 34) < 0.015 && c !== C.j0) c = C.j4;
          const edge = (x > 0 && !cliff[i - 1]) || (x < W - 1 && !cliff[i + 1]) || (y > 0 && !cliff[i - W]);
          if (edge) c = C.jEdge;
          put(i, c);
        }
        continue;
      }

      // Sand
      const n = valueNoise(x, y, 56, 11) * 0.7 + valueNoise(x, y, 18, 12) * 0.3 + (b - 0.5) * 0.08;
      let c = n < 0.34 ? C.sandMid : n > 0.7 ? C.sandLight : C.sand;
      const rip = Math.sin(x * 0.11 + y * 0.55 + valueNoise(x, y, 30, 9) * 9);
      if (rip > 0.94 && valueNoise(x, y, 60, 3) > 0.52) c = C.ripple;
      const h = hash2(x, y, 21);
      if (h < 0.006) c = C.sandDark;
      else if (h > 0.996) c = C.sandLight;
      // Wet sand ring near water
      const w = wv[i];
      if (w > 0.33) c = w + (b - 0.5) * 0.06 > 0.44 ? C.wet2 : w + (b - 0.5) * 0.08 > 0.38 ? C.wet1 : c;
      // Shadows cast by cliffs (light from the top-left)
      const up = dUp[i];
      let shade = 1;
      if (up <= 3) shade = 0.7;
      else if (up <= 8 && b < (9 - up) / 6) shade = 0.82;
      for (let k = 1; k <= 5 && shade > 0.7; k++) {
        if (x - k >= 0 && cliff[i - k]) { shade = Math.min(shade, k <= 2 ? 0.74 : b < 0.5 ? 0.84 : shade); break; }
      }
      put(i, shade < 1 ? mul(c, shade) : c);
    }
  }

  const keys = [];
  for (let f = 0; f < frames; f++) {
    const img = new Uint8ClampedArray(base);
    const ph = (f / frames) * Math.PI * 2;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const w = wv[i];
        if (w <= 0.5) continue;
        const b = bayer(x, y);
        let c;
        const land1 = !isWater(x, y - 1);
        const land2 = !isWater(x, y - 2);
        const land3 = !isWater(x, y - 3);
        if (land1) c = C.bank1;
        else if (land2) c = C.bank2;
        else if (land3) c = C.deep;
        else {
          const foamEdge = 0.535 + 0.02 * Math.sin(ph + valueNoise(x, y, 10, 5) * 6);
          if (w < foamEdge) c = C.foam;
          else if (w < foamEdge + 0.012 && b < 0.5) c = C.waterLight;
          else if (w + (b - 0.5) * 0.08 < 0.66) c = C.shallow;
          else if (w + (b - 0.5) * 0.1 < 0.86) c = C.water;
          else c = w + (b - 0.5) * 0.06 < 0.97 ? C.waterDark : C.deep;
          const wave = Math.sin(x * 0.3 + y * 0.8 + ph + valueNoise(x, y, 11, 6) * 7);
          if (wave > 0.97 && w > 0.62) c = C.waterLight;
          if (hash2(x, y, 40 + f) < 0.0016 && w > 0.6) c = C.foam;
        }
        // cliff shadow on water too
        if (dUp[i] <= 4) c = mul(c, 0.75);
        img[i * 4] = c[0]; img[i * 4 + 1] = c[1]; img[i * 4 + 2] = c[2]; img[i * 4 + 3] = 255;
      }
    }
    const key = `${keyPrefix}${f}`;
    const tex = scene.textures.createCanvas(key, W, H);
    tex.getContext().putImageData(new ImageData(img, W, H), 0, 0);
    tex.refresh();
    keys.push(key);
  }
  return keys;
}
