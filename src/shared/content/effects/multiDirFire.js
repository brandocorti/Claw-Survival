export const multiDirFire = {
  name: '4-way fire',
  kind: 'buff',
  modify(stats, _effect, cfg) {
    stats.fireDirections = Math.max(stats.fireDirections, cfg.directions);
  },
};
