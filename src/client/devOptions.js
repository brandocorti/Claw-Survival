// Dev/testing options read from the page URL, e.g. http://localhost:5173/?room=8&tough
//   ?fast        match lasts 100 s instead of 10 min
//   ?room=N      start in fight room N (depth N-1); ?room=8 meets the Crab King
//   ?depth=N     start at difficulty depth N (same as ?room=N+1)
//   ?break       start in a break room (campfire + Salesman)
//   ?tough       10 hearts instead of 3
//   ?rich        start at level 3 with a nearly full XP bar (to try the prices)
//   ?effect=ID   start with an effect, e.g. ?effect=sandInBoots,seaLegs (ids: shared/content/effects)
//   ?seed=N      fixed random seed (same rooms and spawns every run)
//   ?time=N      start with N seconds already gone on the match clock (?time=590: time-up in 10 s)
//   ?qa=NAME     scripted states for screenshots: clear (kills every enemy as it appears),
//                shop, roll, gossip (open the Salesman's menu / buy), crowd (150 enemies)
// Returns a modified copy of the config; the original is never changed.

/**
 * @typedef {object} DevOptions
 * @property {object} config
 * @property {number} seed
 * @property {number} startDepth
 * @property {'fight'|'break'} startIn
 * @property {boolean} rich
 * @property {string[]} effects
 * @property {string|null} qa
 * @property {number} startTime - seconds already gone on the match clock
 */

/**
 * @param {object} baseConfig
 * @param {string} search - window.location.search
 * @returns {DevOptions}
 */
export function readDevOptions(baseConfig, search) {
  const params = new URLSearchParams(search);
  const config = structuredClone(baseConfig);
  if (params.has('fast')) config.match.durationSeconds = 100;
  if (params.has('tough')) config.player.maxHealth = 20;
  const room = Number(params.get('room')) || 0;
  const depth = Number(params.get('depth')) || 0;
  const startDepth = Math.max(0, room > 0 ? room - 1 : depth);
  const seed = Number(params.get('seed')) || Math.floor(Math.random() * 1e9);
  const effects = (params.get('effect') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return {
    config,
    seed,
    startDepth,
    startIn: params.has('break') ? 'break' : 'fight',
    rich: params.has('rich'),
    effects,
    qa: params.get('qa'),
    startTime: Math.max(0, Number(params.get('time')) || 0),
  };
}
