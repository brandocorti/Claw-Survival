// Seeded random numbers. The simulation never calls Math.random(), so a match
// replays identically from the same seed (needed for tests and for the server).

/**
 * Creates a deterministic random generator (mulberry32).
 * @param {number} seed - any 32-bit integer
 * @returns {{ next: () => number, range: (min: number, max: number) => number, int: (min: number, max: number) => number }}
 */
export function createRng(seed) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    /** Float in [0, 1). */
    next,
    /** Float in [min, max). */
    range: (min, max) => min + (max - min) * next(),
    /** Integer in [min, max], both included. */
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
  };
}
