// Tile types used by arena maps. Each map character becomes one tile type.
// `blocksMove`: players and walking enemies cannot walk through it.
// `blocksFlying`: flying enemies (tiki spirits) cannot pass it either.
// `blocksGiant`: bosses, which crush the rocks they walk over and wade through water.
// `blocksBullets`: projectiles stop when they hit it.
// To add a tile: add an entry here, then give it a look in src/client/art/tileArt.js.

export const TILE = Object.freeze({
  SAND: 0,
  CLIFF: 1,
  ROCK: 2,
  WATER: 3,
});

/** Map character -> tile type. 'P' marks the player spawn (sand underneath). */
export const TILE_CHARS = Object.freeze({
  '.': TILE.SAND,
  P: TILE.SAND,
  '#': TILE.CLIFF,
  o: TILE.ROCK,
  '~': TILE.WATER,
});

/** Collision rules per tile type. */
export const TILE_RULES = Object.freeze({
  [TILE.SAND]: { blocksMove: false, blocksFlying: false, blocksGiant: false, blocksBullets: false },
  [TILE.CLIFF]: { blocksMove: true, blocksFlying: true, blocksGiant: true, blocksBullets: true },
  [TILE.ROCK]: { blocksMove: true, blocksFlying: true, blocksGiant: false, blocksBullets: true },
  // Water stops walking but bullets and flyers pass over it, like pits in bullet-hell games.
  [TILE.WATER]: { blocksMove: true, blocksFlying: false, blocksGiant: false, blocksBullets: false },
});
