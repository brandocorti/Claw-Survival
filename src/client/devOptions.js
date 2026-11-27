// Dev/testing options read from the page URL, e.g. http://localhost:5173/?fast&round=3
//   ?fast      match lasts 100 s instead of 5 min (20 s rounds)
//   ?round=N   start at round N
//   ?boss      go straight to the final boss
//   ?tough     10 hearts instead of 3
//   ?cards=N   start with N level-up cards to pick
//   ?bosshp=N  multiplies the final boss's health (e.g. 0.6)
//   ?classic, ?gfx=..., ?capture, ?script   see gfx/flags.js
//   ?seed=N    fixed random seed (same enemy spawns every run)
// Online (any of these opens the online lobby instead of the start menu; the last three
// are sent to the server when you create a room):
//   ?online      open the online lobby (e.g. ?online&fast for a 100 s online match)
//   ?room=CODE   open the lobby with this room code filled in (the link a host shares)
//   ?bots=N      add N test bots to the room
//   ?botsTough   bots take no damage from enemies (so one person can reach the end)
//   ?fast        also makes the online match 100 s
// Returns a modified copy of the config; the original is never changed.

/**
 * @param {object} baseConfig
 * @param {string} search - window.location.search
 * @returns {{ config: object, startRound: number, startCards: number, startAtBoss: boolean, seed: number }}
 */
export function readDevOptions(baseConfig, search) {
  const params = new URLSearchParams(search);
  const config = structuredClone(baseConfig);
  if (params.has('fast')) config.match.durationSeconds = 100;
  if (params.has('bosshp')) config.enemies.crabEmperor.hp *= Number(params.get('bosshp')) || 1;
  if (params.has('tough')) config.player.maxHealth = 20;
  const startRound = Math.max(1, Math.min(config.rounds.count, Number(params.get('round')) || 1));
  const startCards = Math.max(0, Math.min(40, Number(params.get('cards')) || 0));
  const seed = Number(params.get('seed')) || Math.floor(Math.random() * 1e9);
  return { config, startRound, startCards, startAtBoss: params.has('boss'), seed };
}

/** Solo-only options: any of these in the URL skips the menu and starts solo, as before. */
const SOLO_SHORTCUTS = ['solo', 'round', 'boss', 'tough', 'cards'];

/**
 * @param {string} search - window.location.search
 * @returns {boolean} true if the URL asks for solo play straight away
 */
export function wantsSoloStraightAway(search) {
  const params = new URLSearchParams(search);
  return SOLO_SHORTCUTS.some((key) => params.has(key));
}

/**
 * Options for creating an online room, from the URL.
 * @param {string} search
 * @param {number} maxBots
 * @returns {{ bots: number, botsTough: boolean, fast: boolean, room: string | null }}
 */
export function readOnlineOptions(search, maxBots) {
  const params = new URLSearchParams(search);
  return {
    bots: Math.max(0, Math.min(maxBots, Number(params.get('bots')) || 0)),
    botsTough: params.has('botsTough'),
    fast: params.has('fast'),
    room: params.get('room'),
  };
}
