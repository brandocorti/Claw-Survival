// Pixel art is data: check every sprite grid is a clean rectangle, so a typo in
// a pixel string shows up here instead of as a garbled sprite in the game.
import { describe, it, expect } from 'vitest';
import { ENEMY_ART } from '../../../src/client/art/enemyArt.js';
import { CARD_ICONS, CARD_ICON_COLORS } from '../../../src/client/art/cardArt.js';
import { ABILITY_TYPES } from '../../../src/shared/content/abilities/index.js';
import { wrapText } from '../../../src/client/ui/wrapText.js';
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

describe('ability cards', () => {
  it('every ability has config, code and an icon, and nothing is left over', () => {
    const ids = Object.keys(ABILITY_TYPES).sort();
    expect(Object.keys(CONFIG.abilities).sort()).toEqual(ids);
    expect(Object.keys(CARD_ICONS).sort()).toEqual(ids);
  });

  it('icons are 11x11 and use only defined colors', () => {
    for (const [id, rows] of Object.entries(CARD_ICONS)) {
      expect(rows.length, id).toBe(11);
      for (const row of rows) expect(row.length, id).toBe(11);
      for (const ch of new Set(rows.join('').replace(/\./g, ''))) expect(CARD_ICON_COLORS[ch], `${id} '${ch}'`).toBeDefined();
    }
  });

  it('card text fits the card (3 lines of 26 characters) and uses characters the font has', () => {
    for (const [id, def] of Object.entries(ABILITY_TYPES)) {
      const cfg = CONFIG.abilities[id];
      expect(def.name.length, id).toBeLessThanOrEqual(26);
      for (let level = 1; level <= cfg.maxLevel; level++) {
        const text = def.describe(level, cfg);
        expect(text).not.toMatch(/undefined|NaN/);
        expect(text.toUpperCase()).toMatch(/^[A-Z0-9 .,:!?\-+/'()%=]+$/);
        const lines = wrapText(text, 26).split('\n');
        expect(lines.length, text).toBeLessThanOrEqual(3);
        for (const line of lines) expect(line.length, text).toBeLessThanOrEqual(26);
      }
    }
  });
});
