// Entry point: creates the Phaser game with pixel-perfect settings.
import * as Phaser from 'phaser';
import { CONFIG } from '../shared/config.js';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { CAPTURE } from './gfx/flags.js';
import { installIntegerScaling } from './systems/integerScaling.js';

// Captures: the same "random" particles every time, and tweens (which read the real
// clock) follow the harness clock instead.
if (CAPTURE) {
  Date.now = () => window.__t ?? 0;
  let seed = 1;
  Math.random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

const { width, height } = CONFIG.display;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width,
  height,
  backgroundColor: '#1a1212',
  render: { preserveDrawingBuffer: CAPTURE }, // lets the capture harness read the canvas
  pixelArt: true, // nearest-neighbor filtering, no smoothing
  roundPixels: true, // draw sprites on whole pixels
  scale: {
    mode: Phaser.Scale.NONE, // we pick the zoom ourselves (integer only)
    autoCenter: Phaser.Scale.NO_CENTER, // centered with CSS flexbox in index.html
  },
  scene: [BootScene, MenuScene, GameScene],
});

installIntegerScaling(game, width, height);

if (import.meta.env.DEV) window.__game = game;
