// Coconuts that circle the player and hurt enemies they touch.
import { hitEnemiesAround } from '../../sim/systems/abilities.js';

/**
 * Where a player's coconuts are at a given time (also used by the client to draw them).
 * @param {{ x: number, y: number }} center
 * @param {number} time - world time, seconds
 * @param {number} level
 * @param {object} c - config.abilities.orbitCoconuts
 * @returns {{ x: number, y: number }[]}
 */
export function orbitPositions(center, time, level, c) {
  const count = c.perLevel * level;
  return Array.from({ length: count }, (_, i) => {
    const a = time * c.angularSpeed + (i * Math.PI * 2) / count;
    return { x: center.x + Math.cos(a) * c.orbitRadius, y: center.y + Math.sin(a) * c.orbitRadius };
  });
}

export const orbitCoconuts = {
  name: 'Coconut guard',
  describe(level, c) {
    const n = c.perLevel * level;
    return n === 1 ? '1 coconut circles you and hits enemies' : `${n} coconuts circle you and hit enemies`;
  },
  update(world, player, level, c) {
    for (const at of orbitPositions(player, world.time, level, c)) {
      hitEnemiesAround(world, at, c, player.id, `orbit:${player.id}`);
    }
  },
};
