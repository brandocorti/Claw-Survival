// Client side of spectating: who can be watched, and the "WATCHING ANA 2/3" label,
// read from the synced room summary (server/rooms/schema.js). The server makes the
// real choice (shared/net/spectate.js); this is only for the HUD. No Phaser, unit tested.

/**
 * Players whose run is still going, in join order (the order the server cycles through).
 * @param {Map<string, { name: string, alive: boolean, bossBeaten: boolean, connected: boolean }>} players - room.state.players
 * @param {string} localId - left out: you cannot watch yourself
 * @returns {{ id: string, name: string }[]}
 */
export function watchablePlayers(players, localId) {
  const list = [];
  for (const [id, p] of players) {
    if (id !== localId && p.alive && !p.bossBeaten && p.connected) list.push({ id, name: p.name });
  }
  return list;
}

/**
 * The text of the spectator bar.
 * @param {{ id: string, name: string }[]} list - from watchablePlayers()
 * @param {string} viewedId - whose island is on screen
 * @param {string} viewedName - their name (they may have just dropped out of the list)
 * @returns {string}
 */
export function watchLabel(list, viewedId, viewedName) {
  const index = list.findIndex((p) => p.id === viewedId);
  const count = index >= 0 && list.length > 1 ? `  ${index + 1}/${list.length}` : '';
  const keys = list.length > 1 ? '   Q < > E' : '';
  return `WATCHING ${viewedName}${count}${keys}   M MENU`;
}
