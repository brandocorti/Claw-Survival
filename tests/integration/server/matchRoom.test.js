// The real room over real WebSockets: a Colyseus server on a free port and SDK
// clients in Node. Checks the parts unit tests cannot: room codes, joining by code,
// the host, bots, the server clock, and that bad messages cannot break the room.
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { Client } from '@colyseus/sdk';
import { matchMaker } from '@colyseus/core';
import { createGameServer, ROOM_NAME } from '../../../src/server/createServer.js';
import { getMatchPlayer } from '../../../src/shared/sim/match.js';
import { damagePlayer } from '../../../src/shared/sim/systems/damage.js';

let server;
let endpoint;
const rooms = [];

beforeAll(async () => {
  server = createGameServer();
  await server.listen(0);
  const { port } = server.transport.server.address();
  endpoint = `ws://localhost:${port}`;
});

afterEach(async () => {
  await Promise.all(rooms.splice(0).map((r) => r.leave().catch(() => {})));
});

afterAll(async () => {
  await server.gracefullyShutdown(false);
});

/** Creates or joins and remembers the room so it is left after the test. */
async function connect(fn) {
  const room = await fn(new Client(endpoint));
  rooms.push(room);
  return room;
}
/** Waits until `check(state)` is true (state patches arrive a few times per second). */
async function waitFor(room, check, ms = 3000) {
  const start = Date.now();
  // The first full state arrives a moment after joining.
  while (!(room.state?.players && check(room.state))) {
    if (Date.now() - start > ms) throw new Error('timed out waiting for the room state');
    await new Promise((r) => setTimeout(r, 20));
  }
}
const serverRoom = (code) => matchMaker.getLocalRoomById(code);

describe('online room', () => {
  it('a new room gets a 4-character code and the creator is the host, in the lobby', async () => {
    const host = await connect((c) => c.create(ROOM_NAME, { name: 'Maria' }));
    await waitFor(host, (s) => s.players.size === 1);
    expect(host.roomId).toMatch(/^[A-Z2-9]{4}$/);
    expect(host.state.code).toBe(host.roomId);
    expect(host.state.phase).toBe('lobby');
    expect(host.state.hostId).toBe(host.sessionId);
    expect(host.state.players.get(host.sessionId).name).toBe('Maria');
    expect(host.state.duration).toBe(300);
  });

  it('the server decides the match length, and every client is told it', async () => {
    const host = await connect((c) => c.create(ROOM_NAME, { name: 'Maria', fast: true }));
    const guest = await connect((c) => c.joinById(host.roomId, { name: 'Leo' }));
    await waitFor(guest, (s) => s.players.size === 2);
    expect(guest.state.duration).toBe(100);
    expect(serverRoom(host.roomId).config.match.durationSeconds).toBe(100);
  });

  it('a second player joins with the code; only the host can start', async () => {
    const host = await connect((c) => c.create(ROOM_NAME, { name: 'Maria' }));
    const guest = await connect((c) => c.joinById(host.roomId, { name: 'Leo' }));
    await waitFor(host, (s) => s.players.size === 2);

    guest.send('start');
    await new Promise((r) => setTimeout(r, 300));
    expect(host.state.phase).toBe('lobby');

    host.send('start');
    await waitFor(guest, (s) => s.phase === 'waves');
    // One arena per player on the server, each with its own clock, and both running.
    const match = serverRoom(host.roomId).match;
    const [a, b] = match.players.map((e) => e.world);
    const start = Date.now();
    while (a.time < 0.5 || b.time < 0.5) {
      if (Date.now() - start > 3000) throw new Error('the arenas did not run');
      await new Promise((r) => setTimeout(r, 20));
    }
    expect(match.players.map((e) => e.id).sort()).toEqual([host.sessionId, guest.sessionId].sort());
    expect(a).not.toBe(b);
    expect(a.match).not.toBe(b.match);
  });

  it('cannot start alone, but can with bots from the create options', async () => {
    const alone = await connect((c) => c.create(ROOM_NAME, { name: 'Solo' }));
    await waitFor(alone, (s) => s.players.size === 1);
    alone.send('start');
    await new Promise((r) => setTimeout(r, 300));
    expect(alone.state.phase).toBe('lobby');

    const host = await connect((c) => c.create(ROOM_NAME, { name: 'Maria', bots: 3 }));
    await waitFor(host, (s) => s.players.size === 4);
    const bots = [...host.state.players.values()].filter((p) => p.isBot);
    expect(bots.map((b) => b.name)).toEqual(['Bot 1', 'Bot 2', 'Bot 3']);
    host.send('start');
    await waitFor(host, (s) => s.phase === 'waves');
  });

  it('the host can add and remove bots in the lobby; a guest cannot', async () => {
    const host = await connect((c) => c.create(ROOM_NAME, { name: 'Maria' }));
    const guest = await connect((c) => c.joinById(host.roomId, { name: 'Leo' }));
    await waitFor(host, (s) => s.players.size === 2);
    guest.send('addBot');
    host.send('addBot');
    host.send('addBot');
    await waitFor(host, (s) => s.players.size === 4);
    host.send('removeBot');
    await waitFor(host, (s) => s.players.size === 3);
    await new Promise((r) => setTimeout(r, 300));
    expect(host.state.players.size).toBe(3);
  });

  it('when the host leaves the lobby the next player becomes host', async () => {
    const host = await connect((c) => c.create(ROOM_NAME, { name: 'Maria' }));
    const guest = await connect((c) => c.joinById(host.roomId, { name: 'Leo' }));
    await waitFor(guest, (s) => s.players.size === 2);
    await host.leave();
    await waitFor(guest, (s) => s.hostId === guest.sessionId && s.players.size === 1);
  });

  it('bad payloads are ignored: a client cannot move faster or pick a card that is not on offer', async () => {
    const host = await connect((c) => c.create(ROOM_NAME, { name: 'Cheater', bots: 1 }));
    await waitFor(host, (s) => s.players.size === 2);
    host.send('start');
    await waitFor(host, (s) => s.phase === 'waves');
    const match = serverRoom(host.roomId).match;
    const me = getMatchPlayer(match, host.sessionId);
    const startX = me.x;

    for (const bad of ['garbage', null, [1, 2], { moveX: 'fast' }]) host.send('input', bad);
    host.send('pickCard', { index: 7 });
    host.send('pickCard', { index: -1 });
    host.send('pickCard', 'zero');
    host.send('input', { seq: 1, moveX: 50, moveY: 0, roll: false });
    const myWorld = match.players.find((e) => e.id === host.sessionId).world;
    const t0 = myWorld.time;
    await new Promise((r) => setTimeout(r, 500));
    const seconds = myWorld.time - t0;
    const maxSpeed = me.stats.moveSpeed; // the clamp keeps it at normal speed
    expect(me.x - startX).toBeGreaterThan(0);
    expect(me.x - startX).toBeLessThanOrEqual(maxSpeed * (seconds + 0.05));
    expect(me.abilities).toEqual({});
    expect(host.state.phase).toBe('waves'); // still connected, the room is still running
  });

  it('E at the salesman opens the shop on the server and freezes only that island', async () => {
    const host = await connect((c) => c.create(ROOM_NAME, { name: 'Maria', bots: 1 }));
    await waitFor(host, (s) => s.players.size === 2);
    host.send('start');
    await waitFor(host, (s) => s.phase === 'waves');
    const match = serverRoom(host.roomId).match;
    const [mine, theirs] = [host.sessionId, `bot-1`].map((id) => match.players.find((e) => e.id === id).world);
    const me = getMatchPlayer(match, host.sessionId);
    me.x = mine.map.vendor.x - 16;
    me.y = mine.map.vendor.y;

    host.send('input', { seq: 1, moveX: 0, moveY: 0, roll: false, interact: true });
    const start = Date.now();
    while (!me.shopOpen) {
      if (Date.now() - start > 2000) throw new Error('the shop did not open');
      await new Promise((r) => setTimeout(r, 20));
    }
    const [t1, t2] = [mine.time, theirs.time];
    await new Promise((r) => setTimeout(r, 300));

    expect(mine.paused).toBe(true);
    expect(mine.time).toBe(t1);
    expect(theirs.time).toBeGreaterThan(t2);
    host.send('input', { seq: 2, moveX: 0, moveY: 0, roll: false, shop: 'close' });
    await new Promise((r) => setTimeout(r, 200));
    expect(me.shopOpen).toBe(false);
    expect(mine.time).toBeGreaterThan(t1);
  });

  it('a message type our client never sends disconnects the sender; the others play on', async () => {
    const host = await connect((c) => c.create(ROOM_NAME, { name: 'Maria' }));
    const cheater = await connect((c) => c.joinById(host.roomId, { name: 'Cheater' }));
    await waitFor(host, (s) => s.players.size === 2);
    const left = new Promise((resolve) => cheater.onLeave(resolve));
    cheater.send('giveMeXp', { amount: 9999 });
    expect(await left).toBe(4002); // CloseCode.WITH_ERROR
    await waitFor(host, (s) => s.players.size === 1);
    expect(host.state.hostId).toBe(host.sessionId);
  });

  it('after a match ends, a client sending at a normal rate is not dropped', async () => {
    // Regression: Colyseus's per-second message limit reads the room clock. Stopping the
    // simulation loop with setSimulationInterval() leaves a stale handle behind, so nothing
    // advanced the clock any more: the one-second window never reset and every client was
    // dropped after maxMessagesPerSecond messages in total (seen in the browser: both
    // players disconnected a few seconds after the winner was shown).
    const host = await connect((c) => c.create(ROOM_NAME, { name: 'Maria', bots: 1 }));
    await waitFor(host, (s) => s.players.size === 2);
    host.send('start');
    await waitFor(host, (s) => s.phase === 'waves');
    // The bot dies in its arena; the next tick ends the match (as when a player dies in play).
    const match = serverRoom(host.roomId).match;
    const bot = getMatchPlayer(match, 'bot-1');
    bot.invulnerableTime = 0;
    damagePlayer(match.players.find((e) => e.id === 'bot-1').world, bot, 999);
    await waitFor(host, (s) => s.phase === 'over' && s.winnerId === host.sessionId);

    let dropped = null;
    host.onLeave((code) => { dropped = code; });
    const perSecond = 20; // half the limit
    for (let i = 0; i < perSecond * 3; i++) {
      host.send('input', { seq: i, moveX: 0, moveY: 0, roll: false });
      await new Promise((r) => setTimeout(r, 1000 / perSecond));
    }
    await new Promise((r) => setTimeout(r, 200));
    expect(dropped).toBe(null);
  });

  it('a room code cannot be joined once the match has started', async () => {
    const host = await connect((c) => c.create(ROOM_NAME, { name: 'Maria', bots: 1 }));
    await waitFor(host, (s) => s.players.size === 2);
    host.send('start');
    await waitFor(host, (s) => s.phase === 'waves');
    await expect(new Client(endpoint).joinById(host.roomId, { name: 'Late' })).rejects.toThrow();
  });
});
