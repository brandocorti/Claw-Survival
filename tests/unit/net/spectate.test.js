// Spectating online: who may watch, who can be watched, cycling, and moving on when
// the watched player's run ends (shared/net/spectate.js).
import { describe, it, expect } from 'vitest';
import { createMatch, addMatchPlayer, startMatch, stepMatch, getMatchPlayer } from '../../../src/shared/sim/match.js';
import { damagePlayer } from '../../../src/shared/sim/systems/damage.js';
import { isWatchable, canSpectate, nextWatchable, updateWatchers } from '../../../src/shared/net/spectate.js';
import { BIG_ROOM, TEST_CONFIG, TEST_ENEMY_TYPES, TICK } from '../helpers/fixtures.js';

const GRACE = 3; // ticks

/** A started match with players p1..pN; nothing spawns, so only kill() ends a run. */
function makeMatch(n) {
  const match = createMatch({ config: TEST_CONFIG, arena: BIG_ROOM, worldOptions: { spawning: false, enemyTypes: TEST_ENEMY_TYPES } });
  for (let i = 1; i <= n; i++) addMatchPlayer(match, `p${i}`);
  startMatch(match);
  return match;
}
const kill = (match, id) => {
  const p = getMatchPlayer(match, id);
  p.invulnerableTime = 0;
  damagePlayer(match.players.find((e) => e.id === id).world, p, 999);
};
const tick = (match, n = 1) => {
  for (let i = 0; i < n; i++) stepMatch(match, {}, TICK);
};

describe('spectating rules', () => {
  it('only a player whose run is over may watch, and only players still playing can be watched', () => {
    const match = makeMatch(3);
    expect(canSpectate(match, 'p1')).toBe(false);
    kill(match, 'p1');
    expect(canSpectate(match, 'p1')).toBe(true);
    expect(isWatchable(match, 'p1')).toBe(false);
    expect(isWatchable(match, 'p2')).toBe(true);
    expect(canSpectate(match, 'nobody')).toBe(false);
  });

  it('a player who beat the final boss is not watchable, but may watch', () => {
    const match = makeMatch(2);
    match.players.find((e) => e.id === 'p2').world.match.phase = 'won';
    expect(isWatchable(match, 'p2')).toBe(false);
    expect(canSpectate(match, 'p2')).toBe(true);
  });

  it('cycles forward and backward through the players still playing, skipping the viewer and the out', () => {
    const match = makeMatch(4);
    kill(match, 'p1');
    kill(match, 'p3');
    expect(nextWatchable(match, 'p1', 'p1', 1)).toBe('p2');
    expect(nextWatchable(match, 'p1', 'p2', 1)).toBe('p4');
    expect(nextWatchable(match, 'p1', 'p4', 1)).toBe('p2'); // wraps
    expect(nextWatchable(match, 'p1', 'p2', -1)).toBe('p4'); // backwards
  });

  it('with one player left, next and previous both stay on them; with none, there is nobody', () => {
    const match = makeMatch(3);
    kill(match, 'p1');
    kill(match, 'p3');
    expect(nextWatchable(match, 'p1', 'p2', 1)).toBe('p2');
    expect(nextWatchable(match, 'p1', 'p2', -1)).toBe('p2');
    kill(match, 'p2');
    expect(nextWatchable(match, 'p1', 'p1', 1)).toBe(null);
  });
});

describe('watchers when the watched run ends', () => {
  it('keep seeing the ended island for the grace time, then move on to the next player', () => {
    const match = makeMatch(3);
    kill(match, 'p1');
    const watching = new Map([['p1', 'p2']]);
    const lostAt = new Map();
    kill(match, 'p2');
    for (let i = 0; i < GRACE; i++) {
      tick(match);
      updateWatchers(match, watching, lostAt, GRACE);
      expect(watching.get('p1')).toBe('p2');
    }
    tick(match);
    updateWatchers(match, watching, lostAt, GRACE);
    expect(watching.get('p1')).toBe('p3');
    expect(lostAt.size).toBe(0);
  });

  it('keep the last island on screen when its end also ends the match', () => {
    const match = makeMatch(3);
    kill(match, 'p1');
    kill(match, 'p3');
    const watching = new Map([['p1', 'p2']]);
    const lostAt = new Map();
    kill(match, 'p2');
    tick(match); // the match sees that every run is over
    expect(match.phase).toBe('over');
    for (let i = 0; i <= GRACE; i++) {
      tick(match); // the match clock has stopped
      updateWatchers(match, watching, lostAt, GRACE);
    }
    expect(watching.get('p1')).toBe('p2');
  });

  it('stop watching when the grace time ends and nobody else is playing', () => {
    // p3 beat the boss and waits: the match is still on, but nobody is left to watch.
    const match = makeMatch(3);
    kill(match, 'p1');
    const watching = new Map([['p1', 'p2']]);
    const lostAt = new Map();
    match.players.find((e) => e.id === 'p2').world.match.phase = 'won';
    match.players.find((e) => e.id === 'p3').world.match.phase = 'won';
    match.phase = 'waves'; // as if the last check has not run yet
    for (let i = 0; i <= GRACE; i++) {
      match.tick++;
      updateWatchers(match, watching, lostAt, GRACE);
    }
    expect(watching.has('p1')).toBe(false);
  });

  it('leave a watcher alone while their player is still playing', () => {
    const match = makeMatch(2);
    kill(match, 'p1');
    const watching = new Map([['p1', 'p2']]);
    const lostAt = new Map();
    tick(match, 10);
    updateWatchers(match, watching, lostAt, GRACE);
    expect(watching.get('p1')).toBe('p2');
  });
});
