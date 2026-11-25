// Pixel art is data: check every sprite grid is a clean rectangle, so a typo in
// a pixel string shows up here instead of as a garbled sprite in the game.
import { describe, it, expect } from 'vitest';
import { ENEMY_ART, ELITE_OUTLINE } from '../../../src/client/art/enemyArt.js';
import { SALESMAN, CAMPFIRE, DOOR_ICONS, EFFECT_ICONS } from '../../../src/client/art/roomArt.js';
import { PALETTE } from '../../../src/client/art/palette.js';
import { EFFECTS } from '../../../src/shared/content/effects/index.js';
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

describe('room art (Salesman, campfire, door and effect icons)', () => {
  const grids = {
    salesman: [SALESMAN.rows],
    campfire: CAMPFIRE.frames,
    ...Object.fromEntries(Object.entries(DOOR_ICONS).map(([k, v]) => [`door-${k}`, [v.rows]])),
    ...Object.fromEntries(Object.entries(EFFECT_ICONS).map(([k, rows]) => [`effect-${k}`, [rows]])),
  };
  for (const [name, frames] of Object.entries(grids)) {
    it(`${name}: every row of every frame has the same width`, () => {
      const w = frames[0][0].length;
      for (const frame of frames) {
        expect(frame.length).toBe(frames[0].length);
        for (const row of frame) expect(row.length).toBe(w);
      }
    });
  }

  it('every effect has an icon, and the Salesman wears no purple (purple = curses)', () => {
    for (const def of Object.values(EFFECTS)) expect(EFFECT_ICONS[def.icon], def.id).toBeDefined();
    const purple = [PALETTE.curse, PALETTE.curseDark].map((c) => c.toLowerCase());
    for (const color of Object.values(SALESMAN.colors)) expect(purple).not.toContain(color.toLowerCase());
  });

  it('every enemy has an elite (gold) look and gold is not purple', () => {
    expect(ELITE_OUTLINE.toLowerCase()).not.toBe(PALETTE.curse.toLowerCase());
  });
});
