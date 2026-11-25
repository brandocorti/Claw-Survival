import { describe, it, expect } from 'vitest';
import { heroFrame, heroRollBall, rotateGrid, HERO_TRAITS, HERO_SKINS, HERO_W, HERO_H } from '../../../src/shared/art/hero.js';
import { empBody, empClaw, empLeg, empStalk, empCrown } from '../../../src/shared/art/emperor.js';

const isClean = (grid, w, h) => {
  expect(grid.length).toBe(h);
  for (const row of grid) {
    expect(row.length).toBe(w);
    for (const c of row) if (c !== null) expect(c).toMatch(/^#[0-9a-f]{6}$/);
  }
};
const poses = [
  ...[0, 1, 2, 3].map((walk) => ({ walk, tail: walk % 2 })), { idle: 0 }, { idle: 1, tail: 1 }, { blink: true }, { hurt: true },
];

describe('hero art', () => {
  it.each(['down', 'up', 'side'])('%s: every pose is a clean 18x23 grid, for every skin', (dir) => {
    for (const skin of Object.values(HERO_SKINS)) for (const pose of poses) isClean(heroFrame(skin, dir, pose), HERO_W, HERO_H);
  });

  it.each(['down', 'up', 'side'])('%s: the four walk frames are not all the same', (dir) => {
    const frames = new Set([0, 1, 2, 3].map((walk) => JSON.stringify(heroFrame({}, dir, { walk }))));
    expect(frames.size).toBeGreaterThanOrEqual(3);
  });

  it('skins only use traits that exist, and change the picture', () => {
    const base = JSON.stringify(heroFrame({}, 'down'));
    for (const [name, skin] of Object.entries(HERO_SKINS)) {
      for (const key of Object.keys(skin)) expect(HERO_TRAITS, `${name}.${key}`).toHaveProperty(key);
      if (name !== 'castaway') expect(JSON.stringify(heroFrame(skin, 'down'))).not.toBe(base);
    }
  });

  it('the roll ball is 16x16 and four quarter turns bring it back', () => {
    const ball = heroRollBall({});
    isClean(ball, 16, 16);
    expect(rotateGrid(ball, 4)).toEqual(ball);
    expect(rotateGrid(ball, 1)).not.toEqual(ball);
  });
});

describe('Crab Emperor art', () => {
  it('every part has its designed size', () => {
    isClean(empBody(false), 52, 32);
    isClean(empBody(true), 52, 32);
    for (const k of [0, 1, 2]) isClean(empClaw(k), 30, 26);
    isClean(empLeg(), 16, 6);
    isClean(empStalk(), 8, 14);
    isClean(empCrown(), 22, 13);
  });

  it('phase two shows cracks', () => {
    expect(empBody(true)).not.toEqual(empBody(false));
  });

  it('nothing in the new art is purple (reserved for curses)', () => {
    const grids = [empBody(true), empClaw(2), empLeg(), empStalk(), empCrown(), heroRollBall({})];
    for (const dir of ['down', 'up', 'side']) for (const skin of Object.values(HERO_SKINS)) grids.push(heroFrame(skin, dir));
    for (const c of new Set(grids.flat(2).filter(Boolean))) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
      const purple = r > g * 1.35 && b > g * 1.35 && Math.min(r, b) > 70;
      expect(purple, c).toBe(false);
    }
  });
});
