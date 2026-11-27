// Level-up cards: offers a choice for each pending level-up and applies the pick.
// Bad perks (milestone 6) will be offered through this same choice.
import { gainAbility } from './abilities.js';

/**
 * Draws up to `count` different abilities the player can still level up.
 * With `peek`, only tells whether any are left (no random numbers used).
 * @returns {string[]} ability ids (empty when everything is maxed)
 */
export function drawCards(world, player, count, { peek = false } = {}) {
  const pool = Object.keys(world.abilityTypes).filter(
    (id) => (player.abilities[id] ?? 0) < world.config.abilities[id].maxLevel,
  );
  if (peek) return pool.slice(0, count);
  const drawn = [];
  while (drawn.length < count && pool.length > 0) {
    drawn.push(pool.splice(world.rng.int(0, pool.length - 1), 1)[0]);
  }
  return drawn;
}

/**
 * Applies picks and opens the next choice (the game is paused while one is open).
 * @param {object} world
 * @param {Record<string, import('../../protocol.js').PlayerInput>} inputs
 */
export function updateCards(world, inputs) {
  if (!world.cards || world.match.phase === 'won') return; // no more cards after winning
  for (const p of world.players) {
    if (!p.alive) {
      p.cardChoice = null;
      continue;
    }
    if (p.cardChoice) applyPick(world, p, inputs[p.id]?.pick);
    if (!p.cardChoice && !p.shopOpen && p.pendingLevelUps > 0) offer(world, p);
  }
}

function applyPick(world, player, pick) {
  const id = Number.isInteger(pick) ? player.cardChoice[pick] : undefined;
  if (id === undefined) return; // nothing picked yet, or not a card on offer
  player.cardChoice = null;
  player.pendingLevelUps--;
  const level = gainAbility(world, player, id);
  world.events.push({ type: 'cardPicked', playerId: player.id, abilityId: id, level });
}

function offer(world, player) {
  const cards = drawCards(world, player, world.config.cards.choices);
  if (cards.length === 0) {
    player.pendingLevelUps = 0; // every ability is maxed: nothing left to choose
    return;
  }
  player.cardChoice = cards;
  player.cardOpenedAt = world.time;
  world.events.push({ type: 'cardsOffered', playerId: player.id, cards });
}
