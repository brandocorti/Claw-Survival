import { describe, it, expect } from 'vitest';
import { damageEnemy, damagePlayer } from '../../../src/shared/sim/systems/damage.js';
import { createBullet } from '../../../src/shared/sim/entities/bullet.js';
import { grantXp } from '../../../src/shared/sim/systems/xp.js';
import { makeWorld, placeEnemy, placeSturdyEnemy, run, runCollect, BIG_ROOM, TEST_CONFIG } from '../helpers/fixtures.js';

const seconds = (s) => Math.ceil(s * 60) + 1;
const { introSeconds } = TEST_CONFIG.finalBoss;
const bossDelay = TEST_CONFIG.enemies.crabEmperor.spawnDelay;

/** World with the clock just before the end of the waves and an unhurtable player. */
const nearTheEnd = (options = {}) => {
  const made = makeWorld({ arena: BIG_ROOM, spawning: true, ...options });
  made.world.match.elapsed = TEST_CONFIG.match.durationSeconds - 0.5;
  made.world.match.round = TEST_CONFIG.rounds.count;
  made.world.match.bossSpawned = true;
  made.player.invulnerableTime = 9999;
  return made;
};
const toBoss = (made) => {
  run(made.world, seconds(0.5 + introSeconds + bossDelay));
  return made.world.enemies[0];
};

describe('final boss duel', () => {
  it('the boss is not there while the timer is running', () => {
    const { world } = nearTheEnd();
    const events = runCollect(world, 25);
    expect(world.match.phase).toBe('waves');
    expect(events.some((e) => e.type === 'bossSpawned')).toBe(false);
  });

  it('when time is up every enemy and enemy bullet vanishes, without XP or kills', () => {
    const { world, player } = nearTheEnd();
    for (let i = 0; i < 4; i++) placeSturdyEnemy(world, 'dummy', player.x + 60 + i * 15, player.y);
    world.bullets.push(createBullet(999, 1, 'enemy', player.x + 150, player.y - 60, 0, { speed: 1, range: 99, damage: 1, radius: 3 }));
    const kills = player.kills;
    const events = runCollect(world, seconds(0.5));
    expect(world.match.phase).toBe('bossIntro');
    expect(world.enemies.length).toBe(0);
    expect(world.bullets.some((b) => b.team === 'enemy')).toBe(false);
    expect(player.kills).toBe(kills);
    expect(world.gems.length).toBe(0);
    expect(events.filter((e) => e.type === 'finalBossIntro').length).toBe(1);
  });

  it('after the intro the boss appears alone, and nothing else ever spawns', () => {
    const made = nearTheEnd();
    toBoss(made);
    expect(made.world.match.phase).toBe('boss');
    made.world.enemies[0].hp = 1e9;
    for (let i = 0; i < 20; i++) {
      run(made.world, 60);
      expect(made.world.enemies.map((e) => e.type)).toEqual(['crabEmperor']);
    }
  });

  it('the clock and the round stop during the duel', () => {
    const made = nearTheEnd();
    toBoss(made).hp = 1e9;
    run(made.world, 300);
    expect(made.world.match.elapsed).toBe(TEST_CONFIG.match.durationSeconds);
    expect(made.world.match.round).toBe(TEST_CONFIG.rounds.count);
  });

  it('beating the boss wins the match, once, and clears its bullets', () => {
    const made = nearTheEnd();
    const boss = toBoss(made);
    made.world.bullets.push(createBullet(999, boss.id, 'enemy', made.player.x + 150, made.player.y - 60, 0, { speed: 1, range: 99, damage: 1, radius: 3 }));
    damageEnemy(made.world, boss, 1e9, 'p1');
    const events = runCollect(made.world, 120);
    expect(made.world.match.phase).toBe('won');
    expect(events.filter((e) => e.type === 'matchWon').length).toBe(1);
    expect(made.world.bullets.some((b) => b.team === 'enemy')).toBe(false);
  });

  it('dying in the same tick as the boss is not a win', () => {
    const made = nearTheEnd();
    const boss = toBoss(made);
    damageEnemy(made.world, boss, 1e9, 'p1');
    made.player.invulnerableTime = 0;
    damagePlayer(made.world, made.player, 999);
    run(made.world, 120);
    expect(made.world.match.phase).not.toBe('won');
  });

  it('no level-up cards open over the victory screen', () => {
    const made = nearTheEnd({ cards: true });
    damageEnemy(made.world, toBoss(made), 1e9, 'p1');
    run(made.world, 2);
    grantXp(made.world, made.player, 500);
    run(made.world, 5);
    expect(made.world.paused).toBe(false);
  });

  it('killing another enemy does not win the duel', () => {
    const made = nearTheEnd();
    toBoss(made).hp = 1e9;
    damageEnemy(made.world, placeEnemy(made.world, 'dummy', made.player.x + 90, made.player.y), 1e9, 'p1');
    run(made.world, 5);
    expect(made.world.match.phase).toBe('boss');
  });

  it('gives back config.finalBoss.healBefore, never above the maximum', () => {
    const config = { ...TEST_CONFIG, finalBoss: { ...TEST_CONFIG.finalBoss, healBefore: 2 } };
    const hurt = nearTheEnd({ config });
    hurt.player.health = 1;
    run(hurt.world, seconds(0.5));
    expect(hurt.player.health).toBe(3);
    const full = nearTheEnd({ config });
    run(full.world, seconds(0.5));
    expect(full.player.health).toBe(TEST_CONFIG.player.maxHealth);
  });
});

describe('Crab Emperor', () => {
  const emperor = () => {
    const { world, player } = makeWorld({ arena: BIG_ROOM });
    player.invulnerableTime = 9999;
    world.config = { ...TEST_CONFIG, autoAim: { ...TEST_CONFIG.autoAim, range: 0 } };
    const e = placeEnemy(world, 'crabEmperor', player.x + 130, player.y);
    e.state = 'walk';
    e.timer = 0;
    return { world, e };
  };

  it('uses the normal pattern above half health and the enraged one below', () => {
    const calm = emperor();
    run(calm.world, 1);
    expect(calm.e.state).toBe('fanWindup');
    const angry = emperor();
    angry.e.hp = angry.e.maxHp / 2;
    run(angry.world, 1);
    expect(angry.e.state).toBe('spiralWindup');
  });

  it('the spiral warns first, then fires rotating arms, then stops', () => {
    const { world, e } = emperor();
    const s = TEST_CONFIG.enemies.crabEmperor.spiral;
    e.hp = 1;
    run(world, 2);
    expect(e.telegraph).toBe(true);
    expect(world.bullets.length).toBe(0);
    const events = runCollect(world, seconds(s.windup + s.duration));
    const volleys = events.filter((ev) => ev.type === 'enemyShot').length;
    expect(volleys).toBeGreaterThanOrEqual(Math.floor(s.duration / s.interval));
    expect(volleys).toBeLessThanOrEqual(Math.ceil(s.duration / s.interval) + 1);
    expect(e.state).toBe('walk');
  });
});
