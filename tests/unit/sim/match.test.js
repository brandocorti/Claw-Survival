// Online match: one arena per player, each on its own clock, last alive wins.
import { describe, it, expect } from 'vitest';
import {
  createMatch, addMatchPlayer, removeMatchPlayer, startMatch, stepMatch, drainMatchEvents,
  getMatchPlayer, matchSummary, resetMatch,
} from '../../../src/shared/sim/match.js';
import { damagePlayer } from '../../../src/shared/sim/systems/damage.js';
import { grantXp } from '../../../src/shared/sim/systems/xp.js';
import { roundLength } from '../../../src/shared/sim/systems/spawner.js';
import { BIG_ROOM, TEST_CONFIG, TEST_ENEMY_TYPES, TICK } from '../helpers/fixtures.js';

const seconds = (s) => Math.ceil(s * TEST_CONFIG.sim.tickRate);
/** Takes the first card whenever one is offered (a choice freezes that island until picked). */
const PICK_FIRST = Object.freeze({ moveX: 0, moveY: 0, roll: false, pick: 0 });
/** A room with the salesman ('V') next to the spawn. */
const SHOP_ROOM = {
  id: 'shop',
  rows: ['##############', '#............#', '#............#', '#.....PV.....#', '#............#', '#............#', '##############'],
};

/** A started match with players p1..pN on the big room; every player is unhurtable unless told otherwise. */
function makeMatch(n = 2, { spawning = true, tough = true, seed = 1, arena = BIG_ROOM } = {}) {
  const match = createMatch({
    config: TEST_CONFIG, arena, seed, worldOptions: { spawning, enemyTypes: TEST_ENEMY_TYPES },
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
  it('gives every player their own world, all on tick 0', () => {
    const match = makeMatch(3);
    expect(match.phase).toBe('waves');
    const worlds = match.players.map((e) => e.world);
    expect(new Set(worlds).size).toBe(3);
    for (const w of worlds) {
      expect(w.tick).toBe(0);
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

describe('online match: one clock per island', () => {
  it('a player choosing a card freezes only their own island and its clock', () => {
    // Arrange: p1 has a card choice open, p2 does not.
    const match = makeMatch(2, { spawning: true });
    const [w1, w2] = match.players.map((e) => e.world);
    const p1 = getMatchPlayer(match, 'p1');
    const p2 = getMatchPlayer(match, 'p2');
    runMatch(match, 10);
    grantXp(w1, p1, 100);
    runMatch(match, 1);
    expect(p1.cardChoice).not.toBe(null);
    const before = { x1: p1.x, x2: p2.x, t1: w1.match.elapsed, t2: w2.match.elapsed, tick1: w1.tick };

    // Act: both hold right for half a second.
    const right = { moveX: 1, moveY: 0, roll: false };
    runMatch(match, 30, { p1: right, p2: right });

    // Assert: p1's island did not move on at all, p2's kept running.
    expect(w1.paused).toBe(true);
    expect(p1.x).toBe(before.x1);
    expect(w1.match.elapsed).toBe(before.t1);
    expect(w1.tick).toBe(before.tick1);
    expect(w2.paused).toBe(false);
    expect(p2.x).toBeGreaterThan(before.x2);
    expect(w2.match.elapsed).toBeCloseTo(before.t2 + 30 * TICK, 6);
  });

  it('after the pick the island carries on from where it stopped', () => {
    const match = makeMatch(2);
    const w1 = match.players[0].world;
    const p1 = getMatchPlayer(match, 'p1');
    grantXp(w1, p1, 5); // exactly one level-up
    runMatch(match, 1);
    const elapsed = w1.match.elapsed;
    runMatch(match, 20);
    expect(w1.match.elapsed).toBe(elapsed);

    runMatch(match, 1, { p1: PICK_FIRST });
    runMatch(match, 10, { p1: PICK_FIRST });

    expect(w1.paused).toBe(false);
    expect(w1.match.elapsed).toBeGreaterThan(elapsed);
  });

  it('pausing puts a player behind: islands can be in different rounds', () => {
    const match = makeMatch(2);
    const w1 = match.players[0].world;
    grantXp(w1, getMatchPlayer(match, 'p1'), 5);
    runMatch(match, seconds(roundLength(TEST_CONFIG)) + 30, { p2: PICK_FIRST }); // p1 never picks

    expect(w1.match.round).toBe(1);
    expect(match.players[1].world.match.round).toBe(2);
    expect(matchSummary(match).players.map((p) => p.round)).toEqual([1, 2]);
  });

  it('the shop freezes the island too, and only that one', () => {
    const match = makeMatch(2, { arena: SHOP_ROOM });
    const [w1, w2] = match.players.map((e) => e.world);
    const p1 = getMatchPlayer(match, 'p1');
    Object.assign(p1, { x: w1.map.vendor.x - 16, y: w1.map.vendor.y });
    runMatch(match, 1, { p1: { ...PICK_FIRST, interact: true } });
    expect(p1.shopOpen).toBe(true);
    const t1 = w1.match.elapsed;
    const t2 = w2.match.elapsed;

    runMatch(match, 30, { p1: PICK_FIRST, p2: PICK_FIRST });

    expect(w1.paused).toBe(true);
    expect(w1.match.elapsed).toBe(t1);
    expect(w2.match.elapsed).toBeGreaterThan(t2);
  });

  it('a player who finishes the waves first waits for the others', () => {
    const match = makeMatch(2);
    const w2 = match.players[1].world;
    grantXp(w2, getMatchPlayer(match, 'p2'), 5); // p2 stops for a card and falls behind
    runMatch(match, seconds(TEST_CONFIG.match.durationSeconds + 10), { p1: PICK_FIRST });

    expect(match.players[0].world.match.phase).toBe('wavesOver');
    expect(w2.match.phase).toBe('waves');
    expect(match.phase).toBe('waves');
    expect(matchSummary(match).players.map((p) => p.wavesDone)).toEqual([true, false]);

    runMatch(match, seconds(TEST_CONFIG.match.durationSeconds + 10), { p2: PICK_FIRST });
    expect(match.phase).toBe('wavesOver');
  });

  it('when the clock ends every arena empties, no final boss appears, and the match waits for the PvP', () => {
    const match = makeMatch(2);
    // Level-up cards freeze an island until picked (one tick each): both players take the first card.
    runMatch(match, seconds(TEST_CONFIG.match.durationSeconds + 10), { p1: PICK_FIRST, p2: PICK_FIRST });
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

  it('the summary has each player\'s level, round and state', () => {
    const match = makeMatch(2, { spawning: false });
    grantXp(match.players[0].world, getMatchPlayer(match, 'p1'), 6);
    kill(match, 'p2');
    runMatch(match, 1);
    expect(matchSummary(match)).toEqual({
      phase: 'over', winnerId: 'p1',
      players: [
        { id: 'p1', level: 2, alive: true, round: 1, health: 6, maxHealth: 6, kills: 0, wavesDone: false },
        { id: 'p2', level: 1, alive: false, round: 1, health: 0, maxHealth: 6, kills: 0, wavesDone: false },
      ],
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

describe('online match: player rules kept from the old card-timeout tests', () => {
  it('dying closes an open card choice at once (a dead player\'s arena stops stepping)', () => {
    const match = makeMatch(2, { spawning: false });
    const p1 = getMatchPlayer(match, 'p1');
    grantXp(match.players[0].world, p1, 5);
    runMatch(match, 1);
    expect(p1.cardChoice).not.toBe(null);
    kill(match, 'p1');
    expect(p1.alive).toBe(false);
    expect(p1.cardChoice).toBe(null);
  });

  it('a pveImmune player (test bot option) ignores enemy damage but not damage from a player', () => {
    const match = makeMatch(1, { spawning: false, tough: false });
    const world = match.players[0].world;
    const player = getMatchPlayer(match, 'p1');
    player.pveImmune = true;
    expect(damagePlayer(world, player, 2)).toBe(false);
    expect(player.health).toBe(TEST_CONFIG.player.maxHealth);
    expect(damagePlayer(world, player, 2, 'p2')).toBe(true);
    expect(player.health).toBe(TEST_CONFIG.player.maxHealth - 2);
  });
});
