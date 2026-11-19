// Pixel art is data: check every sprite grid is a clean rectangle, so a typo in
// a pixel string shows up here instead of as a garbled sprite in the game.
import { describe, it, expect } from 'vitest';
import { ENEMY_ART } from '../../../src/client/art/enemyArt.js';
import { chibiFrame, CHIBI_DIRECTIONS, CHIBI_WIDTH, CHIBI_HEIGHT } from '../../../src/shared/art/chibi.js';
import { CONFIG } from '../../../src/shared/config.js';
import { ENEMY_TYPES } from '../../../src/shared/content/enemies/index.js';

describe('enemy art', () => {
  for (const [type, art] of Object.entries(ENEMY_ART)) {
    it(`${type}: every row of every frame has the same width, and frames match in size`, () => {
      const w = art.frames[0][0].length;
      const h = art.frames[0].length;
      for (const frame of art.frames) {
        expect(frame.length).toBe(h);
        for (const row of frame) expect(row.length).toBe(w);
      }
    });

    it(`${type}: uses only colors it defines`, () => {
      const chars = new Set(art.frames.flat().join('').replace(/\./g, ''));
      for (const ch of chars) expect(art.colors[ch], `color '${ch}'`).toBeDefined();
    });
  }

  it('every enemy in the config has a behaviour and art', () => {
    for (const type of Object.keys(CONFIG.enemies)) {
      expect(ENEMY_TYPES[type], type).toBeDefined();
      expect(ENEMY_ART[type], type).toBeDefined();
    }
  });
});

describe('chibi castaway', () => {
  it('every direction and step is a full-size grid', () => {
    for (const dir of CHIBI_DIRECTIONS) {
      for (const step of [0, 1]) {
        const g = chibiFrame({}, dir, step);
        expect(g.length).toBe(CHIBI_HEIGHT);
        for (const row of g) expect(row.length).toBe(CHIBI_WIDTH);
      }
    }
  });
});
