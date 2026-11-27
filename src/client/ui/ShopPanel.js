// The salesman's panel: how every player is doing on the left, one random ability for
// sale on the right. The simulation owns the shop; this only shows it and asks.
import { addPixelText } from '../art/pixelFont.js';
import { PALETTE as P, hexToInt } from '../art/palette.js';
import { DEPTH } from '../systems/depth.js';
import { shopOffer, playerStatuses } from '../../shared/sim/systems/shop.js';
import { ABILITY_TYPES } from '../../shared/content/abilities/index.js';

const GOLD = hexToInt('#ffd23a');
const WOOD = hexToInt('#3a2a1c');
const GREEN = hexToInt('#5dff8a');
/** Ignore input right after opening, so a held or repeated key cannot buy by accident. */
const INPUT_DELAY_MS = 250;

export class ShopPanel {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} config
   */
  constructor(scene, config) {
    this.scene = scene;
    this.config = config;
    this.isOpen = false;
    this.choice = null;
    this.objects = [];
    this.drawn = '';
    this.openedAt = 0;
    for (const key of ['ONE', 'NUMPAD_ONE', 'ENTER']) scene.input.keyboard.on(`keydown-${key}`, () => this.choose('buy'));
  }

  /** @returns {'buy'|'close'|null} the choice made since the last call */
  takeChoice() {
    const { choice } = this;
    this.choice = null;
    return choice;
  }

  choose(choice) {
    if (!this.isOpen || this.scene.pauseMenu.isOpen) return;
    if (choice === 'buy' && this.scene.time.now - this.openedAt < INPUT_DELAY_MS) return;
    this.choice = choice;
  }

  /** Call every frame; redraws only when something changed. */
  update(world, player) {
    if (player.shopOpen && !this.isOpen) this.openedAt = this.scene.time.now;
    this.isOpen = player.shopOpen;
    const state = this.isOpen
      ? JSON.stringify([player.coins, player.lastRoll, shopOffer(world, player), playerStatuses(world, player.id)])
      : '';
    if (state === this.drawn) return;
    this.drawn = state;
    for (const obj of this.objects) obj.destroy();
    this.objects = [];
    if (this.isOpen) this.draw(world, player);
    else this.scene.input.setDefaultCursor('default');
  }

  draw(world, player) {
    const { width, height } = this.config.display;
    const s = this.scene;
    const text = (x, y, t, tint = 0xffffff) => this.add(addPixelText(s, x, y, t)).setTint(tint);
    this.add(s.add.rectangle(0, 0, width, height, 0x0d0a08, 0.72).setOrigin(0));
    this.add(s.add.rectangle(40, 34, 400, 200, WOOD).setOrigin(0).setStrokeStyle(2, hexToInt(P.wood)));
    this.add(s.add.image(70, 72, 'vendor').setOrigin(0.5, 1));
    text(90, 46, 'THE SALESMAN', GOLD).setScale(2);
    text(90, 62, 'NEWS IS FREE. LUCK IS NOT.');
    this.add(s.add.image(370, 53, 'coin', '0'));
    text(378, 50, `${player.coins} COINS`, GOLD);

    this.drawStatuses(world, player, text);
    this.drawOffer(world, player, text);

    const leave = this.add(s.add.rectangle(240, 214, 130, 14, hexToInt('#54402a')).setStrokeStyle(1, hexToInt(P.wood)))
      .setInteractive({ useHandCursor: true });
    leave.on('pointerdown', () => this.choose('close'));
    this.add(addPixelText(s, 240, 211, '[E] LEAVE').setOrigin(0.5, 0));
  }

  drawStatuses(world, player, text) {
    text(56, 84, 'HOW IS EVERYONE?', hexToInt(P.xpBar));
    const rows = playerStatuses(world, player.id);
    rows.slice(0, 6).forEach((r, i) => {
      const y = 98 + i * 16;
      text(56, y, r.you ? 'YOU' : r.name.slice(0, 12), r.alive ? 0xffffff : 0x9a8a8a);
      text(112, y, r.alive ? 'ALIVE' : 'DEAD', r.alive ? GREEN : hexToInt(P.enemyShot));
      text(144, y, `LV ${r.level}`);
      text(172, y, `HP ${r.health / 2}/${r.maxHealth / 2}`);
      text(56, y + 7, `ROUND ${r.round}   KILLS ${r.kills}`, 0xc9b892);
    });
    if (rows.length === 1) text(56, 122, 'NO OTHER CASTAWAYS THIS RUN', 0xc9b892);
  }

  drawOffer(world, player, text) {
    const s = this.scene;
    const { price, state } = shopOffer(world, player);
    text(256, 84, 'RANDOM BUFF', hexToInt(P.xpBar));
    text(256, 96, 'ONE ROLL PER ROUND', 0xc9b892);

    const roll = player.lastRoll;
    if (roll) {
      this.add(s.add.image(276, 130, `card-${roll.abilityId}`).setScale(2));
      text(298, 120, 'YOU GOT', 0xc9b892);
      text(298, 130, ABILITY_TYPES[roll.abilityId].name, GREEN);
      text(298, 140, `LEVEL ${roll.level}`);
    } else {
      text(268, 118, '?', GOLD).setScale(4);
      text(298, 130, `PRICE: ${price} COINS`, state === 'coins' ? hexToInt(P.enemyShot) : 0xffffff);
    }

    const label = {
      ok: `[1] BUY FOR ${price}`,
      coins: `${price - player.coins} COINS SHORT`,
      soldOut: 'COME BACK NEXT ROUND',
      maxed: 'YOU HAVE EVERYTHING',
    }[state];
    const button = this.add(s.add.rectangle(340, 174, 160, 18, hexToInt(state === 'ok' ? '#54402a' : '#2a2018')))
      .setStrokeStyle(1, state === 'ok' ? hexToInt(P.shotRim) : hexToInt('#4d3a24'));
    if (state === 'ok') button.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.choose('buy'));
    this.add(addPixelText(s, 340, 171, label).setOrigin(0.5, 0)).setTint(state === 'ok' ? GOLD : 0x9a8a8a);
  }

  add(obj) {
    obj.setScrollFactor(0).setDepth(DEPTH.MENU);
    this.objects.push(obj);
    return obj;
  }
}
