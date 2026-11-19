// Angry crab: fast, scuttles toward you, and every few seconds winds up and
// charges SIDEWAYS (mostly horizontal), so moving up or down dodges it.
import { moveToward, distance, canShoot } from './helpers.js';

export const crab = {
  /**
   * @param {object} world
   * @param {import('../../sim/entities/enemy.js').Enemy} e
   * @param {import('../../sim/entities/player.js').Player} target
   * @param {object} s - config.enemies.crab
   * @param {number} dt
   */
  update(world, e, target, s, dt) {
    const c = s.charge;
    switch (e.state) {
      case 'start':
        e.state = 'walk';
        e.timer = world.rng.range(c.intervalMin, c.intervalMax);
        break;

      case 'walk': {
        moveToward(world, e, target, s.speed);
        e.timer -= dt;
        const dx = target.x - e.x;
        const dy = target.y - e.y;
        // Only charge when roughly level with the player: crabs charge sideways.
        if (e.timer <= 0 && Math.abs(dy) < 48 && distance(e, target) < c.maxDistance && canShoot(world, e, target, c.maxDistance)) {
          const sx = Math.sign(dx) || 1;
          const sy = Math.max(-0.35, Math.min(0.35, dy / Math.max(Math.abs(dx), 1)));
          const len = Math.hypot(sx, sy);
          e.dirX = sx / len;
          e.dirY = sy / len;
          e.state = 'windup';
          e.timer = c.windup;
          e.telegraph = true; // flash from the very first wind-up tick
        }
        break;
      }

      case 'windup':
        e.telegraph = true;
        e.timer -= dt;
        if (e.timer <= 0) {
          e.state = 'charge';
          e.timer = c.duration;
        }
        break;

      case 'charge':
        e.vx = e.dirX * c.speed;
        e.vy = e.dirY * c.speed;
        e.timer -= dt;
        if (e.timer <= 0 || e.hitWall) {
          e.state = 'walk';
          e.timer = world.rng.range(c.intervalMin, c.intervalMax);
        }
        break;

      default:
        e.state = 'start';
    }
  },
};
