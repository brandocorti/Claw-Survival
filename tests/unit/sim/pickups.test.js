import { describe, it, expect } from 'vitest';
import { createWorld, addPlayer, stepWorld, drainEvents } from '../../../src/shared/sim/world.js';
import { spawnPickup } from '../../../src/shared/sim/systems/pickups.js';
import { hasEffect } from '../../../src/shared/sim/systems/effects.js';
import { makeWorld, run, OPEN_ROOM, TEST_CONFIG, TEST_ENEMY_TYPES, TICK } from '../helpers/fixtures.js';

describe('buff pickups', () => {
  it('collects a pickup on touch, applies its effect, and emits pickupCollected', () => {
    const { world, player } = makeWorld();
    const pickup = spawnPickup(world, 'doubleXp', player.x + 4, player.y);
    expect(world.pickups.length).toBe(1);

    run(world, 1);
    expect(world.pickups.length).toBe(0);
    expect(hasEffect(player, 'doubleXp')).toBe(true);
    const events = drainEvents(world);
    expect(events.some((e) => e.type === 'pickupCollected' && e.id === pickup.id && e.effectId === 'doubleXp')).toBe(true);
  });

  it('despawns uncollected pickups when lifetime runs out', () => {
    const { world, player } = makeWorld();
    spawnPickup(world, 'doubleXp', player.x + 60, player.y, 1.0);
    expect(world.pickups.length).toBe(1);

    run(world, 62);
    expect(world.pickups.length).toBe(0);
    expect(hasEffect(player, 'doubleXp')).toBe(false);
  });

  it('spawns pickups periodically during waves and respects maxOnMap', () => {
    const config = {
      ...TEST_CONFIG,
      pickups: { ...TEST_CONFIG.pickups, initialDelay: 0.5, spawnInterval: 0.5, maxOnMap: 2, lifetime: 30 },
    };
    const world = createWorld({ config, arena: OPEN_ROOM, seed: 42, spawning: true, cards: false, enemyTypes: TEST_ENEMY_TYPES });
    const player = addPlayer(world, 'p1');
    player.invulnerableTime = 100; // keep alive while waves run

    // Step 2.0s (4 spawn intervals)
    for (let i = 0; i < 120; i++) stepWorld(world, { p1: { moveX: 0, moveY: 0, roll: false } }, TICK);
    expect(world.pickups.length).toBeLessThanOrEqual(2);
    expect(world.pickups.length).toBeGreaterThanOrEqual(1);
  });

  it('freezes pickup and effect timers while world.paused is true', () => {
    const world = createWorld({
      config: TEST_CONFIG,
      arena: OPEN_ROOM,
      spawning: false,
      cards: true,
      enemyTypes: TEST_ENEMY_TYPES,
    });
    const player = addPlayer(world, 'p1');
    const pickup = spawnPickup(world, 'doubleXp', player.x + 50, player.y, 5);
    player.pendingLevelUps = 1;

    // First step opens card choice and pauses world
    stepWorld(world, { p1: { moveX: 0, moveY: 0, roll: false } }, TICK);
    expect(world.paused).toBe(true);
    const lifeAfterOpen = pickup.life;

    // Subsequent ticks stay paused
    for (let i = 0; i < 30; i++) stepWorld(world, { p1: { moveX: 0, moveY: 0, roll: false } }, TICK);
    expect(pickup.life).toBe(lifeAfterOpen);
  });
});
