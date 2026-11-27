// Generates all placeholder textures, then opens the start menu.
import * as Phaser from 'phaser';
import { CONFIG } from '../../shared/config.js';
import { createSprites } from '../art/sprites.js';
import { createCardTextures } from '../art/cardArt.js';
import { createTileset } from '../art/tileArt.js';
import { createPixelFont } from '../art/pixelFont.js';
import { createHitTextTexture } from '../art/hitText.js';

export const TILESET_KEY = 'tiles';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    createSprites(this);
    createCardTextures(this);
    createTileset(this, TILESET_KEY, CONFIG.display.tileSize);
    createPixelFont(this);
    createHitTextTexture(this);
    // Dev options in the URL (?fast, ?boss...) skip the start menu; look options do not.
    const look = new Set(['classic', 'gfx']);
    const skipMenu = [...new URLSearchParams(window.location.search).keys()].some((key) => !look.has(key));
    this.scene.start(skipMenu ? 'Game' : 'Menu');
  }
}
