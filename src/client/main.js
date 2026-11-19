// Entry point: creates the Phaser game with pixel-perfect settings.
import * as Phaser from 'phaser';
import { CONFIG } from '../shared/config.js';
import { BootScene } from './scenes/BootScene.js';
import { GameScene } from './scenes/GameScene.js';
import { installIntegerScaling } from './systems/integerScaling.js';

const { width, height } = CONFIG.display;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width,
  height,
  backgroundColor: '#1a1212',
  pixelArt: true, // nearest-neighbor filtering, no smoothing
  roundPixels: true, // draw sprites on whole pixels
  scale: {
    mode: Phaser.Scale.NONE, // we pick the zoom ourselves (integer only)
    autoCenter: Phaser.Scale.NO_CENTER, // centered with CSS flexbox in index.html
  },
  scene: [BootScene, GameScene],
});

installIntegerScaling(game, width, height);

if (import.meta.env.DEV) window.__game = game;
