// A vertical list of menu entries, used with the mouse or the keyboard
// (up / down, left / right to change a value, Enter or Space to choose).
import { addPixelText } from '../art/pixelFont.js';
import { PALETTE as P, hexToInt } from '../art/palette.js';

const ROW_H = 18;
const IDLE = hexToInt('#3a2a1c');
const HOT = hexToInt('#54402a');

export class MenuList {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} o
   * @param {number} o.x - center
   * @param {number} o.y - top
   * @param {number} [o.width]
   * @param {number} o.depth
   * @param {{ label: () => string, choose: () => void, change?: (step: -1|1) => void }[]} o.items
   */
  constructor(scene, { x, y, width = 180, depth, items }) {
    this.scene = scene;
    this.items = items;
    this.index = 0;
    this.rows = items.map((item, i) => {
      const top = y + i * (ROW_H + 4);
      const box = scene.add.rectangle(x, top, width, ROW_H, IDLE).setOrigin(0.5, 0).setScrollFactor(0).setDepth(depth)
        .setInteractive({ useHandCursor: true });
      const text = addPixelText(scene, x, top + 6, '').setOrigin(0.5, 0).setScrollFactor(0).setDepth(depth);
      box.on('pointerover', () => this.select(i));
      box.on('pointerdown', (pointer) => {
        if (!pointer.leftButtonDown()) return;
        this.select(i);
        // Clicking the left or right half of a value lowers or raises it.
        if (item.change) item.change(pointer.x < x ? -1 : 1);
        else item.choose();
        if (this.rows) this.refresh();
      });
      return { box, text };
    });
    this.onKey = (event) => this.key(event.code);
    scene.input.keyboard.on('keydown', this.onKey);
    this.refresh();
  }

  key(code) {
    const n = this.items.length;
    const item = this.items[this.index];
    if (code === 'ArrowUp' || code === 'KeyW') this.select((this.index + n - 1) % n);
    else if (code === 'ArrowDown' || code === 'KeyS') this.select((this.index + 1) % n);
    else if ((code === 'ArrowLeft' || code === 'KeyA') && item.change) item.change(-1);
    else if ((code === 'ArrowRight' || code === 'KeyD') && item.change) item.change(1);
    else if (code === 'Enter' || code === 'Space') item.choose();
    else return;
    if (this.rows) this.refresh();
  }

  select(i) {
    this.index = i;
    this.refresh();
  }

  refresh() {
    this.rows.forEach(({ box, text }, i) => {
      const hot = i === this.index;
      box.setFillStyle(hot ? HOT : IDLE).setStrokeStyle(1, hexToInt(hot ? P.shotRim : P.wood));
      text.setText(this.items[i].label().toUpperCase()).setTint(hexToInt(hot ? P.shotCore : P.white));
    });
  }

  destroy() {
    this.scene.input.keyboard.off('keydown', this.onKey);
    for (const { box, text } of this.rows) {
      box.destroy();
      text.destroy();
    }
    this.rows = null;
    this.scene.input.setDefaultCursor('default');
  }
}
