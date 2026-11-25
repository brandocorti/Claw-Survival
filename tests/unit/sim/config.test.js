// Sanity checks on the REAL config, so a balance change cannot break the match structure.
import { describe, it, expect } from 'vitest';
import { CONFIG } from '../../../src/shared/config.js';
import { roundLength, spawnRate } from '../../../src/shared/sim/systems/spawner.js';

const { rounds, enemies } = CONFIG;

describe('match config', () => {
  it('a match lasts 5 minutes', () => expect(CONFIG.match.durationSeconds).toBe(300));

  it('the boss arrives after the break and before the end of its round', () => {
    const bossAt = roundLength(CONFIG) - rounds.bossAtSecondsLeft;
    expect(bossAt).toBeGreaterThan(rounds.breakSeconds);
    expect(bossAt).toBeLessThan(roundLength(CONFIG));
    for (const r of rounds.bossRounds) expect(r).toBeLessThanOrEqual(rounds.count);
  });

  it('every round has an enemy mix made of known, non-boss enemies', () => {
    expect(rounds.enemyWeights.length).toBe(rounds.count);
    for (const mix of rounds.enemyWeights) {
      for (const type of Object.keys(mix)) {
        expect(enemies[type], type).toBeDefined();
        expect(enemies[type].boss, type).toBeFalsy();
      }
    }
  });

  it('each round is busier than the one before', () => {
    for (let r = 2; r <= rounds.count; r++) expect(spawnRate(CONFIG, r, 0.5)).toBeGreaterThan(spawnRate(CONFIG, r - 1, 0.5));
  });
});
