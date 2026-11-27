// The online transport when its snapshots switch to another player's island
// (spectating): the buffer starts over so nothing slides between islands, and a
// spectator sends no input. A fake room stands in for Colyseus.
import { describe, it, expect } from 'vitest';
import { ColyseusTransport } from '../../../src/client/network/ColyseusTransport.js';
import { encodeSnapshot, decodeSnapshot } from '../../../src/shared/net/snapshot.js';
import { createWorld, addPlayer, drainEvents } from '../../../src/shared/sim/world.js';
import { MSG } from '../../../src/shared/net/messages.js';
import { OPEN_ROOM, TEST_CONFIG, TEST_ENEMY_TYPES } from '../helpers/fixtures.js';

function fakeRoom(sessionId) {
  const sent = [];
  return {
    sessionId,
    sent,
    state: { players: new Map() },
    send: (type, msg) => sent.push({ type, msg }),
    onMessage: () => () => {},
    leave: () => Promise.resolve(),
  };
}

/** A decoded snapshot of a one-player island owned by `id`, at server time `time`, player at x. */
function islandSnapshot(id, time, x) {
  const world = createWorld({ config: TEST_CONFIG, arena: OPEN_ROOM, spawning: false, enemyTypes: TEST_ENEMY_TYPES });
  const p = addPlayer(world, id);
  p.x = x;
  return decodeSnapshot(JSON.parse(JSON.stringify(encodeSnapshot(world, drainEvents(world), time))), TEST_CONFIG);
}

const STILL = { moveX: 0, moveY: 0, roll: false, pick: null, interact: false, shop: null };

function makeTransport() {
  let now = 0;
  const room = fakeRoom('me');
  const transport = new ColyseusTransport({ room, config: TEST_CONFIG, arena: OPEN_ROOM, now: () => now });
  return { room, transport, setNow: (t) => { now = t; } };
}

describe('online transport: watching another island', () => {
  it('shows our own island until snapshots of another one arrive', () => {
    const { transport, setNow } = makeTransport();
    transport.acceptSnapshot(islandSnapshot('me', 1, 50), 1);
    setNow(2);
    transport.update(16, STILL);
    expect(transport.spectating).toBe(false);
    expect(transport.getViewedPlayer().id).toBe('me');
  });

  it('starts the buffer over when the island changes: the new player does not slide from the old position', () => {
    const { transport, setNow } = makeTransport();
    for (let t = 1; t <= 3; t++) transport.acceptSnapshot(islandSnapshot('me', t / 10, 50), t / 10);
    transport.acceptSnapshot(islandSnapshot('ana', 0.4, 300), 0.4);
    transport.acceptSnapshot(islandSnapshot('ana', 0.45, 310), 0.45);
    setNow(0.6);
    transport.update(16, STILL);
    expect(transport.spectating).toBe(true);
    expect(transport.viewedPlayerId).toBe('ana');
    expect(transport.buffer.snapshots.every((s) => s.players[0].id === 'ana')).toBe(true);
    const ana = transport.getViewedPlayer();
    expect(ana.prevX).toBeGreaterThanOrEqual(300); // interpolated between Ana's snapshots only
    expect(transport.getLocalPlayer()).toBeUndefined();
  });

  it('sends no input or card picks while watching, and asks the server for the next player', () => {
    const { room, transport, setNow } = makeTransport();
    transport.acceptSnapshot(islandSnapshot('ana', 1, 300), 1);
    setNow(2);
    transport.update(16, { ...STILL, moveX: 1, pick: 0 });
    expect(room.sent.filter((m) => m.type === MSG.input || m.type === MSG.pickCard)).toEqual([]);
    transport.spectate(-1);
    expect(room.sent).toEqual([{ type: MSG.spectate, msg: { step: -1 } }]);
  });
});
