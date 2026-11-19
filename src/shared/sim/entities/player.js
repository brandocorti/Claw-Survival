// Player data. Systems in ../systems change it; the client only reads it.

/**
 * @typedef {object} Player
 * @property {string} id
 * @property {number} x - feet position (center of the collision box)
 * @property {number} y
 * @property {number} prevX - position at the start of the tick (for smooth rendering)
 * @property {number} prevY
 * @property {number} aim - radians: toward the auto-aim target, else the walking direction
 * @property {number} moveAngle - radians, last walking direction
 * @property {number|null} targetId - enemy the weapon is aimed at
 * @property {boolean} alive
 * @property {number} health - half hearts
 * @property {number} maxHealth - half hearts
 * @property {number} xp - XP toward the next level
 * @property {number} level
 * @property {number} pendingLevelUps - level-ups whose card choice is still open (milestone 3)
 * @property {number} kills
 * @property {string} weapon - key into config.weapons
 * @property {number} fireCooldown - seconds until the next shot
 * @property {boolean} moving
 * @property {boolean} rolling
 * @property {number} rollTime - seconds left in the current roll
 * @property {number} rollDirX
 * @property {number} rollDirY
 * @property {number} rollCooldown - seconds until the next roll is allowed
 * @property {number} invulnerableTime - seconds of invulnerability left (roll or after a hit)
 * @property {number} lastHitTime - world time of the last damage taken (for the hit flash)
 */

/**
 * @param {string} id
 * @param {number} x
 * @param {number} y
 * @param {typeof import('../../config.js').CONFIG} config
 * @returns {Player}
 */
export function createPlayer(id, x, y, config) {
  const p = config.player;
  return {
    id,
    x,
    y,
    prevX: x,
    prevY: y,
    aim: Math.PI / 2,
    moveAngle: Math.PI / 2,
    targetId: null,
    alive: true,
    health: p.maxHealth,
    maxHealth: p.maxHealth,
    xp: 0,
    level: 1,
    pendingLevelUps: 0,
    kills: 0,
    weapon: p.startingWeapon,
    fireCooldown: 0,
    moving: false,
    rolling: false,
    rollTime: 0,
    rollDirX: 0,
    rollDirY: 0,
    rollCooldown: 0,
    invulnerableTime: 0,
    lastHitTime: -1,
  };
}

/** @param {Player} player */
export function isInvulnerable(player) {
  return player.invulnerableTime > 0;
}
