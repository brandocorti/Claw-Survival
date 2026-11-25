// What the Salesman says. The client only talks to the SalesmanLines interface.
// Now: FixedSalesmanLines (hand-written lines). A later GenAI step adds an
// LLM-backed implementation with the same async method and a fallback to these
// lines when the model is slow or fails (the same pattern as MessageGenerator
// in design/game-brief.md, section 6B).

/**
 * What a line is about.
 * @typedef {'greeting'|'saleRoll'|'saleIntel'|'refusalXp'|'refusalSold'|'buffResult'|'debuffResult'|'goodbye'} LineKind
 */

/**
 * Facts a line may use.
 * @typedef {object} LineContext
 * @property {import('../rivals/RivalStatusSource.js').RivalStatus[]} [rivals] - gossip report
 * @property {string} [effectName] - mystery roll result
 */

/** Lines are short: never more than this many words. */
export const MAX_WORDS = 12;

/**
 * Interface.
 * @abstract
 */
export class SalesmanLines {
  /**
   * @param {LineKind} kind
   * @param {LineContext} [context]
   * @returns {Promise<string>}
   */
  async line(kind, context) {
    throw new Error(`SalesmanLines.line(${kind}) is not implemented`);
  }
}

/** Hand-written lines, in character. */
export const FIXED_LINES = Object.freeze({
  greeting: [
    'Psst. Castaway. I sell luck, gossip, and slightly used coconuts.',
    'Welcome back. Mind the backpack, it bites.',
    'Ah, a paying customer. Or a hungry one. Same thing.',
  ],
  saleRoll: [
    'Shake the shell, castaway. Fortune or curse, no refunds.',
    'One mystery, freshly washed ashore. Probably.',
  ],
  saleIntel: [
    'Gossip is cheap. Mine is just slightly less cheap.',
    'I hear things. Seagulls talk, if you pay them.',
  ],
  refusalXp: [
    "No XP, no deal. The sea doesn't give credit.",
    'Come back with shinier pockets, friend.',
  ],
  refusalSold: [
    'One deal per visit. My backpack has rules.',
    "That's all for today. Even crooks need a nap.",
  ],
  buffResult: [
    'Lucky you. Try not to waste it.',
    'The island likes you today. Weird.',
  ],
  debuffResult: [
    'Ooh. That looks itchy. No refunds. Heh.',
    'Cursed! Purple suits you, honestly.',
  ],
  goodbye: [
    'Off you go. Stay alive, I need repeat customers.',
    'Mind the crabs. They never pay either.',
  ],
});

/** The fixed implementation: rotates through FIXED_LINES, reports gossip from the facts. */
export class FixedSalesmanLines extends SalesmanLines {
  /** @param {{ start?: number }} [options] - start index, so two visits do not always open the same way */
  constructor({ start = 0 } = {}) {
    super();
    this.counter = start;
  }

  /**
   * @param {LineKind} kind
   * @param {LineContext} [context]
   * @returns {Promise<string>}
   */
  async line(kind, context = {}) {
    return this.lineNow(kind, context);
  }

  /**
   * Same as line(), without waiting (fixed lines are instant).
   * @param {LineKind} kind
   * @param {LineContext} [context]
   * @returns {string}
   */
  lineNow(kind, context = {}) {
    if (kind === 'saleIntel' && context.rivals?.length) return gossipLine(context.rivals);
    const options = FIXED_LINES[kind];
    if (!options) throw new Error(`No Salesman lines for "${kind}"`);
    return options[this.counter++ % options.length];
  }
}

/**
 * One line about the most interesting rival: a cursed one first, else the deepest.
 * "Maria? Level 6, room 11. And cursed. Heh."
 * @param {import('../rivals/RivalStatusSource.js').RivalStatus[]} rivals
 */
export function gossipLine(rivals) {
  const alive = rivals.filter((r) => r.alive);
  if (alive.length === 0) return 'Everyone else? Washed out. Just you and me.';
  const cursed = alive.find((r) => r.debuffs.length > 0);
  const pick = cursed ?? [...alive].sort((a, b) => b.room - a.room)[0];
  const name = titleCase(pick.name);
  return `${name}? Level ${pick.level}, room ${pick.room}.${cursed ? ' And cursed. Heh.' : ''}`;
}

function titleCase(name) {
  return name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
