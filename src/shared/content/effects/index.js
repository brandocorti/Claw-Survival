// Timed status effect registry (buffs and debuffs).
// To add an effect:
//   1. numbers in config.js -> effects.<id> (must include `duration`)
//   2. an EffectDef object with `name`, `kind` ('buff' | 'debuff'), and one or more hooks:
//        modify(stats, effect, cfg, base)
//        onApply(world, player, effect, cfg)
//        onTick(world, player, effect, cfg, dt)
//        onExpire(world, player, effect, cfg)
//        onPlayerDamaged(world, player, effect, cfg, hit)
//        onEnemyDamaged(world, player, effect, cfg, hit)
//   3. register it in EFFECT_TYPES below
//   4. an 11x11 icon in src/client/art/effectArt.js

/**
 * @typedef {object} ActiveEffect
 * @property {string} id
 * @property {'buff'|'debuff'} kind
 * @property {number} remaining - seconds left
 * @property {number} duration - max seconds (for UI / refresh)
 * @property {string|null} sourceId - player who applied it (null = pickup / environment)
 */

/**
 * @typedef {object} EffectDef
 * @property {string} name
 * @property {'buff'|'debuff'} kind
 * @property {'refresh'|'extend'} [stacking]
 * @property {(stats: object, effect: ActiveEffect, cfg: object, base: object) => void} [modify]
 * @property {(world: object, player: object, effect: ActiveEffect, cfg: object) => void} [onApply]
 * @property {(world: object, player: object, effect: ActiveEffect, cfg: object, dt: number) => void} [onTick]
 * @property {(world: object, player: object, effect: ActiveEffect, cfg: object) => void} [onExpire]
 * @property {(world: object, player: object, effect: ActiveEffect, cfg: object, hit: object) => void} [onPlayerDamaged]
 * @property {(world: object, player: object, effect: ActiveEffect, cfg: object, hit: object) => void} [onEnemyDamaged]
 */

import { totalShield } from './totalShield.js';
import { multiDirFire } from './multiDirFire.js';
import { lifesteal } from './lifesteal.js';
import { thorns } from './thorns.js';
import { homing } from './homing.js';
import { heal } from './heal.js';

export const doubleXp = {
  name: 'Double XP',
  kind: 'buff',
  modify(stats, _effect, cfg) {
    stats.xpMultiplier *= cfg.multiplier;
  },
};

export { totalShield, multiDirFire, lifesteal, thorns, homing };

export const EFFECT_TYPES = Object.freeze({
  doubleXp,
  totalShield,
  multiDirFire,
  lifesteal,
  thorns,
  homing,
  heal,
});
