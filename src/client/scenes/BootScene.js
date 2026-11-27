// Generates all placeholder textures, then opens the start menu (or, for a shared
// room link or dev options in the URL, the online lobby or a solo run straight away).
import * as Phaser from 'phaser';
import { CONFIG } from '../../shared/config.js';
import { createSprites } from '../art/sprites.js';
import { createCardTextures } from '../art/cardArt.js';
import { createTileset } from '../art/tileArt.js';
import { createPixelFont } from '../art/pixelFont.js';

export const TILESET_KEY = 'tiles';

/** URL options that are about the look only: they never skip the menu. */
const LOOK_OPTIONS = new Set(['classic', 'gfx']);
/** URL options for online play (devOptions.js readOnlineOptions): they open the lobby. */
const ONLINE_OPTIONS = ['online', 'room', 'bots', 'botsTough'];

/**
 * Which scene opens first: a shared room link or online dev options open the lobby,
 * other dev options (?fast, ?boss...) start a solo run, and none opens the start menu.
 * @param {string} search - window.location.search
 * @returns {'Menu'|'Lobby'|'Game'}
 */
export function firstScene(search) {
  const keys = [...new URLSearchParams(search).keys()];
  if (keys.some((key) => ONLINE_OPTIONS.includes(key))) return 'Lobby';
  return keys.some((key) => !LOOK_OPTIONS.has(key)) ? 'Game' : 'Menu';
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    createSprites(this);
    createCardTextures(this);
    createTileset(this, TILESET_KEY, CONFIG.display.tileSize);
    createPixelFont(this);
    this.scene.start(firstScene(window.location.search));
  }
}
