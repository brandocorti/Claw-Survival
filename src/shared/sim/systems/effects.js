// Timed status effects (buffs and debuffs) applied to players.
import { EPSILON } from '../math.js';
import { refreshStats } from './abilities.js';

/**
 * Applies or refreshes a timed status effect on a living player.
 * @param {object} world
 * @param {import('../entities/player.js').Player} player
 * @param {string} id - key into world.effectTypes and config.effects
 * @param {{ duration?: number, sourceId?: string | null }} [options]
 * @returns {import('../../content/effects/index.js').ActiveEffect | null}
 */
export function applyEffect(world, player, id, options = {}) {
  const def = world.effectTypes?.[id];
  const cfg = world.config.effects?.[id];
  if (!def || !player.alive) return null;

  const duration = options.duration ?? cfg?.duration ?? 0;
  if (duration <= 0) return null;

  const sourceId = options.sourceId ?? null;
  let active = getEffect(player, id);
  if (active) {
    if ((def.stacking ?? 'refresh') === 'extend') {
      active.remaining += duration;
      active.duration = Math.max(active.duration, active.remaining);
    } else {
      active.remaining = Math.max(active.remaining, duration);
      active.duration = Math.max(active.duration, duration);
    }
    active.sourceId = sourceId;
  } else {
    active = { id, kind: def.kind, remaining: duration, duration, sourceId };
    player.effects.push(active);
  }

  def.onApply?.(world, player, active, cfg);
  refreshStats(world, player);
  world.events.push({
    type: 'effectApplied',
    playerId: player.id,
    effectId: id,
    kind: def.kind,
    duration: active.remaining,
    sourceId,
  });
  return active;
}

/** @param {import('../entities/player.js').Player} player @param {string} id */
export function hasEffect(player, id) {
  return player.effects.some((e) => e.id === id);
}

/** @param {import('../entities/player.js').Player} player @param {string} id */
export function getEffect(player, id) {
  return player.effects.find((e) => e.id === id) ?? null;
}

/**
 * Ticks active effects for all living players and removes expired ones.
 * @param {object} world
 * @param {number} dt
 */
export function updateEffects(world, dt) {
  for (const player of world.players) {
    if (!player.alive || player.effects.length === 0) continue;
    let changed = false;
    let kept = 0;

    // Iterate over a snapshot of indices; keep surviving effects in-place.
    const count = player.effects.length;
    for (let i = 0; i < count; i++) {
      const effect = player.effects[i];
      const def = world.effectTypes?.[effect.id];
      const cfg = world.config.effects?.[effect.id];
      effect.remaining -= dt;
      def?.onTick?.(world, player, effect, cfg, dt);

      if (effect.remaining <= EPSILON) {
        def?.onExpire?.(world, player, effect, cfg);
        world.events.push({
          type: 'effectExpired',
          playerId: player.id,
          effectId: effect.id,
          kind: effect.kind,
        });
        changed = true;
        continue;
      }
      player.effects[kept++] = effect;
    }
    player.effects.length = kept;
    if (changed) refreshStats(world, player);
  }
}

/**
 * Expires and removes all active effects from a player (e.g. on death).
 * @param {object} world
 * @param {import('../entities/player.js').Player} player
 */
export function clearEffects(world, player) {
  if (player.effects.length === 0) return;
  const old = player.effects.slice();
  player.effects.length = 0;
  for (const effect of old) {
    const def = world.effectTypes?.[effect.id];
    const cfg = world.config.effects?.[effect.id];
    def?.onExpire?.(world, player, effect, cfg);
  }
  refreshStats(world, player);
}
