// Status effects: apply and expire change the right stats and restore them afterwards.
import { describe, it, expect } from 'vitest';
import {
  applyEffect, removeEffect, onRoomEntered, updateEffects,
} from '../../../src/shared/sim/systems/effects.js';
import { EFFECTS, effectIdsOfKind } from '../../../src/shared/content/effects/index.js';
import { makeWorld, run, input, TEST_CONFIG } from '../helpers/fixtures.js';

const C = TEST_CONFIG;
const base = {
  moveSpeed: C.player.moveSpeed,
  fireRate: C.weapons.test.fireRate,
  damage: C.weapons.test.damage,
  maxHealth: C.player.maxHealth,
  pickupRadius: C.xp.pickupRadius,
};

describe('effect definitions', () => {
  it('4 buffs and 4 debuffs, each changing only existing stats', () => {
    expect(effectIdsOfKind('buff').length).toBeGreaterThanOrEqual(4);
    expect(effectIdsOfKind('debuff').length).toBeGreaterThanOrEqual(4);
    for (const def of Object.values(EFFECTS)) {
      for (const stat of Object.keys(def.modifiers)) expect(Object.keys(base), `${def.id}.${stat}`).toContain(stat);
      expect(Object.keys(def.duration).length, def.id).toBe(1);
    }
  });
});

describe('apply and expire', () => {
  for (const def of Object.values(EFFECTS)) {
    it(`${def.id}: changes only its stats, and expiring restores them`, () => {
      const { world, player } = makeWorld();
      applyEffect(world, player, def.id);
      for (const [stat, value] of Object.entries(base)) {
        const m = def.modifiers[stat];
        const expected = m ? (value + (m.add ?? 0)) * (m.mul ?? 1) : value;
        expect(player.stats[stat], stat).toBeCloseTo(expected);
      }
      removeEffect(world, player, def.id);
      expect(player.stats).toEqual(base);
      expect(player.maxHealth).toBe(base.maxHealth);
    });
  }

  it('room effects last their rooms, counted on entering fight rooms only', () => {
    const { world, player } = makeWorld();
    applyEffect(world, player, 'seaLegs'); // 3 rooms
    onRoomEntered(world, player, 'break');
    for (let i = 0; i < 3; i++) {
      onRoomEntered(world, player, 'fight');
      expect(player.effects.map((e) => e.id), `room ${i + 1}`).toContain('seaLegs');
    }
    onRoomEntered(world, player, 'fight');
    expect(player.effects).toEqual([]);
    expect(player.stats.moveSpeed).toBe(base.moveSpeed);
  });

  it('"until the next break" ends in a break room; it never refills health', () => {
    const { world, player } = makeWorld();
    applyEffect(world, player, 'sunburn');
    expect(player.maxHealth).toBe(base.maxHealth - 2);
    expect(player.health).toBe(base.maxHealth - 2);
    onRoomEntered(world, player, 'fight');
    expect(player.maxHealth).toBe(base.maxHealth - 2);
    onRoomEntered(world, player, 'break');
    expect(player.maxHealth).toBe(base.maxHealth);
    expect(player.health).toBe(base.maxHealth - 2);
  });

  it('a max-heart buff fills the new heart; losing it trims health but never kills', () => {
    const { world, player } = makeWorld();
    applyEffect(world, player, 'coconutMilk');
    expect(player.maxHealth).toBe(base.maxHealth + 2);
    expect(player.health).toBe(base.maxHealth + 2);
    removeEffect(world, player, 'coconutMilk');
    expect(player.health).toBe(base.maxHealth);

    player.health = 1;
    applyEffect(world, player, 'sunburn');
    expect(player.health).toBe(1);
    expect(player.alive).toBe(true);
  });

  it('applying the same effect again refreshes it instead of stacking', () => {
    const { world, player } = makeWorld();
    applyEffect(world, player, 'quickPebbles');
    onRoomEntered(world, player, 'fight');
    applyEffect(world, player, 'quickPebbles');
    expect(player.effects.length).toBe(1);
    expect(player.effects[0].roomsLeft).toBe(EFFECTS.quickPebbles.duration.rooms);
    expect(player.stats.fireRate).toBeCloseTo(base.fireRate * 1.2);
  });

  it('effects timed in seconds expire on time (milestone 6 bad perks will use this)', () => {
    const defs = { ...EFFECTS, zap: { id: 'zap', kind: 'debuff', name: 'ZAP', description: '', icon: 'speed', duration: { seconds: 2 }, modifiers: { moveSpeed: { mul: 0.5 } } } };
    const { world, player } = makeWorld();
    applyEffect(world, player, 'zap', { defs, sourceId: 'p2' });
    expect(player.effects[0].sourceId).toBe('p2');
    for (let i = 0; i < 119; i++) updateEffects(world, 1 / 60, defs);
    expect(player.stats.moveSpeed).toBe(base.moveSpeed * 0.5);
    updateEffects(world, 2 / 60, defs);
    expect(player.stats.moveSpeed).toBe(base.moveSpeed);
  });
});

describe('the game systems read the changed stats', () => {
  it('move speed changes how far the player walks', () => {
    const walk = (effect) => {
      const { world, player } = makeWorld();
      if (effect) applyEffect(world, player, effect);
      const x0 = player.x;
      run(world, 20, input({ moveX: 1 }));
      return player.x - x0;
    };
    expect(walk('seaLegs')).toBeCloseTo(walk(null) * 1.15, 0);
    expect(walk('sandInBoots')).toBeCloseTo(walk(null) * 0.8, 0);
  });

  it('fire rate changes how many shots are fired', () => {
    const shots = (effect) => {
      const { world, player } = makeWorld();
      if (effect) applyEffect(world, player, effect);
      world.enemies.push({ id: 500, type: 'dummy', x: player.x + 60, y: player.y, prevX: 0, prevY: 0, vx: 0, vy: 0, hp: 1e9, maxHp: 1e9, radius: 5, flying: false, boss: false, dead: false, spawnDelay: 0, spawnDuration: 0, state: '', timer: 0, telegraph: false, dirX: 0, dirY: 0, speedNow: 0, counter: 0, lastHitTime: -1, killedByPlayer: false, elite: false, damageScale: 1, speedScale: 1, xpScale: 1 });
      let n = 0;
      for (let i = 0; i < 600; i++) {
        run(world, 1);
        n += world.events.filter((e) => e.type === 'shot').length;
        world.events.length = 0;
      }
      return n;
    };
    expect(shots('quickPebbles')).toBeGreaterThan(shots(null));
    expect(shots('wetBands')).toBeLessThan(shots(null));
  });
});
