// Placeholder pixel art for rooms: the Salesman, the campfire, the icons shown
// above doors, and the status effect icons. Same method as sprites.js: pixel
// strings, '.' = transparent, outlines added automatically.
// No purple anywhere except on debuff icons (PALETTE.curse): purple = curses.
import { PALETTE as P } from './palette.js';
import { gridFromStrings, addOutline, createTextureFromGrid, createSpritesheet } from './pixelArt.js';

/** Chibi wandering merchant: straw hat, shifty grin, huge backpack full of junk. */
export const SALESMAN = {
  rows: [
    '....hhhhhh......',
    '..hhHHHHHHhh....',
    '.hhhhhhhhhhhh...',
    '...ssssssss.bbb.',
    '...sKsssKss.bBbb',
    '...ssssssssbbbbb',
    '...sMmmmMssbJbbb',
    '....ssssssbbbbbb',
    '...vvvvvvvbbJbbb',
    '..svvVVvvvbbbbb.',
    '..svvVVvvvsbbb..',
    '...vvvvvvv......',
    '...pp...pp......',
    '...pp...pp......',
    '..ddd...ddd.....',
  ],
  colors: {
    h: '#e8c860', H: '#b8402a', s: '#f0c090', K: P.outline, M: P.outline, m: '#f6f0e0',
    b: '#8a5a2e', B: P.band, J: '#3f9a8a', v: '#2f7f6f', V: P.band, p: '#5a4030', d: P.cliffBase,
  },
};

const FLAMES = [
  ['......F.......', '.....FfF......', '....FFfFF.....', '...FFfffFF....', '....FfffF.....'],
  ['.......F......', '......FfF.....', '....FFfFF.....', '...FFfffFF....', '....FfffF.....'],
];
const LOGS = ['..owwFFFwwo...', '.oowwwwwwwoo..', '..oooooooo....'];

/** Campfire, two flicker frames. */
export const CAMPFIRE = {
  frames: FLAMES.map((f) => [...f, ...LOGS]),
  colors: { F: P.explosion, f: P.shotCore, w: P.wood, o: P.rock },
};

/** Icons drawn above a door once it opens: what is behind it. */
export const DOOR_ICONS = {
  fight: {
    rows: [
      'W.......W', '.W.....W.', '..W...W..', '...W.W...', '....W....',
      '...W.W...', '.hW...Wh.', '.h.....h.', 'h.......h',
    ],
    colors: { W: '#e8eef2', h: P.wood },
  },
  break: {
    rows: ['....F....', '...FfF...', '..FfffF..', '..FfffF..', '...FFF...', '.wwwwwww.', '..w...w..'],
    colors: { F: P.explosion, f: P.shotCore, w: P.wood },
  },
  hidden: {
    rows: ['.QQQQ.', 'QQ..QQ', '....QQ', '...QQ.', '..QQ..', '......', '..QQ..'],
    colors: { Q: P.white },
  },
};

/** Status effect icons (white glyph, the HUD draws a buff or curse colored square behind). */
export const EFFECT_ICONS = {
  speed: ['.......', 'W..W...', '.W..W..', '..W..W.', '.W..W..', 'W..W...', '.......'],
  fire: ['.WW....', '.WW..W.', '....WWW', '.W...W.', 'WWW....', '.W..WW.', '....WW.'],
  heart: ['.WW.WW.', 'WWWWWWW', 'WWWWWWW', '.WWWWW.', '..WWW..', '...W...', '.......'],
  magnet: ['WW...WW', 'WW...WW', 'WW...WW', 'WW...WW', 'WWW.WWW', '.WWWWW.', '..WWW..'],
};

/**
 * Builds every room texture. Call once, in BootScene (through createSprites).
 * Keys: 'salesman', 'campfire' (frames '0', '1'), 'door-fight', 'door-break',
 * 'door-hidden', 'effect-<icon>'.
 * @param {Phaser.Scene} scene
 */
export function createRoomTextures(scene) {
  const outlined = (rows, colors) => addOutline(gridFromStrings(rows, colors), P.outline);
  createTextureFromGrid(scene, 'salesman', outlined(SALESMAN.rows, SALESMAN.colors));
  createSpritesheet(scene, 'campfire', CAMPFIRE.frames.map((rows, i) => ({ name: String(i), grid: outlined(rows, CAMPFIRE.colors) })));
  for (const [kind, icon] of Object.entries(DOOR_ICONS)) {
    createTextureFromGrid(scene, `door-${kind}`, outlined(icon.rows, icon.colors));
  }
  for (const [name, rows] of Object.entries(EFFECT_ICONS)) {
    createTextureFromGrid(scene, `effect-${name}`, gridFromStrings(rows, { W: P.white }));
  }
}
