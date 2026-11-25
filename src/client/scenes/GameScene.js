// The arena: survive the rounds on the beach clearing. WASD moves, Space rolls,
// the slingshot fires by itself at the nearest enemy.
// Solo: LocalTransport runs the simulation here; R restarts after the game ends.
// Online: ColyseusTransport draws what the server sends; R goes back to the menu.
import * as Phaser from 'phaser';
import { CONFIG } from '../../shared/config.js';
import { BEACH_ARENA } from '../../shared/content/arenas/beach.js';
import { LocalTransport } from '../network/LocalTransport.js';
import { MapView } from '../entities/MapView.js';
import { PlayerView } from '../entities/PlayerView.js';
import { EnemyViews } from '../entities/EnemyViews.js';
import { BulletViews } from '../entities/BulletViews.js';
import { AbilityViews } from '../entities/AbilityViews.js';
import { GemViews } from '../entities/GemViews.js';
import { InputSystem } from '../systems/InputSystem.js';
import { CameraSystem } from '../systems/CameraSystem.js';
import { EffectsSystem } from '../systems/EffectsSystem.js';
import { installEvidenceHotkey } from '../systems/evidence.js';
import { DEPTH } from '../systems/depth.js';
import { Hud } from '../ui/Hud.js';
import { CardScreen } from '../ui/CardScreen.js';
import { addPixelText } from '../art/pixelFont.js';
import { readDevOptions } from '../devOptions.js';
import { TILESET_KEY } from './BootScene.js';

/** Stand-in player for the card screen when no choice may be shown. */
const NO_CARD_CHOICE = Object.freeze({ cardChoice: null });

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  /**
   * @param {{ mode?: 'solo' | 'online', transport?: import('../network/ColyseusTransport.js').ColyseusTransport }} [data]
   */
  create(data = {}) {
    this.online = data.mode === 'online';
    if (this.online) {
      this.transport = data.transport;
      this.config = this.transport.config;
    } else {
      const { config, startRound, startCards, startAtBoss, seed } = readDevOptions(CONFIG, window.location.search);
      this.config = config;
      this.transport = new LocalTransport({ config, arena: BEACH_ARENA, seed, startRound, startCards, startAtBoss });
    }
    const config = this.config;
    const handHeight = config.player.handHeight;
    const world = this.transport.world;
    const localId = this.transport.localPlayerId;

    this.mapView = new MapView(this, world.map, TILESET_KEY);
    /** @type {Map<string, PlayerView>} */
    this.playerViews = new Map();
    this.enemyViews = new EnemyViews(this);
    this.bulletViews = new BulletViews(this, handHeight);
    this.gemViews = new GemViews(this);
    this.abilityViews = new AbilityViews(this, config);
    this.inputSystem = new InputSystem(this);
    this.cameraSystem = new CameraSystem(this, config.camera, world.map);
    this.effects = new EffectsSystem(this, {
      shotHeight: handHeight,
      localPlayerId: localId,
      shake: (ms, intensity) => this.cameraSystem.shake(ms, intensity),
    });
    const room = this.online ? this.transport.room : null;
    this.hud = new Hud(this, config, localId, { room });
    this.cardScreen = new CardScreen(this, config, { online: this.online });
    this.targetMark = this.add.image(0, 0, 'targetMark').setDepth(DEPTH.FX).setVisible(false);

    this.fpsText = addPixelText(this, config.display.width - 4, config.display.height - 10, '')
      .setOrigin(1, 0).setScrollFactor(0).setDepth(DEPTH.HUD).setAlpha(0.6);
    this.fpsTimer = 0;
    this.lastInput = { moveX: 0, moveY: 0, roll: false };

    this.input.keyboard.on('keydown-R', () => {
      const local = this.transport.getLocalPlayer();
      if (!local) return;
      const over = !local.alive || this.transport.world.match.phase === 'won' || room?.state.phase === 'over';
      if (!over) return;
      if (this.online) this.backToMenu();
      else this.scene.restart({ mode: 'solo' });
    });
    if (this.online) {
      // The server closed the room or the connection dropped (reconnecting is step 6).
      this.onRoomLeave = () => this.scene.start('Lobby', { error: 'Disconnected from the game server.' });
      room.onLeave(this.onRoomLeave);
      this.events.once('shutdown', () => room.onLeave.remove(this.onRoomLeave));
    }
    installEvidenceHotkey(this, this.online ? 'm5-online' : 'm3-final-boss');
    if (import.meta.env.DEV) window.__scene = this; // for debugging in the console
  }

  update(_time, deltaMs) {
    const dt = deltaMs / 1000;

    // 1. Input -> simulation
    const input = { ...this.inputSystem.read(), pick: this.cardScreen.takePick() };
    this.lastInput = input;
    this.transport.update(deltaMs, input);

    // 2. Simulation -> visuals (online: nothing to draw until the first snapshot)
    const world = this.transport.world;
    const alpha = this.transport.alpha;
    const local = this.transport.getLocalPlayer();
    if (!local) return;
    const room = this.online ? this.transport.room : null;
    for (const p of world.players) {
      let view = this.playerViews.get(p.id);
      if (!view) {
        view = new PlayerView(this, this.config.player);
        this.playerViews.set(p.id, view);
      }
      view.update(p, alpha, dt, world.time);
    }
    this.enemyViews.sync(world.enemies, alpha, world.time);
    this.bulletViews.sync(world.bullets, alpha);
    this.gemViews.sync(world.gems, alpha, world.time);
    this.abilityViews.sync(world, alpha, this.transport.renderTime);

    const events = this.transport.drainEvents();
    this.mapView.handle(events);
    this.effects.handle(events);
    this.hud.handle(events);
    this.hud.update(world, local);
    // No cards once you are out or the match is decided (online the last snapshot can still hold one).
    const choosing = local.alive && room?.state.phase !== 'over';
    this.cardScreen.update(choosing ? local : NO_CARD_CHOICE, world.time);

    // 3. Auto-aim target marker
    const target = local.targetId != null ? world.enemies.find((e) => e.id === local.targetId) : null;
    if (target && !target.dead) {
      const c = this.enemyViews.bodyCenter(target, alpha);
      this.targetMark.setVisible(true).setPosition(c.x, c.y).setScale(Math.max(1, Math.round(target.radius / 5)));
    } else {
      this.targetMark.setVisible(false);
    }

    // 4. Camera
    const px = local.prevX + (local.x - local.prevX) * alpha;
    const py = local.prevY + (local.y - local.prevY) * alpha;
    this.cameraSystem.update(px, py, input.moveX, input.moveY, dt);

    this.fpsTimer -= dt;
    if (this.fpsTimer <= 0) {
      this.fpsTimer = 0.25;
      this.fpsText.setText(`FPS ${Math.round(this.game.loop.actualFps)}  ${world.enemies.length}`);
    }
  }

  /** Online: leave the room and return to the start menu. */
  backToMenu() {
    this.transport.room.onLeave.remove(this.onRoomLeave);
    this.transport.leave();
    this.scene.start('Lobby');
  }
}
