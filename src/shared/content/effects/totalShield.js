export const totalShield = {
  name: 'Total shield',
  kind: 'buff',
  modify(stats) {
    stats.invulnerable = true;
  },
};
