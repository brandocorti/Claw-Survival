// 11x11 icons for ability cards (also shown small in the HUD).
// Texture key: `card-<abilityId>`. Purple stays reserved for bad perks (milestone 6).
import { PALETTE as P } from './palette.js';
import { gridFromStrings, addOutline, createTextureFromGrid } from './pixelArt.js';

export const CARD_ICON_COLORS = {
  O: P.shotRim, W: P.white, Y: P.shotCore, L: P.sandLight, R: P.heart, G: '#5dff8a',
  B: P.wood, K: P.woodDark, S: P.rockLight, C: '#7a4a26', H: '#a06a3c', P: P.xpBar, F: P.explosion,
};

export const CARD_ICONS = {
  damage: [
    '.....Y.....',
    '..Y..Y..Y..',
    '...Y...Y...',
    '....OOO....',
    '...OWWOO...',
    'YY.OWOOO.YY',
    '...OOOOO...',
    '....OOO....',
    '...Y...Y...',
    '..Y..Y..Y..',
    '.....Y.....',
  ],
  fireRate: [
    '...........',
    'LLLL..OO...',
    '.....OWOO..',
    '......OO...',
    '..LLLL..OO.',
    '.......OWOO',
    '........OO.',
    'LLLL..OO...',
    '.....OWOO..',
    '......OO...',
    '...........',
  ],
  moveSpeed: [
    '.....BBB...',
    '.....BBB...',
    'WW...BBB...',
    '.WWW.BBB...',
    '..WWWBBB...',
    '.WWW.BBBB..',
    'WW...BBBBB.',
    '.....BBBBBB',
    '.....KKKKKK',
    '...........',
    'LLL.LLL.LLL',
  ],
  maxHearts: [
    '.RR...RR...',
    'RWRR.RRRR..',
    'RRRRRRRRR..',
    'RRRRRRRRR..',
    '.RRRRRRR...',
    '..RRRRR....',
    '...RRR..G..',
    '....R...G..',
    '......GGGGG',
    '........G..',
    '........G..',
  ],
  multishot: [
    '.......OO..',
    '......OWOO.',
    '.......OO..',
    '...L.......',
    '.L......OO.',
    'LLLL...OWOO',
    '.L......OO.',
    '...L.......',
    '.......OO..',
    '......OWOO.',
    '.......OO..',
  ],
  piercing: [
    '...........',
    '....SSS....',
    '...S...S...',
    '...S...S.O.',
    '...S...S.OO',
    'OOOOOOOOOOO',
    '...S...S.OO',
    '...S...S.O.',
    '...S...S...',
    '....SSS....',
    '...........',
  ],
  orbitCoconuts: [
    '....CC.....',
    '...CHCC....',
    '....CC.....',
    '..L.....L..',
    '.L...P...L.',
    '.L..PPP..L.',
    '.L...P...L.',
    '..L.....L..',
    '.CC.....CC.',
    'CHCC...CHCC',
    '.CC.....CC.',
  ],
  fireTrail: [
    '.....F.....',
    '....FF.....',
    '....FFF....',
    '..F.FYFF...',
    '..FFFYYF.F.',
    '..FFYYYFFF.',
    '.FFFYWYYFF.',
    '.FFYYWWYFF.',
    '.FFYWWWYFF.',
    '..FFYWYFF..',
    '...FFFFF...',
  ],
};

/** Builds every card icon texture. Call once, in BootScene. */
export function createCardTextures(scene) {
  for (const [id, rows] of Object.entries(CARD_ICONS)) {
    createTextureFromGrid(scene, `card-${id}`, addOutline(gridFromStrings(rows, CARD_ICON_COLORS), P.outline));
  }
}
