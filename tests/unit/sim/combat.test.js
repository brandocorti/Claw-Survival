import { describe, it, expect } from 'vitest';
import { stepWorld } from '../../../src/shared/sim/world.js';
import { findTarget } from '../../../src/shared/sim/systems/combat.js';
import {
  makeWorld, placeEnemy, input, run, runCollect, OBSTACLE_ROOM, TEST_CONFIG, TICK,
} from '../helpers/fixtures.js';

const weapon = TEST_CONFIG.weapons.test;
const countShots = (events) => events.filter((e) => e.type === 'shot').length;

describe('auto-aim', () => {
  it('does not shoot when there are no enemies', () => {
    const { world } = makeWorld();
    const events = runCollect(world, 60);
    expect(countShots(events)).toBe(0);
  });

  it('targets the nearest enemy in range', () => {
    const { world, player } = makeWorld();
    placeEnemy(world, 'dummy', player.x + 60, player.y);
    const near = placeEnemy(world, 'dummy', player.x - 30, player.y);
    expect(findTarget(world, player)).toBe(near);
  });

  it('ignores enemies beyond autoAim.range', () => {
    const { world, player } = makeWorld({ arena: { id: 'long', rows: ['#####################', '#P..................#', '#####################'] } });
    placeEnemy(world, 'dummy', player.x + TEST_CONFIG.autoAim.range + 10, player.y);
    expect(findTarget(world, player)).toBe(null);
  });

  it('skips an enemy hidden behind a rock and picks one it can hit', () => {
    const { world, player } = makeWorld({ arena: OBSTACLE_ROOM });
    // Rock at tile (4, 2); player at tile (2, 2).
    placeEnemy(world, 'dummy', 6.5 * 16, 2.5 * 16); // behind the rock
    const visible = placeEnemy(world, 'dummy', 2.5 * 16, 5.5 * 16); // below, in the open
    expect(findTarget(world, player)).toBe(visible);
  });

  it('ignores enemies that are still appearing (spawn delay)', () => {
    const { world, player } = makeWorld();
    const e = placeEnemy(world, 'dummy', player.x + 30, player.y);
    e.spawnDelay = 0.5;
    expect(findTarget(world, player)).toBe(null);
  });

  it('aims at the target', () => {
    const { world, player } = makeWorld();
    placeEnemy(world, 'dummy', player.x, player.y + 40);
    run(world, 1);
    expect(player.aim).toBeCloseTo(Math.PI / 2, 5);
  });
});

describe('auto-fire', () => {
  it('fires at exactly fireRate shots per second while a target is in range', () => {
    const { world, player } = makeWorld();
    placeEnemy(world, 'dummy', player.x + 50, player.y);
    const events = runCollect(world, 60);
    // first shot at t=0, then every 1/fireRate s: 4 shots in [0, 1)
    expect(countShots(events)).toBe(weapon.fireRate);
  });

  it('does not shoot while rolling', () => {
    const { world, player } = makeWorld();
    placeEnemy(world, 'dummy', player.x + 50, player.y);
    stepWorld(world, { p1: input({ moveY: 1, roll: true }) }, TICK);
    expect(player.rolling).toBe(true);
    expect(world.bullets.length).toBe(0);
  });

  it('shots damage the target and kill it at 0 hp, dropping XP gems', () => {
    const { world, player } = makeWorld();
    const e = placeEnemy(world, 'dummy', player.x + 40, player.y);
    e.hp = 2;
    const events = runCollect(world, 60);
    expect(e.dead).toBe(true);
    expect(world.enemies).not.toContain(e);
    expect(events.some((ev) => ev.type === 'enemyDied')).toBe(true);
    expect(player.kills).toBe(1);
    // dummy is worth 3 XP; the gems may already be collected
    const gemXp = world.gems.reduce((s, g) => s + g.value, 0) + player.xp;
    expect(gemXp).toBe(TEST_CONFIG.enemies.dummy.xp);
  });

  it('player bullets stop at rocks', () => {
    const { world, player } = makeWorld({ arena: OBSTACLE_ROOM });
    const events = [];
    const b = { x: player.x, y: player.y };
    world.bullets.push({ id: 999, ownerId: 'p1', team: 'player', ...b, prevX: b.x, prevY: b.y, vx: 240, vy: 0, life: 2, damage: 1, radius: 2 });
    events.push(...runCollect(world, 30));
    expect(world.bullets.length).toBe(0);
    expect(events.some((e) => e.type === 'bulletHit')).toBe(true);
  });
});

describe('enemy bullets', () => {
  const enemyBullet = (player, dx) => ({
    id: 999, ownerId: 1, team: 'enemy', x: player.x + dx, y: player.y, prevX: player.x + dx, prevY: player.y,
    vx: -120, vy: 0, life: 2, damage: 1, radius: 3,
  });

  it('hurt the player and are removed', () => {
    const { world, player } = makeWorld();
    world.bullets.push(enemyBullet(player, 30));
    run(world, 30);
    expect(player.health).toBe(TEST_CONFIG.player.maxHealth - 1);
    expect(world.bullets.length).toBe(0);
  });

  it('pass through a rolling player without hurting them', () => {
    const { world, player } = makeWorld();
    world.bullets.push(enemyBullet(player, 12));
    stepWorld(world, { p1: input({ moveY: 1, roll: true }) }, TICK);
    run(world, 8);
    expect(player.health).toBe(TEST_CONFIG.player.maxHealth);
  });

  it('fly over water', () => {
    const { world } = makeWorld({ arena: OBSTACLE_ROOM });
    // Water at tiles (4..5, 4). Bullet from the left, along row 4.
    const y = 4.5 * 16;
    world.bullets.push({ id: 999, ownerId: 1, team: 'enemy', x: 40, y, prevX: 40, prevY: y, vx: 200, vy: 0, life: 2, damage: 1, radius: 3 });
    run(world, 20);
    expect(world.bullets[0].x).toBeGreaterThan(6 * 16);
  });
});

describe('determinism', () => {
  it('same seed gives the same game', () => {
    const play = () => {
      const { world } = makeWorld({ seed: 42, spawning: true, arena: OBSTACLE_ROOM });
      run(world, 600, input({ moveX: 1 }));
      return JSON.stringify({ e: world.enemies.map((e) => [e.type, e.x, e.y, e.hp]), b: world.bullets.length });
    };
    expect(play()).toEqual(play());
  });
});
