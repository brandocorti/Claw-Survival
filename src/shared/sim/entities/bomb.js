// Thrown bomb projectile data.

/**
 * @typedef {object} Bomb
 * @property {number} id
 * @property {string|number} ownerId
 * @property {number} startX
 * @property {number} startY
 * @property {number} targetX
 * @property {number} targetY
 * @property {number} x
 * @property {number} y
 * @property {number} prevX
 * @property {number} prevY
 * @property {number} elapsed
 * @property {number} flightTime
 * @property {number} radius
 * @property {number} damage
 */

/**
 * Creates a thrown bomb entity.
 * @param {number} id
 * @param {string|number} ownerId
 * @param {number} startX
 * @param {number} startY
 * @param {number} targetX
 * @param {number} targetY
 * @param {number} flightTime
 * @param {number} radius
 * @param {number} damage
 * @returns {Bomb}
 */
export function createBomb(id, ownerId, startX, startY, targetX, targetY, flightTime, radius, damage) {
  return {
    id,
    ownerId,
    startX,
    startY,
    targetX,
    targetY,
    x: startX,
    y: startY,
    prevX: startX,
    prevY: startY,
    elapsed: 0,
    flightTime,
    radius,
    damage,
  };
}
