// The Salesman's menu: his portrait and a speech bubble on top, three cards
// below (1 mystery roll, 2 gossip, 3 leave), picked with the mouse or keys 1/2/3,
// like the level-up cards will be. The game is paused while it is open (the
// scene does that through onOpen / onClose).
// Purchases go through transport.sendAction(); the rules live in the simulation
// (shared/sim/systems/breakRoom.js). Lines come from a SalesmanLines object, so a
// later GenAI step can swap in an LLM without touching this file.
import { addPixelText } from '../art/pixelFont.js';
import { PALETTE as P, hexToInt } from '../art/palette.js';
import { DEPTH } from '../systems/depth.js';
import { priceOf } from '../../shared/sim/systems/breakRoom.js';
import { EFFECTS } from '../../shared/content/effects/index.js';

const BUFF_COLOR = '#2f8f7a';
const CARD_W = 128;
const CARD_H = 88;
const CARD_BG = 0x3a2a1c;
const CARD_BG_OFF = 0x241a12;
const BUBBLE_BG = 0x2b2018;
const CARD_EDGE = 0xe8c860;
const Z = DEPTH.HUD + 20;

/** Splits text into lines of at most `max` characters, on spaces. */
export function wrapText(text, max) {
  const lines = [];
  let line = '';
  for (const word of String(text).split(/\s+/)) {
    if (line && (line + ' ' + word).length > max) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines.join('\n');
}

export class SalesmanMenu {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} options
   * @param {object} options.config - game config
   * @param {import('../network/LocalTransport.js').LocalTransport} options.transport
   * @param {import('../../shared/dialogue/SalesmanLines.js').SalesmanLines} options.lines
   * @param {() => void} options.onOpen - pause the game
   * @param {() => void} options.onClose - resume it
   */
  constructor(scene, { config, transport, lines, onOpen, onClose }) {
    this.scene = scene;
    this.config = config;
    this.transport = transport;
    this.lines = lines;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.isOpen = false;
    this.objects = [];
    this.lineRequest = 0;

    const kb = scene.input.keyboard;
    kb.on('keydown-ONE', () => this.choose('roll'));
    kb.on('keydown-TWO', () => this.choose('intel'));
    kb.on('keydown-THREE', () => this.close());
    kb.on('keydown-ESC', () => this.close());
    kb.on('keydown-E', () => {
      // The E that opened the menu arrives in the same frame: ignore it.
      if (this.isOpen && this.scene.time.now - this.openedAt > 150) this.close();
    });
  }

  /** Opens the menu (the simulation asked for it with a 'salesmanOpened' event). */
  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.openedAt = this.scene.time.now;
    this.onOpen();
    const s = this.scene;
    const w = this.config.display.width;
    const h = this.config.display.height;
    const fixed = (o) => {
      o.setScrollFactor(0).setDepth(Z);
      this.objects.push(o);
      return o;
    };

    fixed(s.add.rectangle(0, 0, w, h, 0x0d0a08, 0.72).setOrigin(0));
    // Portrait and speech bubble
    fixed(s.add.image(70, 104, 'salesman').setOrigin(0.5, 1).setScale(4));
    fixed(s.add.rectangle(128, 28, w - 150, 40, BUBBLE_BG).setOrigin(0).setStrokeStyle(2, CARD_EDGE));
    fixed(s.add.triangle(128, 52, 0, 0, 0, 12, -12, 6, CARD_EDGE));
    this.speech = fixed(addPixelText(s, 138, 36, '').setTint(0xf6efe0));
    fixed(addPixelText(s, 128, 18, 'THE SALESMAN').setTint(hexToInt(P.shotRim)));
    this.say('greeting');

    const player = this.transport.getLocalPlayer();
    this.cards = {
      roll: this.makeCard(w / 2 - 140, 'roll', '1  MYSTERY ROLL', ['A RANDOM BUFF...', '...OR A CURSE.', `${Math.round(this.config.salesman.buffChance * 100)}% LUCK. NO REFUNDS.`], player),
      intel: this.makeCard(w / 2, 'intel', '2  GOSSIP', ['LEVEL, ROOM AND', 'EFFECTS OF EVERY', 'OTHER CASTAWAY.'], player),
      leave: this.makeCard(w / 2 + 140, 'leave', '3  LEAVE', ['BACK TO THE FIRE.', '', 'E OR ESC ALSO WORK.'], player),
    };
    fixed(addPixelText(s, w / 2, h - 12, 'ONE DEAL PER VISIT   1 / 2 / 3 OR CLICK').setOrigin(0.5).setAlpha(0.8));
    this.refreshCards();
  }

  /** One card: a container so it can flip as a whole. */
  makeCard(x, item, title, body, player) {
    const s = this.scene;
    const y = 180;
    const bg = s.add.rectangle(0, 0, CARD_W, CARD_H, CARD_BG).setStrokeStyle(2, CARD_EDGE);
    const titleText = addPixelText(s, 0, -CARD_H / 2 + 8, title).setOrigin(0.5, 0);
    const bodyText = addPixelText(s, 0, -14, body.join('\n')).setOrigin(0.5, 0).setCenterAlign().setAlpha(0.9);
    const priceText = addPixelText(s, 0, CARD_H / 2 - 14, '').setOrigin(0.5, 0);
    const card = s.add.container(x, y, [bg, titleText, bodyText, priceText]).setDepth(Z + 1);
    card.setScrollFactor(0, 0, true);
    bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => (item === 'leave' ? this.close() : this.choose(item)));
    this.objects.push(card);
    return { item, card, bg, titleText, bodyText, priceText, cost: item === 'leave' ? 0 : priceOf(this.config, item, player.level) };
  }

  /** Greys out what cannot be bought: sold this visit, or not enough XP (price in red). */
  refreshCards() {
    const player = this.transport.getLocalPlayer();
    const sold = this.transport.world.run.salesmanSold;
    for (const c of [this.cards.roll, this.cards.intel]) {
      if (c.flipped) continue;
      const afford = player.xp >= c.cost;
      const off = sold || !afford;
      c.priceText.setText(sold ? 'SOLD OUT' : `${c.cost} XP`).setTint(off ? hexToInt(P.enemyShot) : hexToInt(P.xpBar));
      // Greyed out, but opaque: a see-through card showed the room behind it.
      c.bg.setFillStyle(off ? CARD_BG_OFF : CARD_BG).setStrokeStyle(2, off ? 0x6e5f50 : CARD_EDGE);
      c.titleText.setAlpha(off ? 0.5 : 1);
      c.bodyText.setAlpha(off ? 0.4 : 0.9);
    }
  }

  /** @param {'roll'|'intel'} item */
  choose(item) {
    if (!this.isOpen || this.busy) return;
    const result = this.transport.sendAction({ type: 'buy', item });
    if (!result.ok) {
      this.say(result.reason === 'sold' ? 'refusalSold' : 'refusalXp');
      const c = this.cards[item];
      this.scene.tweens.add({ targets: c.card, x: c.card.x + 3, yoyo: true, repeat: 3, duration: 40 });
      return;
    }
    if (item === 'roll') this.flipCard(this.cards.roll, result.effectId);
    else this.showReport(result.report);
    this.refreshCards();
  }

  /** The mystery roll result: the card flips over to the effect (purple if it is a curse). */
  flipCard(c, effectId) {
    const def = EFFECTS[effectId];
    const curse = def.kind === 'debuff';
    this.busy = true;
    c.flipped = true;
    this.scene.tweens.add({
      targets: c.card,
      scaleX: 0,
      duration: 180,
      ease: 'Sine.easeIn',
      onComplete: () => {
        c.bg.setFillStyle(hexToInt(curse ? P.curseDark : BUFF_COLOR)).setStrokeStyle(2, hexToInt(curse ? P.curse : P.shotCore));
        c.titleText.setText(curse ? 'CURSED!' : 'LUCKY!');
        c.bodyText.setText(`${def.name}\n\n${wrapText(def.description, 24)}`).setAlpha(1);
        c.priceText.setText(curse ? 'BAD LUCK' : 'GOOD LUCK').setTint(0xffffff);
        this.scene.tweens.add({
          targets: c.card, scaleX: 1.05, scaleY: 1.05, duration: 200, ease: 'Back.easeOut',
          onComplete: () => { this.busy = false; },
        });
      },
    });
    this.say(curse ? 'debuffResult' : 'buffResult');
  }

  /** The gossip: one panel with every rival's level, room, buffs and curses. */
  showReport(rivals) {
    const s = this.scene;
    for (const c of Object.values(this.cards)) c.card.setVisible(false);
    const w = this.config.display.width;
    const fixed = (o) => {
      o.setScrollFactor(0).setDepth(Z + 2);
      this.objects.push(o);
      return o;
    };
    fixed(s.add.rectangle(w / 2, 180, w - 40, 112, CARD_BG).setStrokeStyle(2, CARD_EDGE));
    fixed(addPixelText(s, 30, 130, 'GOSSIP REPORT').setTint(hexToInt(P.shotRim)));
    rivals.forEach((r, i) => {
      const y = 144 + i * 26;
      const status = r.alive ? 'ON THE ISLAND' : 'WASHED OUT';
      fixed(addPixelText(s, 30, y, `${r.name}   LV ${r.level}   ROOM ${r.room}   ${status}`).setTint(r.alive ? 0xffffff : 0x8a8a8a));
      const buffs = r.buffs.map((id) => EFFECTS[id]?.name ?? id).join(', ') || 'NONE';
      const curses = r.debuffs.map((id) => EFFECTS[id]?.name ?? id).join(', ') || 'NONE';
      fixed(addPixelText(s, 38, y + 9, `BUFFS: ${buffs}`).setTint(hexToInt(P.xpBar)));
      fixed(addPixelText(s, 250, y + 9, `CURSES: ${curses}`).setTint(hexToInt(r.debuffs.length ? P.curse : '#8a8a8a')));
    });
    fixed(addPixelText(s, w - 30, 226, '3 / E / ESC  LEAVE').setOrigin(1, 0).setAlpha(0.8));
    this.say('saleIntel', { rivals });
  }

  /** Shows a line in the speech bubble. Async, so an LLM implementation can plug in. */
  say(kind, context = {}) {
    const request = ++this.lineRequest;
    this.lines.line(kind, context).then((text) => {
      if (this.isOpen && request === this.lineRequest) this.speech.setText(wrapText(text.toUpperCase(), 72));
    });
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.busy = false;
    for (const o of this.objects) {
      this.scene.tweens.killTweensOf(o);
      o.destroy();
    }
    this.objects = [];
    this.onClose();
  }
}
