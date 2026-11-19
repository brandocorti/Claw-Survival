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
 */

/**
 * @param {number} id
 * @param {string} type
 * @param {number} x
 * @param {number} y
 * @param {object} stats - config.enemies[type]
 * @param {number} healthScale - multiplier for this round
 * @param {number} spawnDelay - seconds
 * @returns {Enemy}
 */
export function createEnemy(id, type, x, y, stats, healthScale, spawnDelay) {
  const hp = Math.ceil(stats.hp * healthScale);
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
  };
}

/** True once the warning swirl is over: it can move, attack and be hit. */
export function isActive(enemy) {
  return !enemy.dead && enemy.spawnDelay <= 0;
}
