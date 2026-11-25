// Builds the Colyseus game server (not started). Used by `npm run server` and by tests.
import { defineServer, defineRoom } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { MatchRoom } from './rooms/MatchRoom.js';

/** Name clients use to create a room: client.create(ROOM_NAME, ...). */
export const ROOM_NAME = 'match';

/**
 * @returns {import('@colyseus/core').Server} call `.listen(port)` to start it
 */
export function createGameServer() {
  return defineServer({
    rooms: { [ROOM_NAME]: defineRoom(MatchRoom) },
    transport: new WebSocketTransport(),
    greet: false,
  });
}
