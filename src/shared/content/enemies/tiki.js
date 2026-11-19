// Tiki mask spirit: floats over water, drifts at a distance, and fires rings
// of bullets, each ring rotated a little from the last (light bullet-hell).
import { keepDistance, fireRing, distance } from './helpers.js';

export const tiki = {
  update(world, e, target, s, dt) {
    const r = s.ring;
    if (e.state === 'start') {
      e.state = 'float';
      e.timer = world.rng.range(1, r.interval);
    }
    const winding = e.timer <= r.windup;
    keepDistance(world, e, target, winding ? 0 : s.speed, s.preferredRange);
    e.telegraph = winding;
    e.timer -= dt;
    if (e.timer <= 0) {
      if (distance(e, target) <= r.range) {
        fireRing(world, e, r.count, e.counter * r.rotateStep, r);
        e.counter++;
      }
      e.timer = r.interval;
    }
  },
};
