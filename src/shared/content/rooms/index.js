// Room template registry. To add a room: write the template in fightRooms.js or
// breakRooms.js (rules at the top of each file) and add it to the list there.
// tests/unit/sim/rooms.test.js checks every template automatically.
export { FIGHT_ROOMS } from './fightRooms.js';
export { BREAK_ROOMS } from './breakRooms.js';

/** Door socket characters, one per edge. */
export const SOCKETS = Object.freeze(['N', 'E', 'S', 'W']);

/** You enter the next room through the socket opposite the one you left. */
export const OPPOSITE = Object.freeze({ N: 'S', S: 'N', E: 'W', W: 'E' });
