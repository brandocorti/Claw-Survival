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
  R: P.heart,
  D: P.woodDark,
  S: P.rockLight,
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
  totalShield: [
    '...YYYYY...',
    '..YWWWWWY..',
    '.YWCCCCCWY.',
    'YWWCCCCCWWY',
    'YWWCCCCCWWY',
    'YWWCCCCCWWY',
    '.YWCCCCCWY.',
    '..YWCCCWY..',
    '...YWWWY...',
    '....YWY....',
    '.....Y.....',
  ],
  multiDirFire: [
    '.....W.....',
    '....WOW....',
    '...OWYWO...',
    '....OYO....',
    '.O..OYO..O.',
    'WWYYOWOYYWW',
    '.O..OYO..O.',
    '....OYO....',
    '...OWYWO...',
    '....WOW....',
    '.....W.....',
  ],
  lifesteal: [
    '..RR...RR..',
    '.RRRR.RRRR.',
    'RRWWRRRRRRR',
    'RRWWR.G.RRR',
    'RRRRRGGGRRR',
    '.RRRR.G.RR.',
    '..RRRRRRR..',
    '...RRRRR...',
    '....RRR....',
    '.....R.....',
    '...........',
  ],
  thorns: [
    '.....G.....',
    '....GD.....',
    '.L.GDD.....',
    '..GD.D.G.L.',
    '...D.D.DG..',
    '...DDDDD...',
    '..GD.D.D...',
    '.L.G.D.DG..',
    '.....DDG.L.',
    '.....DG....',
    '.....G.....',
  ],
  homing: [
    '..OO...OO..',
    '.OWO...OWO.',
    'OW.......WO',
    'O...OOO...O',
    '...OWYWO...',
    '...OYWYO...',
    '...OWYWO...',
    'O...OOO...O',
    'OW.......WO',
    '.OWO...OWO.',
    '..OO...OO..',
  ],
  heal: [
    '...........',
    '..RR...RR..',
    '.RWRR.RRRR.',
    '.RRRRRRRRR.',
    '.RRRRRRRRR.',
    '..RRRRRRR..',
    '...RRRRR...',
    '....RRR....',
    '.....R.....',
    '...........',
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
