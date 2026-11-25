import { describe, it, expect } from 'vitest';
import { grantXp } from '../../../src/shared/sim/systems/xp.js';
import { drawCards } from '../../../src/shared/sim/systems/cards.js';
import { damagePlayer } from '../../../src/shared/sim/systems/damage.js';
import { makeWorld, placeEnemy, input, run, runCollect, TEST_CONFIG } from '../helpers/fixtures.js';

const levelUp = (world, player, times = 1) => {
  for (let i = 0; i < times; i++) grantXp(world, player, needed(player));
};
const needed = (player) => {
  const c = TEST_CONFIG.xp.curve;
  return Math.round(c.base + c.growth * (player.level - 1) ** c.exponent) - player.xp;
};

describe('card choice', () => {
  it('a level-up offers 3 different cards and pauses the world', () => {
    const { world, player } = makeWorld({ cards: true });
    levelUp(world, player);
    const events = runCollect(world, 1);
    expect(world.paused).toBe(true);
    expect(new Set(player.cardChoice).size).toBe(3);
    expect(events.filter((e) => e.type === 'cardsOffered').length).toBe(1);
  });

  it('nothing moves, spawns or counts down while the choice is open', () => {
    const { world, player } = makeWorld({ cards: true, spawning: true });
    run(world, 10);
    const enemy = placeEnemy(world, 'crab', player.x + 60, player.y);
    levelUp(world, player);
    run(world, 1);
    const before = JSON.stringify([world.time, world.match, player.x, player.health, enemy.x, enemy.timer, world.enemies.length]);
    run(world, 600, input({ moveX: 1, roll: true }));
    expect(JSON.stringify([world.time, world.match, player.x, player.health, enemy.x, enemy.timer, world.enemies.length])).toBe(before);
  });

  it('picking a card gives that ability and resumes the game', () => {
    const { world, player } = makeWorld({ cards: true });
    levelUp(world, player);
    run(world, 1);
    const chosen = player.cardChoice[1];
    const time = world.time;
    const events = runCollect(world, 1, input({ pick: 1 }));
    expect(player.abilities).toEqual({ [chosen]: 1 });
    expect(player.pendingLevelUps).toBe(0);
    expect(player.cardChoice).toBe(null);
    expect(world.time).toBeGreaterThan(time);
    expect(events.find((e) => e.type === 'cardPicked')).toMatchObject({ abilityId: chosen, level: 1 });
  });

  it('two level-ups at once give two choices, one after the other', () => {
    const { world, player } = makeWorld({ cards: true });
    levelUp(world, player, 2);
    run(world, 1);
    run(world, 1, input({ pick: 0 }));
    expect(player.cardChoice).not.toBe(null);
    expect(world.paused).toBe(true);
    run(world, 1, input({ pick: 0 }));
    expect(player.cardChoice).toBe(null);
    const levels = Object.values(player.abilities).reduce((a, b) => a + b, 0);
    expect(levels).toBe(2);
  });

  it.each([3, -1, 0.5, 'damage', null, undefined])('ignores the invalid pick %s', (pick) => {
    const { world, player } = makeWorld({ cards: true });
    levelUp(world, player);
    run(world, 1);
    run(world, 5, input({ pick }));
    expect(player.abilities).toEqual({});
    expect(world.paused).toBe(true);
  });

  it('a pick sent when no choice is open does nothing', () => {
    const { world, player } = makeWorld({ cards: true });
    run(world, 5, input({ pick: 0 }));
    expect(player.abilities).toEqual({});
  });

  it('never offers an ability that is already at its maximum', () => {
    const { world, player } = makeWorld({ cards: true });
    player.abilities = { damage: TEST_CONFIG.abilities.damage.maxLevel };
    for (let i = 0; i < 100; i++) expect(drawCards(world, player, 3)).not.toContain('damage');
  });

  it('offers fewer cards when few are left, and carries on when all are maxed', () => {
    const { world, player } = makeWorld({ cards: true });
    for (const [id, c] of Object.entries(TEST_CONFIG.abilities)) player.abilities[id] = c.maxLevel;
    player.abilities.damage = 0;
    levelUp(world, player);
    run(world, 1);
    expect(player.cardChoice).toEqual(['damage']);
    run(world, 1, input({ pick: 0 }));

    player.abilities.damage = TEST_CONFIG.abilities.damage.maxLevel;
    levelUp(world, player);
    run(world, 1);
    expect(world.paused).toBe(false);
    expect(player.pendingLevelUps).toBe(0);
  });

  it('every ability shows up in the draw', () => {
    const { world, player } = makeWorld({ cards: true });
    const seen = new Set();
    for (let i = 0; i < 200; i++) drawCards(world, player, 3).forEach((id) => seen.add(id));
    expect([...seen].sort()).toEqual(Object.keys(TEST_CONFIG.abilities).sort());
  });

  it('dying with a level-up waiting does not freeze the game', () => {
    const { world, player } = makeWorld({ cards: true });
    levelUp(world, player);
    damagePlayer(world, player, 999);
    run(world, 2);
    expect(player.alive).toBe(false);
    expect(world.paused).toBe(false);
  });
});
