// Placeholder sprites drawn from pixel strings: player, weapon, bullets, gems,
// hearts, rocks and effects. Enemies are in enemyArt.js.
import { PALETTE as P } from './palette.js';
import { gridFromStrings, addOutline, createTextureFromGrid, createSpritesheet } from './pixelArt.js';
import { chibiFrame, CHIBI_DIRECTIONS, CHIBI_STEPS } from '../../shared/art/chibi.js';
import { createEnemyTextures } from './enemyArt.js';

/** Slingshot pointing right; the handle (left) sits in the player's hand. */
const SLINGSHOT = [
  '.....WW.',
  '......WB',
  'wwwwWW.B',
  'wwwwWW.B',
  '......WB',
  '.....WW.',
];

/** Player shot: glowing pebble. */
const PEBBLE = [
  '.YY.',
  'YWWY',
  'YWWY',
  '.YY.',
];

/** Enemy shot: bigger, red, so it never looks like your own shots. */
const ENEMY_BULLET = [
  '.EEE.',
  'EEWEE',
  'EWWWE',
  'EEWEE',
  '.EEE.',
];

const MUZZLE_FLASH = [
  '..W..',
  '.WYW.',
  'WYWYW',
  '.WYW.',
  '..W..',
];

/** Corner brackets drawn around the auto-aim target. */
const TARGET_MARK = [
  'WW.......WW',
  'W.........W',
  '...........',
  '...........',
  '...........',
  '...........',
  '...........',
  'W.........W',
  'WW.......WW',
];

/** Boulder used as cover: light top face, darker front face (3/4 view). */
const ROCK = [
  '....LLLLLL....',
  '..LLLLLLLLLL..',
  '.LLLLLLLLLGLL.',
  'LLLLMLLLLGGGLL',
  'LLLLLLLLLLLLLL',
  'MLLLLLLLLLLLLM',
  'MMMMLLLLLLMMMM',
  'DMMMMMMMMMMMMD',
  'DDDDMMMMMMDDDD',
  'DDDDDDKDDDDDDD',
  'DDDDDDKKDDDDDD',
  '.DDDDDDDDDDDD.',
  '..KKKKKKKKKK..',
];

const SHADOW = [
  '..SSSSSSSS..',
  'SSSSSSSSSSSS',
  'SSSSSSSSSSSS',
  '..SSSSSSSS..',
];

/** Sand swirl marking where an enemy is about to appear. */
const SPAWN_MARK = [
  '...dddddd...',
  '.dd......dd.',
  'd....ll....d',
  '.dd......dd.',
  '...dddddd...',
];

/** Orbiting coconut: green, so it never looks like the brown coconut enemy. */
const ORBIT_COCONUT = [
  '..GGGG..',
  '.GLLGGG.',
  'GLLGGGGD',
  'GLGGGGGD',
  'GGGGGGDD',
  'GGGGGGDD',
  '.GGGDDD.',
  '..DDDD..',
];

/** XP gems: small (1 XP), medium (5), large (20). */
const GEMS = {
  1: { rows: ['.C.', 'CWc', '.c.'], colors: { C: '#4de1ff', c: '#1f9fd0', W: P.white } },
  5: {
    rows: ['..G..', '.GWG.', 'GGWGg', '.Ggg.', '..g..'],
    colors: { G: '#5dff8a', g: '#22b05a', W: P.white },
  },
  20: {
    rows: ['...Y...', '..YWY..', '.YYWYy.', 'YYYWYyy', '.YYYyy.', '..Yyy..', '...y...'],
    colors: { Y: '#ffd23a', y: '#d08a10', W: P.white },
  },
};

/** Heart, drawn full / half / empty. */
const HEART = [
  '.AA.BB.',
  'AWAABBB',
  'AAAABBB',
  '.AAABB.',
  '..AAB..',
  '...A...',
];

/**
 * Generates every placeholder texture. Call once, in BootScene.
 * @param {Phaser.Scene} scene
 */
export function createSprites(scene) {
  // Player castaway: frames down_0, down_1, up_0, up_1, side_0, side_1
  const frames = [];
  for (const dir of CHIBI_DIRECTIONS) {
    for (let step = 0; step < CHIBI_STEPS; step++) {
      frames.push({ name: `${dir}_${step}`, grid: addOutline(chibiFrame({}, dir, step), P.outline) });
    }
  }
  createSpritesheet(scene, 'castaway', frames);
  createEnemyTextures(scene);

  const outlined = (rows, colors) => addOutline(gridFromStrings(rows, colors), P.outline);
  createTextureFromGrid(scene, 'slingshot', outlined(SLINGSHOT, { W: P.wood, w: P.woodDark, B: P.band }));
  createTextureFromGrid(scene, 'pebble', outlined(PEBBLE, { Y: P.shotRim, W: P.shotCore }));
  createTextureFromGrid(scene, 'enemyBullet', outlined(ENEMY_BULLET, { E: P.enemyShot, W: P.white }));
  createTextureFromGrid(scene, 'muzzle', gridFromStrings(MUZZLE_FLASH, { W: P.white, Y: P.shotRim }));
  createTextureFromGrid(scene, 'targetMark', outlined(TARGET_MARK, { W: P.white }));
  createTextureFromGrid(
    scene,
    'rock',
    outlined(ROCK, { L: P.rockLight, M: P.rock, D: P.rockDark, K: P.rockDeep, G: P.jungleLight }),
  );
  createTextureFromGrid(scene, 'shadow', gridFromStrings(SHADOW, { S: 'rgba(26,18,18,0.35)' }));
  createTextureFromGrid(scene, 'bulletShadow', gridFromStrings(['SS', 'SS'], { S: 'rgba(26,18,18,0.35)' }));
  createTextureFromGrid(scene, 'spawnMark', gridFromStrings(SPAWN_MARK, { d: '#8a6a3a', l: P.sandLight }));
  createTextureFromGrid(
    scene,
    'orbitCoconut',
    outlined(ORBIT_COCONUT, { G: '#8fd14a', L: '#dcf7a0', D: P.jungleLight }),
  );
  createTextureFromGrid(scene, 'px', gridFromStrings(['WW', 'WW'], { W: P.white }));
  createTextureFromGrid(scene, 'ring', ringGrid(16, P.white));

  for (const [value, gem] of Object.entries(GEMS)) {
    createTextureFromGrid(scene, `gem${value}`, outlined(gem.rows, gem.colors));
  }

  const red = P.heart;
  const empty = P.heartEmpty;
  const heart = (left, right) => outlined(HEART, { A: left, B: right, W: left === red ? P.white : empty });
  createSpritesheet(scene, 'heart', [
    { name: 'full', grid: heart(red, red) },
    { name: 'half', grid: heart(red, empty) },
    { name: 'empty', grid: heart(empty, empty) },
  ]);
}

/** Circle outline (2 px thick) used for explosion shockwaves. */
function ringGrid(radius, color) {
  const size = radius * 2 + 1;
  return Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => {
      const d = Math.hypot(x - radius, y - radius);
      return d <= radius && d > radius - 2 ? color : null;
    }),
  );
}
