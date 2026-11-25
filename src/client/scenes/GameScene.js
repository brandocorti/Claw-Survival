// Solo PvE: survive the rounds on the beach clearing. WASD moves, Space rolls,
// the slingshot fires by itself at the nearest enemy. R restarts after death.
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

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    const { config, startRound, startCards, seed } = readDevOptions(CONFIG, window.location.search);
    this.config = config;
    const handHeight = config.player.handHeight;
    this.transport = new LocalTransport({ config, arena: BEACH_ARENA, seed, startRound, startCards });
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
    this.hud = new Hud(this, config, localId);
    this.cardScreen = new CardScreen(this, config);
    this.targetMark = this.add.image(0, 0, 'targetMark').setDepth(DEPTH.FX).setVisible(false);

    this.fpsText = addPixelText(this, config.display.width - 4, config.display.height - 10, '')
      .setOrigin(1, 0).setScrollFactor(0).setDepth(DEPTH.HUD).setAlpha(0.6);
    this.fpsTimer = 0;
    this.lastInput = { moveX: 0, moveY: 0, roll: false };

    this.input.keyboard.on('keydown-R', () => {
      if (!this.transport.getLocalPlayer().alive) this.scene.restart();
    });
    installEvidenceHotkey(this, 'm3-cards');
    if (import.meta.env.DEV) window.__scene = this; // for debugging in the console
  }

  update(_time, deltaMs) {
    const dt = deltaMs / 1000;

    // 1. Input -> simulation
    const input = { ...this.inputSystem.read(), pick: this.cardScreen.takePick() };
    this.lastInput = input;
    this.transport.update(deltaMs, input);

    // 2. Simulation -> visuals
    const world = this.transport.world;
    const alpha = this.transport.alpha;
    const local = this.transport.getLocalPlayer();
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
    this.effects.handle(events);
    this.hud.handle(events);
    this.hud.update(world, local);
    this.cardScreen.update(local);

    // 3. Auto-aim target marker
    const target = local.targetId != null ? world.enemies.find((e) => e.id === local.targetId) : null;
    if (target && !target.dead) {
      const c = this.enemyViews.bodyCenter(target, alpha);
      this.targetMark.setVisible(true).setPosition(c.x, c.y).setScale(target.boss ? 2 : 1);
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
}
