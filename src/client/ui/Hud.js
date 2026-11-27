// Pixel-art HUD: XP bar across the top, level + hearts at the top left, round
// in the middle, match timer, kills and coins at the top right, boss bar at the bottom,
// owned ability icons on the left, round / boss banners, and the end screen (lost or won).
// Online it also lists the other players (name, round, level, or out) under the coins,
// and says so when you have finished your waves and the others are still playing.
import { addPixelText, toPixelText } from '../art/pixelFont.js';
import { PALETTE as P, hexToInt } from '../art/palette.js';
import { DEPTH } from '../systems/depth.js';
import { GFX } from '../gfx/flags.js';
import { xpToNextLevel } from '../../shared/sim/systems/xp.js';
import { watchablePlayers, watchLabel } from '../network/spectatorList.js';

const MAX_HEARTS_DRAWN = 14;
const MARGIN = 4;
const VICTORY_DELAY_MS = 2600;
const BOSS_NAMES = { crabKing: 'CRAB KING', crabEmperor: 'CRAB EMPEROR' };
/** Online: where the list of other players starts (under the timer, kills and coins). */
const RIVALS_TOP = 40;

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
    /** Whose island is on screen: ours, or (online, once out) the player we watch. */
    this.viewedPlayerId = localPlayerId;
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
    this.coinIcon = fixed(scene.add.image(this.w - 8, 31, 'coin', '0'));
    this.coinText = fixed(addPixelText(scene, this.w - 14, 28, '').setOrigin(1, 0)).setTint(hexToInt('#ffd23a'));
    this.bossText = fixed(addPixelText(scene, this.w / 2, this.h - 18, '').setOrigin(0.5, 0)).setVisible(false);
    this.hearts = [];
    this.heartShakeUntil = 0;

    this.banner = fixed(addPixelText(scene, this.w / 2, 70, '').setOrigin(0.5).setScale(2)).setAlpha(0);
    this.subBanner = fixed(addPixelText(scene, this.w / 2, 86, '').setOrigin(0.5)).setAlpha(0);
    /** @type {Map<string, { icon: object, text: object }>} owned abilities */
    this.abilityIcons = new Map();

    this.hint = fixed(addPixelText(scene, MARGIN, this.h - 10, 'WASD MOVE   SPACE ROLL   E TALK   ESC PAUSE'))
      .setAlpha(0.9);
    scene.tweens.add({ targets: this.hint, alpha: 0, delay: 9000, duration: 1500 });

    this.endScreen = null;
    this.wonAt = null;
    this.bossGhost = { id: null, hp: 0 };
  }

  /** @param {import('../../shared/protocol.js').SimEvent[]} events */
  handle(events) {
    for (const e of events) {
      if (e.type === 'roundStarted') {
        const last = e.round === this.config.rounds.count;
        this.showBanner(`ROUND ${e.round}`, last ? 'FINAL ROUND - HOLD ON!' : 'THE TIDE RISES');
      } else if (e.type === 'bossSpawned' && GFX.boss && e.enemyType === 'crabEmperor') {
        // The entrance card (gfx/boss.js) introduces it instead of a banner.
        this.showBanner('', '');
      } else if (e.type === 'bossSpawned') {
        const subtitle = e.enemyType === 'crabEmperor' ? 'ONE AGAINST ONE' : 'THE KING OF THE BEACH IS ANGRY';
        this.showBanner(`${BOSS_NAMES[e.enemyType]}!`, subtitle, P.enemyShot);
      } else if (e.type === 'finalBossIntro') {
        this.showBanner('TIME IS UP', 'THE BEACH GOES QUIET...', P.shotRim);
      } else if (e.type === 'wavesOver') {
        this.showBanner('TIME IS UP', 'YOU SURVIVED THE WAVES', P.shotRim);
      } else if (e.type === 'playerHit' && e.playerId === this.viewedPlayerId) {
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
   * @param {import('../../shared/sim/entities/player.js').Player} player - the player on screen
   * @param {{ spectating?: boolean }} [view] - online: true while watching another player's island
   */
  update(world, player, { spectating = false } = {}) {
    const g = this.gfx;
    g.clear();
    if (GFX.hud) this.drawPanels(g, player);

    // XP bar (top, full width)
    const need = xpToNextLevel(player.level, this.config.xp.curve);
    const barW = this.w - MARGIN * 2;
    g.fillStyle(hexToInt(P.outline)).fillRect(MARGIN - 1, 1, barW + 2, 7);
    g.fillStyle(hexToInt(P.xpBarBack)).fillRect(MARGIN, 2, barW, 5);
    g.fillStyle(hexToInt(P.xpBar)).fillRect(MARGIN, 2, Math.floor((barW * player.xp) / need), 5);
    g.fillStyle(0xffffff, 0.35).fillRect(MARGIN, 2, Math.floor((barW * player.xp) / need), 1);
    if (GFX.hud) {
      const filled = Math.floor((barW * player.xp) / need);
      g.fillStyle(0x1f9fd0).fillRect(MARGIN, 5, filled, 2);
      for (let k = 1; k < 10; k++) g.fillStyle(0x0d1a22, 0.8).fillRect(MARGIN + Math.round((barW * k) / 10), 2, 1, 5);
      const shine = (Math.floor(this.scene.time.now / 8) % (barW + 60)) - 30;
      if (shine > 0 && shine < filled - 3) g.fillStyle(0xffffff, 0.7).fillRect(MARGIN + shine, 2, 3, 3);
      if (filled > 0) g.fillStyle(0xffffff, 0.9).fillRect(MARGIN + filled - 1, 2, 1, 5);
    }
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
      view.text.setText(GFX.hud ? '' : String(level)); // pips show the level instead
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
    this.coinText.setText(String(player.coins));

    // Boss health bar
    const boss = world.enemies.find((e) => e.boss && !e.dead && e.spawnDelay <= 0);
    this.bossText.setVisible(Boolean(boss));
    this.hint.setVisible(!boss); // the boss bar needs the space
    if (boss && GFX.boss) {
      this.drawBossBar(g, boss);
    } else if (boss) {
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
      this.updateOnlineEnd(world, player, spectating);
      this.updateWatchBar(spectating);
      return;
    }
    if (this.endScreen) return;
    if (!player.alive) this.showEnd(world, player, 'WASHED OUT', P.enemyShot, 'R  TRY AGAIN     M  MENU');
    else if (m.phase === 'won' && this.victoryIsDue()) this.showEnd(world, player, 'YOU SURVIVED!', '#5dff8a', 'R  PLAY AGAIN     M  MENU');
  }

  /** The victory screen waits for the boss's death sequence. */
  victoryIsDue() {
    this.wonAt ??= this.scene.time.now;
    return this.scene.time.now - this.wonAt > (GFX.boss ? VICTORY_DELAY_MS : 0);
  }

  /** Framed boss bar with a white trail that catches up with the damage. */
  drawBossBar(g, boss) {
    const second = boss.type === 'crabEmperor' && boss.hp <= boss.maxHp / 2;
    this.bossText.setText(BOSS_NAMES[boss.type] + (second ? '  - II -' : '')).setTint(0xf0c040).setY(this.h - 21);
    const ghost = this.bossGhost;
    if (ghost.id !== boss.id) Object.assign(ghost, { id: boss.id, hp: boss.hp });
    ghost.hp = Math.max(boss.hp, ghost.hp + (boss.hp - ghost.hp) * 0.04);
    const bw = 200;
    const bx = (this.w - bw) / 2;
    const by = this.h - 11;
    const px = (hp) => Math.ceil((bw * Math.max(0, hp)) / boss.maxHp);
    g.fillStyle(0x0d0a08, 0.75).fillRect(bx - 6, by - 13, bw + 12, 22);
    g.fillStyle(0xb8862a).fillRect(bx - 6, by - 13, bw + 12, 1).fillRect(bx - 6, by + 8, bw + 12, 1);
    g.fillStyle(0x1a1212).fillRect(bx - 1, by - 1, bw + 2, 7);
    g.fillStyle(0x3a1414).fillRect(bx, by, bw, 5);
    g.fillStyle(0xffffff, 0.85).fillRect(bx, by, px(ghost.hp), 5);
    g.fillStyle(0xc8322a).fillRect(bx, by, px(boss.hp), 5);
    g.fillStyle(0xff6a4a).fillRect(bx, by, px(boss.hp), 1);
    g.fillStyle(0xf0c040).fillRect(bx + bw / 2, by - 2, 1, 9); // phase notch
  }

  /** Dark glass plates, the wooden round sign and framed ability slots with level pips. */
  drawPanels(g, player) {
    const plate = (x, y, w, h) => {
      g.fillStyle(0x0d0a08, 0.62).fillRect(x + 1, y, w - 2, h).fillRect(x, y + 1, w, h - 2);
      g.fillStyle(0xffffff, 0.12).fillRect(x + 1, y, w - 2, 1);
      g.fillStyle(0x000000, 0.35).fillRect(x + 1, y + h - 1, w - 2, 1);
    };
    const heartCount = Math.min(MAX_HEARTS_DRAWN, Math.ceil(player.maxHealth / 2));
    plate(1, 8, 30 + heartCount * 10 + 3, 13);
    g.fillStyle(0x1f6f8b).fillRect(2, 9, 25, 11); // level chip
    g.fillStyle(0x4de1ff, 0.6).fillRect(2, 9, 25, 1);
    plate(this.w - 46, 8, 45, 29);
    const rx = this.w / 2 - 33;
    g.fillStyle(0x1a1212).fillRect(rx - 1, 7, 68, 13);
    g.fillStyle(0xa0612d).fillRect(rx, 8, 66, 11);
    g.fillStyle(0xc88a50).fillRect(rx, 8, 66, 1);
    g.fillStyle(0x6e3d1a).fillRect(rx, 13, 66, 1).fillRect(rx, 18, 66, 1);
    g.fillStyle(0x4a4a55);
    for (const [nx, ny] of [[2, 10], [63, 10], [2, 16], [63, 16]]) g.fillRect(rx + nx, ny, 1, 1);
    Object.entries(player.abilities).forEach(([id, level], i) => {
      const y = 27 + i * 16;
      g.fillStyle(0x1a1212).fillRect(1, y - 1, 18, 17);
      g.fillStyle(0x2a1f1a, 0.9).fillRect(2, y, 16, 15);
      g.fillStyle(0xc88a50).fillRect(2, y, 16, 1);
      const max = this.config.abilities[id].maxLevel;
      for (let k = 0; k < max; k++) {
        g.fillStyle(0x1a1212).fillRect(20 + k * 4, y + 5, 4, 4);
        g.fillStyle(k < level ? 0xffd23a : 0x4a3a3a).fillRect(21 + k * 4, y + 6, 2, 2);
      }
    });
  }

  /** Online: one line per other player: name, their own round and level, or OUT / LEFT / DONE. */
  updateRivals() {
    const others = [...this.room.state.players.entries()].filter(([id]) => id !== this.localPlayerId);
    while (this.rivalTexts.length < others.length) {
      const y = RIVALS_TOP + this.rivalTexts.length * 8;
      this.rivalTexts.push(addPixelText(this.scene, this.w - MARGIN, y, '').setOrigin(1, 0).setScrollFactor(0).setDepth(DEPTH.HUD));
    }
    this.rivalTexts.forEach((text, i) => {
      const entry = others[i];
      if (!entry) return text.setVisible(false);
      const [, p] = entry;
      const status = !p.connected ? 'LEFT' : !p.alive ? 'OUT' : p.bossBeaten ? `LV ${p.level} DONE` : `R${p.round} LV ${p.level}`;
      text.setVisible(true).setText(`${toPixelText(p.name)} ${status}`).setAlpha(p.alive ? 1 : 0.5)
        .setTint(p.alive ? 0xffffff : hexToInt(P.rock));
    });
  }

  /**
   * Online end screens: out, or boss beaten, while the others play on (every island has
   * its own clock); then the winner for everyone once every run is over.
   */
  updateOnlineEnd(world, player, spectating) {
    const state = this.room.state;
    if (spectating && state.phase !== 'over') {
      // Watching someone: their island, no end screen over it.
      if (this.endKind === 'dead' || this.endKind === 'won') this.clearEnd();
      this.endKind = 'watching';
      return;
    }
    if (state.phase === 'over' && this.endKind !== 'over') {
      const winner = state.winnerId ? state.players.get(state.winnerId) : null;
      const mine = state.winnerId === this.localPlayerId;
      const heading = mine ? 'YOU WIN!' : winner ? `${toPixelText(winner.name)} WINS` : 'NOBODY WINS';
      this.clearEnd();
      // Watching someone when it ended: show our own run's numbers, from the summary.
      const me = state.players.get(this.localPlayerId);
      const ownWorld = spectating && me ? { match: { phase: me.bossBeaten ? 'won' : 'waves', round: me.round } } : world;
      const ownPlayer = spectating && me ? { level: me.level, kills: me.kills } : player;
      this.showEnd(ownWorld, ownPlayer, heading, mine ? '#5dff8a' : P.shotRim, 'PRESS R FOR THE MENU');
      this.endKind = 'over';
    } else if (!player.alive && !this.endKind) {
      const others = watchablePlayers(state.players, this.localPlayerId).length > 0;
      this.showEnd(world, player, 'WASHED OUT', P.enemyShot, others ? 'SOON YOU WATCH THE OTHERS - R FOR THE MENU' : 'THE OTHERS PLAY ON - PRESS R FOR THE MENU');
      this.endKind = 'dead';
    } else if (world.match.phase === 'won' && !this.endKind && this.victoryIsDue()) {
      this.showEnd(world, player, 'YOU SURVIVED!', '#5dff8a', 'WAITING FOR THE OTHERS - PRESS R FOR THE MENU');
      this.endKind = 'won';
    }
  }

  /** Online, while watching: "WATCHING ANA 2/3  Q < > E  M MENU" under the round sign. */
  updateWatchBar(spectating) {
    const show = spectating && this.room.state.phase !== 'over';
    if (!this.watchBar) {
      const fixed = (obj) => obj.setScrollFactor(0).setDepth(DEPTH.HUD);
      this.watchPlate = fixed(this.scene.add.rectangle(this.w / 2, 30, 10, 11, 0x0d0a08, 0.75));
      this.watchBar = fixed(addPixelText(this.scene, this.w / 2, 27, '').setOrigin(0.5, 0));
    }
    this.watchPlate.setVisible(show);
    this.watchBar.setVisible(show);
    if (!show) return;
    const players = this.room.state.players;
    const name = toPixelText(players.get(this.viewedPlayerId)?.name ?? '?');
    const list = watchablePlayers(players, this.localPlayerId).map((p) => ({ ...p, name: toPixelText(p.name) }));
    this.watchBar.setText(watchLabel(list, this.viewedPlayerId, name));
    this.watchPlate.setSize(this.watchBar.width + 8, 11);
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
