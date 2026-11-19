import { describe, it, expect } from 'vitest';
import { damagePlayer, killEnemy, processExplosions } from '../../../src/shared/sim/systems/damage.js';
import { allPlayersDead, drainEvents } from '../../../src/shared/sim/world.js';
import { makeWorld, placeEnemy, run, TEST_CONFIG } from '../helpers/fixtures.js';

describe('player damage', () => {
  it('a hit removes health and gives temporary invulnerability', () => {
    const { world, player } = makeWorld();
    expect(damagePlayer(world, player, 1)).toBe(true);
    expect(player.health).toBe(TEST_CONFIG.player.maxHealth - 1);
    expect(damagePlayer(world, player, 1)).toBe(false); // invulnerable
    expect(player.health).toBe(TEST_CONFIG.player.maxHealth - 1);
  });

  it('can be hit again after the invulnerability ends', () => {
    const { world, player } = makeWorld();
    damagePlayer(world, player, 1);
    run(world, Math.ceil(TEST_CONFIG.player.hitInvulnerability * 60) + 1);
    expect(damagePlayer(world, player, 1)).toBe(true);
  });

  it('dies at 0 health, emitting playerDied', () => {
    const { world, player } = makeWorld();
    damagePlayer(world, player, 99);
    expect(player.health).toBe(0);
    expect(player.alive).toBe(false);
    expect(allPlayersDead(world)).toBe(true);
    expect(drainEvents(world).some((e) => e.type === 'playerDied')).toBe(true);
  });

  it('touching an enemy hurts', () => {
    const { world, player } = makeWorld();
    placeEnemy(world, 'dummy', player.x + 6, player.y);
    run(world, 1);
    expect(player.health).toBe(TEST_CONFIG.player.maxHealth - TEST_CONFIG.enemies.dummy.contactDamage);
  });
});

describe('coconut explosions', () => {
  const blast = TEST_CONFIG.enemies.coconut.explosion;

  it('a coconut killed by the player explodes and hurts a nearby player', () => {
    const { world, player } = makeWorld();
    const c = placeEnemy(world, 'coconut', player.x + blast.radius - 2, player.y);
    killEnemy(world, c, 'p1');
    processExplosions(world);
    expect(player.health).toBe(TEST_CONFIG.player.maxHealth - blast.playerDamage);
  });

  it('a coconut far away does not hurt the player', () => {
    const { world, player } = makeWorld();
    const c = placeEnemy(world, 'coconut', player.x + 70, player.y);
    killEnemy(world, c, 'p1');
    processExplosions(world);
    expect(player.health).toBe(TEST_CONFIG.player.maxHealth);
  });

  it('chain reaction: the blast kills a nearby coconut, credited to the player', () => {
    const { world, player } = makeWorld();
    const a = placeEnemy(world, 'coconut', player.x + 60, player.y + 20);
    const b = placeEnemy(world, 'coconut', player.x + 75, player.y + 20);
    killEnemy(world, a, 'p1');
    processExplosions(world);
    expect(b.dead).toBe(true);
    expect(player.kills).toBe(2);
    expect(drainEvents(world).filter((e) => e.type === 'explosion').length).toBe(2);
  });

  it('touching a coconut sets it off: damage but no XP', () => {
    const { world, player } = makeWorld();
    const c = placeEnemy(world, 'coconut', player.x + 6, player.y);
    run(world, 1);
    expect(c.dead).toBe(true);
    expect(player.health).toBe(TEST_CONFIG.player.maxHealth - blast.playerDamage);
    expect(world.gems.length).toBe(0);
    expect(player.kills).toBe(0);
  });
});
