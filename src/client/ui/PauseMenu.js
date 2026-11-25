// Pause menu (Esc): resume, settings, restart, or back to the start menu.
import { MenuList } from './MenuList.js';
import { openSettings } from './SettingsPanel.js';
import { addPixelText } from '../art/pixelFont.js';
import { PALETTE as P, hexToInt } from '../art/palette.js';
import { DEPTH } from '../systems/depth.js';

const LAYER = DEPTH.MENU + 100;

export class PauseMenu {
  /**
   * @param {Phaser.Scene} scene
   * @param {{ width: number, height: number }} display
   */
  constructor(scene, display) {
    this.scene = scene;
    this.display = display;
    this.isOpen = false;
    this.backdrop = [];
    this.list = null;
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    const { width, height } = this.display;
    const s = this.scene;
    // Interactive, so clicks never reach the cards or the shop behind it.
    const dim = s.add.rectangle(0, 0, width, height, 0x0d0a08, 0.8).setOrigin(0).setScrollFactor(0).setDepth(LAYER).setInteractive();
    const title = addPixelText(s, width / 2, 46, 'PAUSED').setOrigin(0.5).setScale(3).setScrollFactor(0).setDepth(LAYER).setTint(hexToInt(P.shotRim));
    this.backdrop = [dim, title];
    this.showMain();
  }

  showMain() {
    this.list?.destroy();
    this.list = new MenuList(this.scene, {
      x: this.display.width / 2,
      y: 80,
      depth: LAYER + 1,
      items: [
        { label: () => 'Resume', choose: () => this.close() },
        { label: () => 'Settings', choose: () => this.showSettings() },
        { label: () => 'Restart run', choose: () => this.scene.scene.restart() },
        { label: () => 'Quit to menu', choose: () => this.scene.scene.start('Menu') },
      ],
    });
  }

  showSettings() {
    this.list?.destroy();
    this.list = openSettings(this.scene, { x: this.display.width / 2, y: 76, depth: LAYER + 1, onBack: () => this.showMain() });
  }

  close() {
    this.isOpen = false;
    this.list?.destroy();
    this.list = null;
    for (const obj of this.backdrop) obj.destroy();
    this.backdrop = [];
  }
}
