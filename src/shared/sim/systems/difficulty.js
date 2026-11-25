// Difficulty curve: every "the deeper you go, the harder it gets" formula lives
// here, in one pure function, so the curve can be tested and tuned in one place.
// The room spawner and the enemy factory read from difficultyAt(); they never
// keep scaling formulas of their own. Values come from config.difficulty.

/**
 * @typedef {object} Difficulty
 * @property {number} depth - fight rooms cleared so far
 * @property {number} budget - enemies in this fight room
 * @property {number} waves - the budget is split into this many waves
 * @property {number} waveGap - seconds between waves
 * @property {number} healthScale - enemy health multiplier
 * @property {number} damageScale - enemy damage multiplier (apply with scaleDamage)
 * @property {number} speedScale - enemy speed multiplier
 * @property {number} xpScale - enemy XP multiplier
 * @property {number} eliteChance - 0..1, chance per spawn of an elite
 * @property {Record<string, number>} enemyWeights - enemy mix, relative weights
 */

/**
 * All difficulty values for a depth.
 * @param {typeof import('../../config.js').CONFIG} config
 * @param {number} depth - fight rooms cleared (0 = the first room)
 * @returns {Difficulty}
 */
export function difficultyAt(config, depth) {
  const d = config.difficulty;
  const n = Math.max(0, Math.floor(depth));
  const e = d.elite;
  return {
    depth: n,
    budget: Math.min(d.maxBudget, d.baseEnemies + d.enemiesPerRoom * n),
    waves: Math.min(d.maxWaves, d.baseWaves + Math.floor(n / d.wavesEvery)),
    waveGap: Math.max(d.waveGapMin, d.waveGapStart - d.waveGapPerDepth * n),
    healthScale: 1 + d.healthPerDepth * n,
    damageScale: 1 + d.damagePerDepth * n,
    speedScale: Math.min(d.maxSpeedScale, 1 + d.speedPerDepth * n),
    xpScale: 1 + d.xpPerDepth * n,
    eliteChance: n < e.fromDepth ? 0 : Math.min(e.maxChance, e.baseChance + e.chancePerDepth * (n - e.fromDepth)),
    enemyWeights: weightsAt(d.enemyWeightsByDepth, n),
  };
}

/**
 * The enemy mix for a depth: the last entry whose fromDepth <= depth.
 * @param {{ fromDepth: number, weights: Record<string, number> }[]} table - sorted by fromDepth
 * @param {number} depth
 */
export function weightsAt(table, depth) {
  let weights = table[0].weights;
  for (const row of table) if (row.fromDepth <= depth) weights = row.weights;
  return weights;
}

/**
 * Damage in half hearts after scaling: rounded, never below the base value.
 * @param {number} base - half hearts
 * @param {number} damageScale
 */
export function scaleDamage(base, damageScale) {
  return Math.max(base, Math.round(base * damageScale));
}

/**
 * True if `depth` is one where the HUD flashes "DANGER RISES".
 * @param {object} config
 * @param {number} depth
 */
export function isDangerStep(config, depth) {
  return depth > 0 && depth % config.difficulty.dangerEvery === 0;
}
