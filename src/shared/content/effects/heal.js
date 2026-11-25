// Instant healing pickup: restores health immediately on collection.
export const heal = {
  name: 'Heart',
  kind: 'buff',
  instant: true,
  onApply(world, player, _effect, cfg) {
    const amount = cfg?.amount ?? 2;
    player.health = Math.min(player.maxHealth, player.health + amount);
    world.events.push({ type: 'lifestealHeal', playerId: player.id, x: player.x, y: player.y, health: player.health });
  },
};
