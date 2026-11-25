// Solo PvE: a run of rooms. Clear a fight room to open its doors, walk through
// one, rest and trade with the Salesman in break rooms. WASD moves, Space rolls,
// E interacts; the slingshot fires by itself. R restarts after death or time-up.
import * as Phaser from 'phaser';
import { CONFIG } from '../../shared/config.js';
import { LocalTransport } from '../network/LocalTransport.js';
import { MapView } from '../entities/MapView.js';
import { PlayerView } from '../entities/PlayerView.js';
import { EnemyViews } from '../entities/EnemyViews.js';
import { BulletViews } from '../entities/BulletViews.js';
import { GemViews } from '../entities/GemViews.js';
import { InputSystem } from '../systems/InputSystem.js';
import { CameraSystem } from '../systems/CameraSystem.js';
import { EffectsSystem } from '../systems/EffectsSystem.js';
import { installEvidenceHotkey } from '../systems/evidence.js';
import { DEPTH } from '../systems/depth.js';
import { Hud } from '../ui/Hud.js';
import { SalesmanMenu } from '../ui/SalesmanMenu.js';
import { addPixelText } from '../art/pixelFont.js';
import { readDevOptions } from '../devOptions.js';
import { FixedSalesmanLines } from '../../shared/dialogue/SalesmanLines.js';
import { killEnemy } from '../../shared/sim/systems/damage.js';
import { spawnEnemy, findSpawnPoint } from '../../shared/sim/systems/spawner.js';
import { TILESET_KEY } from './BootScene.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    const dev = readDevOptions(CONFIG, window.location.search);
    const { config } = dev;
    this.config = config;
    this.qa = dev.qa;
    const handHeight = config.player.handHeight;
    this.transport = new LocalTransport({
      config, seed: dev.seed, startDepth: dev.startDepth, startIn: dev.startIn, effects: dev.effects, rich: dev.rich, startTime: dev.startTime,
    });
    const world = this.transport.world;
    const localId = this.transport.localPlayerId;

    this.mapView = new MapView(this, world.map, TILESET_KEY);
    this.shownMap = world.map;
    /** @type {Map<string, PlayerView>} */
    this.playerViews = new Map();
    this.enemyViews = new EnemyViews(this);
    this.bulletViews = new BulletViews(this, handHeight);
    this.gemViews = new GemViews(this);
    this.inputSystem = new InputSystem(this);
    this.cameraSystem = new CameraSystem(this, config.camera, world.map);
    this.effects = new EffectsSystem(this, {
      shotHeight: handHeight,
      localPlayerId: localId,
      shake: (ms, intensity) => this.cameraSystem.shake(ms, intensity),
    });
    this.hud = new Hud(this, config, localId);
    this.menu = new SalesmanMenu(this, {
      config,
      transport: this.transport,
      lines: new FixedSalesmanLines({ start: dev.seed % 3 }),
      onOpen: () => this.transport.setPaused(true),
      onClose: () => this.transport.setPaused(false),
    });
    this.targetMark = this.add.image(0, 0, 'targetMark').setDepth(DEPTH.FX).setVisible(false);

    this.fpsText = addPixelText(this, config.display.width - 4, config.display.height - 10, '')
      .setOrigin(1, 0).setScrollFactor(0).setDepth(DEPTH.HUD).setAlpha(0.6);
    this.fpsTimer = 0;

    this.input.keyboard.on('keydown-R', () => {
      if (!this.transport.getLocalPlayer().alive || world.run.pveOver) this.scene.restart();
    });
    installEvidenceHotkey(this, 'rooms');
    if (import.meta.env.DEV) window.__scene = this; // for debugging in the console
    if (this.qa === 'crowd') this.time.delayedCall(1200, () => this.spawnCrowd(150));
  }

  update(_time, deltaMs) {
    const dt = deltaMs / 1000;

    // 1. Input -> simulation (paused while a menu is open)
    const input = this.menu.isOpen ? { moveX: 0, moveY: 0, roll: false, interact: false } : this.inputSystem.read();
    this.transport.update(deltaMs, input);
    this.runQa();

    // 2. A new room: rebuild the map view and the camera bounds.
    const world = this.transport.world;
    if (world.map !== this.shownMap) this.showRoom(world);

    // 3. Simulation -> visuals
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

    const events = this.transport.drainEvents();
    this.handleRoomEvents(events, world);
    this.effects.handle(events);
    this.hud.handle(events);
    this.hud.update(world, local);

    // 4. Auto-aim target marker
    const target = local.targetId != null ? world.enemies.find((e) => e.id === local.targetId) : null;
    if (target && !target.dead) {
      const c = this.enemyViews.bodyCenter(target, alpha);
      this.targetMark.setVisible(true).setPosition(c.x, c.y).setScale(target.boss ? 2 : 1);
    } else {
      this.targetMark.setVisible(false);
    }

    // 5. Camera
    const px = local.prevX + (local.x - local.prevX) * alpha;
    const py = local.prevY + (local.y - local.prevY) * alpha;
    this.cameraSystem.update(px, py, input.moveX, input.moveY, dt);

    this.fpsTimer -= dt;
    if (this.fpsTimer <= 0) {
      this.fpsTimer = 0.25;
      this.fpsText.setText(`FPS ${Math.round(this.game.loop.actualFps)}  ${world.enemies.length}`);
    }
  }

  /** Doors opening, the fade between rooms, and the Salesman's menu. */
  handleRoomEvents(events, world) {
    const fadeMs = this.config.rooms.transitionSeconds * 1000;
    for (const e of events) {
      if (e.type === 'doorsOpened') this.mapView.openDoors(world.run.room.doors, this.config.rooms.revealDoorTypes);
      else if (e.type === 'roomLeaving') this.cameras.main.fadeOut(fadeMs * 0.9, 13, 10, 8);
      else if (e.type === 'roomEntered') this.cameras.main.fadeIn(fadeMs, 13, 10, 8);
      else if (e.type === 'salesmanOpened' && e.playerId === this.transport.localPlayerId) this.menu.open();
    }
  }

  /** Swaps the map view for the room the simulation just loaded. */
  showRoom(world) {
    this.mapView.destroy();
    this.mapView = new MapView(this, world.map, TILESET_KEY);
    this.shownMap = world.map;
    this.cameraSystem.setMap(world.map);
    if (world.run.room.doors.some((d) => d.open)) this.mapView.openDoors(world.run.room.doors, this.config.rooms.revealDoorTypes);
  }

  /**
   * ?qa=... scripted states, so screenshots can be taken without a person playing:
   * clear (enemies die as they appear), shop / roll / gossip (Salesman menu, then buy).
   */
  runQa() {
    if (!this.qa) return;
    const world = this.transport.world;
    if (this.qa === 'clear') {
      for (const e of world.enemies) if (!e.dead && e.spawnDelay <= 0) killEnemy(world, e, this.transport.localPlayerId);
    }
    const shop = ['shop', 'roll', 'gossip'].includes(this.qa);
    if (shop && !this.qaDone && world.run.room?.kind === 'break' && world.time > 0.6) {
      this.qaDone = true;
      this.menu.open();
      if (this.qa === 'roll') this.time.delayedCall(400, () => this.menu.choose('roll'));
      if (this.qa === 'gossip') this.time.delayedCall(400, () => this.menu.choose('intel'));
    }
  }

  /** ?qa=crowd: a performance check with `count` enemies in the room. */
  spawnCrowd(count) {
    const world = this.transport.world;
    const types = ['crab', 'coconut', 'skeleton', 'tiki'];
    for (let i = 0; i < count; i++) {
      const type = types[i % types.length];
      const p = findSpawnPoint(world, this.config.enemies[type]);
      if (p) spawnEnemy(world, type, p.x, p.y);
    }
    const player = this.transport.getLocalPlayer();
    player.invulnerableTime = 1e9;
  }
}
