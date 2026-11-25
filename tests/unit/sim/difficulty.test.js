// The difficulty curve. Formula tests use a fixed config; the "shape" tests
// (never easier, caps, no spikes) run on the real config.js, because that is
// the curve the players get, and a tuning change must not break it silently.
import { describe, it, expect } from 'vitest';
import { difficultyAt, scaleDamage, weightsAt, isDangerStep } from '../../../src/shared/sim/systems/difficulty.js';
import { CONFIG } from '../../../src/shared/config.js';
import { TEST_CONFIG } from '../helpers/fixtures.js';

const DEPTHS = Array.from({ length: 41 }, (_, i) => i);
const curve = DEPTHS.map((d) => difficultyAt(CONFIG, d));

/** Values where a larger number is harder (or richer, for xpScale). */
const GROWING = ['budget', 'waves', 'healthScale', 'damageScale', 'speedScale', 'eliteChance', 'xpScale'];
/** Continuous values that must not jump more than ~20% from one room to the next. */
const SMOOTH = ['budget', 'healthScale', 'damageScale', 'speedScale', 'eliteChance'];
const MAX_STEP = 1.2 + 1e-9;

describe('difficulty formulas', () => {
  const C = TEST_CONFIG;
  it('budget = min(maxBudget, baseEnemies + enemiesPerRoom * depth)', () => {
    expect(difficultyAt(C, 0).budget).toBe(C.difficulty.baseEnemies);
    expect(difficultyAt(C, 3).budget).toBe(C.difficulty.baseEnemies + 3 * C.difficulty.enemiesPerRoom);
    expect(difficultyAt(C, 1000).budget).toBe(C.difficulty.maxBudget);
  });

  it('waves = min(maxWaves, baseWaves + floor(depth / wavesEvery)), gap shrinks to its minimum', () => {
    expect(difficultyAt(C, 0).waves).toBe(2);
    expect(difficultyAt(C, 3).waves).toBe(2);
    expect(difficultyAt(C, 4).waves).toBe(3);
    expect(difficultyAt(C, 1000).waves).toBe(C.difficulty.maxWaves);
    expect(difficultyAt(C, 0).waveGap).toBe(C.difficulty.waveGapStart);
    expect(difficultyAt(C, 1000).waveGap).toBe(C.difficulty.waveGapMin);
  });

  it('elite chance is 0 before fromDepth, then baseChance + chancePerDepth per depth', () => {
    const e = C.difficulty.elite;
    expect(difficultyAt(C, e.fromDepth - 1).eliteChance).toBe(0);
    expect(difficultyAt(C, e.fromDepth).eliteChance).toBeCloseTo(e.baseChance);
    expect(difficultyAt(C, e.fromDepth + 2).eliteChance).toBeCloseTo(e.baseChance + 2 * e.chancePerDepth);
  });

  it('damage is rounded and never below the base', () => {
    expect(scaleDamage(1, 1)).toBe(1);
    expect(scaleDamage(1, 1.2)).toBe(1);
    expect(scaleDamage(1, 1.5)).toBe(2);
    expect(scaleDamage(2, 0.5)).toBe(2);
  });

  it('enemy mix: the last row whose fromDepth <= depth', () => {
    const table = [{ fromDepth: 0, weights: { a: 1 } }, { fromDepth: 5, weights: { b: 1 } }];
    expect(weightsAt(table, 0)).toEqual({ a: 1 });
    expect(weightsAt(table, 4)).toEqual({ a: 1 });
    expect(weightsAt(table, 5)).toEqual({ b: 1 });
    expect(weightsAt(table, 99)).toEqual({ b: 1 });
  });

  it('DANGER RISES every dangerEvery depths, not at depth 0', () => {
    expect(isDangerStep(C, 0)).toBe(false);
    expect(isDangerStep(C, C.difficulty.dangerEvery)).toBe(true);
    expect(isDangerStep(C, C.difficulty.dangerEvery + 1)).toBe(false);
  });
});

describe('difficulty curve (real config)', () => {
  it('never gets easier as depth grows', () => {
    for (let d = 1; d < curve.length; d++) {
      for (const key of GROWING) expect(curve[d][key], `${key} at depth ${d}`).toBeGreaterThanOrEqual(curve[d - 1][key]);
      expect(curve[d].waveGap, `waveGap at depth ${d}`).toBeLessThanOrEqual(curve[d - 1].waveGap);
    }
  });

  it('respects every cap', () => {
    const d = CONFIG.difficulty;
    for (const c of curve) {
      expect(c.budget).toBeLessThanOrEqual(d.maxBudget);
      expect(c.budget).toBeLessThanOrEqual(CONFIG.spawning.maxAlive);
      expect(c.waves).toBeLessThanOrEqual(d.maxWaves);
      expect(c.waveGap).toBeGreaterThanOrEqual(d.waveGapMin);
      expect(c.speedScale).toBeLessThanOrEqual(d.maxSpeedScale);
      expect(c.eliteChance).toBeLessThanOrEqual(d.elite.maxChance);
    }
  });

  // Step values (waves, the first elite chance) and integer rounding are exempt:
  // they can only move in whole steps. Crab King rooms are exempt by design.
  it('no continuous value rises more than ~20% from one room to the next', () => {
    for (let d = 1; d < curve.length; d++) {
      for (const key of SMOOTH) {
        const before = curve[d - 1][key];
        if (before === 0) continue; // the first elite chance starts from nothing
        expect(curve[d][key] / before, `${key} from depth ${d - 1} to ${d}`).toBeLessThanOrEqual(MAX_STEP);
      }
    }
  });

  it('the enemy mix only adds harder enemies as depth grows', () => {
    const order = CONFIG.difficulty.enemyWeightsByDepth.map((r) => r.fromDepth);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(Object.keys(curve[0].enemyWeights).sort()).toEqual(['coconut', 'crab']);
    expect(curve[20].enemyWeights.tiki).toBeGreaterThan(0);
  });
});
