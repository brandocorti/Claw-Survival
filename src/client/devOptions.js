// Dev/testing options read from the page URL, e.g. http://localhost:5173/?fast&round=3
//   ?fast      match lasts 100 s instead of 5 min (20 s rounds)
//   ?round=N   start at round N
//   ?boss      go straight to the final boss
//   ?tough     10 hearts instead of 3
//   ?cards=N   start with N level-up cards to pick
//   ?pickup    spawn a starter buff pickup right next to the player
//   ?seed=N    fixed random seed (same enemy spawns every run)
// Returns a modified copy of the config; the original is never changed.

/**
 * @param {object} baseConfig
 * @param {string} search - window.location.search
 * @returns {{ config: object, startRound: number, startCards: number, startAtBoss: boolean, spawnStartPickup: boolean, seed: number }}
 */
export function readDevOptions(baseConfig, search) {
  const params = new URLSearchParams(search);
  const config = structuredClone(baseConfig);
  if (params.has('fast')) config.match.durationSeconds = 100;
  if (params.has('tough')) config.player.maxHealth = 20;
  const startRound = Math.max(1, Math.min(config.rounds.count, Number(params.get('round')) || 1));
  const startCards = Math.max(0, Math.min(40, Number(params.get('cards')) || 0));
  const seed = Number(params.get('seed')) || Math.floor(Math.random() * 1e9);
  return {
    config,
    startRound,
    startCards,
    startAtBoss: params.has('boss'),
    spawnStartPickup: params.has('pickup'),
    seed,
  };
}
