import { damageEnemy } from '../../sim/systems/damage.js';
import { isActive } from '../../sim/entities/enemy.js';

export const thorns = {
  name: 'Thorns',
  kind: 'buff',
  onPlayerDamaged(world, player, _effect, cfg, { source } = {}) {
    const enemy =
      source?.enemy ??
      (source?.attackerId != null
        ? world.enemies.find((e) => e.id === source.attackerId)
        : null);

    if (!enemy || !isActive(enemy)) return;

    const dmg =
      source.kind === 'contact' && !enemy.boss
        ? enemy.hp
        : enemy.boss
          ? cfg.bossDamage
          : cfg.rangedDamage;

    damageEnemy(world, enemy, dmg, player.id);
    world.events.push({
      type: 'thornsHit',
      playerId: player.id,
      enemyId: enemy.id,
      x: enemy.x,
      y: enemy.y,
      damage: dmg,
    });
  },
};
