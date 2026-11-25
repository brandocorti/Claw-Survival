// Collectible timed buff pickups dropped on the arena sand.

/**
 * @typedef {object} Pickup
 * @property {number} id
 * @property {string} effectId - key into world.effectTypes and config.effects
 * @property {number} x
 * @property {number} y
 * @property {number} prevX
 * @property {number} prevY
 * @property {number} life - seconds before it despawns
 * @property {number} maxLife
 * @property {boolean} collected
 */

/**
 * @param {number} id
 * @param {string} effectId
 * @param {number} x
 * @param {number} y
 * @param {number} lifetime - seconds
 * @returns {Pickup}
 */
export function createPickup(id, effectId, x, y, lifetime) {
  return {
    id,
    effectId,
    x,
    y,
    prevX: x,
    prevY: y,
    life: lifetime,
    maxLife: lifetime,
    collected: false,
  };
}
