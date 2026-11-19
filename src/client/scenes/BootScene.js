// Generates all placeholder textures, then starts the game.
import * as Phaser from 'phaser';
import { CONFIG } from '../../shared/config.js';
import { createSprites } from '../art/sprites.js';
import { createTileset } from '../art/tileArt.js';
import { createPixelFont } from '../art/pixelFont.js';

export const TILESET_KEY = 'tiles';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    createSprites(this);
    createTileset(this, TILESET_KEY, CONFIG.display.tileSize);
    createPixelFont(this);
    this.scene.start('Game');
  }
}
