// Level-up card choice: dims the paused game and shows the cards on offer.
// Pick with the mouse or the keys 1 / 2 / 3. The pick is only a request; the
// simulation decides (it owns the choice and will run on the server later).
import { addPixelText } from '../art/pixelFont.js';
import { PALETTE as P, hexToInt } from '../art/palette.js';
import { DEPTH } from '../systems/depth.js';
import { ABILITY_TYPES } from '../../shared/content/abilities/index.js';
import { wrapText } from './wrapText.js';

const CARD_W = 116;
const CARD_H = 136;
const GAP = 14;
const TOP = 80;
/** Ignore input right after the cards appear, so a held key or double click cannot pick by accident. */
const INPUT_DELAY_MS = 250;

export class CardScreen {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} config
   */
  constructor(scene, config) {
    this.scene = scene;
    this.config = config;
    this.objects = [];
    this.shown = null;
    this.openedAt = 0;
    this.pick = null;
    ['ONE', 'TWO', 'THREE', 'NUMPAD_ONE', 'NUMPAD_TWO', 'NUMPAD_THREE'].forEach((key, i) => {
      scene.input.keyboard.on(`keydown-${key}`, () => this.choose(i % 3));
    });
  }

  /** Call every frame with the local player; opens and closes itself. */
  update(player) {
    if (player.cardChoice === this.shown) return;
    this.close();
    if (player.cardChoice) this.open(player);
  }

  /** The card picked since the last call (index), or null. */
  takePick() {
    const pick = this.pick;
    this.pick = null;
    return pick;
  }

  choose(index) {
    if (!this.shown || index >= this.shown.length || this.scene.pauseMenu.isOpen) return;
    if (this.scene.time.now - this.openedAt < INPUT_DELAY_MS) return;
    this.pick = index;
  }

  open(player) {
    const { width, height } = this.config.display;
    this.shown = player.cardChoice;
    this.openedAt = this.scene.time.now;

    this.add(this.scene.add.rectangle(0, 0, width, height, 0x0d0a08, 0.72).setOrigin(0));
    // Several level-ups can be queued: show the level this choice belongs to.
    const level = player.level - player.pendingLevelUps + 1;
    this.add(addPixelText(this.scene, width / 2, 36, `LEVEL ${level}!`).setOrigin(0.5).setScale(3)).setTint(hexToInt(P.xpBar));
    this.add(addPixelText(this.scene, width / 2, 60, 'CHOOSE A CARD - CLICK IT OR PRESS ITS NUMBER').setOrigin(0.5));

    const n = this.shown.length;
    const left = Math.round((width - n * CARD_W - (n - 1) * GAP) / 2);
    this.shown.forEach((id, i) => this.addCard(id, i, left + i * (CARD_W + GAP), player));
  }

  addCard(id, index, x, player) {
    const def = ABILITY_TYPES[id];
    const cfg = this.config.abilities[id];
    const next = (player.abilities[id] ?? 0) + 1;
    const cx = x + CARD_W / 2;

    const frame = this.add(this.scene.add.rectangle(x, TOP, CARD_W, CARD_H, hexToInt('#3a2a1c')).setOrigin(0));
    const idle = () => frame.setFillStyle(hexToInt('#3a2a1c')).setStrokeStyle(2, hexToInt(P.wood));
    const hover = () => frame.setFillStyle(hexToInt('#54402a')).setStrokeStyle(2, hexToInt(P.shotRim));
    idle();
    frame.setInteractive({ useHandCursor: true })
      .on('pointerover', hover)
      .on('pointerout', idle)
      .on('pointerdown', (pointer) => { if (pointer.leftButtonDown()) this.choose(index); });

    this.add(this.scene.add.image(cx, TOP + 30, `card-${id}`).setScale(3));
    this.add(addPixelText(this.scene, cx, TOP + 58, def.name).setOrigin(0.5, 0)).setTint(hexToInt(P.shotRim));
    this.add(addPixelText(this.scene, cx, TOP + 70, wrapText(def.describe(next, cfg), 26)).setOrigin(0.5, 0).setCenterAlign());
    this.add(addPixelText(this.scene, cx, TOP + 102, next === 1 ? 'NEW' : `LEVEL ${next}/${cfg.maxLevel}`).setOrigin(0.5, 0))
      .setTint(hexToInt(next === 1 ? '#5dff8a' : P.xpBar));
    this.add(addPixelText(this.scene, cx, TOP + 116, `[${index + 1}]`).setOrigin(0.5, 0).setScale(2));
  }

  add(obj) {
    obj.setScrollFactor(0).setDepth(DEPTH.MENU);
    this.objects.push(obj);
    return obj;
  }

  close() {
    for (const obj of this.objects) obj.destroy();
    this.objects = [];
    this.shown = null;
    this.pick = null;
    this.scene.input.setDefaultCursor('default');
  }
}
