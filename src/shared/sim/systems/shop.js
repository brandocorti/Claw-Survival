// The salesman: press E next to him to see how everyone is doing and to buy a random
// ability. He sells config.shop.rollsPerRound per round and each one costs more than
// the last. He leaves when the waves end, so the boss duel stays one against one.
import { gainAbility } from './abilities.js';
import { drawCards } from './cards.js';

/** True while the salesman is on the map. */
export function shopIsOpen(world) {
  return Boolean(world.map.vendor) && world.match.phase === 'waves';
}

/** True if the player is close enough to talk to him. */
export function nearVendor(world, player) {
  const v = world.map.vendor;
  return shopIsOpen(world) && Math.hypot(player.x - v.x, player.y - v.y) <= world.config.shop.interactRadius;
}

/**
 * What the salesman offers a player right now.
 * @returns {{ price: number, state: 'ok'|'coins'|'soldOut'|'maxed' }}
 */
export function shopOffer(world, player) {
  const { basePrice, priceStep, rollsPerRound } = world.config.shop;
  const price = basePrice + priceStep * player.rollsBought;
  const boughtNow = player.rollRound === world.match.round ? player.rollsThisRound : 0;
  let state = 'ok';
  if (drawCards(world, player, 1, { peek: true }).length === 0) state = 'maxed';
  else if (boughtNow >= rollsPerRound) state = 'soldOut';
  else if (player.coins < price) state = 'coins';
  return { price, state };
}

/**
 * Opens and closes the shop and handles purchases.
 * @param {object} world
 * @param {Record<string, import('../../protocol.js').PlayerInput>} inputs
 */
export function updateShop(world, inputs) {
  for (const p of world.players) {
    const input = inputs[p.id];
    if (!p.alive || !shopIsOpen(world)) {
      p.shopOpen = false;
    } else if (p.shopOpen) {
      if (input?.shop === 'buy') buyRoll(world, p);
      else if (input?.shop === 'close' || input?.interact) p.shopOpen = false;
    } else if (input?.interact && !p.cardChoice && nearVendor(world, p)) {
      p.shopOpen = true;
      p.lastRoll = null;
    }
  }
}

function buyRoll(world, player) {
  const { price, state } = shopOffer(world, player);
  if (state !== 'ok') return;
  const [abilityId] = drawCards(world, player, 1);
  player.coins -= price;
  player.rollsBought++;
  player.rollsThisRound = player.rollRound === world.match.round ? player.rollsThisRound + 1 : 1;
  player.rollRound = world.match.round;
  const level = gainAbility(world, player, abilityId);
  player.lastRoll = { abilityId, level };
  world.events.push({ type: 'rollBought', playerId: player.id, abilityId, level });
}

/**
 * How every player in the match is doing, you first. Other players play in their own
 * arenas, so their rows come from the server through world.remotePlayers (milestone 5).
 * @returns {{ name: string, you: boolean, alive: boolean, level: number, round: number, health: number, maxHealth: number, kills: number }[]}
 */
export function playerStatuses(world, playerId) {
  const row = (p, you) => ({
    name: p.name ?? p.id,
    you,
    alive: p.alive,
    level: p.level,
    round: p.round ?? world.match.round,
    health: p.health,
    maxHealth: p.maxHealth,
    kills: p.kills,
  });
  const here = [...world.players].sort((a, b) => (b.id === playerId) - (a.id === playerId));
  return [...here.map((p) => row(p, p.id === playerId)), ...world.remotePlayers.map((p) => row(p, false))];
}
