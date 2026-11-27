// Spectating online: a player who is out watches another player's island until the
// match ends. The server decides who watches whom (with these rules); a client only
// asks for the next or the previous player. Pure functions over a match
// (shared/sim/match.js), so they are unit tested without a network.
import { getMatchPlayer } from '../sim/match.js';

/**
 * True if this player's island is worth watching: their run is still going
 * (alive, and the final boss not beaten yet).
 * @param {object} match
 * @param {string} id
 */
export function isWatchable(match, id) {
  if (match.phase !== 'waves') return false;
  const entry = match.players.find((e) => e.id === id);
  const player = getMatchPlayer(match, id);
  return Boolean(entry?.world && player?.alive && entry.world.match.phase !== 'won');
}

/**
 * True if this player may watch others: the match is running and their own run is over.
 * @param {object} match
 * @param {string} viewerId
 */
export function canSpectate(match, viewerId) {
  const entry = match.players.find((e) => e.id === viewerId);
  return match.phase === 'waves' && Boolean(entry?.world) && !isWatchable(match, viewerId);
}

/**
 * The next watchable player after `fromId` in join order (step 1), or before it
 * (step -1), wrapping around. The viewer is never picked.
 * @param {object} match
 * @param {string} viewerId
 * @param {string} fromId - the player watched now (or the viewer, to start)
 * @param {1|-1} step
 * @returns {string|null} null if nobody is left to watch
 */
export function nextWatchable(match, viewerId, fromId, step) {
  const ids = match.players.map((e) => e.id);
  const n = ids.length;
  const start = Math.max(0, ids.indexOf(fromId));
  for (let k = 1; k <= n; k++) {
    const id = ids[(((start + k * step) % n) + n) % n];
    if (id !== viewerId && isWatchable(match, id)) return id;
  }
  return null;
}

/**
 * After a tick: when the watched player's run ends (died, left, beat the boss), their
 * watchers keep seeing that island for `graceTicks` (so they see how it ended), then move
 * on to the next player still playing. When nobody is left they stop watching.
 * @param {object} match
 * @param {Map<string, string>} watching - viewer id -> watched id, changed in place
 * @param {Map<string, number>} lostAt - viewer id -> match tick their player's run ended, changed in place
 * @param {number} graceTicks
 */
export function updateWatchers(match, watching, lostAt, graceTicks) {
  for (const [viewerId, targetId] of watching) {
    if (isWatchable(match, targetId)) {
      lostAt.delete(viewerId);
      continue;
    }
    if (!lostAt.has(viewerId)) lostAt.set(viewerId, match.tick);
    if (match.tick - lostAt.get(viewerId) < graceTicks) continue;
    lostAt.delete(viewerId);
    const next = nextWatchable(match, viewerId, targetId, 1);
    if (next) watching.set(viewerId, next);
    else watching.delete(viewerId);
  }
}
