// Projectile data. Positions are on the ground plane; the client draws them
// raised so they look like they fly at hand height.

/**
 * @typedef {object} Bullet
 * @property {number} id
 * @property {string|number} ownerId - player id or enemy id
 * @property {'player'|'enemy'} team - player bullets hit enemies, enemy bullets hit players
 * @property {number} x
 * @property {number} y
 * @property {number} prevX
 * @property {number} prevY
 * @property {number} vx
 * @property {number} vy
 * @property {number} life - seconds before it drops
 * @property {number} damage
 * @property {number} radius
 */

/**
 * @param {number} id
 * @param {string|number} ownerId
 * @param {'player'|'enemy'} team
 * @param {number} x
 * @param {number} y
 * @param {number} angle - radians
 * @param {{ speed: number, range: number, damage: number, radius: number }} stats
 * @returns {Bullet}
 */
export function createBullet(id, ownerId, team, x, y, angle, stats) {
  return {
    id,
    ownerId,
    team,
    x,
    y,
    prevX: x,
    prevY: y,
    vx: Math.cos(angle) * stats.speed,
    vy: Math.sin(angle) * stats.speed,
    life: stats.range / stats.speed,
    damage: stats.damage,
    radius: stats.radius,
  };
}
