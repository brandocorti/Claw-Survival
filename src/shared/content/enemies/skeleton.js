// Skeleton pirate: keeps its distance and shoots slow aimed bullets, with a
// short wind-up flash before each shot.
import { keepDistance, canShoot, angleTo, fireFan } from './helpers.js';

export const skeleton = {
  update(world, e, target, s, dt) {
    const f = s.fire;
    if (e.state === 'start') {
      e.state = 'move';
      e.timer = world.rng.range(0.6, f.interval);
    }
    const winding = e.timer <= f.windup;
    keepDistance(world, e, target, winding ? s.speed * 0.3 : s.speed, s.preferredRange);
    e.telegraph = winding;
    e.timer -= dt;
    if (e.timer <= 0) {
      if (canShoot(world, e, target, f.range * 0.9)) fireFan(world, e, angleTo(e, target), 1, 0, f);
      e.timer = f.interval * world.rng.range(0.85, 1.15);
    }
  },
};
