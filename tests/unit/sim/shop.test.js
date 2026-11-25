import { describe, it, expect } from 'vitest';
import { killEnemy } from '../../../src/shared/sim/systems/damage.js';
import { grantXp } from '../../../src/shared/sim/systems/xp.js';
import { shopIsOpen, shopOffer, nearVendor, playerStatuses } from '../../../src/shared/sim/systems/shop.js';
import { createPickup } from '../../../src/shared/sim/entities/pickup.js';
import { openSpotNear, parseArena, tileBlocks } from '../../../src/shared/sim/map.js';
import { BEACH_ARENA } from '../../../src/shared/content/arenas/beach.js';
import { CONFIG } from '../../../src/shared/config.js';
import { makeWorld, placeEnemy, input, run, runCollect, TEST_CONFIG, POND_ROOM } from '../helpers/fixtures.js';

const SHOP_ROOM = { id: 'shop', rows: ['############', '#..........#', '#..........#', '#....PV....#', '#..........#', '############'] };
const { basePrice, priceStep } = TEST_CONFIG.shop;
const make = (options = {}) => makeWorld({ arena: SHOP_ROOM, ...options });
const open = (world) => run(world, 1, input({ interact: true }));
const buy = (world) => runCollect(world, 1, input({ shop: 'buy' }));
const withDrops = (drops) => ({ ...TEST_CONFIG, drops: { ...TEST_CONFIG.drops, ...drops } });

describe('loot', () => {
  const killMany = (config, n, killer = 'p1') => {
    const { world, player } = make({ config });
    for (let i = 0; i < n; i++) killEnemy(world, placeEnemy(world, 'dummy', 40, 40), killer);
    return { world, player };
  };
  const count = (world, kind) => world.pickups.filter((p) => p.kind === kind).length;

  it('coins and hearts drop at about their configured rates', () => {
    const { world } = killMany(withDrops({ coinChance: 0.2, heartChance: 0.05 }), 4000);
    expect(count(world, 'coin') / 4000).toBeCloseTo(0.2, 1);
    expect(count(world, 'heart') / 4000).toBeCloseTo(0.05, 1);
    expect(count(world, 'heart')).toBeGreaterThan(120);
    expect(count(world, 'heart')).toBeLessThan(290);
  });

  it('enemies that blow themselves up drop nothing', () => {
    expect(killMany(withDrops({ coinChance: 1, heartChance: 1 }), 20, null).world.pickups.length).toBe(0);
  });

  it('a mini-boss drops its fixed coins, the final boss none', () => {
    const config = { ...TEST_CONFIG, enemies: { ...TEST_CONFIG.enemies, crabKing: { ...TEST_CONFIG.enemies.crabKing, coins: 5 } } };
    const { world } = make({ config });
    killEnemy(world, placeEnemy(world, 'crabKing', 60, 40), 'p1');
    expect(count(world, 'coin')).toBe(5);
    expect(CONFIG.enemies.crabEmperor.coins).toBe(0);
  });

  it('coins fly to the player and are counted', () => {
    const { world, player } = make();
    world.pickups.push(createPickup(1, 'coin', 1, player.x + 20, player.y, 0, 0));
    const events = runCollect(world, 60);
    expect(player.coins).toBe(1);
    expect(events.some((e) => e.type === 'pickupCollected' && e.kind === 'coin')).toBe(true);
  });

  it('hearts heal, but stay on the ground at full health', () => {
    const { world, player } = make();
    world.pickups.push(createPickup(1, 'heart', 2, player.x + 10, player.y, 0, 0));
    run(world, 60);
    expect(world.pickups.length).toBe(1);
    player.health = player.maxHealth - 1;
    run(world, 60);
    expect(world.pickups.length).toBe(0);
    expect(player.health).toBe(player.maxHealth); // never above the maximum
  });

  it('what drops over water lands where it can be reached', () => {
    const map = parseArena(POND_ROOM, 16);
    const spot = openSpotNear(map, 8.5 * 16, 3.5 * 16);
    expect(tileBlocks(map, Math.floor(spot.x / 16), Math.floor(spot.y / 16))).toBe(false);
    expect(openSpotNear(map, 50, 50)).toEqual({ x: 50, y: 50 });
  });
});

describe('the salesman', () => {
  it('stands on reachable ground on the real island, away from the spawn', () => {
    const map = parseArena(BEACH_ARENA, 16);
    expect(tileBlocks(map, Math.floor(map.vendor.x / 16), Math.floor(map.vendor.y / 16))).toBe(false);
    expect(Math.hypot(map.vendor.x - map.spawn.x, map.vendor.y - map.spawn.y)).toBeGreaterThan(80);
  });

  it('E opens the shop only when close, and pauses the game', () => {
    const { world, player } = make();
    player.x = 24;
    open(world);
    expect(player.shopOpen).toBe(false);
    player.x = world.map.vendor.x - 16;
    open(world);
    expect(player.shopOpen).toBe(true);
    expect(world.paused).toBe(true);
    const { time } = world;
    run(world, 60, input({ moveX: 1 }));
    expect(world.time).toBe(time);
  });

  it.each([[{ interact: true }], [{ shop: 'close' }]])('%o closes it and the game goes on', (press) => {
    const { world, player } = make();
    open(world);
    run(world, 1, input(press));
    expect(player.shopOpen).toBe(false);
    expect(world.paused).toBe(false);
  });

  it('sells one random ability for coins', () => {
    const { world, player } = make();
    player.coins = basePrice + 3;
    open(world);
    const events = buy(world);
    const [[id, level]] = Object.entries(player.abilities);
    expect(level).toBe(1);
    expect(player.coins).toBe(3);
    expect(player.lastRoll).toEqual({ abilityId: id, level: 1 });
    expect(events.find((e) => e.type === 'rollBought')).toMatchObject({ abilityId: id });
  });

  it('refuses without enough coins', () => {
    const { world, player } = make();
    player.coins = basePrice - 1;
    open(world);
    buy(world);
    expect(shopOffer(world, player).state).toBe('coins');
    expect(player.abilities).toEqual({});
    expect(player.coins).toBe(basePrice - 1);
  });

  it('sells one per round, even if you leave and come back; the next costs more', () => {
    const { world, player } = make();
    player.coins = 999;
    open(world);
    buy(world);
    buy(world);
    run(world, 1, input({ shop: 'close' }));
    open(world);
    buy(world);
    expect(player.rollsBought).toBe(1);
    expect(shopOffer(world, player).state).toBe('soldOut');
    world.match.round = 2;
    expect(shopOffer(world, player)).toEqual({ price: basePrice + priceStep, state: 'ok' });
    buy(world);
    expect(player.rollsBought).toBe(2);
    expect(player.coins).toBe(999 - basePrice - (basePrice + priceStep));
  });

  it('buying without opening the shop does nothing', () => {
    const { world, player } = make();
    player.coins = 999;
    buy(world);
    expect(player.rollsBought).toBe(0);
  });

  it('never sells an ability that is already at its maximum', () => {
    const { world, player } = make();
    for (const [id, c] of Object.entries(TEST_CONFIG.abilities)) player.abilities[id] = c.maxLevel;
    player.coins = 999;
    open(world);
    expect(shopOffer(world, player).state).toBe('maxed');
    buy(world);
    expect(player.coins).toBe(999);
  });

  it('level-up cards wait until the shop is closed', () => {
    const { world, player } = make({ cards: true });
    open(world);
    grantXp(world, player, 5);
    run(world, 5);
    expect(player.cardChoice).toBe(null);
    run(world, 1, input({ shop: 'close' }));
    expect(player.cardChoice).not.toBe(null);
  });

  it('leaves when the waves end, closing the shop', () => {
    const { world, player } = make();
    open(world);
    world.match.phase = 'bossIntro';
    expect(shopIsOpen(world)).toBe(false);
    expect(nearVendor(world, player)).toBe(false);
    run(world, 1);
    expect(player.shopOpen).toBe(false);
    open(world);
    expect(player.shopOpen).toBe(false);
  });

  it('an arena without a salesman just has no shop', () => {
    const { world } = makeWorld();
    expect(shopIsOpen(world)).toBe(false);
    open(world);
    expect(world.paused).toBe(false);
  });
});

describe('player status', () => {
  it('alone, only lists you', () => {
    const { world } = make();
    expect(playerStatuses(world, 'p1')).toMatchObject([{ you: true, alive: true, level: 1, round: 1 }]);
  });

  it('lists you first, then players from other arenas', () => {
    const { world, player } = make();
    player.kills = 7;
    world.remotePlayers.push({ id: 'x', name: 'Maria', alive: false, level: 4, round: 3, health: 0, maxHealth: 6, kills: 50 });
    expect(playerStatuses(world, 'p1')).toMatchObject([{ you: true, kills: 7 }, { name: 'Maria', you: false, alive: false, round: 3 }]);
  });
});
