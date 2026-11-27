// Regression: a frozen island (shop or card choice open) keeps the same world time, so the
// client threw away every snapshot after the first as a "late duplicate". A purchase or the
// next card choice never reached the screen, and the game looked frozen.
import { describe, it, expect } from 'vitest';
import { encodeSnapshot, decodeSnapshot } from '../../../src/shared/net/snapshot.js';
import { SnapshotBuffer } from '../../../src/client/network/SnapshotBuffer.js';
import { createWorld, addPlayer, stepWorld, drainEvents } from '../../../src/shared/sim/world.js';
import { grantXp } from '../../../src/shared/sim/systems/xp.js';
import { TEST_CONFIG, TEST_ENEMY_TYPES, TICK } from '../helpers/fixtures.js';

const SHOP_ROOM = { id: 'shop', rows: ['############', '#..........#', '#..........#', '#....PV....#', '#..........#', '############'] };
const SNAPSHOT_EVERY = TEST_CONFIG.sim.tickRate / TEST_CONFIG.net.snapshotRate;
const overTheWire = (data) => JSON.parse(JSON.stringify(data));

/** Server and client in one: steps the world, sends a snapshot every few ticks, the client buffers them. */
function link() {
  const world = createWorld({ config: TEST_CONFIG, arena: SHOP_ROOM, spawning: false, enemyTypes: TEST_ENEMY_TYPES });
  const player = addPlayer(world, 'p1');
  const buffer = new SnapshotBuffer({ delay: 2 / TEST_CONFIG.net.snapshotRate });
  let serverTick = 0;
  const step = (input = {}) => {
    stepWorld(world, { p1: input }, TICK);
    serverTick++;
    if (serverTick % SNAPSHOT_EVERY === 0) {
      const data = overTheWire(encodeSnapshot(world, drainEvents(world), serverTick * TICK));
      buffer.push(decodeSnapshot(data, TEST_CONFIG), serverTick * TICK);
    }
  };
  /** What the client draws after `seconds` more of server time (every frame takes the events). */
  const run = (seconds, input = {}) => {
    const events = [];
    for (let i = 0; i < Math.round(seconds / TICK); i++) {
      step(i === 0 ? input : {});
      const s = buffer.sample(serverTick * TICK);
      if (s) events.push(...buffer.takeEvents(s.to.time));
    }
    const s = buffer.sample(serverTick * TICK);
    return { me: s.to.players[0], events };
  };
  return { world, player, run };
}

describe('online: a frozen island still updates on screen', () => {
  it('a purchase at the salesman shows while the island is frozen', () => {
    const { world, player, run } = link();
    player.coins = 100;
    run(0.5);
    expect(run(0.5, { interact: true }).me.shopOpen).toBe(true);
    expect(world.paused).toBe(true);

    const { me, events } = run(0.5, { shop: 'buy' });

    expect(world.paused).toBe(true); // still shopping, the island did not move
    expect(player.coins).toBeLessThan(100);
    expect(me.coins).toBe(player.coins);
    expect(me.lastRoll).toEqual(player.lastRoll);
    expect(events.map((e) => e.type)).toContain('rollBought');
  });

  it('the second card choice of a double level-up replaces the first on screen', () => {
    const { world, player, run } = link();
    run(0.5);
    grantXp(world, player, 20); // more than one level-up
    const first = run(0.5).me.cardChoice;
    expect(first).not.toBe(null);
    expect(player.pendingLevelUps).toBeGreaterThan(1);

    const { me } = run(0.5, { pick: 0 });

    expect(world.paused).toBe(true); // the next choice is open at once, still frozen
    expect(me.cardChoice).toEqual(player.cardChoice);
    expect(me.pendingLevelUps).toBe(player.pendingLevelUps);
    expect(Object.keys(me.abilities)).toHaveLength(1);
  });
});
