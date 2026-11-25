// Crab Emperor (final boss): fought alone after the match timer. Below half
// health it switches to enragedPattern, which adds the bullet spiral.
import { updateBoss } from './boss.js';

export const crabEmperor = {
  update(world, e, target, s, dt) {
    updateBoss(world, e, target, s, dt, () => {
      const pattern = e.hp <= e.maxHp / 2 ? s.enragedPattern : s.pattern;
      return pattern[e.counter++ % pattern.length];
    });
  },
};
