// Level-up card choice: dims the paused game and shows the cards on offer.
// Pick with the mouse or the keys 1 / 2 / 3. The pick is only a request; the
// simulation decides (it owns the choice; online it runs on the server).
// Online the game does not pause, so the cards are shorter, sit along the bottom
// edge (the player stays visible in the middle) and count down to the auto-pick.
import { addPixelText } from '../art/pixelFont.js';
import { PALETTE as P, hexToInt } from '../art/palette.js';
import { DEPTH } from '../systems/depth.js';
import { ABILITY_TYPES } from '../../shared/content/abilities/index.js';
import { wrapText } from './wrapText.js';

/** Card sizes and positions: the full layout (solo, game paused) and the compact one (online). */
const LAYOUTS = {
  full: { cardW: 116, cardH: 136, gap: 14, top: 80, dim: 0.72, iconScale: 3 },
  /** `top` is set from the screen height: the cards sit this far above the bottom edge. */
  compact: { cardW: 116, cardH: 84, gap: 10, bottomMargin: 6, dim: 0.3, iconScale: 2 },
};
/** Ignore input right after the cards appear, so a held key or double click cannot pick by accident. */
const INPUT_DELAY_MS = 250;

export class CardScreen {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} config
   * @param {{ online?: boolean }} [options] - online: compact cards, no pause, auto-pick countdown
   */
  constructor(scene, config, { online = false } = {}) {
    this.scene = scene;
    this.config = config;
    this.online = online;
    const c = LAYOUTS.compact;
    this.layout = online ? { ...c, top: config.display.height - c.cardH - c.bottomMargin } : LAYOUTS.full;
    this.countdown = null;
    this.objects = [];
    this.shown = null;
    this.openedAt = 0;
    this.pick = null;
    ['ONE', 'TWO', 'THREE', 'NUMPAD_ONE', 'NUMPAD_TWO', 'NUMPAD_THREE'].forEach((key, i) => {
      scene.input.keyboard.on(`keydown-${key}`, () => this.choose(i % 3));
    });
  }

  /**
   * Call every frame with the local player; opens and closes itself.
   * @param {object} player
   * @param {number} [worldTime] - online: for the auto-pick countdown
   */
  update(player, worldTime = 0) {
    if (player.cardChoice !== this.shown) {
      this.close();
      if (player.cardChoice) this.open(player);
    }
    if (this.countdown && this.shown) {
      const left = Math.max(0, this.config.net.cardTimeoutSeconds - (worldTime - player.cardOpenedAt));
      this.countdown.setText(`CHOOSE WITH 1 / 2 / 3 - THE GAME DOES NOT STOP - AUTO-PICK IN ${Math.ceil(left)}`);
    }
  }

  /** The card picked since the last call (index), or null. */
  takePick() {
    const pick = this.pick;
    this.pick = null;
    return pick;
  }

  choose(index) {
    if (!this.shown || index >= this.shown.length) return;
    if (this.scene.time.now - this.openedAt < INPUT_DELAY_MS) return;
    this.pick = index;
  }

  open(player) {
    const { width, height } = this.config.display;
    this.shown = player.cardChoice;
    this.openedAt = this.scene.time.now;

    const L = this.layout;
    this.add(this.scene.add.rectangle(0, 0, width, height, 0x0d0a08, L.dim).setOrigin(0));
    // Several level-ups can be queued: show the level this choice belongs to.
    const level = player.level - player.pendingLevelUps + 1;
    if (this.online) {
      this.add(addPixelText(this.scene, width / 2, L.top - 18, `LEVEL ${level}!`).setOrigin(0.5).setScale(2)).setTint(hexToInt(P.xpBar));
      this.countdown = this.add(addPixelText(this.scene, width / 2, L.top - 8, '').setOrigin(0.5));
    } else {
      this.add(addPixelText(this.scene, width / 2, 36, `LEVEL ${level}!`).setOrigin(0.5).setScale(3)).setTint(hexToInt(P.xpBar));
      this.add(addPixelText(this.scene, width / 2, 60, 'CHOOSE A CARD - CLICK IT OR PRESS ITS NUMBER').setOrigin(0.5));
    }

    const n = this.shown.length;
    const left = Math.round((width - n * L.cardW - (n - 1) * L.gap) / 2);
    this.shown.forEach((id, i) => this.addCard(id, i, left + i * (L.cardW + L.gap), player));
  }

  addCard(id, index, x, player) {
    const def = ABILITY_TYPES[id];
    const cfg = this.config.abilities[id];
    const next = (player.abilities[id] ?? 0) + 1;
    const { cardW, cardH, top: TOP, iconScale } = this.layout;
    const cx = x + cardW / 2;

    const frame = this.add(this.scene.add.rectangle(x, TOP, cardW, cardH, hexToInt('#3a2a1c')).setOrigin(0));
    const idle = () => frame.setFillStyle(hexToInt('#3a2a1c')).setStrokeStyle(2, hexToInt(P.wood));
    const hover = () => frame.setFillStyle(hexToInt('#54402a')).setStrokeStyle(2, hexToInt(P.shotRim));
    idle();
    frame.setInteractive({ useHandCursor: true })
      .on('pointerover', hover)
      .on('pointerout', idle)
      .on('pointerdown', (pointer) => { if (pointer.leftButtonDown()) this.choose(index); });

    const levelText = next === 1 ? 'NEW' : `LEVEL ${next}/${cfg.maxLevel}`;
    const levelTint = hexToInt(next === 1 ? '#5dff8a' : P.xpBar);
    if (this.online) {
      // Compact: icon and key on top, then name, level and text.
      this.add(this.scene.add.image(x + 14, TOP + 14, `card-${id}`).setScale(iconScale));
      this.add(addPixelText(this.scene, x + cardW - 6, TOP + 6, `[${index + 1}]`).setOrigin(1, 0).setScale(2));
      this.add(addPixelText(this.scene, cx, TOP + 28, def.name).setOrigin(0.5, 0)).setTint(hexToInt(P.shotRim));
      this.add(addPixelText(this.scene, cx, TOP + 37, levelText).setOrigin(0.5, 0)).setTint(levelTint);
      this.add(addPixelText(this.scene, cx, TOP + 47, wrapText(def.describe(next, cfg), 26)).setOrigin(0.5, 0).setCenterAlign());
      return;
    }
    this.add(this.scene.add.image(cx, TOP + 30, `card-${id}`).setScale(iconScale));
    this.add(addPixelText(this.scene, cx, TOP + 58, def.name).setOrigin(0.5, 0)).setTint(hexToInt(P.shotRim));
    this.add(addPixelText(this.scene, cx, TOP + 70, wrapText(def.describe(next, cfg), 26)).setOrigin(0.5, 0).setCenterAlign());
    this.add(addPixelText(this.scene, cx, TOP + 102, levelText).setOrigin(0.5, 0)).setTint(levelTint);
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
    this.countdown = null;
    this.scene.input.setDefaultCursor('default');
  }
}
