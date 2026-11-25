// Test bots: they let one person play a whole online match. A bot is only an
// input source: the server asks it for a PlayerInput each tick, exactly like a
// real client, so bots go through the same rules (and the same validation).
// Seeded, so a bot behaves the same way in every test run.
import { createRng } from '../sim/rng.js';
import { createEmptyInput } from '../protocol.js';

/**
 * @typedef {object} Bot
 * @property {string} id - player id
 * @property {ReturnType<typeof createRng>} rng
 * @property {number} moveX
 * @property {number} moveY
 * @property {number} turnIn - seconds until it picks a new direction
 * @property {string[]|null} seenChoice - the card choice it is thinking about
 * @property {number} pickIn - seconds until it picks a card
 */

/**
 * @param {string} id
 * @param {number} seed
 * @returns {Bot}
 */
export function createBot(id, seed) {
  return { id, rng: createRng(seed), moveX: 0, moveY: 0, turnIn: 0, seenChoice: null, pickIn: 0 };
}

/**
 * The bot's input for this tick: random walk, an occasional roll, and a random
 * card after a short "thinking" delay.
 * @param {Bot} bot
 * @param {import('../sim/entities/player.js').Player | undefined} player - the bot's player, read only
 * @param {typeof import('../config.js').CONFIG} config
 * @param {number} dt - seconds
 * @returns {import('../protocol.js').PlayerInput}
 */
export function botInput(bot, player, config, dt) {
  const input = createEmptyInput();
  if (!player || !player.alive) return input;
  const cfg = config.net.bot;

  bot.turnIn -= dt;
  if (bot.turnIn <= 0) {
    bot.turnIn = bot.rng.range(cfg.turnIntervalMin, cfg.turnIntervalMax);
    if (bot.rng.next() < cfg.idleChance) {
      bot.moveX = 0;
      bot.moveY = 0;
    } else {
      const angle = bot.rng.range(0, Math.PI * 2);
      bot.moveX = Math.cos(angle);
      bot.moveY = Math.sin(angle);
    }
    input.roll = bot.rng.next() < cfg.rollChance;
  }
  input.moveX = bot.moveX;
  input.moveY = bot.moveY;

  if (player.cardChoice !== bot.seenChoice) {
    bot.seenChoice = player.cardChoice;
    bot.pickIn = bot.rng.range(cfg.pickDelayMin, cfg.pickDelayMax);
  }
  if (player.cardChoice) {
    bot.pickIn -= dt;
    if (bot.pickIn <= 0) input.pick = bot.rng.int(0, player.cardChoice.length - 1);
  }
  return input;
}
