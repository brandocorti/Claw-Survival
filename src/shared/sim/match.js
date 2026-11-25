// An online match: one world (arena) per player, all on one clock owned by the match.
// Pure JavaScript like the rest of the simulation: the Colyseus room only feeds it
// inputs and sends its state, so every rule here is unit tested without a network.
//
//   phase 'lobby' -> 'waves' -> 'wavesOver' -> (step 5: 'pvpCountdown' -> 'pvp') -> 'over'
//
// Rules owned by the match (not by a single world):
//   - the shared clock: every world reads match.clock, so all arenas are in the same round
//   - last alive: with 2+ players, the match ends as soon as at most one is alive
import { createWorld, addPlayer, stepWorld, allPlayersDead } from './world.js';
import { roundLength } from './systems/spawner.js';
import { EPSILON } from './math.js';

/**
 * @typedef {object} MatchPlayer
 * @property {string} id
 * @property {object|null} world - this player's own arena while the waves run
 */

/**
 * Creates a match in the lobby phase.
 * @param {object} options
 * @param {typeof import('../config.js').CONFIG} options.config
 * @param {{ id: string, rows: string[] }} options.arena - arena every player gets a copy of
 * @param {number} [options.seed] - world i gets seed + i, so the islands differ
 * @param {object} [options.worldOptions] - extra createWorld options (tests inject enemy types, spawning: false...)
 */
export function createMatch({ config, arena, seed = 1, worldOptions = {} }) {
  return {
    config,
    arena,
    seed,
    worldOptions,
    phase: 'lobby',
    /** The one clock: seconds since the match started. Worlds read it, only stepMatch() moves it. */
    clock: { elapsed: 0 },
    tick: 0,
    /** @type {MatchPlayer[]} in join order */
    players: [],
    /** @type {string|null} null = nobody won (everyone died on the same tick) */
    winnerId: null,
    /** Match-level events (matchStarted, matchOver...), read and cleared by drainMatchEvents(). */
    events: [],
  };
}

/**
 * Adds a player while the match is in the lobby.
 * @returns {MatchPlayer|null} null if the match has started or the id is taken
 */
export function addMatchPlayer(match, id) {
  if (match.phase !== 'lobby' || match.players.some((p) => p.id === id)) return null;
  const entry = { id, world: null };
  match.players.push(entry);
  return entry;
}

/**
 * Removes a player. In the lobby they simply leave; during the match they
 * count as dead (their arena stops), which can end the match.
 */
export function removeMatchPlayer(match, id) {
  const entry = match.players.find((p) => p.id === id);
  if (!entry) return;
  if (match.phase === 'lobby') {
    match.players.splice(match.players.indexOf(entry), 1);
    return;
  }
  forfeit(match, entry);
}

/** Kills a player for good during the match (left the game). */
export function forfeit(match, entry) {
  const player = getMatchPlayer(match, entry.id);
  if (player && player.alive) {
    player.alive = false;
    player.health = 0;
    player.cardChoice = null;
    entry.world.events.push({ type: 'playerDied', playerId: player.id, x: player.x, y: player.y });
  }
  checkLastAlive(match);
}

/**
 * Starts the match: one world per player, all reading the same clock, all on tick 0.
 * Online worlds never pause for cards (the clock is shared) and end the waves
 * without the final boss.
 * @returns {boolean} false if it could not start (not in the lobby, or no players)
 */
export function startMatch(match) {
  if (match.phase !== 'lobby' || match.players.length === 0) return false;
  const { config } = match;
  match.clock.elapsed = 0;
  match.tick = 0;
  match.winnerId = null;
  match.players.forEach((entry, i) => {
    entry.world = createWorld({
      config,
      arena: match.arena,
      seed: match.seed + i,
      ...match.worldOptions,
      cardPause: false,
      cardTimeout: config.net.cardTimeoutSeconds,
      clock: match.clock,
      finale: 'external',
    });
    addPlayer(entry.world, entry.id);
  });
  match.phase = 'waves';
  match.events.push({ type: 'matchStarted' });
  return true;
}

/**
 * Advances the whole match by one tick: the clock once, then every arena whose
 * player is still alive.
 * @param {object} match
 * @param {Record<string, import('../protocol.js').PlayerInput>} inputs - by player id
 * @param {number} [dt] - seconds, defaults to 1 / config.sim.tickRate
 */
export function stepMatch(match, inputs, dt = 1 / match.config.sim.tickRate) {
  if (match.phase !== 'waves') return;
  match.tick++;
  match.clock.elapsed += dt;
  for (const entry of match.players) {
    if (allPlayersDead(entry.world)) continue; // a dead player's arena stops
    stepWorld(entry.world, { [entry.id]: inputs[entry.id] }, dt);
  }
  // milestone 7: the Gulag catches deaths here, before they count toward "last alive".
  if (checkLastAlive(match)) return;
  if (match.players.every((e) => allPlayersDead(e.world) || e.world.match.phase === 'wavesOver')) {
    // Step 5 starts the shared PvP arena from here.
    match.phase = 'wavesOver';
    match.events.push({ type: 'wavesOver' });
  }
}

/**
 * Ends the match if the last-alive rule applies: with 2+ players, when at most one is
 * alive; alone, when that player dies.
 * @returns {boolean} true if the match is over
 */
export function checkLastAlive(match) {
  if (match.phase === 'over') return true;
  if (match.phase === 'lobby') return false;
  const alive = match.players.filter((e) => getMatchPlayer(match, e.id)?.alive);
  const limit = match.players.length >= 2 ? 1 : 0;
  if (alive.length > limit) return false;
  endMatch(match, alive.length === 1 ? alive[0].id : null);
  return true;
}

function endMatch(match, winnerId) {
  match.phase = 'over';
  match.winnerId = winnerId;
  match.events.push({ type: 'matchOver', winnerId });
}

/**
 * Puts the match back in the lobby with the same players, ready for a rematch.
 */
export function resetMatch(match) {
  match.phase = 'lobby';
  match.clock.elapsed = 0;
  match.tick = 0;
  match.winnerId = null;
  for (const entry of match.players) entry.world = null;
}

/** @returns {import('./entities/player.js').Player | undefined} the player's sim object, in their current world */
export function getMatchPlayer(match, id) {
  const entry = match.players.find((p) => p.id === id);
  return entry?.world?.players.find((p) => p.id === id);
}

/** The round every arena is in, from the shared clock (1-based). */
export function matchRound(match) {
  const { config } = match;
  const elapsed = Math.min(match.clock.elapsed, config.match.durationSeconds - EPSILON);
  return Math.min(config.rounds.count, Math.floor(elapsed / roundLength(config)) + 1);
}

/**
 * The small summary every client gets about every player.
 * @returns {{ phase: string, clock: number, round: number, winnerId: string|null,
 *   players: { id: string, level: number, alive: boolean }[] }}
 */
export function matchSummary(match) {
  return {
    phase: match.phase,
    clock: match.clock.elapsed,
    round: matchRound(match),
    winnerId: match.winnerId,
    players: match.players.map((e) => {
      const p = getMatchPlayer(match, e.id);
      return { id: e.id, level: p?.level ?? 1, alive: p ? p.alive : true };
    }),
  };
}

/**
 * Returns and clears the match-level events.
 * @returns {{ type: string, winnerId?: string|null }[]}
 */
export function drainMatchEvents(match) {
  const events = match.events;
  match.events = [];
  return events;
}
