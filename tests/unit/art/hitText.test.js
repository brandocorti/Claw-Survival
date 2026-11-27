// The comic "HIT!" word is pixel data: check it builds a clean, slanted rectangle.
import { describe, it, expect } from 'vitest';
import { hitTextGrid, slantShift } from '../../../src/client/art/hitText.js';

describe('hit text', () => {
  it('builds a rectangle: every row has the same width', () => {
    const grid = hitTextGrid();
    expect(grid.length).toBe(7);
    for (const row of grid) expect(row.length).toBe(grid[0].length);
  });

  it('is slanted: top rows shift right, the bottom row not at all, and never back left', () => {
    const h = 20;
    expect(slantShift(h - 1, h)).toBe(0);
    expect(slantShift(0, h)).toBeGreaterThan(0);
    for (let y = 1; y < h; y++) expect(slantShift(y, h)).toBeLessThanOrEqual(slantShift(y - 1, h));
  });

  it('rejects letters it has no glyph for', () => {
    expect(() => hitTextGrid('OUCH')).toThrow();
  });
});
