export const homing = {
  name: 'Homing shots',
  kind: 'buff',
  modify(stats, _effect, cfg) {
    stats.homingRange = Math.max(stats.homingRange, cfg.range);
    stats.homingTurnRate = Math.max(stats.homingTurnRate, cfg.turnRate);
  },
};
