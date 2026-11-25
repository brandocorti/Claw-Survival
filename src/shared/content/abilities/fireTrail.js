// Dodge rolls leave burning ground that hurts walking enemies.

/** Fire stats at a level (damage in HP per hit, duration in seconds). */
export function fireStats(level, c) {
  return {
    damage: c.baseDamage + c.damagePerLevel * level,
    duration: c.baseDuration + c.durationPerLevel * level,
  };
}

export const fireTrail = {
  name: 'Fire roll',
  describe: (level, c) => `Your roll leaves fire: ${fireStats(level, c).damage} damage, ${fireStats(level, c).duration}s`,
  update(world, player, level, c) {
    if (!player.rolling) {
      player.lastFire = null;
      return;
    }
    const last = player.lastFire;
    if (last && Math.hypot(player.x - last.x, player.y - last.y) < c.spacing) return;
    const { damage, duration } = fireStats(level, c);
    player.lastFire = { x: player.x, y: player.y };
    world.fires.push({
      id: world.nextId++,
      ownerId: player.id,
      x: player.x,
      y: player.y,
      life: duration,
      radius: c.radius,
      damage,
      hitCooldown: c.hitCooldown,
    });
  },
};
