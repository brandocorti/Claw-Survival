// Coconut creature: rolls at you, speeding up. Explodes on death or when it
// touches you. The blast also hurts other enemies, so chain reactions happen.
import { moveToward } from './helpers.js';
import { killEnemy, queueExplosion } from '../../sim/systems/damage.js';

export const coconut = {
  update(world, e, target, s, dt) {
    e.speedNow = Math.min(s.maxSpeed, e.speedNow + s.acceleration * dt);
    moveToward(world, e, target, e.speedNow);
  },

  /** Touching a player sets it off (no XP: the player did not kill it). */
  onContact(world, e) {
    killEnemy(world, e, null);
  },

  /** Every coconut death is an explosion; kills it causes are credited to whoever killed the coconut. */
  onDeath(world, e, killerId) {
    queueExplosion(world, e.x, e.y, world.config.enemies.coconut.explosion, killerId);
  },
};
