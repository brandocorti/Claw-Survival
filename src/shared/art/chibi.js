// Procedural chibi castaway sprites, built from traits (colors for now).
// Returns plain color grids (no canvas), so the server can reuse this in
// milestone 10 as the fallback when AI skin generation fails.
// Grid size: 14 x 16 pixels, before the client adds the 1 px dark outline.

export const CHIBI_WIDTH = 14;
export const CHIBI_HEIGHT = 16;

/** Default castaway: torn cream shirt, red bandana, blue shorts. */
export const DEFAULT_CHIBI_TRAITS = Object.freeze({
  skin: '#f2c29b',
  skinShade: '#d9966a',
  hair: '#5a3520',
  bandana: '#d9452b',
  shirt: '#f4e9d0',
  shirtShade: '#c9b892',
  shorts: '#3b6fa0',
  feet: '#8a5a3a',
  eyes: '#1a1212',
  blush: '#e8857a',
});

/** Directions with their own art. Left is the 'side' frame mirrored. */
export const CHIBI_DIRECTIONS = ['down', 'up', 'side'];
export const CHIBI_STEPS = 2;

/**
 * Draws one frame.
 * @param {Partial<typeof DEFAULT_CHIBI_TRAITS>} traits
 * @param {'down'|'up'|'side'} dir - 'side' faces right
 * @param {0|1} step - walk frame
 * @returns {(string|null)[][]} rows of CSS colors, null = transparent
 */
export function chibiFrame(traits, dir, step) {
  const t = { ...DEFAULT_CHIBI_TRAITS, ...traits };
  const g = Array.from({ length: CHIBI_HEIGHT }, () => Array(CHIBI_WIDTH).fill(null));
  const rect = (x0, y0, x1, y1, c) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = c;
  };
  const px = (x, y, c) => { g[y][x] = c; };

  // --- Legs (rows 13-15) ---
  if (dir === 'side') {
    if (step === 0) {
      rect(6, 13, 7, 14, t.skin);
      rect(6, 15, 8, 15, t.feet);
    } else {
      rect(4, 13, 5, 14, t.skinShade);
      rect(4, 15, 5, 15, t.feet);
      rect(8, 13, 9, 14, t.skin);
      rect(8, 15, 10, 15, t.feet);
    }
  } else if (step === 0) {
    rect(4, 13, 5, 14, t.skin);
    rect(8, 13, 9, 14, t.skin);
    rect(4, 15, 5, 15, t.feet);
    rect(8, 15, 9, 15, t.feet);
  } else {
    rect(4, 13, 5, 13, t.skin);
    rect(4, 14, 5, 14, t.feet);
    rect(8, 13, 9, 14, t.skin);
    rect(8, 15, 9, 15, t.feet);
  }

  // --- Body (rows 9-12): torn shirt, shorts, arms ---
  if (dir === 'side') {
    rect(5, 9, 9, 11, t.shirt);
    rect(5, 11, 9, 11, t.shirtShade);
    rect(5, 12, 9, 12, t.shorts);
    rect(7, 9, 7, 10, t.shirtShade);
    px(7, 11, t.skin);
  } else {
    rect(4, 9, 9, 11, t.shirt);
    rect(4, 11, 9, 11, t.shirtShade);
    px(5, 11, t.shirt); // torn hem
    px(8, 11, t.shirt);
    rect(4, 12, 9, 12, t.shorts);
    // sleeves and hands
    rect(3, 9, 3, 10, t.shirtShade);
    rect(10, 9, 10, 10, t.shirtShade);
    px(3, 11, t.skin);
    px(10, 11, t.skin);
  }

  // --- Head (rows 0-8): big chibi head ---
  rect(3, 1, 10, 1, t.skin);
  rect(2, 2, 11, 7, t.skin);
  rect(3, 8, 10, 8, t.skinShade);

  if (dir === 'down') {
    rect(4, 0, 9, 0, t.hair);
    rect(3, 1, 10, 1, t.hair);
    rect(2, 2, 11, 2, t.bandana);
    rect(2, 3, 4, 3, t.hair);
    rect(8, 3, 11, 3, t.hair);
    rect(2, 4, 2, 5, t.hair);
    rect(11, 4, 11, 5, t.hair);
    rect(4, 5, 4, 6, t.eyes);
    rect(9, 5, 9, 6, t.eyes);
    px(3, 7, t.blush);
    px(10, 7, t.blush);
    rect(6, 7, 7, 7, t.skinShade);
  } else if (dir === 'up') {
    rect(4, 0, 9, 0, t.hair);
    rect(3, 1, 10, 1, t.hair);
    rect(2, 2, 11, 7, t.hair);
    rect(2, 2, 11, 2, t.bandana);
    rect(6, 3, 7, 3, t.bandana); // knot
    px(5, 4, t.bandana);
    px(8, 4, t.bandana);
  } else {
    rect(4, 0, 9, 0, t.hair);
    rect(3, 1, 10, 1, t.hair);
    rect(2, 2, 11, 2, t.bandana);
    rect(2, 3, 10, 3, t.hair);
    rect(2, 4, 5, 7, t.hair);
    px(1, 3, t.bandana); // knot tails behind the head
    px(0, 4, t.bandana);
    rect(9, 5, 9, 6, t.eyes);
    px(10, 7, t.blush);
  }
  return g;
}
