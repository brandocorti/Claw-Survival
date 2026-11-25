// Abilities that only change numbers. `modify` edits the player's derived stats;
// `base` holds the values without any ability, so percentages do not compound.
// `describe` is the card text for the level you would reach.

const percent = (v) => `${Math.round(v * 100)}%`;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export const damage = {
  name: 'Heavy pebbles',
  describe: (level, c) => `+${c.damagePerLevel} damage per pebble`,
  modify(stats, level, c) {
    stats.damage += c.damagePerLevel * level;
  },
};

export const fireRate = {
  name: 'Quick hands',
  describe: (level, c) => `+${percent(c.ratePerLevel)} fire rate`,
  modify(stats, level, c, base) {
    stats.fireRate += base.fireRate * c.ratePerLevel * level;
  },
};

export const moveSpeed = {
  name: 'Beach runner',
  describe: (level, c) => `+${percent(c.speedPerLevel)} move speed`,
  modify(stats, level, c, base) {
    stats.moveSpeed += base.moveSpeed * c.speedPerLevel * level;
  },
};

export const maxHearts = {
  name: 'Big heart',
  describe: (level, c) => `+${plural(c.healthPerLevel / 2, 'heart', 'hearts')}, and heals it`,
  modify(stats, level, c) {
    stats.maxHealth += c.healthPerLevel * level;
  },
  onPick(world, player, level, c) {
    player.health = Math.min(player.maxHealth, player.health + c.healthPerLevel);
  },
};

export const multishot = {
  name: 'Handful',
  describe: (level, c) => `Shoot ${1 + c.shotsPerLevel * level} pebbles at once`,
  modify(stats, level, c) {
    stats.shots += c.shotsPerLevel * level;
    stats.shotSpread = c.spread;
  },
};

export const piercing = {
  name: 'Sharp stones',
  describe: (level, c) => `Pebbles pass through ${plural(c.piercePerLevel * level, 'enemy', 'enemies')}`,
  modify(stats, level, c) {
    stats.pierce += c.piercePerLevel * level;
  },
};
