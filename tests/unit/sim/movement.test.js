import { describe, it, expect } from 'vitest';
import { stepWorld, drainEvents } from '../../../src/shared/sim/world.js';
import { makeWorld, input, run, TEST_CONFIG, TICK } from '../helpers/fixtures.js';

describe('movement', () => {
  it('moves at moveSpeed in a straight line', () => {
    const { world, player } = makeWorld();
    const startX = player.x;
    run(world, 30, input({ moveX: 1 })); // 0.5 s
    expect(player.x - startX).toBeCloseTo(TEST_CONFIG.player.moveSpeed * 0.5, 5);
  });

  it('diagonal movement is not faster than straight movement', () => {
    const { world, player } = makeWorld();
    const sx = player.x;
    const sy = player.y;
    run(world, 20, input({ moveX: 1, moveY: 1 }));
    const dist = Math.hypot(player.x - sx, player.y - sy);
    expect(dist).toBeCloseTo(TEST_CONFIG.player.moveSpeed * (20 / 60), 5);
  });

  it('stops flush against the outer walls', () => {
    const { world, player } = makeWorld();
    run(world, 300, input({ moveX: -1 }));
    // Left wall occupies x 0..16; box half-size 5 -> stops at x = 21.
    expect(player.x).toBe(16 + TEST_CONFIG.player.radius);
  });

  it('faces the walking direction when there is nothing to shoot', () => {
    const { world, player } = makeWorld();
    run(world, 2, input({ moveX: -1 }));
    expect(player.aim).toBeCloseTo(Math.PI, 5);
  });

  it('a dead player does not move', () => {
    const { world, player } = makeWorld();
    player.alive = false;
    const x = player.x;
    run(world, 10, input({ moveX: 1 }));
    expect(player.x).toBe(x);
  });
});

describe('dodge roll', () => {
  const roll = TEST_CONFIG.player.roll;

  it('rolls in the movement direction, faster than walking, and emits a roll event', () => {
    const { world, player } = makeWorld();
    const startX = player.x;
    stepWorld(world, { p1: input({ moveX: 1, roll: true }) }, TICK);
    expect(player.rolling).toBe(true);
    expect(player.x - startX).toBeCloseTo(roll.speed * TICK, 5);
    expect(drainEvents(world).some((e) => e.type === 'roll')).toBe(true);
  });

  it('rolls the way the player faces when standing still', () => {
    const { world, player } = makeWorld();
    player.aim = Math.PI / 2;
    stepWorld(world, { p1: input({ roll: true }) }, TICK);
    expect(player.rollDirX).toBeCloseTo(0, 5);
    expect(player.rollDirY).toBeCloseTo(1, 5);
  });

  it('is invulnerable at the start of the roll, then not', () => {
    const { world, player } = makeWorld();
    stepWorld(world, { p1: input({ moveX: 1, roll: true }) }, TICK);
    expect(player.invulnerableTime).toBeGreaterThan(0);
    run(world, Math.ceil(roll.invulnerableTime * 60) + 1);
    expect(player.invulnerableTime).toBe(0);
  });

  it('cannot roll again until the cooldown after the roll has passed', () => {
    const { world, player } = makeWorld();
    stepWorld(world, { p1: input({ moveY: 1, roll: true }) }, TICK);
    run(world, Math.ceil(roll.duration * 60));
    expect(player.rolling).toBe(false);

    stepWorld(world, { p1: input({ moveY: 1, roll: true }) }, TICK);
    expect(player.rolling).toBe(false); // still cooling down

    run(world, Math.ceil(roll.cooldown * 60));
    stepWorld(world, { p1: input({ moveY: -1, roll: true }) }, TICK);
    expect(player.rolling).toBe(true);
  });

  it('ends after the roll duration', () => {
    const { world, player } = makeWorld();
    stepWorld(world, { p1: input({ moveX: 1, roll: true }) }, TICK);
    run(world, Math.ceil(roll.duration * 60), input({ moveX: 1 }));
    expect(player.rolling).toBe(false);
  });
});
