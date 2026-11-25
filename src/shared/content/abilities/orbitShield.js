// Orbiting shields that block or reflect enemy bullets.

/**
 * Number of shields at a given level.
 * @param {number} level
 * @param {object} cfg
 * @returns {number}
 */
export function shieldCount(level, cfg) {
  return cfg.counts[Math.min(level, cfg.counts.length) - 1];
}

/**
 * Where a player's shields are at a given time.
 * @param {{ x: number, y: number }} center
 * @param {number} time
 * @param {number} level
 * @param {object} cfg
 * @returns {{ x: number, y: number }[]}
 */
export function shieldPositions(center, time, level, cfg) {
  const count = shieldCount(level, cfg);
  return Array.from({ length: count }, (_, i) => {
    const a = time * cfg.angularSpeed + (i * Math.PI * 2) / count;
    return {
      x: center.x + Math.cos(a) * cfg.orbitRadius,
      y: center.y + Math.sin(a) * cfg.orbitRadius,
    };
  });
}

export const orbitShield = {
  name: 'Shell shield',
  describe(level, cfg) {
    const n = shieldCount(level, cfg);
    if (level < cfg.bounceFromLevel) {
      return `${n} ${n === 1 ? 'shield blocks' : 'shields block'} shots`;
    }
    return `${n} shields bounce shots`;
  },
  update(world, player, level, cfg) {
    if (!world.bullets || world.bullets.length === 0) return;
    const positions = shieldPositions(player, world.time, level, cfg);
    for (const at of positions) {
      for (const b of world.bullets) {
        if (b.team === 'enemy' && b.life > 0) {
          const distSq = (b.x - at.x) ** 2 + (b.y - at.y) ** 2;
          const hitDist = b.radius + cfg.radius;
          if (distSq <= hitDist * hitDist) {
            if (level >= cfg.bounceFromLevel) {
              b.team = 'player';
              b.ownerId = player.id;
              b.vx = -b.vx * cfg.reflectSpeedScale;
              b.vy = -b.vy * cfg.reflectSpeedScale;
              b.damage = cfg.reflectDamage;
              b.hitIds = [];
              b.life += cfg.reflectBonusLife ?? 1.0;
              world.events.push({
                type: 'shieldReflected',
                playerId: player.id,
                x: b.x,
                y: b.y,
              });
            } else {
              b.life = 0;
              world.events.push({
                type: 'shieldBlocked',
                playerId: player.id,
                x: b.x,
                y: b.y,
              });
            }
          }
        }
      }
    }
  },
};
