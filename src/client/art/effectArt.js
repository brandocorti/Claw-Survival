// 11x11 icons for timed status effects (also shown on pickups and the HUD).
// Texture keys: `effect-<effectId>` and `pickupBuff`.
// Purple (P.curse) remains reserved exclusively for debuffs / curses.
import { PALETTE as P } from './palette.js';
import { gridFromStrings, addOutline, createTextureFromGrid } from './pixelArt.js';

export const EFFECT_ICON_COLORS = {
  C: P.xpBar,
  B: '#1f9fd0',
  Y: P.shotCore,
  O: P.shotRim,
  W: P.white,
  L: P.sandLight,
  G: '#5dff8a',
};

export const EFFECT_ICONS = {
  doubleXp: [
    '.OOO...W.W.',
    'O...O..W.W.',
    '....O...W..',
    '...O...W.W.',
    '..O....W.W.',
    '.OOOO......',
    '.....CCC...',
    '....CWWCC..',
    '....CCCCC..',
    '.....BBB...',
    '...........',
  ],
};

/** 15x15 glowing gold/sand crate-orb backdrop for buff pickups on the ground. */
const PICKUP_BUFF_BACKDROP = [
  '.....OOOOO.....',
  '...OOYYYYYOO...',
  '..OYYLLLLLYYO..',
  '.OYLLWWWWLLLYO.',
  '.OYLWWWWWWLLYO.',
  'OYLWWWWWWWWLLYO',
  'OYLWWWWWWWWLLYO',
  'OYLWWWWWWWWLLYO',
  'OYLWWWWWWWWLLYO',
  'OYLWWWWWWWWLLYO',
  '.OYLLWWWWLLLYO.',
  '.OYLLLLLLLLLYO.',
  '..OYYLLLLLYYO..',
  '...OOYYYYYOO...',
  '.....OOOOO.....',
];

/** Builds all status-effect icon and pickup backdrop textures. Call once in BootScene. */
export function createEffectTextures(scene) {
  for (const [id, rows] of Object.entries(EFFECT_ICONS)) {
    createTextureFromGrid(scene, `effect-${id}`, addOutline(gridFromStrings(rows, EFFECT_ICON_COLORS), P.outline));
  }
  createTextureFromGrid(
    scene,
    'pickupBuff',
    addOutline(gridFromStrings(PICKUP_BUFF_BACKDROP, EFFECT_ICON_COLORS), P.outline),
  );
}
