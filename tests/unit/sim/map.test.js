import { describe, it, expect } from 'vitest';
import { parseArena, tileAt, boxBlocked, pointBlocksBullet, moveBox } from '../../../src/shared/sim/map.js';
import { TILE } from '../../../src/shared/content/tiles.js';
import { BEACH_ARENA } from '../../../src/shared/content/arenas/beach.js';
import { OPEN_ROOM, OBSTACLE_ROOM } from '../helpers/fixtures.js';

describe('parseArena', () => {
  it('reads size, tiles and the spawn at the center of the P tile', () => {
    const map = parseArena(OPEN_ROOM, 16);
    expect(map.width).toBe(12);
    expect(map.height).toBe(8);
    expect(tileAt(map, 0, 0)).toBe(TILE.CLIFF);
    expect(tileAt(map, 1, 1)).toBe(TILE.SAND);
    expect(map.spawn).toEqual({ x: 5.5 * 16, y: 3.5 * 16 });
  });

  it('treats tiles outside the map as cliff', () => {
    const map = parseArena(OPEN_ROOM, 16);
    expect(tileAt(map, -1, 3)).toBe(TILE.CLIFF);
    expect(tileAt(map, 12, 3)).toBe(TILE.CLIFF);
  });

  it('rejects rows of different lengths', () => {
    expect(() => parseArena({ id: 'bad', rows: ['#P#', '##'] }, 16)).toThrow(/row 1/);
  });

  it('rejects unknown characters and a missing spawn', () => {
    expect(() => parseArena({ id: 'bad', rows: ['#P?'] }, 16)).toThrow(/unknown tile/);
    expect(() => parseArena({ id: 'bad', rows: ['#..#'] }, 16)).toThrow(/spawn/);
  });

  it('rejects a second spawn tile', () => {
    expect(() => parseArena({ id: 'bad', rows: ['#PP#'] }, 16)).toThrow(/more than one/);
  });

  it('parses the real beach arena with an open spawn', () => {
    const map = parseArena(BEACH_ARENA, 16);
    expect(map.width).toBeGreaterThan(30);
    expect(boxBlocked(map, map.spawn.x, map.spawn.y, 5)).toBe(false);
  });
});

describe('collision rules', () => {
  const map = parseArena(OBSTACLE_ROOM, 16);

  it('rocks block movement and bullets', () => {
    const rockCenter = { x: 4.5 * 16, y: 2.5 * 16 };
    expect(boxBlocked(map, rockCenter.x, rockCenter.y, 5)).toBe(true);
    expect(pointBlocksBullet(map, rockCenter.x, rockCenter.y)).toBe(true);
  });

  it('water blocks movement but not bullets', () => {
    const waterCenter = { x: 4.5 * 16, y: 4.5 * 16 };
    expect(boxBlocked(map, waterCenter.x, waterCenter.y, 5)).toBe(true);
    expect(pointBlocksBullet(map, waterCenter.x, waterCenter.y)).toBe(false);
  });

  it('moveBox stops flush against a wall', () => {
    // Start at x=40 (tile 2), move right 100 px toward the rock at tile 4 (x 64..80).
    const r = moveBox(map, 40, 2.5 * 16, 5, 100, 0);
    expect(r.hitX).toBe(true);
    expect(r.x).toBe(64 - 5);
  });

  it('moveBox does not tunnel through a 1-tile rock at high speed', () => {
    const r = moveBox(map, 40, 2.5 * 16, 5, 400, 0);
    expect(r.x).toBeLessThan(64);
  });
});
