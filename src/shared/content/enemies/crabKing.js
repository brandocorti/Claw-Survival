// Crab King (mini-boss): cycles through config.enemies.crabKing.pattern. The
// full ring is only used below half health.
import { updateBoss } from './boss.js';

export const crabKing = {
  update(world, e, target, s, dt) {
    updateBoss(world, e, target, s, dt, () => {
      const attack = s.pattern[e.counter++ % s.pattern.length];
      return attack === 'ring' && e.hp > e.maxHp / 2 ? 'fan' : attack;
    });
  },
};
