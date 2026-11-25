// Where the Salesman's gossip comes from. The Salesman only talks to this
// interface. Now: BotRivalSource (simulated rivals). Milestone 5: a source
// that reads the other players from the server.

/**
 * What the Salesman can tell about one other player.
 * @typedef {object} RivalStatus
 * @property {string} name
 * @property {number} level
 * @property {number} room - the "ROOM n" they are in
 * @property {string[]} buffs - effect ids
 * @property {string[]} debuffs - effect ids
 * @property {boolean} alive
 */

/**
 * Interface. Implementations override getRivals().
 * @abstract
 */
export class RivalStatusSource {
  /** @returns {RivalStatus[]} every other player, right now */
  getRivals() {
    throw new Error('RivalStatusSource.getRivals() is not implemented');
  }
}

/** No rivals (tests, or a world with nobody else in it). */
export class EmptyRivalSource extends RivalStatusSource {
  /** @returns {RivalStatus[]} */
  getRivals() {
    return [];
  }
}
