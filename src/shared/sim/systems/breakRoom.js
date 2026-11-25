// Break rooms: rest at the campfire and buy from the Salesman, paying with XP.
// Prices are a fraction of the current XP bar, so they scale with level, and
// they are paid from the progress on that bar: spending never removes a level.
// Player actions arrive through applyAction(), so in milestone 5 the same
// actions can come over the network to the server unchanged.
import { xpToNextLevel } from './xp.js';
import { applyEffect } from './effects.js';
import { effectIdsOfKind } from '../../content/effects/index.js';

/**
 * XP cost of an item at a level: ceil(price fraction * XP bar of that level).
 * @param {object} config
 * @param {'rest'|'roll'|'intel'} item
 * @param {number} level
 */
export function priceOf(config, item, level) {
  return Math.ceil(config.breakRoom.prices[item] * xpToNextLevel(level, config.xp.curve));
}

/**
 * Takes XP from the progress on the current bar. Never touches the level.
 * @param {import('../entities/player.js').Player} player
 * @param {number} cost
 * @returns {boolean} false (and nothing spent) if the player cannot afford it
 */
export function spendXp(player, cost) {
  if (player.xp < cost) return false;
  player.xp -= cost;
  return true;
}

/**
 * What the player could interact with right now (within interactRadius), if anything.
 * @param {object} world
 * @param {import('../entities/player.js').Player} player
 * @returns {'campfire'|'salesman'|null}
 */
export function nearbyInteractable(world, player) {
  const room = world.run.room;
  if (!room || room.kind !== 'break' || !player.alive || world.run.transition) return null;
  const radius = world.config.breakRoom.interactRadius;
  let best = null;
  let bestD = radius;
  for (const name of ['campfire', 'salesman']) {
    const m = world.map.markers[name];
    if (!m) continue;
    const d = Math.hypot(m.x - player.x, m.y - player.y);
    if (d <= bestD) {
      bestD = d;
      best = name;
    }
  }
  return best;
}

/**
 * E pressed: rest at the campfire, or tell the client to open the Salesman's menu.
 * @param {object} world
 * @param {import('../entities/player.js').Player} player
 * @param {import('../../protocol.js').PlayerInput} input
 */
export function updateInteraction(world, player, input) {
  if (!input.interact) return;
  const target = nearbyInteractable(world, player);
  if (target === 'campfire') applyAction(world, player.id, { type: 'rest' });
  else if (target === 'salesman') {
    world.events.push({ type: 'salesmanOpened', playerId: player.id, sold: world.run.salesmanSold });
  }
}

/**
 * @typedef {object} ActionResult
 * @property {boolean} ok
 * @property {string} [reason] - why it was refused: 'notHere' | 'full' | 'xp' | 'sold'
 * @property {string} [item]
 * @property {number} [cost]
 * @property {string} [effectId] - mystery roll result
 * @property {import('../../rivals/RivalStatusSource.js').RivalStatus[]} [report] - gossip result
 */

/**
 * Applies a player's break-room action.
 * @param {object} world
 * @param {string} playerId
 * @param {{ type: 'rest' } | { type: 'buy', item: 'roll'|'intel' }} action
 * @returns {ActionResult}
 */
export function applyAction(world, playerId, action) {
  const player = world.players.find((p) => p.id === playerId);
  const room = world.run.room;
  if (!player || !player.alive || !room || room.kind !== 'break') return refuse(world, playerId, action, 'notHere');
  if (action.type === 'rest') return rest(world, player);
  if (action.type === 'buy') return buy(world, player, action.item);
  return refuse(world, playerId, action, 'notHere');
}

/** Rest at the campfire: heal for XP. Allowed again and again while affordable and hurt. */
function rest(world, player) {
  const action = { type: 'rest' };
  if (player.health >= player.maxHealth) return refuse(world, player.id, action, 'full');
  const cost = priceOf(world.config, 'rest', player.level);
  if (!spendXp(player, cost)) return refuse(world, player.id, action, 'xp');
  player.health = Math.min(player.maxHealth, player.health + world.config.breakRoom.healAmount);
  world.events.push({ type: 'rested', playerId: player.id, cost, health: player.health });
  return { ok: true, item: 'rest', cost };
}

/** The Salesman sells one item per break room: a mystery roll or gossip. */
function buy(world, player, item) {
  const action = { type: 'buy', item };
  if (item !== 'roll' && item !== 'intel') return refuse(world, player.id, action, 'notHere');
  if (world.run.salesmanSold) return refuse(world, player.id, action, 'sold');
  const cost = priceOf(world.config, item, player.level);
  if (!spendXp(player, cost)) return refuse(world, player.id, action, 'xp');
  world.run.salesmanSold = true;

  /** @type {ActionResult} */
  const result = { ok: true, item, cost };
  if (item === 'roll') {
    const kind = world.rng.next() < world.config.salesman.buffChance ? 'buff' : 'debuff';
    const pool = effectIdsOfKind(kind);
    result.effectId = pool[world.rng.int(0, pool.length - 1)];
    applyEffect(world, player, result.effectId, { sourceId: 'salesman' });
  } else {
    result.report = world.rivals.getRivals();
  }
  world.events.push({ type: 'salesmanSale', playerId: player.id, item, cost, effectId: result.effectId ?? null });
  return result;
}

function refuse(world, playerId, action, reason) {
  world.events.push({ type: 'actionRefused', playerId, action: action.type, item: action.item ?? null, reason });
  return { ok: false, reason, item: action.item ?? action.type };
}
