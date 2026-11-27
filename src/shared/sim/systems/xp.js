// XP gems and levelling. Level-ups are counted in player.pendingLevelUps; the
// card choice that spends them is milestone 3.
import { createGem } from '../entities/gem.js';
import { openSpotNear } from '../map.js';
import { flyToPlayers, popVelocity } from './pickups.js';

/**
 * XP needed to go from `level` to `level + 1`:
 *   round(base + growth * (level - 1) ^ exponent)
 * @param {number} level - current level, starting at 1
 * @param {{ base: number, growth: number, exponent: number }} curve - config.xp.curve
 */
export function xpToNextLevel(level, curve) {
  return Math.round(curve.base + curve.growth * Math.pow(level - 1, curve.exponent));
}

/**
 * Splits an XP value into gems (largest first) that pop out around (x, y).
 * @param {object} world
 */
export function dropGems(world, x, y, value) {
  let left = value;
  const spot = openSpotNear(world.map, x, y);
  for (const size of world.config.xp.gemValues) {
    while (left >= size) {
      const v = popVelocity(world.rng);
      world.gems.push(createGem(world.nextId++, size, spot.x, spot.y, v.vx, v.vy));
      left -= size;
    }
  }
}

/**
 * Adds XP to a player and levels up as many times as it covers.
 * @param {object} world
 * @param {import('../entities/player.js').Player} player
 * @param {number} value
 */
export function grantXp(world, player, value) {
  player.xp += value;
  let need = xpToNextLevel(player.level, world.config.xp.curve);
  while (player.xp >= need) {
    player.xp -= need;
    player.level++;
    player.pendingLevelUps++;
    world.events.push({ type: 'levelUp', playerId: player.id, level: player.level });
    need = xpToNextLevel(player.level, world.config.xp.curve);
  }
}

/**
 * Moves gems: they pop out and slow down, then fly to a living player within
 * pickupRadius and are collected on touch.
 * @param {object} world
 * @param {number} dt
 */
export function updateGems(world, dt) {
  flyToPlayers(world, world.gems, dt, () => true, (player, gem) => {
    world.events.push({ type: 'gemCollected', playerId: player.id, value: gem.value });
    grantXp(world, player, gem.value);
  });
}
