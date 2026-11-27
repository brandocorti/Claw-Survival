// Pause menu (Esc): resume, settings, restart, or back to the start menu.
// Online it cannot pause (the server runs your island), so it says so, has no restart,
// and quitting leaves the room.
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
   * @param {{ online?: boolean, onQuit?: () => void }} [options] - onQuit: what "Quit to menu" does
   */
  constructor(scene, display, { online = false, onQuit = () => scene.scene.start('Menu') } = {}) {
    this.scene = scene;
    this.display = display;
    this.online = online;
    this.onQuit = onQuit;
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
    const title = addPixelText(s, width / 2, 46, this.online ? 'MENU' : 'PAUSED').setOrigin(0.5).setScale(3).setScrollFactor(0).setDepth(LAYER).setTint(hexToInt(P.shotRim));
    this.backdrop = [dim, title];
    if (this.online) {
      this.backdrop.push(addPixelText(s, width / 2, 64, 'ONLINE THE GAME DOES NOT STOP').setOrigin(0.5).setScrollFactor(0).setDepth(LAYER));
    }
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
        ...(this.online ? [] : [{ label: () => 'Restart run', choose: () => this.scene.scene.restart({ mode: 'solo' }) }]),
        { label: () => (this.online ? 'Leave the match' : 'Quit to menu'), choose: () => this.onQuit() },
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
