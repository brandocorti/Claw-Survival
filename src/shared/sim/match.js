// An online match: one world (arena) per player, each on its own clock.
// Pure JavaScript like the rest of the simulation: the Colyseus room only feeds it
// inputs and sends its state, so every rule here is unit tested without a network.
//
//   phase 'lobby' -> 'waves' -> 'wavesOver' -> (step 5: 'pvpCountdown' -> 'pvp') -> 'over'
//
// Each island runs like a solo run: it freezes while its player picks a card or shops,
// without affecting anyone else, so players can be in different rounds at the same time.
// Rules owned by the match (not by a single world):
//   - the waves end for the match once every player has finished theirs (or is out)
//   - last alive: with 2+ players, the match ends as soon as at most one is alive
import { createWorld, addPlayer, stepWorld, allPlayersDead } from './world.js';

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
 * Starts the match: one world per player, each with its own clock, all on tick 0.
 * Online worlds end the waves without the final boss.
 * @returns {boolean} false if it could not start (not in the lobby, or no players)
 */
export function startMatch(match) {
  if (match.phase !== 'lobby' || match.players.length === 0) return false;
  const { config } = match;
  match.tick = 0;
  match.winnerId = null;
  match.players.forEach((entry, i) => {
    entry.world = createWorld({
      config,
      arena: match.arena,
      seed: match.seed + i,
      ...match.worldOptions,
      finale: 'external',
    });
    addPlayer(entry.world, entry.id);
  });
  match.phase = 'waves';
  match.events.push({ type: 'matchStarted' });
  return true;
}

/**
 * Advances the whole match by one tick: every arena whose player is still alive.
 * A paused arena (card choice or shop open) stays frozen and its clock does not move.
 * @param {object} match
 * @param {Record<string, import('../protocol.js').PlayerInput>} inputs - by player id
 * @param {number} [dt] - seconds, defaults to 1 / config.sim.tickRate
 */
export function stepMatch(match, inputs, dt = 1 / match.config.sim.tickRate) {
  if (match.phase !== 'waves') return;
  match.tick++;
  for (const entry of match.players) {
    if (allPlayersDead(entry.world)) continue; // a dead player's arena stops
    stepWorld(entry.world, { [entry.id]: inputs[entry.id] }, dt);
  }
  // milestone 7: the Gulag catches deaths here, before they count toward "last alive".
  if (checkLastAlive(match)) return;
  // Players who finish their waves first wait (the client shows "waiting") until everyone has.
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
  match.tick = 0;
  match.winnerId = null;
  for (const entry of match.players) entry.world = null;
}

/** @returns {import('./entities/player.js').Player | undefined} the player's sim object, in their current world */
export function getMatchPlayer(match, id) {
  const entry = match.players.find((p) => p.id === id);
  return entry?.world?.players.find((p) => p.id === id);
}

/**
 * The small summary every client gets about every player. Each player is in their own
 * round (their island has its own clock); the salesman shows these rows.
 * @returns {{ phase: string, winnerId: string|null, players: { id: string, level: number, alive: boolean,
 *   round: number, health: number, maxHealth: number, kills: number, wavesDone: boolean }[] }}
 */
export function matchSummary(match) {
  return {
    phase: match.phase,
    winnerId: match.winnerId,
    players: match.players.map((e) => {
      const p = getMatchPlayer(match, e.id);
      const m = e.world?.match;
      return {
        id: e.id,
        level: p?.level ?? 1,
        alive: p ? p.alive : true,
        round: m?.round ?? 1,
        health: p?.health ?? match.config.player.maxHealth,
        maxHealth: p?.maxHealth ?? match.config.player.maxHealth,
        kills: p?.kills ?? 0,
        wavesDone: m?.phase === 'wavesOver',
      };
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
