// Enemy data. Stats come from config.enemies[type]; behaviour from
// shared/content/enemies/<type>.js.

/**
 * @typedef {object} Enemy
 * @property {number} id
 * @property {string} type - key into config.enemies
 * @property {number} x - feet position
 * @property {number} y
 * @property {number} prevX
 * @property {number} prevY
 * @property {number} vx - desired velocity set by the behaviour this tick
 * @property {number} vy
 * @property {number} hp
 * @property {number} maxHp
 * @property {number} radius
 * @property {boolean} flying
 * @property {boolean} boss
 * @property {boolean} dead
 * @property {number} spawnDelay - seconds before it becomes active (warning swirl)
 * @property {number} spawnDuration - full warning time, for the fade-in
 * @property {string} state - behaviour state, e.g. 'walk', 'windup', 'charge'
 * @property {number} timer - behaviour timer, seconds
 * @property {boolean} telegraph - true while winding up an attack (the client flashes it)
 * @property {number} dirX - charge / roll direction
 * @property {number} dirY
 * @property {number} speedNow - current speed for accelerating enemies (coconut)
 * @property {number} counter - behaviour counter (volleys fired, pattern step)
 * @property {number} lastHitTime - world time of the last hit taken (for the white flash)
 * @property {boolean} killedByPlayer - false when it blew itself up (no XP)
 * @property {boolean} elite - stronger variant (gold outline): more health and XP
 * @property {number} damageScale - multiplier for contact, bullet and blast damage (see difficulty.js)
 * @property {number} speedScale - multiplier for every velocity its behaviour sets
 * @property {number} xpScale - multiplier for the XP it drops
 */

/**
 * Multipliers an enemy is created with (from difficultyAt(), elites included).
 * @typedef {{ health: number, damage: number, speed: number, xp: number, elite: boolean }} EnemyScales
 */

/** No scaling: depth 0, not elite. */
export const BASE_SCALES = Object.freeze({ health: 1, damage: 1, speed: 1, xp: 1, elite: false });

/**
 * @param {number} id
 * @param {string} type
 * @param {number} x
 * @param {number} y
 * @param {object} stats - config.enemies[type]
 * @param {EnemyScales} scales - difficulty multipliers for this enemy
 * @param {number} spawnDelay - seconds
 * @returns {Enemy}
 */
export function createEnemy(id, type, x, y, stats, scales, spawnDelay) {
  const hp = Math.ceil(stats.hp * scales.health);
  return {
    id,
    type,
    x,
    y,
    prevX: x,
    prevY: y,
    vx: 0,
    vy: 0,
    hp,
    maxHp: hp,
    radius: stats.radius,
    flying: Boolean(stats.flying),
    boss: Boolean(stats.boss),
    dead: false,
    spawnDelay,
    spawnDuration: spawnDelay,
    state: 'start',
    timer: 0,
    telegraph: false,
    dirX: 0,
    dirY: 0,
    speedNow: stats.speed,
    counter: 0,
    lastHitTime: -1,
    killedByPlayer: false,
    elite: scales.elite,
    damageScale: scales.damage,
    speedScale: scales.speed,
    xpScale: scales.xp,
  };
}

/** True once the warning swirl is over: it can move, attack and be hit. */
export function isActive(enemy) {
  return !enemy.dead && enemy.spawnDelay <= 0;
}
