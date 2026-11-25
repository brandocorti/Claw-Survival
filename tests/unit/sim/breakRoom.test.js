// Break rooms: XP prices, resting, and the Salesman's one sale per visit.
import { describe, it, expect } from 'vitest';
import { priceOf, spendXp, applyAction, nearbyInteractable } from '../../../src/shared/sim/systems/breakRoom.js';
import { enterRoom } from '../../../src/shared/sim/systems/rooms.js';
import { xpToNextLevel } from '../../../src/shared/sim/systems/xp.js';
import { EFFECTS } from '../../../src/shared/content/effects/index.js';
import { makeRun, run, runCollect, input, TEST_CONFIG } from '../helpers/fixtures.js';

const C = TEST_CONFIG;

/** A player in a break room, at `level` with `fraction` of the XP bar filled. */
function inBreakRoom({ level = 3, fraction = 1, config = C, seed = 1 } = {}) {
  const { world, player } = makeRun({ startIn: 'break', config, seed });
  player.level = level;
  player.xp = Math.floor(fraction * xpToNextLevel(level, config.xp.curve)) - (fraction === 1 ? 1 : 0);
  return { world, player };
}

describe('prices', () => {
  it('scale with level: a fraction of the current XP bar, rounded up', () => {
    for (const item of ['rest', 'roll', 'intel']) {
      expect(priceOf(C, item, 1)).toBe(Math.ceil(C.breakRoom.prices[item] * xpToNextLevel(1, C.xp.curve)));
      expect(priceOf(C, item, 8)).toBeGreaterThan(priceOf(C, item, 1));
    }
  });

  it('spending takes XP from the bar and never removes a level; too little XP is refused', () => {
    const player = { level: 5, xp: 10 };
    expect(spendXp(player, 4)).toBe(true);
    expect(player).toEqual({ level: 5, xp: 6 });
    expect(spendXp(player, 7)).toBe(false);
    expect(player).toEqual({ level: 5, xp: 6 });
    expect(spendXp(player, 6)).toBe(true);
    expect(player).toEqual({ level: 5, xp: 0 });
  });
});

describe('resting at the campfire', () => {
  it('heals healAmount half hearts for its price, and can be repeated', () => {
    const { world, player } = inBreakRoom();
    player.health = 1;
    const xp = player.xp;
    const cost = priceOf(C, 'rest', player.level);
    expect(applyAction(world, 'p1', { type: 'rest' })).toEqual({ ok: true, item: 'rest', cost });
    expect(player.health).toBe(1 + C.breakRoom.healAmount);
    expect(player.xp).toBe(xp - cost);
    expect(applyAction(world, 'p1', { type: 'rest' }).ok).toBe(true);
    expect(player.level).toBe(3);
  });

  it('is refused at full health, without XP, and outside break rooms', () => {
    const { world, player } = inBreakRoom({ fraction: 0.1 });
    expect(applyAction(world, 'p1', { type: 'rest' }).reason).toBe('full');
    player.health = 1;
    expect(applyAction(world, 'p1', { type: 'rest' }).reason).toBe('xp');
    expect(player.health).toBe(1);

    const fight = makeRun();
    fight.player.health = 1;
    fight.player.xp = 100;
    expect(applyAction(fight.world, 'p1', { type: 'rest' }).reason).toBe('notHere');
  });

  it('never heals above max health', () => {
    const { world, player } = inBreakRoom();
    player.health = player.maxHealth - 1;
    applyAction(world, 'p1', { type: 'rest' });
    expect(player.health).toBe(player.maxHealth);
  });

  it('resting does not count as the Salesman purchase', () => {
    const { world, player } = inBreakRoom();
    player.xp = 1000;
    player.health = 1;
    applyAction(world, 'p1', { type: 'rest' });
    expect(applyAction(world, 'p1', { type: 'buy', item: 'intel' }).ok).toBe(true);
  });
});

describe('the Salesman', () => {
  it('sells at most one item per visit; the next break room resets it', () => {
    const { world, player } = inBreakRoom();
    player.xp = 1000;
    expect(applyAction(world, 'p1', { type: 'buy', item: 'roll' }).ok).toBe(true);
    expect(applyAction(world, 'p1', { type: 'buy', item: 'intel' })).toMatchObject({ ok: false, reason: 'sold' });
    expect(applyAction(world, 'p1', { type: 'buy', item: 'roll' })).toMatchObject({ ok: false, reason: 'sold' });
    enterRoom(world, 'fight', 'W');
    enterRoom(world, 'break', 'W');
    expect(applyAction(world, 'p1', { type: 'buy', item: 'intel' }).ok).toBe(true);
  });

  it('refuses without enough XP and keeps the sale open', () => {
    const { world, player } = inBreakRoom({ fraction: 0.1 });
    const xp = player.xp;
    expect(applyAction(world, 'p1', { type: 'buy', item: 'roll' })).toMatchObject({ ok: false, reason: 'xp' });
    expect(player.xp).toBe(xp);
    expect(world.run.salesmanSold).toBe(false);
  });

  it('a mystery roll applies a buff or a debuff, by the configured odds', () => {
    const always = (buffChance) => ({ ...C, salesman: { buffChance } });
    const buff = inBreakRoom({ config: always(1) });
    const r1 = applyAction(buff.world, 'p1', { type: 'buy', item: 'roll' });
    expect(EFFECTS[r1.effectId].kind).toBe('buff');
    expect(buff.player.effects.map((e) => e.id)).toEqual([r1.effectId]);

    const curse = inBreakRoom({ config: always(0) });
    const r2 = applyAction(curse.world, 'p1', { type: 'buy', item: 'roll' });
    expect(EFFECTS[r2.effectId].kind).toBe('debuff');
    expect(curse.player.effects[0].sourceId).toBe('salesman');

    let buffs = 0;
    const n = 400;
    for (let seed = 1; seed <= n; seed++) {
      const { world } = inBreakRoom({ seed });
      if (EFFECTS[applyAction(world, 'p1', { type: 'buy', item: 'roll' }).effectId].kind === 'buff') buffs++;
    }
    expect(buffs / n).toBeCloseTo(C.salesman.buffChance, 1);
  });

  it('gossip reports every rival from the RivalStatusSource', () => {
    const { world } = inBreakRoom();
    const r = applyAction(world, 'p1', { type: 'buy', item: 'intel' });
    expect(r.report).toEqual(world.rivals.getRivals());
    expect(r.report[0]).toEqual({ name: 'ANNA', level: 4, room: 6, buffs: ['seaLegs'], debuffs: ['sunburn'], alive: true });
  });
});

describe('interacting with E', () => {
  it('next to the campfire, E rests', () => {
    const { world, player } = inBreakRoom();
    player.health = 1;
    const fire = world.map.markers.campfire;
    player.x = fire.x - 16;
    player.y = fire.y;
    expect(nearbyInteractable(world, player)).toBe('campfire');
    const events = runCollect(world, 1, input({ interact: true }));
    expect(events.some((e) => e.type === 'rested')).toBe(true);
  });

  it('next to the Salesman, E asks the client to open his menu; far away nothing happens', () => {
    const { world, player } = inBreakRoom();
    const s = world.map.markers.salesman;
    player.x = s.x;
    player.y = s.y + 14;
    expect(runCollect(world, 1, input({ interact: true })).some((e) => e.type === 'salesmanOpened')).toBe(true);
    player.x = s.x + 200;
    expect(nearbyInteractable(world, player)).toBe(null);
    run(world, 1, input({ interact: true }));
  });
});
