// Shapes of the data exchanged between the input layer and the simulation.
// In milestone 5 these same objects travel over the network to the server.

/**
 * Survivors-style controls: the client only sends movement and the roll button.
 * Aiming and shooting are decided by the simulation (auto-aim).
 * @typedef {object} PlayerInput
 * @property {number} moveX - -1..1 (A/D)
 * @property {number} moveY - -1..1 (W/S), +1 is down the screen
 * @property {boolean} roll - roll pressed since the last tick (edge, not held)
 */

/** @returns {PlayerInput} an input with nothing pressed */
export function createEmptyInput() {
  return { moveX: 0, moveY: 0, roll: false };
}

/**
 * Simulation events, emitted each tick for visuals and sound (never for game rules).
 * @typedef {{ type: 'shot', playerId: string, x: number, y: number, angle: number }
 *   | { type: 'bulletHit', x: number, y: number, team: string }
 *   | { type: 'bulletExpired', x: number, y: number, team: string }
 *   | { type: 'roll', playerId: string, x: number, y: number, dirX: number, dirY: number }
 *   | { type: 'enemySpawning', id: number, enemyType: string, x: number, y: number }
 *   | { type: 'enemyHit', id: number, x: number, y: number }
 *   | { type: 'enemyDied', id: number, enemyType: string, x: number, y: number, boss: boolean }
 *   | { type: 'enemyShot', id: number, x: number, y: number }
 *   | { type: 'explosion', x: number, y: number, radius: number }
 *   | { type: 'playerHit', playerId: string, x: number, y: number, health: number }
 *   | { type: 'playerDied', playerId: string, x: number, y: number }
 *   | { type: 'gemCollected', playerId: string, value: number }
 *   | { type: 'levelUp', playerId: string, level: number }
 *   | { type: 'roundStarted', round: number }
 *   | { type: 'bossSpawned', id: number, enemyType: string }} SimEvent
 */
