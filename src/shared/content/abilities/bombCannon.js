// Lobbed explosive bomb cannon ability.
import { isActive } from '../../sim/entities/enemy.js';
import { createBomb } from '../../sim/entities/bomb.js';
import { EPSILON } from '../../sim/math.js';

/**
 * Bomb stats at a given level.
 * @param {number} level
 * @param {object} cfg
 * @returns {{ cooldown: number, radius: number, damage: number }}
 */
export function bombStats(level, cfg) {
  return {
    cooldown: Math.max(0.8, cfg.baseCooldown - cfg.cooldownPerLevel * (level - 1)),
    radius: cfg.baseRadius + cfg.radiusPerLevel * (level - 1),
    damage: cfg.baseDamage + cfg.damagePerLevel * (level - 1),
  };
}

export const bombCannon = {
  name: 'Bomb cannon',
  describe(level, cfg) {
    const s = bombStats(level, cfg);
    return `Lob bomb (${s.damage} dmg, every ${s.cooldown.toFixed(1)}s)`;
  },
  update(world, player, level, cfg, dt) {
    player.bombCooldown = Math.max(0, (player.bombCooldown ?? 0) - dt);
    if (player.bombCooldown > EPSILON) return;

    const s = bombStats(level, cfg);
    const range2 = cfg.range * cfg.range;
    let target = null;
    let minDist2 = range2;

    for (const e of world.enemies) {
      if (!isActive(e)) continue;
      const d2 = (e.x - player.x) ** 2 + (e.y - player.y) ** 2;
      if (d2 <= range2 && (target === null || d2 < minDist2)) {
        minDist2 = d2;
        target = e;
      }
    }

    if (target) {
      if (!world.bombs) world.bombs = [];
      world.bombs.push(
        createBomb(
          world.nextId++,
          player.id,
          player.x,
          player.y,
          target.x,
          target.y,
          cfg.flightTime,
          s.radius,
          s.damage
        )
      );
      player.bombCooldown = s.cooldown;
      world.events.push({
        type: 'bombLaunched',
        playerId: player.id,
        x: player.x,
        y: player.y,
        targetX: target.x,
        targetY: target.y,
      });
    }
  },
};
