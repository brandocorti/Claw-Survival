import { describe, it, expect, vi } from 'vitest';
import { createWorld, addPlayer, drainEvents } from '../../../src/shared/sim/world.js';
import { applyEffect, hasEffect, getEffect, clearEffects } from '../../../src/shared/sim/systems/effects.js';
import { damagePlayer, damageEnemy } from '../../../src/shared/sim/systems/damage.js';
import { grantXp } from '../../../src/shared/sim/systems/xp.js';
import { EFFECT_TYPES } from '../../../src/shared/content/effects/index.js';
import { makeWorld, placeEnemy, run, OPEN_ROOM, TEST_CONFIG, TEST_ENEMY_TYPES, TICK } from '../helpers/fixtures.js';

function makeEffectWorld(extraTypes = {}, extraConfig = {}) {
  const config = {
    ...TEST_CONFIG,
    effects: { ...TEST_CONFIG.effects, ...extraConfig },
  };
  const world = createWorld({
    config,
    arena: OPEN_ROOM,
    spawning: false,
    cards: false,
    enemyTypes: TEST_ENEMY_TYPES,
    effectTypes: { ...EFFECT_TYPES, ...extraTypes },
  });
  const player = addPlayer(world, 'p1');
  return { world, player };
}

describe('status effects', () => {
  it('doubleXp doubles XP gained and reverts cleanly when expired', () => {
    const { world, player } = makeWorld();
    applyEffect(world, player, 'doubleXp');
    expect(hasEffect(player, 'doubleXp')).toBe(true);
    expect(player.stats.xpMultiplier).toBe(2);

    grantXp(world, player, 2);
    expect(player.xp).toBe(4);

    // Run past the 9s duration
    run(world, Math.ceil(9 * 60) + 2);
    expect(hasEffect(player, 'doubleXp')).toBe(false);
    expect(player.stats.xpMultiplier).toBe(1);

    grantXp(world, player, 1);
    expect(player.xp).toBe(0); // 4 + 1 = 5 -> leveled up (curve base = 5)
    expect(player.level).toBe(2);
  });

  it('refreshes remaining duration by default, and extends when stacking === extend', () => {
    const { world, player } = makeEffectWorld(
      {
        haste: { name: 'Haste', kind: 'buff', stacking: 'extend', modify(s) { s.moveSpeed *= 1.5; } },
      },
      { haste: { duration: 4 } },
    );

    applyEffect(world, player, 'doubleXp');
    run(world, 60); // -1s
    expect(getEffect(player, 'doubleXp').remaining).toBeCloseTo(8, 2);
    applyEffect(world, player, 'doubleXp');
    expect(getEffect(player, 'doubleXp').remaining).toBeCloseTo(9, 2);

    applyEffect(world, player, 'haste');
    run(world, 60); // -1s -> 3s left
    applyEffect(world, player, 'haste');
    expect(getEffect(player, 'haste').remaining).toBeCloseTo(7, 2);
    expect(player.stats.moveSpeed).toBeCloseTo(TEST_CONFIG.player.moveSpeed * 1.5, 4);
  });

  it('runs onApply, onTick, and onExpire hooks and emits events', () => {
    const onApply = vi.fn();
    const onTick = vi.fn();
    const onExpire = vi.fn();
    const { world, player } = makeEffectWorld(
      { custom: { name: 'Custom', kind: 'buff', onApply, onTick, onExpire } },
      { custom: { duration: 0.5 } },
    );

    applyEffect(world, player, 'custom', { sourceId: 'p2' });
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(drainEvents(world).some((e) => e.type === 'effectApplied' && e.effectId === 'custom' && e.sourceId === 'p2')).toBe(true);

    run(world, 35); // > 0.5s
    expect(onTick.mock.calls.length).toBeGreaterThanOrEqual(30);
    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(drainEvents(world).some((e) => e.type === 'effectExpired' && e.effectId === 'custom')).toBe(true);
  });

  it('invokes onPlayerDamaged and onEnemyDamaged hooks', () => {
    const onPlayerDamaged = vi.fn();
    const onEnemyDamaged = vi.fn();
    const { world, player } = makeEffectWorld(
      {
        thorns: { name: 'Thorns', kind: 'buff', onPlayerDamaged },
        vamp: { name: 'Vamp', kind: 'buff', onEnemyDamaged },
      },
      { thorns: { duration: 6 }, vamp: { duration: 10 } },
    );

    applyEffect(world, player, 'thorns');
    applyEffect(world, player, 'vamp');

    const enemy = placeEnemy(world, 'dummy', player.x + 60, player.y);
    damageEnemy(world, enemy, 2, player.id);
    expect(onEnemyDamaged).toHaveBeenCalledTimes(1);
    expect(onEnemyDamaged.mock.calls[0][4]).toMatchObject({ enemy, amount: 2, killed: false });

    const source = { kind: 'contact', attackerId: enemy.id, enemy };
    damagePlayer(world, player, 1, source);
    expect(onPlayerDamaged).toHaveBeenCalledTimes(1);
    expect(onPlayerDamaged.mock.calls[0][4]).toMatchObject({ amount: 1, source });
  });

  it('records active debuff sourceIds on playerDied and clears effects on death', () => {
    const onExpire = vi.fn();
    const { world, player } = makeEffectWorld(
      {
        curse: { name: 'Curse', kind: 'debuff', onExpire },
      },
      { curse: { duration: 10 } },
    );

    applyEffect(world, player, 'doubleXp');
    applyEffect(world, player, 'curse', { sourceId: 'p2' });
    drainEvents(world);

    damagePlayer(world, player, 99, { kind: 'contact', attackerId: 1 });
    const died = drainEvents(world).find((e) => e.type === 'playerDied');
    expect(died).toBeDefined();
    expect(died.curseSources).toEqual(['p2']);
    expect(player.effects).toEqual([]);
    expect(onExpire).toHaveBeenCalledTimes(1);

    // clearEffects is safe when empty
    clearEffects(world, player);
    expect(player.effects).toEqual([]);
    expect(TICK).toBeGreaterThan(0);
  });
});
