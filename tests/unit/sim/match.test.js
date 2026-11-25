// Online match: one arena per player, one shared clock, last alive wins.
import { describe, it, expect } from 'vitest';
import {
  createMatch, addMatchPlayer, removeMatchPlayer, startMatch, stepMatch, drainMatchEvents,
  getMatchPlayer, matchRound, matchSummary, resetMatch,
} from '../../../src/shared/sim/match.js';
import { damagePlayer } from '../../../src/shared/sim/systems/damage.js';
import { grantXp } from '../../../src/shared/sim/systems/xp.js';
import { roundLength } from '../../../src/shared/sim/systems/spawner.js';
import { BIG_ROOM, TEST_CONFIG, TEST_ENEMY_TYPES, TICK } from '../helpers/fixtures.js';

const seconds = (s) => Math.ceil(s * TEST_CONFIG.sim.tickRate);

/** A started match with players p1..pN on the big room; every player is unhurtable unless told otherwise. */
function makeMatch(n = 2, { spawning = true, tough = true, seed = 1 } = {}) {
  const match = createMatch({
    config: TEST_CONFIG, arena: BIG_ROOM, seed, worldOptions: { spawning, enemyTypes: TEST_ENEMY_TYPES },
  });
  for (let i = 1; i <= n; i++) addMatchPlayer(match, `p${i}`);
  startMatch(match);
  if (tough) for (const e of match.players) getMatchPlayer(match, e.id).pveImmune = true;
  return match;
}
const runMatch = (match, ticks, inputs = {}) => {
  for (let i = 0; i < ticks; i++) stepMatch(match, inputs, TICK);
};
const kill = (match, id) => {
  const p = getMatchPlayer(match, id);
  p.pveImmune = false;
  p.invulnerableTime = 0;
  damagePlayer(match.players.find((e) => e.id === id).world, p, 999);
};

describe('online match: start', () => {
  it('gives every player their own world, all on tick 0 and sharing one clock', () => {
    const match = makeMatch(3);
    expect(match.phase).toBe('waves');
    const worlds = match.players.map((e) => e.world);
    expect(new Set(worlds).size).toBe(3);
    for (const w of worlds) {
      expect(w.tick).toBe(0);
      expect(w.clock).toBe(match.clock);
      expect(w.players.map((p) => p.id)).toEqual([match.players[worlds.indexOf(w)].id]);
    }
    expect(drainMatchEvents(match)).toEqual([{ type: 'matchStarted' }]);
  });

  it('the islands differ: different seeds give different enemies', () => {
    const match = makeMatch(2);
    runMatch(match, seconds(TEST_CONFIG.rounds.breakSeconds + 3));
    const [a, b] = match.players.map((e) => e.world.enemies.map((en) => `${en.type}@${en.x.toFixed(1)},${en.y.toFixed(1)}`));
    expect(a.length).toBeGreaterThan(0);
    expect(b.length).toBeGreaterThan(0);
    expect(a).not.toEqual(b);
  });

  it('players cannot join after the start, and a match cannot start twice', () => {
    const match = makeMatch(2);
    expect(addMatchPlayer(match, 'late')).toBe(null);
    expect(startMatch(match)).toBe(false);
  });
});

describe('online match: shared clock', () => {
  it('every arena is in the same round at the same time, through every round change', () => {
    const match = makeMatch(3);
    const len = roundLength(TEST_CONFIG);
    for (let r = 1; r <= TEST_CONFIG.rounds.count; r++) {
      runMatch(match, seconds(len) - (r === 1 ? 1 : 0));
      const rounds = match.players.map((e) => e.world.match.round);
      expect(new Set(rounds).size, `after round ${r}`).toBe(1);
      expect(rounds[0]).toBe(matchRound(match));
    }
  });

  it('the arenas follow the match clock, not their own: moving the clock moves every arena', () => {
    const match = makeMatch(3, { spawning: true });
    runMatch(match, 10);
    match.clock.elapsed = 2 * roundLength(TEST_CONFIG) + 1; // e.g. a dev jump, or a world that missed ticks
    runMatch(match, 1);
    for (const e of match.players) {
      expect(e.world.match.round).toBe(3);
      expect(e.world.match.elapsed).toBeCloseTo(match.clock.elapsed, 6);
    }
  });

  it('an open card choice does not stop that arena or the clock', () => {
    const match = makeMatch(2, { spawning: false });
    const p1 = getMatchPlayer(match, 'p1');
    const w1 = match.players[0].world;
    grantXp(w1, p1, 100);
    runMatch(match, 1);
    expect(p1.cardChoice).not.toBe(null);
    const x = p1.x;
    const clock = match.clock.elapsed;
    runMatch(match, 30, { p1: { moveX: 1, moveY: 0, roll: false } });
    expect(w1.paused).toBe(false);
    expect(p1.x).toBeGreaterThan(x);
    expect(match.clock.elapsed).toBeCloseTo(clock + 30 * TICK, 6);
    expect(w1.time).toBeCloseTo(match.players[1].world.time, 6);
  });

  it('when the clock ends every arena empties, no final boss appears, and the match waits for the PvP', () => {
    const match = makeMatch(2);
    runMatch(match, seconds(TEST_CONFIG.match.durationSeconds) + 2);
    expect(match.phase).toBe('wavesOver');
    for (const e of match.players) {
      expect(e.world.match.phase).toBe('wavesOver');
      expect(e.world.enemies.length).toBe(0);
      expect(e.world.bullets.some((b) => b.team === 'enemy')).toBe(false);
    }
    expect(drainMatchEvents(match).map((e) => e.type)).toContain('wavesOver');
    // Nothing moves on after that (step 5 takes over).
    const tick = match.tick;
    runMatch(match, 60);
    expect(match.tick).toBe(tick);
  });
});

describe('online match: last alive', () => {
  it('when all but one player die, the last one wins at once', () => {
    const match = makeMatch(3, { spawning: false });
    runMatch(match, 5);
    kill(match, 'p2');
    runMatch(match, 1);
    expect(match.phase).toBe('waves');
    kill(match, 'p3');
    runMatch(match, 1);
    expect(match.phase).toBe('over');
    expect(match.winnerId).toBe('p1');
    expect(drainMatchEvents(match)).toContainEqual({ type: 'matchOver', winnerId: 'p1' });
  });

  it('if the last players die on the same tick, nobody wins', () => {
    const match = makeMatch(2, { spawning: false });
    kill(match, 'p1');
    kill(match, 'p2');
    runMatch(match, 1);
    expect(match.phase).toBe('over');
    expect(match.winnerId).toBe(null);
  });

  it('a player who leaves during the match counts as dead', () => {
    const match = makeMatch(2, { spawning: false });
    removeMatchPlayer(match, 'p2');
    expect(match.phase).toBe('over');
    expect(match.winnerId).toBe('p1');
  });

  it('a dead player\'s arena stops; the others go on', () => {
    const match = makeMatch(3, { spawning: false });
    kill(match, 'p3');
    runMatch(match, 1);
    const [w1, , w3] = match.players.map((e) => e.world);
    const t1 = w1.tick;
    const t3 = w3.tick;
    runMatch(match, 10);
    expect(w1.tick).toBe(t1 + 10);
    expect(w3.tick).toBe(t3);
  });

  it('alone in a match, it only ends when that player dies', () => {
    const match = makeMatch(1, { spawning: false });
    runMatch(match, 10);
    expect(match.phase).toBe('waves');
    kill(match, 'p1');
    runMatch(match, 1);
    expect(match.phase).toBe('over');
    expect(match.winnerId).toBe(null);
  });
});

describe('online match: lobby and summary', () => {
  it('in the lobby a player who leaves is removed', () => {
    const match = createMatch({ config: TEST_CONFIG, arena: BIG_ROOM });
    addMatchPlayer(match, 'a');
    addMatchPlayer(match, 'b');
    expect(addMatchPlayer(match, 'a')).toBe(null);
    removeMatchPlayer(match, 'a');
    expect(match.players.map((p) => p.id)).toEqual(['b']);
  });

  it('the summary has the clock, the round and each player\'s level and state', () => {
    const match = makeMatch(2, { spawning: false });
    grantXp(match.players[0].world, getMatchPlayer(match, 'p1'), 6);
    kill(match, 'p2');
    runMatch(match, 1);
    expect(matchSummary(match)).toEqual({
      phase: 'over', clock: TICK, round: 1, winnerId: 'p1',
      players: [{ id: 'p1', level: 2, alive: true }, { id: 'p2', level: 1, alive: false }],
    });
  });

  it('after a match it goes back to the lobby with the same players', () => {
    const match = makeMatch(2, { spawning: false });
    kill(match, 'p2');
    runMatch(match, 1);
    resetMatch(match);
    expect(match.phase).toBe('lobby');
    expect(match.players.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(startMatch(match)).toBe(true);
    expect(getMatchPlayer(match, 'p2').alive).toBe(true);
  });
});
