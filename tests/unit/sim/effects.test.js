import { describe, it, expect, vi } from 'vitest';
import { createWorld, addPlayer, drainEvents } from '../../../src/shared/sim/world.js';
import { applyEffect, hasEffect, getEffect, clearEffects } from '../../../src/shared/sim/systems/effects.js';
import { damagePlayer, damageEnemy, queueExplosion } from '../../../src/shared/sim/systems/damage.js';
import { grantXp } from '../../../src/shared/sim/systems/xp.js';
import { EFFECT_TYPES } from '../../../src/shared/content/effects/index.js';
import { makeWorld, placeEnemy, placeSturdyEnemy, run, runCollect, OPEN_ROOM, BIG_ROOM, TEST_CONFIG, TEST_ENEMY_TYPES, TICK } from '../helpers/fixtures.js';
import { createBullet } from '../../../src/shared/sim/entities/bullet.js';
import { gainAbility } from '../../../src/shared/sim/systems/abilities.js';

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

  describe('totalShield buff', () => {
    it('blocks contact, bullet, and explosion damage, emits totalShieldBlocked, does not blink or hurt', () => {
      const { world, player } = makeWorld();
      applyEffect(world, player, 'totalShield');
      expect(player.stats.invulnerable).toBe(true);

      const initialHp = player.health;
      const initialInvuln = player.invulnerable;

      // Contact damage
      const e = placeEnemy(world, 'dummy', player.x, player.y);
      const contactBlocked = damagePlayer(world, player, 2, { kind: 'contact', attackerId: e.id, enemy: e });
      expect(contactBlocked).toBe(false);
      expect(player.health).toBe(initialHp);
      expect(player.invulnerable).toBe(initialInvuln);

      // Bullet damage
      const bulletBlocked = damagePlayer(world, player, 1, { kind: 'bullet', attackerId: 99 });
      expect(bulletBlocked).toBe(false);
      expect(player.health).toBe(initialHp);
      expect(player.invulnerable).toBe(initialInvuln);

      // Explosion damage
      queueExplosion(world, player.x, player.y, { radius: 30, playerDamage: 2, enemyDamage: 4 });
      run(world, 1);
      expect(player.health).toBe(initialHp);
      expect(player.invulnerable).toBe(initialInvuln);

      const events = drainEvents(world);
      const shieldEvents = events.filter((ev) => ev.type === 'totalShieldBlocked');
      expect(shieldEvents.length).toBeGreaterThanOrEqual(3);
      expect(shieldEvents.some((ev) => ev.source?.kind === 'contact')).toBe(true);
      expect(shieldEvents.some((ev) => ev.source?.kind === 'bullet')).toBe(true);
      expect(shieldEvents.some((ev) => ev.source?.kind === 'explosion')).toBe(true);
    });
  });

  describe('multiDirFire buff', () => {
    it('fires 4x bullets in cardinal directions, composes with multishot, and reverts on expiry', () => {
      const { world, player } = makeWorld({ arena: BIG_ROOM });
      placeSturdyEnemy(world, 'dummy', player.x + 80, player.y);
      world.config = { ...TEST_CONFIG, autoAim: { ...TEST_CONFIG.autoAim, range: 120 } };

      applyEffect(world, player, 'multiDirFire');
      expect(player.stats.fireDirections).toBe(4);

      // Run 1 tick for weapon to fire
      let events = runCollect(world, 1);
      expect(events.filter((e) => e.type === 'shot').length).toBe(1);
      // 4 directions x 1 shot = 4 bullets
      expect(world.bullets.length).toBe(4);
      world.bullets.length = 0;

      // Composes with multishot
      gainAbility(world, player, 'multishot', 1); // 1 extra shot per direction -> 2 per direction -> 8 total
      events = runCollect(world, 15);
      expect(world.bullets.length).toBe(8);

      // Past duration (10s)
      world.bullets.length = 0;
      run(world, 10 * 60 + 5);
      expect(hasEffect(player, 'multiDirFire')).toBe(false);
      expect(player.stats.fireDirections).toBe(1);

      // Now only fires standard 1 direction (with 2 multishot bullets)
      world.bullets.length = 0;
      player.fireCooldown = 0;
      run(world, 1);
      expect(world.bullets.length).toBe(2);
    });
  });

  describe('lifesteal buff', () => {
    it('heals +1 half-heart on hit/kill threshold, respects maxHeals cap and maxHealth ceiling, emits lifestealHeal', () => {
      const { world, player } = makeWorld();
      applyEffect(world, player, 'lifesteal');
      player.health = 2; // Hurt player (maxHealth is 6)

      const enemy = placeSturdyEnemy(world, 'dummy', player.x + 30, player.y);
      drainEvents(world);

      // hitsPerHeal = 8 in TEST_CONFIG
      for (let i = 0; i < 7; i++) {
        damageEnemy(world, enemy, 1, player.id);
        expect(player.health).toBe(2);
      }
      // 8th hit triggers heal
      damageEnemy(world, enemy, 1, player.id);
      expect(player.health).toBe(3);
      let healEvents = drainEvents(world).filter((e) => e.type === 'lifestealHeal');
      expect(healEvents.length).toBe(1);
      expect(healEvents[0].health).toBe(3);

      // killsPerHeal = 2 in TEST_CONFIG
      const k1 = placeEnemy(world, 'dummy', player.x + 30, player.y);
      k1.hp = 1;
      damageEnemy(world, k1, 1, player.id);
      expect(player.health).toBe(3);

      const k2 = placeEnemy(world, 'dummy', player.x + 30, player.y);
      k2.hp = 1;
      damageEnemy(world, k2, 1, player.id);
      expect(player.health).toBe(4);
      healEvents = drainEvents(world).filter((e) => e.type === 'lifestealHeal');
      expect(healEvents.length).toBe(1);

      // Heal up to maxHealth (4 -> 5 -> 6)
      // Already 2 heals used (maxHeals = 4)
      const k3 = placeEnemy(world, 'dummy', player.x + 30, player.y);
      const k4 = placeEnemy(world, 'dummy', player.x + 30, player.y);
      k3.hp = 1; k4.hp = 1;
      damageEnemy(world, k3, 1, player.id);
      damageEnemy(world, k4, 1, player.id);
      expect(player.health).toBe(5); // 3rd heal

      const k5 = placeEnemy(world, 'dummy', player.x + 30, player.y);
      const k6 = placeEnemy(world, 'dummy', player.x + 30, player.y);
      k5.hp = 1; k6.hp = 1;
      damageEnemy(world, k5, 1, player.id);
      damageEnemy(world, k6, 1, player.id);
      expect(player.health).toBe(6); // 4th heal (maxHeals reached)

      // Respects maxHealth ceiling and maxHeals cap
      player.health = 3;
      const k7 = placeEnemy(world, 'dummy', player.x + 30, player.y);
      const k8 = placeEnemy(world, 'dummy', player.x + 30, player.y);
      k7.hp = 1; k8.hp = 1;
      damageEnemy(world, k7, 1, player.id);
      damageEnemy(world, k8, 1, player.id);
      expect(player.health).toBe(3); // capped at maxHeals = 4
    });

    it('respects maxHealth ceiling even when heals remain', () => {
      const { world, player } = makeWorld();
      applyEffect(world, player, 'lifesteal');
      expect(player.health).toBe(player.maxHealth);

      const k1 = placeEnemy(world, 'dummy', player.x + 30, player.y);
      const k2 = placeEnemy(world, 'dummy', player.x + 30, player.y);
      k1.hp = 1; k2.hp = 1;
      damageEnemy(world, k1, 1, player.id);
      damageEnemy(world, k2, 1, player.id);
      expect(player.health).toBe(player.maxHealth);
      expect(drainEvents(world).filter((e) => e.type === 'lifestealHeal').length).toBe(0);
    });
  });

  describe('thorns buff', () => {
    it('kills regular contact attacker, deals capped bossDamage to boss, and deals rangedDamage to bullet shooter', () => {
      const { world, player } = makeWorld();
      applyEffect(world, player, 'thorns');

      // Regular contact attacker
      const crab = placeEnemy(world, 'crab', player.x + 5, player.y);
      expect(crab.hp).toBeGreaterThan(0);
      damagePlayer(world, player, 1, { kind: 'contact', attackerId: crab.id, enemy: crab });
      expect(crab.hp).toBe(0);
      let hitEvents = drainEvents(world).filter((e) => e.type === 'thornsHit');
      expect(hitEvents.length).toBe(1);
      expect(hitEvents[0].damage).toBe(TEST_CONFIG.enemies.crab.hp);

      // Boss attacker
      player.invulnerableTime = 0;
      const boss = placeEnemy(world, 'crabKing', player.x + 10, player.y);
      const initialBossHp = boss.hp;
      damagePlayer(world, player, 2, { kind: 'contact', attackerId: boss.id, enemy: boss });
      expect(boss.hp).toBe(initialBossHp - TEST_CONFIG.effects.thorns.bossDamage);
      hitEvents = drainEvents(world).filter((e) => e.type === 'thornsHit');
      expect(hitEvents.length).toBe(1);
      expect(hitEvents[0].damage).toBe(TEST_CONFIG.effects.thorns.bossDamage);

      // Ranged attacker (skeleton shooting)
      player.invulnerableTime = 0;
      const skel = placeEnemy(world, 'skeleton', player.x + 40, player.y);
      damagePlayer(world, player, 1, { kind: 'bullet', attackerId: skel.id, enemy: skel });
      expect(skel.hp).toBe(0);
      hitEvents = drainEvents(world).filter((e) => e.type === 'thornsHit');
      expect(hitEvents.length).toBe(1);
      expect(hitEvents[0].damage).toBe(TEST_CONFIG.effects.thorns.rangedDamage);
    });
  });

  describe('homing buff', () => {
    it('curves a missed player shot toward a nearby active enemy, preserves speed, and ignores already-hit enemies', () => {
      const { world, player } = makeWorld({ arena: BIG_ROOM });
      applyEffect(world, player, 'homing');
      expect(player.stats.homingRange).toBe(TEST_CONFIG.effects.homing.range);
      expect(player.stats.homingTurnRate).toBe(TEST_CONFIG.effects.homing.turnRate);

      // Bullet moving straight right (+X)
      const speed = 200;
      const b = createBullet(101, player.id, 'player', 100, 100, 0, {
        speed,
        range: 300,
        damage: 1,
        radius: 2,
        homingRange: player.stats.homingRange,
        homingTurnRate: player.stats.homingTurnRate,
      });
      world.bullets.push(b);

      // Enemy positioned below the trajectory (+Y) within homingRange
      const target = placeSturdyEnemy(world, 'dummy', 130, 120);

      // Run 3 ticks of simulation
      run(world, 3);
      // vy should now be positive (curving toward target at Y = 120)
      expect(b.vy).toBeGreaterThan(0);
      // Speed should be preserved
      expect(Math.hypot(b.vx, b.vy)).toBeCloseTo(speed, 2);

      // When target is in b.hitIds, bullet ignores it
      b.hitIds.push(target.id);
      b.vx = speed;
      b.vy = 0;
      run(world, 3);
      expect(b.vy).toBeCloseTo(0, 5);
    });
  });

  it('heal instant effect restores health up to maxHealth without staying in player.effects', () => {
    const { world, player } = makeWorld();
    player.health = 2;
    applyEffect(world, player, 'heal');
    expect(player.health).toBe(4);
    expect(player.effects).toEqual([]);
  });
});
