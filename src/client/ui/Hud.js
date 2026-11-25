// Pixel-art HUD: XP bar across the top, level + hearts at the top left with the
// active effect icons under them (debuffs purple), the room in the middle, match
// timer and kills at the top right, boss bar at the bottom, banners (room,
// cleared, danger, boss, level-up), the "E" prompt in break rooms, and the
// game-over and PvE-over screens.
import { addPixelText } from '../art/pixelFont.js';
import { PALETTE as P, hexToInt } from '../art/palette.js';
import { DEPTH } from '../systems/depth.js';
import { xpToNextLevel } from '../../shared/sim/systems/xp.js';
import { priceOf, nearbyInteractable } from '../../shared/sim/systems/breakRoom.js';
import { EFFECTS } from '../../shared/content/effects/index.js';

const MAX_HEARTS_DRAWN = 10;
const MARGIN = 4;
/** Background of buff icons. Debuffs use PALETTE.curse (purple = curses only). */
const BUFF_COLOR = '#2f8f7a';
const GREY = 0x8a8a8a;

export class Hud {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} config - game config
   * @param {string} localPlayerId
   */
  constructor(scene, config, localPlayerId) {
    this.scene = scene;
    this.config = config;
    this.localPlayerId = localPlayerId;
    this.w = config.display.width;
    this.h = config.display.height;
    const fixed = (obj) => obj.setScrollFactor(0).setDepth(DEPTH.HUD);

    this.gfx = fixed(scene.add.graphics());
    this.levelText = fixed(addPixelText(scene, MARGIN, 10, 'LV 1'));
    this.roomText = fixed(addPixelText(scene, this.w / 2, 10, '').setOrigin(0.5, 0));
    this.timerText = fixed(addPixelText(scene, this.w - MARGIN, 10, '').setOrigin(1, 0));
    this.killsText = fixed(addPixelText(scene, this.w - MARGIN, 18, '').setOrigin(1, 0).setAlpha(0.85));
    this.bossText = fixed(addPixelText(scene, this.w / 2, this.h - 18, '').setOrigin(0.5, 0)).setVisible(false);
    this.hearts = [];
    this.heartShakeUntil = 0;
    /** Effect icons: { icon, count } pairs, reused. */
    this.effectIcons = [];

    this.banner = fixed(addPixelText(scene, this.w / 2, 70, '').setOrigin(0.5).setScale(2)).setAlpha(0);
    this.subBanner = fixed(addPixelText(scene, this.w / 2, 86, '').setOrigin(0.5)).setAlpha(0);
    this.levelUpText = fixed(addPixelText(scene, this.w / 2, 112, 'LEVEL UP!').setOrigin(0.5).setScale(2))
      .setTint(hexToInt(P.xpBar)).setAlpha(0);
    this.toast = fixed(addPixelText(scene, this.w / 2, this.h - 34, '').setOrigin(0.5)).setAlpha(0);

    // "E" prompt, in the world, above the campfire or the Salesman.
    this.prompt = addPixelText(scene, 0, 0, '').setOrigin(0.5, 1).setDepth(DEPTH.FX + 1).setVisible(false);

    this.hint = fixed(addPixelText(scene, MARGIN, this.h - 10, 'WASD MOVE   SPACE ROLL   CLEAR THE ROOM TO OPEN THE DOORS'))
      .setAlpha(0.9);
    scene.tweens.add({ targets: this.hint, alpha: 0, delay: 9000, duration: 1500 });

    this.gameOver = null;
  }

  /** @param {import('../../shared/protocol.js').SimEvent[]} events */
  handle(events) {
    for (const e of events) {
      const mine = e.playerId === this.localPlayerId;
      switch (e.type) {
        case 'roomEntered':
          if (e.kind === 'break') this.showBanner('BREAK ROOM', 'REST BY THE FIRE. THE SALESMAN IS WATCHING.', P.shotRim);
          else if (e.danger) this.showBanner(`ROOM ${e.number}`, 'DANGER RISES', P.enemyShot);
          else this.showBanner(`ROOM ${e.number}`, e.boss ? 'SOMETHING BIG IS COMING' : 'CLEAR THE ROOM');
          break;
        case 'roomCleared':
          this.showBanner('ROOM CLEARED', 'PICK A DOOR', P.xpBar);
          break;
        case 'bossSpawned':
          this.showBanner('CRAB KING!', 'THE KING OF THE BEACH IS ANGRY', P.enemyShot);
          this.hint.setAlpha(0); // the boss bar takes the bottom of the screen
          break;
        case 'levelUp':
          if (!mine) break;
          this.levelUpText.setText(`LEVEL ${e.level}!`).setAlpha(1).setY(112);
          this.scene.tweens.add({ targets: this.levelUpText, alpha: 0, y: 100, delay: 600, duration: 500 });
          break;
        case 'playerHit':
          if (mine) this.heartShakeUntil = this.scene.time.now + 250;
          break;
        case 'rested':
          if (mine) this.showToast(`+${this.config.breakRoom.healAmount / 2} HEART   -${e.cost} XP`, P.xpBar);
          break;
        case 'actionRefused':
          if (mine && e.action === 'rest') this.showToast(e.reason === 'full' ? 'ALREADY AT FULL HEALTH' : 'NOT ENOUGH XP', P.enemyShot);
          break;
        case 'effectExpired':
          if (mine && EFFECTS[e.effectId]) this.showToast(`${EFFECTS[e.effectId].name} WORE OFF`);
          break;
        default:
      }
    }
  }

  showBanner(title, subtitle, color = P.white) {
    this.scene.tweens.killTweensOf([this.banner, this.subBanner]);
    this.banner.setText(title).setTint(hexToInt(color)).setAlpha(1);
    this.subBanner.setText(subtitle).setAlpha(1);
    this.scene.tweens.add({ targets: [this.banner, this.subBanner], alpha: 0, delay: 1800, duration: 600 });
  }

  showToast(text, color = P.white) {
    this.scene.tweens.killTweensOf(this.toast);
    this.toast.setText(text).setTint(hexToInt(color)).setAlpha(1);
    this.scene.tweens.add({ targets: this.toast, alpha: 0, delay: 1400, duration: 500 });
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
    const fill = Math.floor((barW * Math.min(player.xp, need)) / need);
    g.fillStyle(hexToInt(P.outline)).fillRect(MARGIN - 1, 1, barW + 2, 7);
    g.fillStyle(hexToInt(P.xpBarBack)).fillRect(MARGIN, 2, barW, 5);
    g.fillStyle(hexToInt(P.xpBar)).fillRect(MARGIN, 2, fill, 5);
    g.fillStyle(0xffffff, 0.35).fillRect(MARGIN, 2, fill, 1);
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

    this.drawEffects(g, player, world);

    // Room, timer, kills
    const room = world.run.room;
    if (room) {
      const label = room.kind === 'break' ? 'BREAK' : `ROOM ${room.number}`;
      this.roomText.setText(room.cleared && room.kind === 'fight' ? `${label} - CLEARED` : label);
    }
    const left = Math.max(0, this.config.match.durationSeconds - world.match.elapsed);
    const mm = String(Math.floor(left / 60)).padStart(2, '0');
    const ss = String(Math.floor(left % 60)).padStart(2, '0');
    this.timerText.setText(`${mm}:${ss}`).setTint(left <= 30 ? hexToInt(P.enemyShot) : 0xffffff);
    this.killsText.setText(`KILLS ${player.kills}`);

    // Boss health bar
    const boss = world.enemies.find((e) => e.boss && !e.dead && e.spawnDelay <= 0);
    this.bossText.setVisible(Boolean(boss));
    if (boss) {
      this.bossText.setText('CRAB KING');
      const bw = 160;
      const bx = (this.w - bw) / 2;
      const by = this.h - 9;
      g.fillStyle(hexToInt(P.outline)).fillRect(bx - 1, by - 1, bw + 2, 6);
      g.fillStyle(hexToInt(P.heartEmpty)).fillRect(bx, by, bw, 4);
      g.fillStyle(hexToInt(P.bossBar)).fillRect(bx, by, Math.ceil((bw * boss.hp) / boss.maxHp), 4);
    }

    this.updatePrompt(world, player);

    if (!player.alive && !this.gameOver) this.showGameOver(world, player);
    if (world.run.pveOver && player.alive && !this.gameOver) this.showPveOver(world, player);
  }

  /** Active effects as small squares under the hearts: teal = buff, purple = curse. */
  drawEffects(g, player, world) {
    // Rooms left, counting the current room only if it is a fight room.
    const here = world.run.room?.kind === 'fight' ? 1 : 0;
    const y = 19;
    player.effects.forEach((e, i) => {
      const def = EFFECTS[e.id];
      if (!def) return;
      let slot = this.effectIcons[i];
      if (!slot) {
        const fixed = (o) => o.setScrollFactor(0).setDepth(DEPTH.HUD + 1);
        slot = { icon: fixed(this.scene.add.image(0, 0, 'effect-speed').setOrigin(0)), count: fixed(addPixelText(this.scene, 0, 0, '')) };
        this.effectIcons[i] = slot;
      }
      const x = 30 + i * 18;
      g.fillStyle(hexToInt(P.outline)).fillRect(x - 1, y - 1, 11, 11);
      g.fillStyle(hexToInt(def.kind === 'debuff' ? P.curse : BUFF_COLOR)).fillRect(x, y, 9, 9);
      slot.icon.setTexture(`effect-${def.icon}`).setPosition(x + 1, y + 1).setVisible(true);
      const left = e.roomsLeft !== null ? String(e.roomsLeft + here) : e.secondsLeft !== null ? String(Math.ceil(e.secondsLeft)) : '';
      slot.count.setText(left).setPosition(x + 10, y + 2).setVisible(left !== '');
    });
    for (let i = player.effects.length; i < this.effectIcons.length; i++) {
      this.effectIcons[i].icon.setVisible(false);
      this.effectIcons[i].count.setVisible(false);
    }
  }

  /** "E REST" / "E TALK" above whatever the player could use, greyed out with the price if unaffordable. */
  updatePrompt(world, player) {
    const target = nearbyInteractable(world, player);
    if (!target) {
      this.prompt.setVisible(false);
      return;
    }
    const m = world.map.markers[target];
    let text = 'E  TALK';
    let usable = true;
    if (target === 'campfire') {
      const cost = priceOf(this.config, 'rest', player.level);
      const full = player.health >= player.maxHealth;
      usable = !full && player.xp >= cost;
      text = full ? 'FULL HEALTH' : `E  REST  ${cost} XP`;
    }
    this.prompt.setText(text).setPosition(Math.round(m.x), Math.round(m.y - 14)).setVisible(true)
      .setTint(usable ? 0xffffff : GREY);
  }

  showGameOver(world, player) {
    const s = this.scene;
    const fixed = (obj) => obj.setScrollFactor(0).setDepth(DEPTH.HUD + 10);
    const dim = fixed(s.add.rectangle(0, 0, this.w, this.h, 0x0d0a08, 0.65).setOrigin(0));
    const title = fixed(addPixelText(s, this.w / 2, 90, 'WASHED OUT').setOrigin(0.5).setScale(3)).setTint(hexToInt(P.enemyShot));
    const room = world.run.room ? `ROOM ${world.run.room.number}` : '';
    const stats = fixed(addPixelText(s, this.w / 2, 120, `${room}   LEVEL ${player.level}   KILLS ${player.kills}`).setOrigin(0.5));
    const retry = fixed(addPixelText(s, this.w / 2, 140, 'PRESS R TO TRY AGAIN').setOrigin(0.5));
    s.tweens.add({ targets: retry, alpha: 0.3, yoyo: true, repeat: -1, duration: 500 });
    this.gameOver = [dim, title, stats, retry];
  }

  /** The match clock ran out while alive. The final PvP replaces this in milestone 8. */
  showPveOver(world, player) {
    const s = this.scene;
    const fixed = (obj) => obj.setScrollFactor(0).setDepth(DEPTH.HUD + 10);
    const dim = fixed(s.add.rectangle(0, 0, this.w, this.h, 0x0d0a08, 0.55).setOrigin(0));
    const title = fixed(addPixelText(s, this.w / 2, 84, "TIME'S UP").setOrigin(0.5).setScale(3)).setTint(hexToInt(P.shotRim));
    const sub = fixed(addPixelText(s, this.w / 2, 106, 'THE RESCUE BOAT IS HERE... THE FINAL FIGHT COMES LATER').setOrigin(0.5));
    const stats = fixed(addPixelText(s, this.w / 2, 122, `REACHED ROOM ${world.run.depth + 1}   LEVEL ${player.level}   KILLS ${player.kills}`).setOrigin(0.5));
    const retry = fixed(addPixelText(s, this.w / 2, 142, 'PRESS R TO PLAY AGAIN').setOrigin(0.5));
    s.tweens.add({ targets: retry, alpha: 0.3, yoyo: true, repeat: -1, duration: 500 });
    this.gameOver = [dim, title, sub, stats, retry];
  }
}
