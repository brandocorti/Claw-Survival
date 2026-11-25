// Simulated rivals for the Salesman's gossip, until real players exist
// (milestone 5). Each bot's state is a pure function of (seed, match time):
// rooms and levels grow at a seeded speed, and every few seconds the bot holds
// a new random set of effects from the same effect pool as the player.
// Same seed and time -> same snapshot, always.
import { RivalStatusSource } from './RivalStatusSource.js';
import { createRng } from '../sim/rng.js';
import { effectIdsOfKind } from '../content/effects/index.js';

export class BotRivalSource extends RivalStatusSource {
  /**
   * @param {object} options
   * @param {number} options.seed
   * @param {() => number} options.clock - match time in seconds (e.g. () => world.match.elapsed)
   * @param {typeof import('../config.js').CONFIG.rivals} options.config - config.rivals
   */
  constructor({ seed, clock, config }) {
    super();
    this.seed = seed >>> 0;
    this.clock = clock;
    this.cfg = config;
    this.buffPool = effectIdsOfKind('buff');
    this.debuffPool = effectIdsOfKind('debuff');

    // Fixed per bot: name and speeds.
    const rng = createRng(mix(this.seed, 0x5eed));
    const names = [...config.names];
    for (let i = names.length - 1; i > 0; i--) {
      const j = rng.int(0, i);
      [names[i], names[j]] = [names[j], names[i]];
    }
    this.bots = Array.from({ length: config.count }, (_, i) => ({
      name: names[i % names.length],
      roomsPerMinute: rng.range(config.roomsPerMinute[0], config.roomsPerMinute[1]),
      levelsPerMinute: rng.range(config.levelsPerMinute[0], config.levelsPerMinute[1]),
    }));
  }

  /** @returns {import('./RivalStatusSource.js').RivalStatus[]} */
  getRivals() {
    return this.snapshotAt(this.clock());
  }

  /**
   * The rivals at a given match time.
   * @param {number} seconds
   * @returns {import('./RivalStatusSource.js').RivalStatus[]}
   */
  snapshotAt(seconds) {
    const t = Math.max(0, seconds);
    const period = Math.floor(t / this.cfg.effectEverySeconds);
    return this.bots.map((bot, i) => {
      const diedAt = this.deathPeriod(i, period);
      const alive = diedAt === null;
      // A washed-out bot stops progressing where it fell.
      const tEff = alive ? t : diedAt * this.cfg.effectEverySeconds;
      const minutes = tEff / 60;
      const rng = createRng(mix(this.seed, i + 1, period + 1));
      const buffs = alive ? pickSome(rng, this.buffPool, rng.int(0, 2)) : [];
      const debuffs = alive && rng.next() < 0.45 ? pickSome(rng, this.debuffPool, 1) : [];
      return {
        name: bot.name,
        level: 1 + Math.floor(minutes * bot.levelsPerMinute),
        room: 1 + Math.floor(minutes * bot.roomsPerMinute),
        buffs,
        debuffs,
        alive,
      };
    });
  }

  /** The first period (<= upTo) in which bot i washed out, or null. */
  deathPeriod(i, upTo) {
    for (let p = this.cfg.safePeriods; p <= upTo; p++) {
      if (createRng(mix(this.seed, 0xdead + i, p)).next() < this.cfg.deathChance) return p;
    }
    return null;
  }
}

/** `count` different items from a list, in a seeded order. */
function pickSome(rng, list, count) {
  const pool = [...list];
  const out = [];
  while (out.length < count && pool.length > 0) out.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
  return out;
}

/** Mixes integers into one 32-bit seed (a small hash). */
function mix(...values) {
  let h = 0x811c9dc5;
  for (const v of values) {
    h = Math.imul(h ^ (v >>> 0), 0x01000193) >>> 0;
    h = (h ^ (h >>> 13)) >>> 0;
  }
  return h;
}
