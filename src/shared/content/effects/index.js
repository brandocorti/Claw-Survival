// Status effect definitions (buffs and debuffs). Pure data; the rules that apply,
// tick and expire them are in shared/sim/systems/effects.js.
//
// Fields:
//   id          unique key
//   kind        'buff' | 'debuff'  (debuffs are drawn purple: curses only)
//   name        short, shown on cards and in the HUD tooltip
//   description short, what it does
//   icon        icon key drawn by the client (client/art/effectArt.js)
//   duration    { rooms: n } fight rooms, { seconds: n }, { untilBreak: true } or { run: true }
//   modifiers   { <stat>: { add?: number, mul?: number } }, stats: see BASE_STATS in effects.js
//               (moveSpeed, fireRate, damage, maxHealth, pickupRadius). maxHealth is in half hearts.
//
// Reuse later: milestone 3 level-up abilities are buffs with { run: true };
// milestone 6 bad perks are debuffs applied with a sourceId (who sent the curse).

/** @typedef {{ add?: number, mul?: number }} StatModifier */
/**
 * @typedef {object} EffectDef
 * @property {string} id
 * @property {'buff'|'debuff'} kind
 * @property {string} name
 * @property {string} description
 * @property {string} icon
 * @property {{ rooms?: number, seconds?: number, untilBreak?: boolean, run?: boolean }} duration
 * @property {Record<string, StatModifier>} modifiers
 */

/** @type {Record<string, EffectDef>} */
export const EFFECTS = Object.freeze({
  // Buffs
  quickPebbles: {
    id: 'quickPebbles', kind: 'buff', name: 'QUICK PEBBLES', description: '+20% FIRE RATE',
    icon: 'fire', duration: { rooms: 3 }, modifiers: { fireRate: { mul: 1.2 } },
  },
  seaLegs: {
    id: 'seaLegs', kind: 'buff', name: 'SEA LEGS', description: '+15% MOVE SPEED',
    icon: 'speed', duration: { rooms: 3 }, modifiers: { moveSpeed: { mul: 1.15 } },
  },
  coconutMilk: {
    id: 'coconutMilk', kind: 'buff', name: 'COCONUT MILK', description: '+1 MAX HEART',
    icon: 'heart', duration: { rooms: 3 }, modifiers: { maxHealth: { add: 2 } },
  },
  gemMagnet: {
    id: 'gemMagnet', kind: 'buff', name: 'GEM MAGNET', description: '+50% PICKUP RADIUS',
    icon: 'magnet', duration: { rooms: 3 }, modifiers: { pickupRadius: { mul: 1.5 } },
  },
  // Debuffs (purple)
  sandInBoots: {
    id: 'sandInBoots', kind: 'debuff', name: 'SAND IN BOOTS', description: '-20% MOVE SPEED',
    icon: 'speed', duration: { rooms: 3 }, modifiers: { moveSpeed: { mul: 0.8 } },
  },
  wetBands: {
    id: 'wetBands', kind: 'debuff', name: 'WET BANDS', description: '-25% FIRE RATE',
    icon: 'fire', duration: { rooms: 3 }, modifiers: { fireRate: { mul: 0.75 } },
  },
  sunburn: {
    id: 'sunburn', kind: 'debuff', name: 'SUNBURN', description: '-1 HEART UNTIL THE NEXT BREAK',
    icon: 'heart', duration: { untilBreak: true }, modifiers: { maxHealth: { add: -2 } },
  },
  butterfingers: {
    id: 'butterfingers', kind: 'debuff', name: 'BUTTERFINGERS', description: '-50% PICKUP RADIUS',
    icon: 'magnet', duration: { rooms: 3 }, modifiers: { pickupRadius: { mul: 0.5 } },
  },
});

/** Effect ids of one kind, in definition order. */
export function effectIdsOfKind(kind) {
  return Object.values(EFFECTS).filter((e) => e.kind === kind).map((e) => e.id);
}
