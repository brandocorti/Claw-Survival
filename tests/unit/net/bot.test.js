// Test bots: valid inputs, repeatable, and they pick cards on their own.
import { describe, it, expect } from 'vitest';
import { createBot, botInput } from '../../../src/shared/net/bot.js';
import { createWorld, addPlayer, stepWorld } from '../../../src/shared/sim/world.js';
import { grantXp } from '../../../src/shared/sim/systems/xp.js';
import { BIG_ROOM, TEST_CONFIG, TEST_ENEMY_TYPES, TICK } from '../helpers/fixtures.js';

function botWorld(seed = 5) {
  const world = createWorld({
    config: TEST_CONFIG, arena: BIG_ROOM, spawning: false, enemyTypes: TEST_ENEMY_TYPES,
    cardPause: false, cardTimeout: 100,
  });
  const player = addPlayer(world, 'bot-1');
  return { world, player, bot: createBot('bot-1', seed) };
}
const play = ({ world, player, bot }, ticks) => {
  const inputs = [];
  for (let i = 0; i < ticks; i++) {
    const input = botInput(bot, player, TEST_CONFIG, TICK);
    inputs.push(input);
    stepWorld(world, { [bot.id]: input }, TICK);
  }
  return inputs;
};

describe('test bots', () => {
  it('send inputs the server would accept, and walk around', () => {
    const made = botWorld();
    const { x, y } = made.player;
    const inputs = play(made, 600);
    for (const i of inputs) {
      expect(Math.hypot(i.moveX, i.moveY)).toBeLessThanOrEqual(1 + 1e-9);
      expect(typeof i.roll).toBe('boolean');
    }
    expect(inputs.some((i) => i.roll)).toBe(true);
    expect(Math.hypot(made.player.x - x, made.player.y - y)).toBeGreaterThan(10);
  });

  it('the same seed plays the same way', () => {
    expect(play(botWorld(9), 300)).toEqual(play(botWorld(9), 300));
  });

  it('pick a card on offer within their thinking time', () => {
    const made = botWorld();
    grantXp(made.world, made.player, 5);
    play(made, 1);
    expect(made.player.cardChoice).not.toBe(null);
    play(made, Math.ceil(TEST_CONFIG.net.bot.pickDelayMax / TICK) + 2);
    expect(made.player.cardChoice).toBe(null);
    expect(Object.keys(made.player.abilities).length).toBe(1);
  });

  it('a dead bot sends nothing', () => {
    const made = botWorld();
    made.player.alive = false;
    expect(botInput(made.bot, made.player, TEST_CONFIG, TICK)).toEqual({ moveX: 0, moveY: 0, roll: false, pick: null });
  });
});
