import { describe, it, expect } from 'vitest';
import { pointBlocksBullet } from '../../../src/shared/sim/map.js';
import { makeWorld, placeEnemy, placeSturdyEnemy, run, runCollect, POND_ROOM, OBSTACLE_ROOM, BIG_ROOM, TEST_CONFIG } from '../helpers/fixtures.js';

describe('walking enemies', () => {
  it('a crab walks toward the player', () => {
    const { world, player } = makeWorld({ arena: BIG_ROOM });
    player.invulnerableTime = 999;
    const crab = placeSturdyEnemy(world, 'crab', player.x + 100, player.y - 60);
    const before = Math.hypot(crab.x - player.x, crab.y - player.y);
    run(world, 30);
    expect(Math.hypot(crab.x - player.x, crab.y - player.y)).toBeLessThan(before);
  });

  it('walkers go around a pond instead of getting stuck at it', () => {
    const { world, player } = makeWorld({ arena: POND_ROOM });
    player.invulnerableTime = 999;
    // Pond column at x tile 8 (rows 1-5); the only way around is row 6.
    const crab = placeSturdyEnemy(world, 'crab', 12.5 * 16, 3.5 * 16);
    crab.state = 'walk';
    crab.timer = 999; // no charging, just walking
    run(world, 60 * 12);
    expect(Math.hypot(crab.x - player.x, crab.y - player.y)).toBeLessThan(20);
  });

  it('a crab winds up (telegraph) before charging sideways', () => {
    const { world, player } = makeWorld({ arena: BIG_ROOM });
    player.invulnerableTime = 999;
    const crab = placeSturdyEnemy(world, 'crab', player.x + 90, player.y);
    crab.state = 'walk';
    crab.timer = 0;
    run(world, 1);
    expect(crab.state).toBe('windup');
    expect(crab.telegraph).toBe(true);
    run(world, Math.ceil(TEST_CONFIG.enemies.crab.charge.windup * 60) + 1);
    expect(crab.state).toBe('charge');
    expect(Math.abs(crab.dirX)).toBeGreaterThan(Math.abs(crab.dirY)); // sideways
  });

  it('overlapping enemies push apart', () => {
    const { world, player } = makeWorld({ arena: BIG_ROOM });
    const a = placeEnemy(world, 'dummy', player.x + 60, player.y);
    const b = placeEnemy(world, 'dummy', player.x + 61, player.y);
    run(world, 30);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(8);
  });
});

describe('shooting enemies', () => {
  it('a tiki spirit fires a full ring of bullets after its wind-up', () => {
    const { world, player } = makeWorld({ arena: BIG_ROOM });
    player.invulnerableTime = 999;
    const tiki = placeSturdyEnemy(world, 'tiki', player.x + 60, player.y);
    tiki.state = 'float';
    tiki.timer = 0.05;
    const events = runCollect(world, 5);
    expect(events.filter((e) => e.type === 'enemyShot').length).toBe(1);
    expect(world.bullets.filter((b) => b.team === 'enemy').length).toBe(TEST_CONFIG.enemies.tiki.ring.count);
  });

  it('a skeleton shoots a bullet aimed at the player', () => {
    const { world, player } = makeWorld({ arena: BIG_ROOM });
    player.invulnerableTime = 999;
    const sk = placeSturdyEnemy(world, 'skeleton', player.x + 100, player.y);
    sk.state = 'move';
    sk.timer = 0.05;
    run(world, 5);
    const shots = world.bullets.filter((b) => b.team === 'enemy');
    expect(shots.length).toBe(1);
    expect(shots[0].vx).toBeLessThan(0); // toward the player, who is to the left
    expect(Math.abs(shots[0].vy)).toBeLessThan(5);
  });

  it('the Crab King only uses its ring attack below half health', () => {
    const { world, player } = makeWorld({ arena: BIG_ROOM });
    player.invulnerableTime = 9999;
    const king = placeEnemy(world, 'crabKing', player.x + 120, player.y);
    king.state = 'walk';
    king.counter = 3; // next pattern entry is 'ring'
    king.timer = 0;
    run(world, 1);
    expect(king.state).toBe('fanWindup'); // full health: ring replaced by fan

    king.hp = king.maxHp / 2 - 1;
    king.state = 'walk';
    king.counter = 3;
    king.timer = 0;
    run(world, 1);
    expect(king.state).toBe('ringWindup');
  });
});

describe('giants (bosses)', () => {
  it.each(['crabKing', 'crabEmperor'])('%s walks straight over water instead of getting stuck', (type) => {
    const { world, player } = makeWorld({ arena: POND_ROOM });
    player.invulnerableTime = 9999;
    const boss = placeSturdyEnemy(world, type, 12.5 * 16, 3.5 * 16);
    boss.state = 'walk';
    boss.timer = 999; // no attacks, just walking
    run(world, 60 * 6);
    expect(Math.hypot(boss.x - player.x, boss.y - player.y)).toBeLessThan(25);
  });

  it('crushes rocks it walks over but is stopped by cliffs', () => {
    const { world, player } = makeWorld({ arena: OBSTACLE_ROOM });
    player.invulnerableTime = 9999;
    const boss = placeSturdyEnemy(world, 'crabEmperor', 8 * 16, 2.5 * 16); // rock at tile (4, 2) in between
    boss.state = 'charge';
    boss.timer = 999;
    boss.dirX = -1;
    boss.dirY = 0;
    const events = runCollect(world, 120);
    expect(events.filter((e) => e.type === 'rockCrushed').map((e) => [e.tx, e.ty])).toEqual([[4, 2]]);
    expect(pointBlocksBullet(world.map, 4.5 * 16, 2.5 * 16)).toBe(false); // shots pass now
    expect(boss.x).toBeLessThan(4 * 16);
    expect(boss.x).toBeGreaterThanOrEqual(16 + boss.radius); // left wall ends at x = 16
  });
});
