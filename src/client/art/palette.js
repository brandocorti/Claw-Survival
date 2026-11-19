// Shared colors for placeholder art.
// Warm sand and wood, jungle greens, turquoise water, torch orange.
// PURPLE IS RESERVED for curses and bad perks: never use it for anything else,
// so sabotage is always readable at a glance.

export const PALETTE = Object.freeze({
  outline: '#1a1212',

  sand: '#e8c98a',
  sandDark: '#d4ad6a',
  sandLight: '#f6dfa8',
  shell: '#f0a8a0',

  jungle: '#3e7a3a',
  jungleDark: '#2c5a2c',
  jungleLight: '#5a9a48',

  rockLight: '#b8a995',
  rock: '#968672',
  rockDark: '#6e5f50',
  rockDeep: '#4f4338',
  cliffFace: '#7d6b58',
  cliffStrata: '#66574a',
  cliffCrack: '#4d4136',
  cliffBase: '#3a3029',

  water: '#22a7a6',
  waterDark: '#1b8a8e',
  waterLight: '#7fe3d6',
  wetSand: '#b38a55',
  foam: '#e6fff8',

  wood: '#a0612d',
  woodDark: '#6e3d1a',
  band: '#e8d9b0',

  // Bright projectiles and effects, against the muted ground.
  shotCore: '#fff7c2',
  shotRim: '#ffb52e',
  enemyShot: '#ff3d4a',
  explosion: '#ff8a2a',
  white: '#ffffff',

  // HUD
  heart: '#e8343a',
  heartEmpty: '#4a3a3a',
  xpBar: '#4de1ff',
  xpBarBack: '#1a2a33',
  bossBar: '#e8343a',

  // Reserved: curses / bad perks only (used from milestone 6).
  curse: '#9b3cff',
  curseDark: '#5a1a9e',
});

/** '#rrggbb' -> 0xrrggbb, for Phaser tints. */
export function hexToInt(hex) {
  return parseInt(hex.slice(1), 16);
}
