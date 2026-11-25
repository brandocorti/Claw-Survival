// Placeholder enemy sprites: cute but dangerous chibis, 2 animation frames each.
// Texture key: `enemy-<type>`, frames '0' and '1'. Outlines are added automatically.
import { PALETTE as P } from './palette.js';
import { gridFromStrings, addOutline, createSpritesheet } from './pixelArt.js';

const CRAB_TOP = [
  '...WW....WW...',
  '...WK....WK...',
  'RR..r....r..RR',
  'RRR.RRRRRR.RRR',
  '.RRRRhhhhRRRR.',
  '..RRRRRRRRRR..',
  '..rRRRRRRRRr..',
  '...rrrrrrrr...',
];
const CRAB = {
  frames: [
    [...CRAB_TOP, '..r.r....r.r..'],
    [...CRAB_TOP, '...r.r..r.r...'],
  ],
  colors: { R: '#e2553a', r: '#a8341f', h: '#ff9b70', W: P.white, K: P.outline },
};

const COCONUT = {
  // One frame; the client spins it as it rolls (the angry face tumbles around).
  frames: [[
    '....BBBB....',
    '..BBhhBBBB..',
    '.BhhBBBBBBB.',
    '.BhKBBBBKBb.',
    'BBBKWBBKWBBb',
    'BBBKKBBKKBBb',
    'BBBBBBBBBBbb',
    'BBBBBKKBBBbb',
    '.BBBBKKBBbb.',
    '.bBBBBBBbbb.',
    '..bbbbbbbb..',
    '....bbbb....',
  ]],
  colors: { B: '#7a4a26', b: '#55321a', h: '#a06a3c', K: P.outline, W: P.white },
};

const SKELETON_TOP = [
  '...HHHHHHHH...',
  '.HHHHHHHHHHHH.',
  'HHGGGGGGGGGGHH',
  '..SSSSSSSSSS..',
  '.SSSSSSSSSSSS.',
  '.SSKKSSSSKKSS.',
  '.SSKRSSSSKRSS.',
  '.SSSSSKKSSSSS.',
  '..SsSsSsSsSs..',
  '...ssssssss...',
  '....S.SS.S....',
  '...SsSSSSsSgg.',
  '....SsSSsS....',
];
const SKELETON = {
  frames: [
    [...SKELETON_TOP, '.....S..S.....', '.....S..S.....', '....SS..SS....'],
    [...SKELETON_TOP, '.....S...S....', '....S....S....', '...SS....SS...'],
  ],
  colors: { H: '#2b2420', G: '#e0b040', S: '#f2ead8', s: '#c9bfa8', K: P.outline, R: '#ff4a3d', g: '#6a6a72' },
};

const TIKI_TOP = [
  '...L.L..L.L...',
  '..LlLlLLlLlL..',
  '...WWWWWWWW...',
  '..WWWWWWWWWW..',
  '..WwwWWWWwwW..',
  '..WEEWWWWEEW..',
  '..WEEWWWWEEW..',
  '..WWWWwwWWWW..',
  '..WWWWwwWWWW..',
  '..WMMMMMMMMW..',
  '..WMTMTTMTMW..',
  '..WMMMMMMMMW..',
  '...WWWWWWWW...',
];
const TIKI = {
  frames: [
    [...TIKI_TOP, '....gggggg....', '.....gggg.....', '......gg......'],
    [...TIKI_TOP, '.....gggggg...', '......gggg....', '.......gg.....'],
  ],
  colors: {
    L: P.jungleLight, l: P.jungleDark, W: '#b0703a', w: '#7a4620',
    E: '#ffcf3a', M: P.outline, T: '#f2ead8', g: '#9fe8e0',
  },
};

/** 2x crab with a crown, built from the crab art. */
function crabKingFrames() {
  const crown = [
    '..........G..GG..G..........',
    '..........GG.GG.GG..........',
    '..........GGGJJGGG..........',
  ];
  return CRAB.frames.map((rows) => [
    ...crown,
    ...rows.flatMap((row) => {
      const wide = [...row].map((c) => c + c).join('');
      return [wide, wide];
    }),
  ]);
}
const CRAB_KING = {
  frames: crabKingFrames(),
  colors: { ...CRAB.colors, G: '#f0c040', J: '#ff3a3a' },
};

export const ENEMY_ART = { crab: CRAB, coconut: COCONUT, skeleton: SKELETON, tiki: TIKI, crabKing: CRAB_KING };

/** Elite enemies get a gold outline (gold, not purple: purple is for curses). */
export const ELITE_OUTLINE = '#ffd23a';

/**
 * Builds every enemy spritesheet. Call once, in BootScene.
 * Keys: `enemy-<type>` and `enemy-<type>-elite` (one more pixel all round: the gold outline).
 * @param {Phaser.Scene} scene
 */
export function createEnemyTextures(scene) {
  for (const [type, art] of Object.entries(ENEMY_ART)) {
    const grids = art.frames.map((rows) => gridFromStrings(rows, art.colors));
    createSpritesheet(scene, `enemy-${type}`, grids.map((g, i) => ({ name: String(i), grid: addOutline(g, P.outline) })));
    createSpritesheet(scene, `enemy-${type}-elite`, grids.map((g, i) => ({ name: String(i), grid: addOutline(addOutline(g, P.outline), ELITE_OUTLINE) })));
  }
}
