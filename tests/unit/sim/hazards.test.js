import { describe, it, expect } from 'vitest';
import { spawnVolcanoRock, triggerVolcanoEruption, updateHazards } from '../../../src/shared/sim/systems/hazards.js';
import { drainEvents } from '../../../src/shared/sim/world.js';
import { makeWorld, placeSturdyEnemy, run, BIG_ROOM, TEST_CONFIG } from '../helpers/fixtures.js';

describe('volcano hazards', () => {
  it('spawnVolcanoRock creates hazard, counts down warning, and explodes hurting both player and enemy', () => {
    const { world, player } = makeWorld({ arena: BIG_ROOM });
    world.config = { ...TEST_CONFIG, autoAim: { ...TEST_CONFIG.autoAim, range: 0 } };
    const cfg = TEST_CONFIG.volcano;

    const rock = spawnVolcanoRock(world, player.x + 10, player.y, cfg);
    expect(rock.kind).toBe('volcanoRock');
    expect(rock.remaining).toBe(cfg.warningSeconds);
    expect(world.hazards).toContain(rock);

    const warnEvents = drainEvents(world).filter((e) => e.type === 'volcanoRockWarning');
    expect(warnEvents.length).toBe(1);
    expect(warnEvents[0].id).toBe(rock.id);
    expect(warnEvents[0].x).toBe(rock.x);
    expect(warnEvents[0].y).toBe(rock.y);
    expect(warnEvents[0].radius).toBe(cfg.radius);

    // Place an enemy within explosion radius
    const enemy = placeSturdyEnemy(world, 'dummy', rock.x + 2, rock.y);
    const initialPlayerHp = player.health;
    const initialEnemyHp = enemy.hp;

    // Run until just before warning expires
    const ticksBefore = Math.floor((cfg.warningSeconds - 0.1) * 60);
    run(world, ticksBefore);
    expect(world.hazards).toContain(rock);
    expect(player.health).toBe(initialPlayerHp);
    expect(enemy.hp).toBe(initialEnemyHp);

    // Run remaining ticks to trigger impact
    run(world, 15);
    expect(world.hazards.length).toBe(0);

    // Emits volcanoRockImpact
    const impactEvents = drainEvents(world).filter((e) => e.type === 'volcanoRockImpact');
    expect(impactEvents.length).toBe(1);
    expect(impactEvents[0].id).toBe(rock.id);

    // Hurting both player and enemy
    expect(player.health).toBe(initialPlayerHp - cfg.playerDamage);
    expect(enemy.hp).toBe(initialEnemyHp - cfg.enemyDamage);
  });

  it('triggerVolcanoEruption updates flow field, spawns rocks around players, and emits volcanoStarted', () => {
    const { world, player } = makeWorld({ arena: BIG_ROOM });
    const cfg = TEST_CONFIG.volcano;

    const count = triggerVolcanoEruption(world);
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(cfg.rockCount);
    expect(world.hazards.length).toBe(count);

    const startedEvents = drainEvents(world).filter((e) => e.type === 'volcanoStarted');
    expect(startedEvents.length).toBe(1);
    expect(startedEvents[0].count).toBe(count);

    // All spawned rocks should be around the player within reasonable bounds
    for (const h of world.hazards) {
      expect(h.kind).toBe('volcanoRock');
      const dist = Math.hypot(h.x - player.x, h.y - player.y);
      expect(dist).toBeGreaterThanOrEqual(cfg.minDistance - 5);
      expect(dist).toBeLessThanOrEqual(cfg.maxDistance + 20);
    }
  });

  it('respects round gating (startRound): does not erupt before startRound', () => {
    const { world, player } = makeWorld({ arena: BIG_ROOM, spawning: true });
    world.match.phase = 'waves';
    world.match.round = 1; // startRound is 2
    world.volcanoTimer = 5;

    run(world, 60); // 1s
    // volcanoTimer should not count down in round 1
    expect(world.volcanoTimer).toBe(5);
    expect(world.hazards.length).toBe(0);

    // Switch to round 2 (startRound)
    world.match.elapsed = 25; // in round 2 (len = 20s)
    world.match.round = TEST_CONFIG.volcano.startRound;
    world.volcanoTimer = 0.1;

    run(world, 10);
    // Should now trigger eruption
    expect(world.hazards.length).toBeGreaterThan(0);
    expect(drainEvents(world).some((e) => e.type === 'volcanoStarted')).toBe(true);
  });

  it('freezes hazard timers and prevents explosions while world.paused is true', () => {
    const { world, player } = makeWorld({ arena: BIG_ROOM, cards: true });
    const cfg = TEST_CONFIG.volcano;
    const rock = spawnVolcanoRock(world, player.x + 5, player.y, cfg);
    const initialRemaining = rock.remaining;
    world.volcanoTimer = 10;

    // Pause world via card choice
    player.cardChoice = ['damage'];
    run(world, 60); // 1 second of ticks

    expect(rock.remaining).toBe(initialRemaining);
    expect(world.volcanoTimer).toBe(10);
    expect(world.hazards).toContain(rock);
    expect(drainEvents(world).filter((e) => e.type === 'volcanoRockImpact').length).toBe(0);

    // Unpause world by resolving choice
    player.cardChoice = null;
    run(world, Math.ceil(cfg.warningSeconds * 60) + 5);
    expect(world.hazards.length).toBe(0);
    expect(drainEvents(world).some((e) => e.type === 'volcanoRockImpact')).toBe(true);
  });
});
