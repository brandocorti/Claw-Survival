// The salesman: a castaway in a straw hat behind a rug full of goods, with a bouncing
// coin over his head so he is easy to spot, and the "E" prompt when you are close.
import { DEPTH } from '../systems/depth.js';
import { addPixelText } from '../art/pixelFont.js';

export class VendorView {
  /**
   * @param {Phaser.Scene} scene
   * @param {{ x: number, y: number }} at - world pixels
   */
  constructor(scene, at) {
    this.at = at;
    this.rug = scene.add.image(at.x, at.y + 9, 'vendorRug').setDepth(DEPTH.SHADOW);
    this.shadow = scene.add.image(at.x, at.y + 3, 'shadow').setDepth(DEPTH.SHADOW);
    this.body = scene.add.image(at.x, at.y + 4, 'vendor').setOrigin(0.5, 1).setDepth(at.y);
    this.mark = scene.add.sprite(at.x, at.y, 'coin', '0').setScale(2).setDepth(DEPTH.FX);
    /** Top of the hat, where the coin floats. */
    this.top = at.y + 4 - this.body.height;
    this.prompt = addPixelText(scene, at.x, this.top - 26, 'E TALK').setOrigin(0.5, 0).setDepth(DEPTH.FX + 1);
  }

  /**
   * @param {{ open: boolean, near: boolean, time: number }} state
   */
  update({ open, near, time }) {
    for (const obj of [this.rug, this.shadow, this.body, this.mark]) obj.setVisible(open);
    this.prompt.setVisible(open && near);
    this.mark.setY(Math.round(this.top - 10 + Math.sin(time * 4) * 2)).setFrame(String(Math.floor(time * 5) % 4));
    this.body.setFlipX(Math.floor(time / 3) % 2 === 0);
  }
}
