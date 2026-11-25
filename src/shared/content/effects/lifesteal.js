export const lifesteal = {
  name: 'Lifesteal',
  kind: 'buff',
  onApply(_w, _p, effect) {
    effect.hits = 0;
    effect.kills = 0;
    effect.heals = 0;
  },
  onEnemyDamaged(world, player, effect, cfg, hit) {
    if (effect.heals >= cfg.maxHeals || player.health >= player.maxHealth) return;
    effect.hits++;
    if (hit.killed) effect.kills++;
    if (effect.hits >= cfg.hitsPerHeal || effect.kills >= cfg.killsPerHeal) {
      effect.hits = 0;
      effect.kills = 0;
      effect.heals++;
      player.health = Math.min(player.maxHealth, player.health + 1);
      world.events.push({
        type: 'lifestealHeal',
        playerId: player.id,
        x: player.x,
        y: player.y,
        health: player.health,
      });
    }
  },
};
