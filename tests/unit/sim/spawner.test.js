// Enemy spawning in fight rooms: a fixed budget split into waves, scaled by depth.
// Rewritten for the room-based run (2026-11-25). The old timed-round tests map to:
//   "spawn rate grows per round"       -> "the budget is split into waves..." + "a fight room spawns exactly its budget"
//   "enemy health grows per round"     -> "enemies at depth 10 have more health and damage than at depth 0"
//   "rounds split the match evenly"    -> "the budget is split into waves..."
//   "announces each round on time"     -> "announces each wave; the next wave comes early when the room is empty"
//   "nothing spawns during the break"  -> "nothing spawns before the first wave delay"
//   "never more than maxAlive"         -> kept, now with a wave bigger than the cap
//   "Crab King near the end of round"  -> "the Crab King appears in the 8th fight room, once"
//   "stops once the player is dead"    -> kept
import { describe, it, expect } from 'vitest';
import { pickEnemyType, findSpawnPoint, spawnEnemy } from '../../../src/shared/sim/systems/spawner.js';
import { splitBudget } from '../../../src/shared/sim/systems/roomSpawner.js';
import { difficultyAt, scaleDamage } from '../../../src/shared/sim/systems/difficulty.js';
import { killEnemy } from '../../../src/shared/sim/systems/damage.js';
import { boxBlocked } from '../../../src/shared/sim/map.js';
import { CONFIG } from '../../../src/shared/config.js';
import { makeWorld, makeRun, run, runCollect, BIG_ROOM, TEST_CONFIG } from '../helpers/fixtures.js';

const C = TEST_CONFIG;
const ticksFor = (seconds) => Math.round(seconds * 60);

/** Config whose enemies are target dummies, so the player's auto-fire barely thins them. */
function dummyConfig(overrides = {}) {
  return {
    ...C,
    difficulty: { ...C.difficulty, enemyWeightsByDepth: [{ fromDepth: 0, weights: { dummy: 1 } }], ...overrides },
  };
}

function killAll(world) {
  for (const e of world.enemies) if (!e.dead) killEnemy(world, e, 'p1');
}

describe('room budget', () => {
  it('the budget is split into waves that add up to it, later waves never smaller', () => {
    expect(splitBudget(10, 2)).toEqual([5, 5]);
    expect(splitBudget(11, 3)).toEqual([3, 4, 4]);
    expect(splitBudget(2, 5)).toEqual([1, 1]);
    for (let b = 1; b < 40; b++) {
      for (let w = 1; w <= 5; w++) {
        const waves = splitBudget(b, w);
        expect(waves.reduce((s, n) => s + n, 0)).toBe(b);
        for (let i = 1; i < waves.length; i++) expect(waves[i]).toBeGreaterThanOrEqual(waves[i - 1]);
      }
    }
  });

  it('a fight room spawns exactly its budget, then nothing more', () => {
    const { world, player } = makeRun({ spawning: true });
    player.invulnerableTime = 9999;
    const events = runCollect(world, ticksFor(60));
    const spawned = events.filter((e) => e.type === 'enemySpawning').length;
    expect(spawned).toBe(difficultyAt(C, 0).budget);
    expect(world.run.room.cleared).toBe(true);
  });

  it('nothing spawns before the first wave delay', () => {
    const { world } = makeRun({ spawning: true });
    run(world, ticksFor(C.rooms.firstWaveDelay) - 2);
    expect(world.enemies.length).toBe(0);
    run(world, 4);
    expect(world.enemies.length).toBeGreaterThan(0);
  });

  it('announces each wave; the next wave comes early when the room is empty', () => {
    const { world, player } = makeRun({ spawning: true, config: dummyConfig() });
    player.invulnerableTime = 9999;
    const first = runCollect(world, ticksFor(C.rooms.firstWaveDelay) + 1);
    expect(first.filter((e) => e.type === 'waveStarted').map((e) => e.wave)).toEqual([1]);
    killAll(world);
    const next = runCollect(world, 2); // far less than the wave gap
    expect(next.filter((e) => e.type === 'waveStarted').map((e) => e.wave)).toEqual([2]);
  });

  it('never has more than maxAlive enemies; the rest of the wave waits for room', () => {
    const config = dummyConfig({ baseEnemies: 18, baseWaves: 1 });
    const { world, player } = makeRun({ spawning: true, config });
    player.invulnerableTime = 9999;
    let most = 0;
    for (let i = 0; i < ticksFor(3); i++) {
      run(world, 1);
      most = Math.max(most, world.enemies.length);
    }
    expect(most).toBe(C.spawning.maxAlive);
    expect(world.run.spawn.queued).toBe(18 - C.spawning.maxAlive);
    killAll(world);
    run(world, 2);
    expect(world.run.spawn.queued).toBe(0);
    expect(world.run.room.cleared).toBe(false); // the waiting enemies are out now
  });

  it('the room clears only when the budget is spent and no enemy is alive', () => {
    const { world, player } = makeRun({ spawning: true, config: dummyConfig() });
    player.invulnerableTime = 9999;
    run(world, ticksFor(C.rooms.firstWaveDelay) + 1);
    expect(world.run.spawn.budgetLeft).toBeGreaterThan(0);
    killAll(world); // wave 1 dead, but budget left: wave 2 comes instead of the clear
    const events = runCollect(world, 1);
    expect(events.some((e) => e.type === 'roomCleared')).toBe(false);
    expect(events.some((e) => e.type === 'waveStarted' && e.wave === 2)).toBe(true);
    expect(world.run.room.cleared).toBe(false);
    run(world, 2);
    killAll(world); // wave 2 (the last) dead
    run(world, 1);
    expect(world.run.room.cleared).toBe(true);
  });

  it('the Crab King appears in the 8th fight room, once, and not in the 1st', () => {
    const first = makeRun({ spawning: true });
    first.player.invulnerableTime = 9999;
    expect(runCollect(first.world, ticksFor(5)).some((e) => e.type === 'bossSpawned')).toBe(false);

    const { world, player } = makeRun({ spawning: true, depth: C.rooms.bossAtFightRoom - 1 });
    player.invulnerableTime = 9999;
    expect(world.run.room.boss).toBe(true);
    const events = runCollect(world, ticksFor(10));
    expect(events.filter((e) => e.type === 'bossSpawned').length).toBe(1);
    // The first Crab King is not scaled by depth.
    const king = world.enemies.find((e) => e.type === 'crabKing');
    expect(king.maxHp).toBe(C.enemies.crabKing.hp);
  });

  it('stops spawning once the player is dead', () => {
    const { world, player } = makeRun({ spawning: true, config: dummyConfig() });
    run(world, ticksFor(C.rooms.firstWaveDelay) + 1);
    player.alive = false;
    const count = world.enemies.length;
    run(world, ticksFor(10));
    expect(world.enemies.length).toBe(count);
  });
});

describe('spawn choice and strength', () => {
  it('only picks enemy types listed for the depth', () => {
    const { world } = makeWorld();
    for (let i = 0; i < 50; i++) expect(pickEnemyType(world, 0)).toBe('crab');
    const types = new Set(Array.from({ length: 200 }, () => pickEnemyType(world, 5)));
    expect([...types].sort()).toEqual(['coconut', 'crab']);
  });

  it('the enemy mix follows enemyWeightsByDepth (real config, depth 6)', () => {
    const { world } = makeWorld({ config: CONFIG, seed: 7 });
    const weights = difficultyAt(CONFIG, 6).enemyWeights;
    const total = Object.values(weights).reduce((s, w) => s + w, 0);
    const counts = {};
    const n = 4000;
    for (let i = 0; i < n; i++) {
      const t = pickEnemyType(world, 6);
      counts[t] = (counts[t] ?? 0) + 1;
    }
    expect(Object.keys(counts).sort()).toEqual(Object.keys(weights).sort());
    for (const [type, w] of Object.entries(weights)) expect(counts[type] / n).toBeCloseTo(w / total, 1);
  });

  it('enemies at depth 10 have more health and damage than at depth 0 (real config)', () => {
    const { world } = makeWorld({ config: CONFIG, arena: BIG_ROOM });
    for (const type of ['crab', 'coconut', 'skeleton', 'tiki']) {
      const shallow = spawnEnemy(world, type, 100, 100, 0, { depth: 0 });
      const deep = spawnEnemy(world, type, 100, 100, 0, { depth: 10 });
      expect(deep.maxHp, type).toBeGreaterThan(shallow.maxHp);
      const base = CONFIG.enemies[type].contactDamage;
      expect(scaleDamage(base, deep.damageScale), type).toBeGreaterThan(scaleDamage(base, shallow.damageScale));
      expect(deep.speedScale).toBeGreaterThan(shallow.speedScale);
    }
  });

  it('a deep crab really hits harder and pays more XP', () => {
    const { world, player } = makeWorld({ config: CONFIG, arena: BIG_ROOM });
    const crab = spawnEnemy(world, 'crab', player.x + 3, player.y, 0, { depth: 10 });
    run(world, 1);
    expect(player.health).toBe(CONFIG.player.maxHealth - 2);
    expect(crab.xpScale).toBeCloseTo(1 + 10 * CONFIG.difficulty.xpPerDepth);
  });

  it('elites have double health, more XP, and never appear before fromDepth', () => {
    const { world } = makeWorld({ arena: BIG_ROOM });
    const plain = spawnEnemy(world, 'skeleton', 100, 100, 0, { depth: 0 });
    const elite = spawnEnemy(world, 'skeleton', 100, 100, 0, { depth: 0, elite: true });
    expect(elite.maxHp).toBe(plain.maxHp * C.difficulty.elite.healthScale);
    expect(elite.xpScale).toBe(C.difficulty.elite.xpScale);
    expect(elite.elite).toBe(true);

    const shallow = makeRun({ spawning: true, depth: C.difficulty.elite.fromDepth - 1, config: dummyConfig() });
    shallow.player.invulnerableTime = 9999;
    const events = runCollect(shallow.world, ticksFor(20));
    expect(events.filter((e) => e.type === 'enemySpawning').every((e) => !e.elite)).toBe(true);
  });

  it('deep rooms spawn some elites', () => {
    const config = dummyConfig({ elite: { ...C.difficulty.elite, baseChance: 0.5, maxChance: 0.5 } });
    const { world, player } = makeRun({ spawning: true, depth: 8, config });
    player.invulnerableTime = 9999;
    const events = runCollect(world, ticksFor(20));
    expect(events.filter((e) => e.type === 'enemySpawning' && e.elite).length).toBeGreaterThan(0);
  });

  it('spawn points are open ground, never closer than minDistance to the player', () => {
    const { world, player } = makeWorld({ arena: BIG_ROOM });
    world.flowField.update([player]);
    for (let i = 0; i < 100; i++) {
      const p = findSpawnPoint(world, C.enemies.crab);
      expect(p).not.toBe(null);
      expect(boxBlocked(world.map, p.x, p.y, C.enemies.crab.radius)).toBe(false);
      expect(Math.hypot(p.x - player.x, p.y - player.y)).toBeGreaterThanOrEqual(C.spawning.minDistance);
    }
  });
});
