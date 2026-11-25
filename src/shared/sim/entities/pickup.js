// Something dropped by an enemy that a player picks up: coins and hearts.
// (XP gems are in gem.js; both move with systems/pickups.js.)

/**
 * @typedef {object} Pickup
 * @property {number} id
 * @property {'coin'|'heart'} kind
 * @property {number} value - coins, or half hearts healed
 * @property {number} x
 * @property {number} y
 * @property {number} prevX
 * @property {number} prevY
 * @property {number} vx
 * @property {number} vy
 * @property {string|null} targetId - player it is flying to
 */

/** @returns {Pickup} */
export function createPickup(id, kind, value, x, y, vx, vy) {
  return { id, kind, value, x, y, prevX: x, prevY: y, vx, vy, targetId: null };
}
