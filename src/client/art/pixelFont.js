// Tiny 3x5 pixel font with a dark outline, generated in code so text stays crisp
// at 480x270. Uppercase only: addPixelText() converts text for you.
import * as Phaser from 'phaser';
import { PALETTE as P } from './palette.js';

export const PIXEL_FONT = 'pixelfont';

const GLYPHS = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'],
  C: ['.##', '#..', '#..', '#..', '.##'], D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'],
  I: ['###', '.#.', '.#.', '.#.', '###'], J: ['..#', '..#', '..#', '#.#', '.#.'],
  K: ['#.#', '#.#', '##.', '#.#', '#.#'], L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#.#', '###', '###', '#.#', '#.#'], N: ['##.', '#.#', '#.#', '#.#', '#.#'],
  O: ['.#.', '#.#', '#.#', '#.#', '.#.'], P: ['##.', '#.#', '##.', '#..', '#..'],
  Q: ['.#.', '#.#', '#.#', '##.', '.##'], R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'], V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
  W: ['#.#', '#.#', '###', '###', '#.#'], X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], Z: ['###', '..#', '.#.', '#..', '###'],
  0: ['###', '#.#', '#.#', '#.#', '###'], 1: ['.#.', '##.', '.#.', '.#.', '###'],
  2: ['##.', '..#', '.#.', '#..', '###'], 3: ['##.', '..#', '.#.', '..#', '##.'],
  4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '##.', '..#', '##.'],
  6: ['.##', '#..', '###', '#.#', '###'], 7: ['###', '..#', '.#.', '.#.', '.#.'],
  8: ['###', '#.#', '###', '#.#', '###'], 9: ['###', '#.#', '###', '..#', '##.'],
  ' ': ['...', '...', '...', '...', '...'], '.': ['...', '...', '...', '...', '.#.'],
  ',': ['...', '...', '...', '.#.', '#..'], ':': ['...', '.#.', '...', '.#.', '...'],
  '!': ['.#.', '.#.', '.#.', '...', '.#.'], '?': ['##.', '..#', '.#.', '...', '.#.'],
  '-': ['...', '...', '###', '...', '...'], '+': ['...', '.#.', '###', '.#.', '...'],
  '/': ['..#', '..#', '.#.', '#..', '#..'], "'": ['.#.', '.#.', '...', '...', '...'],
  '(': ['.#.', '#..', '#..', '#..', '.#.'], ')': ['.#.', '..#', '..#', '..#', '.#.'],
  '[': ['##.', '#..', '#..', '#..', '##.'], ']': ['.##', '..#', '..#', '..#', '.##'],
  '%': ['#.#', '..#', '.#.', '#..', '#.#'], '=': ['...', '###', '...', '###', '...'],
  '<': ['..#', '.#.', '#..', '.#.', '..#'], '>': ['#..', '.#.', '..#', '.#.', '#..'],
  $: ['.##', '##.', '.#.', '.##', '##.'],
  '*': ['#.#', '.#.', '#.#', '...', '...'],
};

const CELL_W = 5; // 3 px glyph + 1 px outline each side
const CELL_H = 7;
const PER_ROW = 16;

/**
 * Builds the font texture and registers it as a bitmap font. Call once, in BootScene.
 * @param {Phaser.Scene} scene
 */
export function createPixelFont(scene) {
  const chars = Object.keys(GLYPHS).join('');
  const rows = Math.ceil(chars.length / PER_ROW);
  const tex = scene.textures.createCanvas(PIXEL_FONT, CELL_W * PER_ROW, CELL_H * rows);
  const ctx = tex.getContext();

  [...chars].forEach((ch, i) => {
    const ox = (i % PER_ROW) * CELL_W;
    const oy = Math.floor(i / PER_ROW) * CELL_H;
    const glyph = GLYPHS[ch];
    // outline pass, then the white glyph on top
    ctx.fillStyle = P.outline;
    glyph.forEach((row, y) => [...row].forEach((c, x) => {
      if (c === '#') ctx.fillRect(ox + x, oy + y, 3, 3);
    }));
    ctx.fillStyle = P.white;
    glyph.forEach((row, y) => [...row].forEach((c, x) => {
      if (c === '#') ctx.fillRect(ox + x + 1, oy + y + 1, 1, 1);
    }));
  });
  tex.refresh();

  const fontData = Phaser.GameObjects.RetroFont.Parse(scene, {
    image: PIXEL_FONT,
    width: CELL_W,
    height: CELL_H,
    chars,
    charsPerRow: PER_ROW,
    spacing: { x: 0, y: 0 },
    offset: { x: 0, y: 0 },
    lineSpacing: 1,
  });
  scene.cache.bitmapFont.add(PIXEL_FONT, fontData);
}

/**
 * Adds outlined pixel text.
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {string} text
 */
export function addPixelText(scene, x, y, text) {
  return scene.add.bitmapText(x, y, PIXEL_FONT, String(text).toUpperCase()).setLetterSpacing(-1);
}
