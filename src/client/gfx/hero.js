// Hero textures: 'hero' spritesheet (walk/idle/blink/hurt per direction,
// roll0..3) and a bigger slingshot with rest / pulled frames.
import { heroFrame, heroRollBall, rotateGrid } from '../../shared/art/hero.js';
import { addOutline, createSpritesheet, gridFromStrings } from '../art/pixelArt.js';
import { PALETTE as P } from '../art/palette.js';

const O = '#1a1212';

const SLING_REST = [
  '......WWw.',
  '.......WB.',
  'hhhwWWW.B.',
  'hhhwWWW.L.',
  '.......WB.',
  '......WWw.',
];
const SLING_PULL = [
  '......WWw.',
  '.....BBW..',
  'hhhwLWW...',
  'hhhwWWW...',
  '.....BBW..',
  '......WWw.',
];

/**
 * @param {Phaser.Scene} scene
 * @param {Partial<typeof import('../../shared/art/hero.js').HERO_TRAITS>} [traits] - recolors
 * @param {string} [key] - texture key; each skin needs its own
 * @returns {string} the key (the roll ball is `${key}Roll`)
 */
export function createHeroTextures(scene, traits = {}, key = 'hero') {
  if (scene.textures.exists(key)) return key;
  const frames = [];
  for (const dir of ['down', 'up', 'side']) {
    for (let i = 0; i < 4; i++) frames.push({ name: `${dir}_walk${i}`, grid: addOutline(heroFrame(traits, dir, { walk: i, tail: i % 2 }), O) });
    for (let i = 0; i < 2; i++) frames.push({ name: `${dir}_idle${i}`, grid: addOutline(heroFrame(traits, dir, { idle: i, tail: i }), O) });
    frames.push({ name: `${dir}_blink`, grid: addOutline(heroFrame(traits, dir, { blink: true }), O) });
    frames.push({ name: `${dir}_hurt`, grid: addOutline(heroFrame(traits, dir, { hurt: true }), O) });
  }
  createSpritesheet(scene, key, frames);
  const ball = heroRollBall(traits);
  createSpritesheet(scene, `${key}Roll`, [0, 1, 2, 3].map((k) => ({ name: String(k), grid: addOutline(rotateGrid(ball, k), O) })));
  if (scene.textures.exists('sling2')) return key;
  const colors = { W: P.wood, w: P.woodDark, B: P.band, L: '#8a5a3a', h: '#c88a50' };
  createSpritesheet(scene, 'sling2', [
    { name: 'rest', grid: addOutline(gridFromStrings(SLING_REST, colors), O) },
    { name: 'pull', grid: addOutline(gridFromStrings(SLING_PULL, colors), O) },
  ]);
  return key;
}
