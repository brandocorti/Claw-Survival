import { describe, it, expect } from 'vitest';
import { xpToNextLevel, grantXp, dropGems } from '../../../src/shared/sim/systems/xp.js';
import { drainEvents } from '../../../src/shared/sim/world.js';
import { makeWorld, run, TEST_CONFIG } from '../helpers/fixtures.js';

const curve = TEST_CONFIG.xp.curve;

describe('XP curve', () => {
  it('matches the documented values: L1 5, L2 8, L5 22, L10 52', () => {
    expect(xpToNextLevel(1, curve)).toBe(5);
    expect(xpToNextLevel(2, curve)).toBe(8);
    expect(xpToNextLevel(5, curve)).toBe(22);
    expect(xpToNextLevel(10, curve)).toBe(52);
  });

  it('always increases', () => {
    for (let l = 1; l < 50; l++) expect(xpToNextLevel(l + 1, curve)).toBeGreaterThan(xpToNextLevel(l, curve));
  });
});

describe('levelling', () => {
  it('a big XP gain levels up several times and keeps the leftover', () => {
    const { world, player } = makeWorld();
    grantXp(world, player, 5 + 8 + 3); // L1->2 costs 5, L2->3 costs 8
    expect(player.level).toBe(3);
    expect(player.xp).toBe(3);
    expect(player.pendingLevelUps).toBe(2);
    expect(drainEvents(world).filter((e) => e.type === 'levelUp').map((e) => e.level)).toEqual([2, 3]);
  });
});

describe('gems', () => {
  it('XP is split into the largest gems first', () => {
    const { world } = makeWorld();
    dropGems(world, 50, 50, 27);
    expect(world.gems.map((g) => g.value).sort((a, b) => b - a)).toEqual([20, 5, 1, 1]);
  });

  it('gems near the player fly to them and are collected', () => {
    const { world, player } = makeWorld();
    dropGems(world, player.x + 20, player.y, 6);
    run(world, 60);
    expect(world.gems.length).toBe(0);
    expect(player.level).toBe(2); // 6 XP: level up at 5
    expect(player.xp).toBe(1);
  });

  it('gems out of pickup range stay on the ground', () => {
    const { world, player } = makeWorld();
    dropGems(world, player.x + 80, player.y, 1);
    run(world, 60);
    expect(world.gems.length).toBe(1);
    expect(player.xp).toBe(0);
  });

  it('dead players do not collect gems', () => {
    const { world, player } = makeWorld();
    player.alive = false;
    dropGems(world, player.x + 10, player.y, 1);
    run(world, 60);
    expect(world.gems.length).toBe(1);
  });
});
