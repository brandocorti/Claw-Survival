// Level-up cards: offers a choice for each pending level-up and applies the pick.
// Bad perks (milestone 6) will be offered through this same choice.
import { gainAbility } from './abilities.js';
import { EPSILON } from '../math.js';

/**
 * Draws up to `count` different abilities the player can still level up.
 * @returns {string[]} ability ids (empty when everything is maxed)
 */
export function drawCards(world, player, count) {
  const pool = Object.keys(world.abilityTypes).filter(
    (id) => (player.abilities[id] ?? 0) < world.config.abilities[id].maxLevel,
  );
  const drawn = [];
  while (drawn.length < count && pool.length > 0) {
    drawn.push(pool.splice(world.rng.int(0, pool.length - 1), 1)[0]);
  }
  return drawn;
}

/**
 * Applies picks and opens the next choice.
 * Solo (world.cardPause): sets world.paused while a choice is open.
 * Online: never pauses; after world.cardTimeout seconds a random card is picked.
 * @param {object} world
 * @param {Record<string, import('../../protocol.js').PlayerInput>} inputs
 */
export function updateCards(world, inputs) {
  world.paused = false;
  if (!world.cards || world.match.phase === 'won') return; // no more cards after winning
  for (const p of world.players) {
    if (!p.alive) {
      p.cardChoice = null;
      continue;
    }
    if (p.cardChoice) applyPick(world, p, inputs[p.id]?.pick);
    if (p.cardChoice && timedOut(world, p)) applyPick(world, p, world.rng.int(0, p.cardChoice.length - 1), true);
    if (!p.cardChoice && p.pendingLevelUps > 0) offer(world, p);
    if (p.cardChoice && world.cardPause) world.paused = true;
  }
}

/** True when an online card choice has been open for world.cardTimeout seconds. */
function timedOut(world, player) {
  return world.cardTimeout != null && world.time - player.cardOpenedAt >= world.cardTimeout - EPSILON;
}

/**
 * @param {boolean} [auto] - true when the timeout picked the card, not the player
 */
function applyPick(world, player, pick, auto = false) {
  const id = Number.isInteger(pick) ? player.cardChoice[pick] : undefined;
  if (id === undefined) return; // nothing picked yet, or not a card on offer
  player.cardChoice = null;
  player.pendingLevelUps--;
  const level = gainAbility(world, player, id);
  world.events.push({ type: 'cardPicked', playerId: player.id, abilityId: id, level, auto });
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
