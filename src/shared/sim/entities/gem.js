// XP gem dropped by a defeated enemy.

/**
 * @typedef {object} Gem
 * @property {number} id
 * @property {number} value - XP
 * @property {number} x
 * @property {number} y
 * @property {number} prevX
 * @property {number} prevY
 * @property {number} vx - pop-out velocity, then magnet velocity
 * @property {number} vy
 * @property {string|null} targetId - player it is flying to
 * @property {boolean} collected
 */

/** @returns {Gem} */
export function createGem(id, value, x, y, vx, vy) {
  return { id, value, x, y, prevX: x, prevY: y, vx, vy, targetId: null, collected: false };
}
