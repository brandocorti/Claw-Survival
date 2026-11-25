// Tile types used by arena maps. Each map character becomes one tile type.
// `blocksMove`: players and walking enemies cannot walk through it.
// `blocksFlying`: flying enemies (tiki spirits) cannot pass it either.
// `blocksBullets`: projectiles stop when they hit it.
// To add a tile: add an entry here, then give it a look in src/client/art/tileArt.js.

export const TILE = Object.freeze({
  SAND: 0,
  CLIFF: 1,
  ROCK: 2,
  WATER: 3,
  /** Room exit, closed: blocks everything until the room is cleared. */
  DOOR_LOCKED: 4,
  /** Room exit, open: walk into it to leave the room. */
  DOOR_OPEN: 5,
  /** Break-room campfire: you cannot walk through it; bullets and flyers pass over. */
  CAMPFIRE: 6,
});

/**
 * Map character -> tile type. 'P' marks the player spawn and '$' the Salesman
 * (sand underneath both). Room templates also use the door sockets N, E, S, W;
 * the room generator turns each one into 'D' (locked door) or '#' before parsing.
 */
export const TILE_CHARS = Object.freeze({
  '.': TILE.SAND,
  P: TILE.SAND,
  $: TILE.SAND,
  '#': TILE.CLIFF,
  o: TILE.ROCK,
  '~': TILE.WATER,
  D: TILE.DOOR_LOCKED,
  d: TILE.DOOR_OPEN,
  C: TILE.CAMPFIRE,
});

/** Collision rules per tile type. */
export const TILE_RULES = Object.freeze({
  [TILE.SAND]: { blocksMove: false, blocksFlying: false, blocksBullets: false },
  [TILE.CLIFF]: { blocksMove: true, blocksFlying: true, blocksBullets: true },
  [TILE.ROCK]: { blocksMove: true, blocksFlying: true, blocksBullets: true },
  // Water stops walking but bullets and flyers pass over it, like pits in bullet-hell games.
  [TILE.WATER]: { blocksMove: true, blocksFlying: false, blocksBullets: false },
  [TILE.DOOR_LOCKED]: { blocksMove: true, blocksFlying: true, blocksBullets: true },
  [TILE.DOOR_OPEN]: { blocksMove: false, blocksFlying: false, blocksBullets: false },
  [TILE.CAMPFIRE]: { blocksMove: true, blocksFlying: false, blocksBullets: false },
});
