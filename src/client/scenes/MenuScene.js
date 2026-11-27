// Start menu over a slowly drifting view of the island.
import * as Phaser from 'phaser';
import { CONFIG } from '../../shared/config.js';
import { BEACH_ARENA } from '../../shared/content/arenas/beach.js';
import { parseArena } from '../../shared/sim/map.js';
import { MapView } from '../entities/MapView.js';
import { MenuList } from '../ui/MenuList.js';
import { openSettings } from '../ui/SettingsPanel.js';
import { addPixelText } from '../art/pixelFont.js';
import { PALETTE as P, hexToInt } from '../art/palette.js';
import { DEPTH } from '../systems/depth.js';
import { music } from '../audio/MusicPlayer.js';
import { TILESET_KEY } from './BootScene.js';

const HELP = [
  'WASD OR ARROWS   MOVE',
  'SPACE            DODGE ROLL',
  'E                TALK TO THE SALESMAN',
  'MOUSE OR 1 2 3   PICK A CARD',
  'ESC              PAUSE',
  '',
  'YOUR SLINGSHOT FIRES BY ITSELF.',
  'SURVIVE 5 MINUTES, THEN BEAT THE FINAL BOSS.',
];

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const { width, height, tileSize } = CONFIG.display;
    this.map = parseArena(BEACH_ARENA, tileSize);
    this.mapView = new MapView(this, this.map, TILESET_KEY);
    const fixed = (obj) => obj.setScrollFactor(0).setDepth(DEPTH.MENU);
    fixed(this.add.rectangle(0, 0, width, height, 0x0d0a08, 0.45).setOrigin(0));
    fixed(addPixelText(this, width / 2, 52, 'Claw Survival').setOrigin(0.5).setScale(4)).setTint(hexToInt(P.shotRim));
    fixed(addPixelText(this, width / 2, 78, 'ONE ISLAND. ONE SEAT ON THE BOAT.').setOrigin(0.5));
    this.page = [];
    this.list = null;
    this.showMain();
    this.input.keyboard.on('keydown-ESC', () => this.showMain());
    music.play('menu');
    if (import.meta.env.DEV) window.__menu = this;
  }

  clearPage() {
    this.list?.destroy();
    this.list = null;
    for (const obj of this.page) obj.destroy();
    this.page = [];
  }

  showMain() {
    this.clearPage();
    this.list = new MenuList(this, {
      x: CONFIG.display.width / 2,
      y: 112,
      depth: DEPTH.MENU,
      items: [
        { label: () => 'Start run', choose: () => this.scene.start('Game') },
        { label: () => 'Settings', choose: () => this.showSettings() },
        { label: () => 'How to play', choose: () => this.showHelp() },
      ],
    });
  }

  showSettings() {
    this.clearPage();
    this.list = openSettings(this, { x: CONFIG.display.width / 2, y: 100, depth: DEPTH.MENU, onBack: () => this.showMain() });
  }

  showHelp() {
    this.clearPage();
    this.page = HELP.map((line, i) => addPixelText(this, 140, 104 + i * 12, line).setScrollFactor(0).setDepth(DEPTH.MENU));
    this.list = new MenuList(this, {
      x: CONFIG.display.width / 2, y: 214, depth: DEPTH.MENU, items: [{ label: () => 'Back', choose: () => this.showMain() }],
    });
  }

  update(time) {
    const w = this.map.width * this.map.tileSize - CONFIG.display.width;
    const h = this.map.height * this.map.tileSize - CONFIG.display.height;
    this.cameras.main.setScroll((0.5 + Math.sin(time / 19000) * 0.5) * w, (0.5 + Math.cos(time / 23000) * 0.5) * h);
  }
}
