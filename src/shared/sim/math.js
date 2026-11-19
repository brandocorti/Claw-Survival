// Small math helpers used by the simulation.

/**
 * Tolerance for timers. Subtracting 1/60 repeatedly leaves tiny leftovers
 * (0.3 - 18 * (1/60) is 1e-17, not 0), so "timer done" means <= EPSILON.
 */
export const EPSILON = 1e-9;

/**
 * Scales a direction so its length is at most 1 (diagonals are not faster).
 * @param {number} x
 * @param {number} y
 * @returns {{ x: number, y: number }}
 */
export function clampToUnit(x, y) {
  const len = Math.hypot(x, y);
  if (len <= 1 || len === 0) return { x, y };
  return { x: x / len, y: y / len };
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}
