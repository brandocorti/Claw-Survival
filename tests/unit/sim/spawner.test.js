import { describe, it, expect } from 'vitest';
import {
  spawnRate, healthScale, roundLength, pickEnemyType, findSpawnPoint,
} from '../../../src/shared/sim/systems/spawner.js';
import { boxBlocked } from '../../../src/shared/sim/map.js';
import { makeWorld, run, runCollect, BIG_ROOM, TEST_CONFIG } from '../helpers/fixtures.js';

const C = TEST_CONFIG;
const ticksFor = (seconds) => Math.round(seconds * 60);

describe('formulas', () => {
  it('spawn rate grows per round and within a round', () => {
    expect(spawnRate(C, 1, 0)).toBeCloseTo(1);
    expect(spawnRate(C, 1, 1)).toBeCloseTo(2); // rampWithinRound 1 = double by the end
    expect(spawnRate(C, 3, 0)).toBeCloseTo(2); // 1 + 0.5 * 2
  });

  it('enemy health grows per round', () => {
    expect(healthScale(C, 1)).toBe(1);
    expect(healthScale(C, 3)).toBe(2);
  });

  it('rounds split the match evenly', () => {
    expect(roundLength(C)).toBe(20);
  });
});

describe('rounds', () => {
  it('announces round 1, then each new round on time', () => {
    const { world, player } = makeWorld({ arena: BIG_ROOM, spawning: true });
    player.invulnerableTime = 9999; // spawning stops if the player dies
    const events = runCollect(world, ticksFor(41));
    expect(events.filter((e) => e.type === 'roundStarted').map((e) => e.round)).toEqual([1, 2, 3]);
    expect(world.match.round).toBe(3);
  });

  it('nothing spawns during the break at the start of a round', () => {
    const { world } = makeWorld({ arena: BIG_ROOM, spawning: true });
    run(world, ticksFor(C.rounds.breakSeconds - 0.1));
    expect(world.enemies.length).toBe(0);
    run(world, ticksFor(1.5));
    expect(world.enemies.length).toBeGreaterThan(0);
  });

  it('never has more than maxAlive enemies', () => {
    const { world, player } = makeWorld({ arena: BIG_ROOM, spawning: true });
    player.health = 9999;
    player.maxHealth = 9999;
    let most = 0;
    for (let i = 0; i < ticksFor(30); i++) {
      run(world, 1);
      player.invulnerableTime = 1; // keep the player alive so spawning continues
      most = Math.max(most, world.enemies.length);
    }
    expect(most).toBe(C.spawning.maxAlive);
  });

  it('the Crab King appears near the end of a boss round, once', () => {
    const { world, player } = makeWorld({ arena: BIG_ROOM, spawning: true });
    player.invulnerableTime = 9999;
    const events = runCollect(world, ticksFor(2 * 20 + (20 - C.rounds.bossAtSecondsLeft) - 0.5));
    expect(events.some((e) => e.type === 'bossSpawned')).toBe(false);
    const later = runCollect(world, ticksFor(4));
    expect(later.filter((e) => e.type === 'bossSpawned').length).toBe(1);
    expect(world.enemies.some((e) => e.type === 'crabKing')).toBe(true);
  });

  it('stops spawning once the player is dead', () => {
    const { world, player } = makeWorld({ arena: BIG_ROOM, spawning: true });
    run(world, ticksFor(5));
    player.alive = false;
    const count = world.enemies.length;
    run(world, ticksFor(5));
    expect(world.enemies.length).toBeLessThanOrEqual(count);
  });
});

describe('spawn choice', () => {
  it('only picks enemy types listed for the round', () => {
    const { world } = makeWorld();
    for (let i = 0; i < 50; i++) expect(pickEnemyType(world, 1)).toBe('crab');
    const types = new Set(Array.from({ length: 200 }, () => pickEnemyType(world, 5)));
    expect([...types].sort()).toEqual(['coconut', 'crab']);
  });

  it('spawn points are open ground at a fair distance from the player', () => {
    const { world, player } = makeWorld({ arena: BIG_ROOM });
    world.flowField.update([player]);
    for (let i = 0; i < 100; i++) {
      const p = findSpawnPoint(world, C.enemies.crab);
      expect(p).not.toBe(null);
      expect(boxBlocked(world.map, p.x, p.y, C.enemies.crab.radius)).toBe(false);
      expect(Math.hypot(p.x - player.x, p.y - player.y)).toBeGreaterThanOrEqual(C.spawning.minDistance * 0.6);
    }
  });
});
