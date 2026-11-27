// Comic-style "HIT!" word shown next to the player when they take damage.
// Chunky 2-pixel-stroke letters, slanted like a comic sound effect, with a thick
// dark outline and a drop shadow so the white reads on bright sand.
import { PALETTE as P } from './palette.js';

export const HIT_TEXT_KEY = 'hitText';

/** Bold glyphs, 7 rows tall, strokes 2 pixels wide. */
const GLYPHS = {
  H: ['##..##', '##..##', '##..##', '######', '##..##', '##..##', '##..##'],
  I: ['######', '..##..', '..##..', '..##..', '..##..', '..##..', '######'],
  T: ['######', '######', '..##..', '..##..', '..##..', '..##..', '..##..'],
  '!': ['##', '##', '##', '##', '##', '..', '##'],
};

/** Each glyph pixel becomes a PIXEL x PIXEL block. */
const PIXEL = 2;
/** Outline thickness and drop-shadow offset, in texture pixels. */
const OUTLINE = 2;
const SHADOW = 2;
/** Every this many texture rows up, the row shifts one pixel right (comic slant). */
const SLANT_EVERY = 3;
const GAP = 1;

/**
 * Builds the word as a grid of glyph pixels (the slant is added when drawing).
 * Pure (no canvas), so it can be unit-tested.
 * @param {string} word - letters must exist in GLYPHS
 * @returns {string[]} rows of '#' and '.', all the same width
 */
export function hitTextGrid(word = 'HIT!') {
  const rows = GLYPHS.H.length;
  const lines = Array.from({ length: rows }, () => '');
  [...word].forEach((ch, i) => {
    const glyph = GLYPHS[ch];
    if (!glyph) throw new Error(`hitText: no glyph for '${ch}'`);
    for (let y = 0; y < rows; y++) lines[y] += (i > 0 ? '.'.repeat(GAP) : '') + glyph[y];
  });
  return lines;
}

/**
 * How far right a texture row is pushed by the slant (top rows the most).
 * @param {number} y - texture row
 * @param {number} height - texture height
 * @returns {number} pixels
 */
export function slantShift(y, height) {
  return Math.floor((height - 1 - y) / SLANT_EVERY);
}

/**
 * Creates the "HIT!" texture once (white letters, dark outline, drop shadow).
 * @param {Phaser.Scene} scene
 */
export function createHitTextTexture(scene) {
  if (scene.textures.exists(HIT_TEXT_KEY)) return;
  const grid = hitTextGrid();
  const pad = OUTLINE;
  const flatW = grid[0].length * PIXEL + pad * 2 + SHADOW;
  const h = grid.length * PIXEL + pad * 2 + SHADOW;
  const w = flatW + slantShift(0, h);
  // Draw the word upright on a scratch canvas, then copy it row by row, shifted (slant).
  const flat = document.createElement('canvas');
  flat.width = flatW;
  flat.height = h;
  const ctx = flat.getContext('2d');
  const each = (fn) => grid.forEach((row, y) => [...row].forEach((c, x) => {
    if (c === '#') fn(pad + x * PIXEL, pad + y * PIXEL);
  }));
  const block = (dx, dy, grow) => each((x, y) => ctx.fillRect(x + dx - grow, y + dy - grow, PIXEL + grow * 2, PIXEL + grow * 2));

  ctx.fillStyle = P.outline;
  block(SHADOW, SHADOW, OUTLINE); // drop shadow
  block(0, 0, OUTLINE); // thick outline
  ctx.fillStyle = P.white; // letters
  block(0, 0, 0);

  const tex = scene.textures.createCanvas(HIT_TEXT_KEY, w, h);
  const out = tex.getContext();
  for (let y = 0; y < h; y++) out.drawImage(flat, 0, y, flatW, 1, slantShift(y, h), y, flatW, 1);
  tex.refresh();
}
