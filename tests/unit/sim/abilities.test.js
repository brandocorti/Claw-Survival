import { describe, it, expect } from 'vitest';
import { gainAbility, refreshStats } from '../../../src/shared/sim/systems/abilities.js';
import { orbitPositions } from '../../../src/shared/content/abilities/orbitCoconuts.js';
import { CONFIG } from '../../../src/shared/config.js';
import { createBullet } from '../../../src/shared/sim/entities/bullet.js';
import { makeWorld, placeEnemy, placeSturdyEnemy, input, run, runCollect, BIG_ROOM, TEST_CONFIG } from '../helpers/fixtures.js';

const A = TEST_CONFIG.abilities;
const weapon = TEST_CONFIG.weapons.test;
const gain = (world, player, id, levels = 1) => {
  for (let i = 0; i < levels; i++) gainAbility(world, player, id);
};

describe('stat abilities', () => {
  it('damage adds to every pebble', () => {
    const { world, player } = makeWorld();
    gain(world, player, 'damage', 2);
    const e = placeSturdyEnemy(world, 'dummy', player.x + 40, player.y);
    const before = e.hp;
    run(world, 14); // one shot lands, the next is not due yet
    expect(before - e.hp).toBe(weapon.damage + 2 * A.damage.damagePerLevel);
  });

  it('fire rate stacks on the base rate without compounding', () => {
    const { world, player } = makeWorld();
    gain(world, player, 'fireRate', 4); // +25% x 4 = double
    expect(player.stats.fireRate).toBeCloseTo(weapon.fireRate * 2, 10);
    placeSturdyEnemy(world, 'dummy', player.x + 50, player.y);
    expect(runCollect(world, 60).filter((e) => e.type === 'shot').length).toBe(weapon.fireRate * 2);
  });

  it('move speed makes the player cover more ground', () => {
    const { world, player } = makeWorld({ arena: BIG_ROOM });
    gain(world, player, 'moveSpeed', 2);
    const x = player.x;
    run(world, 60, input({ moveX: 1 }));
    expect(player.x - x).toBeCloseTo(TEST_CONFIG.player.moveSpeed * 1.2, 5);
  });

  it('max hearts raises the maximum and heals the new heart only', () => {
    const { world, player } = makeWorld();
    player.health = 1;
    gain(world, player, 'maxHearts');
    expect(player.maxHealth).toBe(TEST_CONFIG.player.maxHealth + 2);
    expect(player.health).toBe(3);
  });

  it('recomputing stats twice changes nothing', () => {
    const { world, player } = makeWorld();
    gain(world, player, 'fireRate', 3);
    gain(world, player, 'multishot');
    const once = { ...player.stats };
    refreshStats(world, player);
    expect(player.stats).toEqual(once);
  });
});

describe('multishot', () => {
  it('fires a centered fan, counted as one shot', () => {
    const { world, player } = makeWorld({ arena: BIG_ROOM });
    gain(world, player, 'multishot', 2);
    placeSturdyEnemy(world, 'dummy', player.x + 90, player.y);
    const events = runCollect(world, 1);
    const angles = world.bullets.map((b) => Math.atan2(b.vy, b.vx));
    expect(angles.length).toBe(3);
    [-0.2, 0, 0.2].forEach((a, i) => expect(angles[i]).toBeCloseTo(a, 5));
    expect(events.filter((e) => e.type === 'shot').length).toBe(1);
  });
});

describe('piercing', () => {
  const shoot = (pierce) => {
    const { world, player } = makeWorld({ arena: BIG_ROOM });
    world.config = { ...TEST_CONFIG, autoAim: { ...TEST_CONFIG.autoAim, range: 0 } }; // no auto-fire
    const enemies = [40, 60, 80].map((dx) => placeSturdyEnemy(world, 'dummy', player.x + dx, player.y));
    world.bullets.push(createBullet(999, 'p1', 'player', player.x + 10, player.y, 0, { speed: 240, range: 240, damage: 1, radius: 2, pierce }));
    run(world, 40);
    return enemies.map((e) => 1e9 - e.hp);
  };

  it('without piercing only the first enemy is hit', () => expect(shoot(0)).toEqual([1, 0, 0]));
  it('level 1 passes through one enemy', () => expect(shoot(1)).toEqual([1, 1, 0]));
  it('each enemy is hit only once', () => expect(shoot(9)).toEqual([1, 1, 1]));

  it('the card puts piercing on the player\'s shots', () => {
    const { world, player } = makeWorld();
    gain(world, player, 'piercing', 2);
    placeSturdyEnemy(world, 'dummy', player.x + 50, player.y);
    run(world, 1);
    expect(world.bullets[0].pierce).toBe(2);
  });
});

describe('orbiting coconuts', () => {
  it('one per level, evenly spaced on the orbit', () => {
    const at = orbitPositions({ x: 0, y: 0 }, 0, 4, A.orbitCoconuts);
    expect(at.length).toBe(4);
    for (const p of at) expect(Math.hypot(p.x, p.y)).toBeCloseTo(A.orbitCoconuts.orbitRadius, 5);
    expect(Math.hypot(at[0].x - at[2].x, at[0].y - at[2].y)).toBeCloseTo(2 * A.orbitCoconuts.orbitRadius, 5);
  });

  it('hurt an enemy they touch, at most once per cooldown', () => {
    const { world, player } = makeWorld({ arena: BIG_ROOM });
    world.config = { ...TEST_CONFIG, autoAim: { ...TEST_CONFIG.autoAim, range: 0 }, abilities: { ...A, orbitCoconuts: { ...A.orbitCoconuts, angularSpeed: 0 } } };
    gain(world, player, 'orbitCoconuts');
    const e = placeSturdyEnemy(world, 'dummy', player.x + A.orbitCoconuts.orbitRadius, player.y);
    run(world, 20);
    expect(1e9 - e.hp).toBe(A.orbitCoconuts.damage);
    run(world, 25);
    expect(1e9 - e.hp).toBe(2 * A.orbitCoconuts.damage);
  });

  it('kills are credited to the player', () => {
    const { world, player } = makeWorld({ arena: BIG_ROOM });
    world.config = { ...TEST_CONFIG, autoAim: { ...TEST_CONFIG.autoAim, range: 0 } };
    gain(world, player, 'orbitCoconuts', 4);
    placeEnemy(world, 'dummy', player.x + A.orbitCoconuts.orbitRadius, player.y).hp = 1;
    run(world, 60);
    expect(player.kills).toBe(1);
  });

  it('the orbit is wider than an enemy coconut blast, so blowing one up with it is safe', () => {
    const blast = CONFIG.enemies.coconut.explosion.radius + CONFIG.player.radius;
    expect(CONFIG.abilities.orbitCoconuts.orbitRadius).toBeGreaterThan(blast);
  });
});

describe('fire trail', () => {
  const rollOnce = (level) => {
    const { world, player } = makeWorld({ arena: BIG_ROOM });
    world.config = { ...TEST_CONFIG, autoAim: { ...TEST_CONFIG.autoAim, range: 0 } };
    gain(world, player, 'fireTrail', level);
    const start = { x: player.x, y: player.y };
    run(world, 1, input({ moveX: 1, roll: true }));
    run(world, 20);
    return { world, player, start };
  };

  it('a roll leaves fire spaced along its path; walking does not', () => {
    const { world, start } = rollOnce(1);
    // 200 px/s * 0.3 s = 60 px of roll, one patch every 10 px or so
    expect(world.fires.length).toBeGreaterThanOrEqual(4);
    expect(world.fires.length).toBeLessThanOrEqual(7);
    expect(world.fires[0].x).toBeGreaterThanOrEqual(start.x);
    const count = world.fires.length;
    run(world, 20, input({ moveX: 1 }));
    expect(world.fires.length).toBe(count);
  });

  it('fire hurts walking enemies on a cooldown but not flying ones', () => {
    const { world } = rollOnce(1);
    const f = world.fires[2];
    const walker = placeSturdyEnemy(world, 'dummy', f.x, f.y);
    const flyer = placeSturdyEnemy(world, 'dummy', f.x, f.y);
    flyer.flying = true;
    run(world, 10);
    expect(1e9 - walker.hp).toBe(A.fireTrail.baseDamage + A.fireTrail.damagePerLevel);
    expect(flyer.hp).toBe(1e9);
  });

  it('fire burns out after its duration', () => {
    const { world } = rollOnce(1);
    run(world, Math.ceil((A.fireTrail.baseDuration + A.fireTrail.durationPerLevel) * 60) + 2);
    expect(world.fires.length).toBe(0);
  });

  it('without the card a roll leaves nothing', () => {
    const { world } = makeWorld({ arena: BIG_ROOM });
    run(world, 1, input({ moveX: 1, roll: true }));
    run(world, 20);
    expect(world.fires.length).toBe(0);
  });
});
