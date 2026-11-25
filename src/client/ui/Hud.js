// Pixel-art HUD: XP bar across the top, level + hearts at the top left, round
// in the middle, match timer and kills at the top right, boss bar at the bottom,
// owned ability icons on the left, round / boss banners, and the end screen (lost or won).
// Online it also lists the other players (name, level, alive or out) under the timer.
import { addPixelText, toPixelText } from '../art/pixelFont.js';
import { PALETTE as P, hexToInt } from '../art/palette.js';
import { DEPTH } from '../systems/depth.js';
import { xpToNextLevel } from '../../shared/sim/systems/xp.js';

const MAX_HEARTS_DRAWN = 14;
const MARGIN = 4;
const BOSS_NAMES = { crabKing: 'CRAB KING', crabEmperor: 'CRAB EMPEROR' };

export class Hud {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} config - game config
   * @param {string} localPlayerId
   * @param {{ room?: { state: object } }} [online] - the Colyseus room, for the other players and the winner
   */
  constructor(scene, config, localPlayerId, { room = null } = {}) {
    this.scene = scene;
    this.config = config;
    this.localPlayerId = localPlayerId;
    this.room = room;
    /** @type {object[]} one text per other player (online) */
    this.rivalTexts = [];
    /** 'dead' | 'over' | 'won' | null: which end screen is showing */
    this.endKind = null;
    this.w = config.display.width;
    this.h = config.display.height;
    const fixed = (obj) => obj.setScrollFactor(0).setDepth(DEPTH.HUD);

    this.gfx = fixed(scene.add.graphics());
    this.levelText = fixed(addPixelText(scene, MARGIN, 10, 'LV 1'));
    this.roundText = fixed(addPixelText(scene, this.w / 2, 10, '').setOrigin(0.5, 0));
    this.timerText = fixed(addPixelText(scene, this.w - MARGIN, 10, '').setOrigin(1, 0));
    this.killsText = fixed(addPixelText(scene, this.w - MARGIN, 18, '').setOrigin(1, 0).setAlpha(0.85));
    this.bossText = fixed(addPixelText(scene, this.w / 2, this.h - 18, '').setOrigin(0.5, 0)).setVisible(false);
    this.hearts = [];
    this.heartShakeUntil = 0;

    this.banner = fixed(addPixelText(scene, this.w / 2, 70, '').setOrigin(0.5).setScale(2)).setAlpha(0);
    this.subBanner = fixed(addPixelText(scene, this.w / 2, 86, '').setOrigin(0.5)).setAlpha(0);
    /** @type {Map<string, { icon: object, text: object }>} owned abilities */
    this.abilityIcons = new Map();

    this.hint = fixed(addPixelText(scene, MARGIN, this.h - 10, 'WASD MOVE   SPACE ROLL   YOUR SLINGSHOT FIRES BY ITSELF'))
      .setAlpha(0.9);
    scene.tweens.add({ targets: this.hint, alpha: 0, delay: 9000, duration: 1500 });

    this.endScreen = null;
  }

  /** @param {import('../../shared/protocol.js').SimEvent[]} events */
  handle(events) {
    for (const e of events) {
      if (e.type === 'roundStarted') {
        const last = e.round === this.config.rounds.count;
        this.showBanner(`ROUND ${e.round}`, last ? 'FINAL ROUND - HOLD ON!' : 'THE TIDE RISES');
      } else if (e.type === 'bossSpawned') {
        const subtitle = e.enemyType === 'crabEmperor' ? 'ONE AGAINST ONE' : 'THE KING OF THE BEACH IS ANGRY';
        this.showBanner(`${BOSS_NAMES[e.enemyType]}!`, subtitle, P.enemyShot);
      } else if (e.type === 'finalBossIntro') {
        this.showBanner('TIME IS UP', 'THE BEACH GOES QUIET...', P.shotRim);
      } else if (e.type === 'wavesOver') {
        this.showBanner('TIME IS UP', 'YOU SURVIVED THE WAVES', P.shotRim);
      } else if (e.type === 'playerHit' && e.playerId === this.localPlayerId) {
        this.heartShakeUntil = this.scene.time.now + 250;
      }
    }
  }

  showBanner(title, subtitle, color = P.white) {
    this.scene.tweens.killTweensOf([this.banner, this.subBanner]);
    this.banner.setText(title).setTint(hexToInt(color)).setAlpha(1);
    this.subBanner.setText(subtitle).setAlpha(1);
    this.scene.tweens.add({ targets: [this.banner, this.subBanner], alpha: 0, delay: 1800, duration: 600 });
  }

  /**
   * @param {object} world
   * @param {import('../../shared/sim/entities/player.js').Player} player
   */
  update(world, player) {
    const g = this.gfx;
    g.clear();

    // XP bar (top, full width)
    const need = xpToNextLevel(player.level, this.config.xp.curve);
    const barW = this.w - MARGIN * 2;
    g.fillStyle(hexToInt(P.outline)).fillRect(MARGIN - 1, 1, barW + 2, 7);
    g.fillStyle(hexToInt(P.xpBarBack)).fillRect(MARGIN, 2, barW, 5);
    g.fillStyle(hexToInt(P.xpBar)).fillRect(MARGIN, 2, Math.floor((barW * player.xp) / need), 5);
    g.fillStyle(0xffffff, 0.35).fillRect(MARGIN, 2, Math.floor((barW * player.xp) / need), 1);
    this.levelText.setText(`LV ${player.level}`);

    // Hearts (2 half hearts each)
    const heartCount = Math.min(MAX_HEARTS_DRAWN, Math.ceil(player.maxHealth / 2));
    while (this.hearts.length < heartCount) {
      this.hearts.push(this.scene.add.image(0, 0, 'heart', 'full').setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.HUD));
    }
    const shaking = this.scene.time.now < this.heartShakeUntil;
    this.hearts.forEach((img, i) => {
      if (i >= heartCount) return img.setVisible(false);
      const filled = player.health - i * 2;
      img.setVisible(true).setFrame(filled >= 2 ? 'full' : filled === 1 ? 'half' : 'empty');
      const jitter = shaking ? Math.round(Math.sin(this.scene.time.now / 20 + i) * 1.5) : 0;
      img.setPosition(30 + i * 10 + jitter, 9);
    });

    // Owned abilities, in the order they were first picked
    Object.entries(player.abilities).forEach(([id, level], i) => {
      let view = this.abilityIcons.get(id);
      if (!view) {
        const y = 28 + i * 16;
        view = {
          icon: this.scene.add.image(MARGIN, y, `card-${id}`).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.HUD),
          text: addPixelText(this.scene, MARGIN + 15, y + 3, '').setScrollFactor(0).setDepth(DEPTH.HUD),
        };
        this.abilityIcons.set(id, view);
      }
      view.text.setText(String(level));
    });

    // Round, timer, kills
    const m = world.match;
    const waves = m.phase === 'waves';
    this.roundText.setText(waves ? `ROUND ${m.round}/${this.config.rounds.count}` : m.phase === 'wavesOver' ? 'TIME IS UP' : 'FINAL BOSS');
    this.timerText.setVisible(waves);
    const left = Math.max(0, this.config.match.durationSeconds - m.elapsed);
    const mm = String(Math.floor(left / 60)).padStart(2, '0');
    const ss = String(Math.floor(left % 60)).padStart(2, '0');
    this.timerText.setText(`${mm}:${ss}`).setTint(left <= 30 ? hexToInt(P.enemyShot) : 0xffffff);
    this.killsText.setText(`KILLS ${player.kills}`);

    // Boss health bar
    const boss = world.enemies.find((e) => e.boss && !e.dead && e.spawnDelay <= 0);
    this.bossText.setVisible(Boolean(boss));
    if (boss) {
      this.bossText.setText(BOSS_NAMES[boss.type]);
      const bw = 160;
      const bx = (this.w - bw) / 2;
      const by = this.h - 9;
      g.fillStyle(hexToInt(P.outline)).fillRect(bx - 1, by - 1, bw + 2, 6);
      g.fillStyle(hexToInt(P.heartEmpty)).fillRect(bx, by, bw, 4);
      g.fillStyle(hexToInt(P.bossBar)).fillRect(bx, by, Math.ceil((bw * boss.hp) / boss.maxHp), 4);
    }

    if (this.room) {
      this.updateRivals();
      this.updateOnlineEnd(world, player);
      return;
    }
    if (this.endScreen) return;
    if (!player.alive) this.showEnd(world, player, 'WASHED OUT', P.enemyShot, 'PRESS R TO TRY AGAIN');
    else if (m.phase === 'won') this.showEnd(world, player, 'YOU SURVIVED!', '#5dff8a', 'PRESS R TO PLAY AGAIN');
  }

  /** Online: one line per other player under the timer: name, level, or OUT. */
  updateRivals() {
    const others = [...this.room.state.players.entries()].filter(([id]) => id !== this.localPlayerId);
    while (this.rivalTexts.length < others.length) {
      const y = 28 + this.rivalTexts.length * 8;
      this.rivalTexts.push(addPixelText(this.scene, this.w - MARGIN, y, '').setOrigin(1, 0).setScrollFactor(0).setDepth(DEPTH.HUD));
    }
    this.rivalTexts.forEach((text, i) => {
      const entry = others[i];
      if (!entry) return text.setVisible(false);
      const [, p] = entry;
      const status = !p.connected ? 'LEFT' : p.alive ? `LV ${p.level}` : 'OUT';
      text.setVisible(true).setText(`${toPixelText(p.name)} ${status}`).setAlpha(p.alive ? 1 : 0.5)
        .setTint(p.alive ? 0xffffff : hexToInt(P.rock));
    });
  }

  /** Online end screens: out of the match (others play on), then the winner for everyone. */
  updateOnlineEnd(world, player) {
    const state = this.room.state;
    if (state.phase === 'over' && this.endKind !== 'over') {
      const winner = state.winnerId ? state.players.get(state.winnerId) : null;
      const mine = state.winnerId === this.localPlayerId;
      const heading = mine ? 'YOU WIN!' : winner ? `${toPixelText(winner.name)} WINS` : 'NOBODY WINS';
      this.clearEnd();
      this.showEnd(world, player, heading, mine ? '#5dff8a' : P.shotRim, 'PRESS R FOR THE MENU');
      this.endKind = 'over';
    } else if (!player.alive && !this.endKind) {
      this.showEnd(world, player, 'WASHED OUT', P.enemyShot, 'THE OTHERS PLAY ON - PRESS R FOR THE MENU');
      this.endKind = 'dead';
    }
  }

  clearEnd() {
    if (!this.endScreen) return;
    this.scene.tweens.killTweensOf(this.endScreen);
    for (const obj of this.endScreen) obj.destroy();
    this.endScreen = null;
  }

  showEnd(world, player, heading, color, hint) {
    const s = this.scene;
    const fixed = (obj) => obj.setScrollFactor(0).setDepth(DEPTH.HUD + 10);
    const dim = fixed(s.add.rectangle(0, 0, this.w, this.h, 0x0d0a08, 0.65).setOrigin(0));
    const title = fixed(addPixelText(s, this.w / 2, 90, heading).setOrigin(0.5).setScale(3)).setTint(hexToInt(color));
    const stats = fixed(
      addPixelText(s, this.w / 2, 120, `${world.match.phase === 'waves' ? `ROUND ${world.match.round}` : 'FINAL BOSS'}   LEVEL ${player.level}   KILLS ${player.kills}`).setOrigin(0.5),
    );
    const retry = fixed(addPixelText(s, this.w / 2, 140, hint).setOrigin(0.5));
    s.tweens.add({ targets: retry, alpha: 0.3, yoyo: true, repeat: -1, duration: 500 });
    this.endScreen = [dim, title, stats, retry];
  }
}
