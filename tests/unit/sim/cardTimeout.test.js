// Online card choice: the world keeps running and a card is picked after a timeout.
// Solo keeps the pause (see cards.test.js).
import { describe, it, expect } from 'vitest';
import { createWorld, addPlayer, stepWorld, drainEvents } from '../../../src/shared/sim/world.js';
import { grantXp } from '../../../src/shared/sim/systems/xp.js';
import { damagePlayer } from '../../../src/shared/sim/systems/damage.js';
import { makeWorld, input, run, OPEN_ROOM, TEST_CONFIG, TEST_ENEMY_TYPES, TICK } from '../helpers/fixtures.js';

const TIMEOUT = TEST_CONFIG.net.cardTimeoutSeconds;

function onlineWorld() {
  const world = createWorld({
    config: TEST_CONFIG, arena: OPEN_ROOM, spawning: false, enemyTypes: TEST_ENEMY_TYPES,
    cardPause: false, cardTimeout: TIMEOUT,
  });
  const player = addPlayer(world, 'p1');
  grantXp(world, player, 5); // exactly one level-up
  return { world, player };
}
const step = (world, inp = input()) => {
  stepWorld(world, { p1: inp }, TICK);
  return drainEvents(world);
};

describe('online card choice', () => {
  it('does not pause the world: the player keeps moving while choosing', () => {
    const { world, player } = onlineWorld();
    step(world);
    expect(player.cardChoice).not.toBe(null);
    const x = player.x;
    for (let i = 0; i < 30; i++) step(world, input({ moveX: 1 }));
    expect(world.paused).toBe(false);
    expect(player.x).toBeGreaterThan(x);
    expect(player.cardChoice).not.toBe(null);
  });

  it('a pick before the timeout works as in solo', () => {
    const { world, player } = onlineWorld();
    step(world);
    const chosen = player.cardChoice[2];
    const events = step(world, input({ pick: 2 }));
    expect(player.abilities).toEqual({ [chosen]: 1 });
    expect(events.find((e) => e.type === 'cardPicked')).toMatchObject({ abilityId: chosen, auto: false });
  });

  it('after the timeout a card on offer is picked for the player', () => {
    const { world, player } = onlineWorld();
    step(world);
    const offered = player.cardChoice;
    const events = [];
    const ticks = Math.ceil(TIMEOUT / TICK);
    for (let i = 0; i < ticks - 2; i++) events.push(...step(world));
    expect(player.cardChoice).toBe(offered); // not yet
    for (let i = 0; i < 3; i++) events.push(...step(world));
    expect(player.cardChoice).toBe(null);
    expect(player.pendingLevelUps).toBe(0);
    const picked = events.find((e) => e.type === 'cardPicked');
    expect(picked.auto).toBe(true);
    expect(offered).toContain(picked.abilityId);
    expect(player.abilities[picked.abilityId]).toBe(1);
  });

  it('an invalid pick is ignored and the choice stays open', () => {
    const { world, player } = onlineWorld();
    step(world);
    for (const pick of [3, -1, 1.5, '1', 99]) step(world, input({ pick }));
    expect(player.cardChoice).not.toBe(null);
    expect(player.abilities).toEqual({});
  });

  it('dying closes an open card choice at once (online a dead player\'s arena stops stepping)', () => {
    const { world, player } = onlineWorld();
    step(world);
    expect(player.cardChoice).not.toBe(null);
    player.invulnerableTime = 0;
    damagePlayer(world, player, 999);
    expect(player.alive).toBe(false);
    expect(player.cardChoice).toBe(null);
  });

  it('solo never times out: the choice waits as long as it takes', () => {
    const { world, player } = makeWorld({ cards: true });
    grantXp(world, player, 5);
    run(world, Math.ceil((TIMEOUT * 5) / TICK));
    expect(player.cardChoice).not.toBe(null);
    expect(world.paused).toBe(true);
  });
});

describe('bot option: no damage from enemies', () => {
  it('a pveImmune player ignores enemy damage but not damage from a player', () => {
    const { world, player } = makeWorld();
    player.pveImmune = true;
    expect(damagePlayer(world, player, 2)).toBe(false);
    expect(player.health).toBe(TEST_CONFIG.player.maxHealth);
    expect(damagePlayer(world, player, 2, 'p2')).toBe(true);
    expect(player.health).toBe(TEST_CONFIG.player.maxHealth - 2);
  });
});
