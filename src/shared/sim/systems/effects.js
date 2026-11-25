// Status effects (buffs and debuffs): apply, count down, expire, and work out
// the player's stats from the config plus every active effect.
// Definitions are data in shared/content/effects/. This module is the one place
// stats are changed, so milestone 3 (ability cards = buffs for the whole run) and
// milestone 6 (bad perks = debuffs with a sourceId) reuse it as is.
import { EFFECTS } from '../../content/effects/index.js';
import { baseStats } from '../entities/player.js';

/**
 * One effect on one player.
 * @typedef {object} ActiveEffect
 * @property {string} id - key into EFFECTS
 * @property {'buff'|'debuff'} kind
 * @property {number|null} secondsLeft - null if not timed in seconds
 * @property {number|null} roomsLeft - fight rooms left, null if not timed in rooms
 * @property {boolean} untilBreak - ends when the player enters a break room
 * @property {string|null} sourceId - who caused it (a player id from milestone 6; 'salesman' now)
 */

/**
 * Applies an effect. The same effect again refreshes its duration (no stacking).
 * @param {object} world
 * @param {import('../entities/player.js').Player} player
 * @param {string} effectId
 * @param {{ sourceId?: string|null, defs?: Record<string, import('../../content/effects/index.js').EffectDef> }} [options]
 * @returns {ActiveEffect}
 */
export function applyEffect(world, player, effectId, { sourceId = null, defs = EFFECTS } = {}) {
  const def = defs[effectId];
  if (!def) throw new Error(`Unknown effect "${effectId}"`);
  const d = def.duration;
  const active = {
    id: def.id,
    kind: def.kind,
    secondsLeft: d.seconds ?? null,
    roomsLeft: d.rooms ?? null,
    untilBreak: Boolean(d.untilBreak),
    sourceId,
  };
  const i = player.effects.findIndex((e) => e.id === effectId);
  if (i >= 0) player.effects[i] = active;
  else player.effects.push(active);
  recomputeStats(world, player, defs, { fillNewHealth: true });
  world.events.push({ type: 'effectApplied', playerId: player.id, effectId, kind: def.kind });
  return active;
}

/**
 * Removes an effect (if active) and restores the stats it changed.
 * @param {object} world
 * @param {import('../entities/player.js').Player} player
 * @param {string} effectId
 * @param {Record<string, object>} [defs]
 */
export function removeEffect(world, player, effectId, defs = EFFECTS) {
  const before = player.effects.length;
  player.effects = player.effects.filter((e) => e.id !== effectId);
  if (player.effects.length === before) return;
  recomputeStats(world, player, defs);
  world.events.push({ type: 'effectExpired', playerId: player.id, effectId });
}

/**
 * Counts down effects timed in seconds. Call once per tick.
 * @param {object} world
 * @param {number} dt
 * @param {Record<string, object>} [defs]
 */
export function updateEffects(world, dt, defs = EFFECTS) {
  for (const p of world.players) {
    if (!p.alive || p.effects.length === 0) continue;
    for (const e of p.effects) if (e.secondsLeft !== null) e.secondsLeft -= dt;
    for (const e of p.effects.filter((x) => x.secondsLeft !== null && x.secondsLeft <= 0)) {
      removeEffect(world, p, e.id, defs);
    }
  }
}

/**
 * Called when a player enters a room: room-timed effects lose a fight room,
 * and "until the next break" effects end in a break room.
 * @param {object} world
 * @param {import('../entities/player.js').Player} player
 * @param {'fight'|'break'} kind
 * @param {Record<string, object>} [defs]
 */
export function onRoomEntered(world, player, kind, defs = EFFECTS) {
  const ending = [];
  for (const e of player.effects) {
    if (kind === 'break' && e.untilBreak) ending.push(e.id);
    if (kind === 'fight' && e.roomsLeft !== null) {
      e.roomsLeft--;
      if (e.roomsLeft < 0) ending.push(e.id);
    }
  }
  for (const id of ending) removeEffect(world, player, id, defs);
}

/**
 * Works out player.stats from the config and every active effect:
 *   stat = (base + sum of add) * product of mul
 * Max health never drops below 1 heart. Losing max health only trims health
 * that no longer fits (it never kills). Gaining it fills the new heart only
 * when an effect is applied (a buff), not when a debuff wears off.
 * @param {object} world
 * @param {import('../entities/player.js').Player} player
 * @param {Record<string, object>} [defs]
 * @param {{ fillNewHealth?: boolean }} [options]
 */
export function recomputeStats(world, player, defs = EFFECTS, { fillNewHealth = false } = {}) {
  const base = baseStats(world.config, player.weapon);
  const add = {};
  const mul = {};
  for (const e of player.effects) {
    for (const [stat, m] of Object.entries(defs[e.id].modifiers)) {
      add[stat] = (add[stat] ?? 0) + (m.add ?? 0);
      mul[stat] = (mul[stat] ?? 1) * (m.mul ?? 1);
    }
  }
  const stats = {};
  for (const [stat, value] of Object.entries(base)) stats[stat] = (value + (add[stat] ?? 0)) * (mul[stat] ?? 1);
  stats.maxHealth = Math.max(2, Math.round(stats.maxHealth));

  const gained = stats.maxHealth - player.maxHealth;
  player.stats = stats;
  player.maxHealth = stats.maxHealth;
  if (fillNewHealth && gained > 0 && player.alive) player.health += gained;
  player.health = Math.min(player.health, player.maxHealth);
}
