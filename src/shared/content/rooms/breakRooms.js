// Break room templates: no enemies, a campfire to rest at and the Salesman.
// Same rules as fightRooms.js, plus exactly one 'C' (campfire) and one '$' (Salesman).

/** Castaway camp in a jungle clearing. 24 x 14. */
export const CAMP = {
  id: 'camp',
  rows: [
    '###########NN###########',
    '#......................#',
    '#..o................o..#',
    '#......................#',
    '#.........$............#',
    '#......................#',
    'W..........C...........E',
    'W......................E',
    '#......................#',
    '#..........P...........#',
    '#......................#',
    '#..o................o..#',
    '#......................#',
    '###########SS###########',
  ],
};

/** Every break template; the generator picks from these. */
export const BREAK_ROOMS = Object.freeze([CAMP]);
