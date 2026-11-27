// Solo PvE: survive the rounds on the beach clearing. WASD moves, Space rolls,
// the slingshot fires by itself at the nearest enemy, E talks to the salesman, Esc
// pauses. After the run ends, R restarts and M goes back to the menu.
import * as Phaser from 'phaser';
import { CONFIG } from '../../shared/config.js';
import { BEACH_ARENA } from '../../shared/content/arenas/beach.js';
import { LocalTransport } from '../network/LocalTransport.js';
import { MapView } from '../entities/MapView.js';
import { PlayerView } from '../entities/PlayerView.js';
import { EnemyViews } from '../entities/EnemyViews.js';
import { BulletViews } from '../entities/BulletViews.js';
import { AbilityViews } from '../entities/AbilityViews.js';
import { PickupViews } from '../entities/PickupViews.js';
import { VendorView } from '../entities/VendorView.js';
import { GemViews } from '../entities/GemViews.js';
import { InputSystem } from '../systems/InputSystem.js';
import { CameraSystem } from '../systems/CameraSystem.js';
import { EffectsSystem } from '../systems/EffectsSystem.js';
import { installEvidenceHotkey } from '../systems/evidence.js';
import { DEPTH } from '../systems/depth.js';
import { Hud } from '../ui/Hud.js';
import { CardScreen } from '../ui/CardScreen.js';
import { ShopPanel } from '../ui/ShopPanel.js';
import { PauseMenu } from '../ui/PauseMenu.js';
import { Minimap } from '../ui/Minimap.js';
import { music } from '../audio/MusicPlayer.js';
import { musicFor } from '../audio/musicFor.js';
import { settings } from '../settings.js';
import { shopIsOpen, nearVendor } from '../../shared/sim/systems/shop.js';
import { addPixelText } from '../art/pixelFont.js';
import { readDevOptions } from '../devOptions.js';
import { TILESET_KEY } from './BootScene.js';
import { GFX, SCRIPTED, CAPTURE } from '../gfx/flags.js';
import { Lighting } from '../gfx/lighting.js';
import { Juice } from '../gfx/juice.js';
import { emperorDeath } from '../gfx/boss.js';
import { BossIntroCutscene } from '../ui/BossIntroCutscene.js';

/** Shortest time between two hit-stops, so chains of explosions do not stutter. */
const HIT_STOP_GAP_MS = 500;

/** Deterministic wander used for side-by-side captures (?script). */
function scriptedInput(frame) {
  const t = frame / 60;
  const a = Math.sin(t * 0.35) * 2.2 + Math.sin(t * 0.13) * 3;
  const moveX = Math.abs(Math.cos(a)) > 0.38 ? Math.sign(Math.cos(a)) : 0;
  const moveY = Math.abs(Math.sin(a)) > 0.38 ? Math.sign(Math.sin(a)) : 0;
  return { moveX, moveY, roll: frame % 170 === 0, pick: frame % 20 === 0 ? Math.floor(frame / 20) % 3 : null };
}

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    const { config, startRound, startCards, startAtBoss, seed } = readDevOptions(CONFIG, window.location.search);
    this.config = config;
    const handHeight = config.player.handHeight;
    this.transport = new LocalTransport({
      // The classic look has no props, so they must not block the way either.
      config, arena: { ...BEACH_ARENA, props: GFX.props }, seed, startRound, startCards, startAtBoss,
    });
    const world = this.transport.world;
    const localId = this.transport.localPlayerId;

    this.mapView = new MapView(this, world.map, TILESET_KEY);
    /** @type {Map<string, PlayerView>} */
    this.playerViews = new Map();
    this.enemyViews = new EnemyViews(this);
    this.bulletViews = new BulletViews(this, handHeight);
    this.gemViews = new GemViews(this);
    this.pickupViews = new PickupViews(this);
    this.vendorView = world.map.vendor ? new VendorView(this, world.map.vendor) : null;
    this.abilityViews = new AbilityViews(this, config);
    this.inputSystem = new InputSystem(this);
    this.cameraSystem = new CameraSystem(this, config.camera, world.map);
    this.effects = new EffectsSystem(this, {
      shotHeight: handHeight,
      localPlayerId: localId,
      shake: (ms, intensity) => this.cameraSystem.shake(ms, intensity),
      hitText: config.display.hitText,
    });
    this.hud = new Hud(this, config, localId);
    this.bossIntro = new BossIntroCutscene(this, config.finalBoss.introCutscene);
    this.lighting = GFX.light ? new Lighting(this, config.display, world.map) : null;
    this.juice = GFX.juice ? new Juice(this, world.map, localId) : null;
    /** Frames left with the picture frozen (the simulation keeps running). */
    this.hitStop = 0;
    this.nextHitStop = 0;
    this.camFocus = null;
    this.frame = 0;
    this.minimap = new Minimap(this, world.map, config.display);
    this.cardScreen = new CardScreen(this, config);
    this.shopPanel = new ShopPanel(this, config);
    this.pauseMenu = new PauseMenu(this, config.display);
    this.targetMark = this.add.image(0, 0, 'targetMark').setDepth(DEPTH.FX).setVisible(false);

    this.fpsText = addPixelText(this, config.display.width - 4, 38, '')
      .setOrigin(1, 0).setScrollFactor(0).setDepth(DEPTH.HUD).setAlpha(0.6);
    this.fpsTimer = 0;
    this.lastInput = { moveX: 0, moveY: 0, roll: false };

    this.input.keyboard.on('keydown-R', () => {
      if (this.runIsOver() && !this.pauseMenu.isOpen) this.scene.restart();
    });
    this.input.keyboard.on('keydown-M', () => {
      if (this.runIsOver() && !this.pauseMenu.isOpen) this.scene.start('Menu');
    });
    this.input.keyboard.on('keydown-ESC', (event) => {
      if (event.repeat) return;
      if (this.pauseMenu.isOpen) this.pauseMenu.close();
      else if (this.shopPanel.isOpen) this.shopPanel.choose('close');
      else this.pauseMenu.open();
    });
    music.rewind();
    if (CAPTURE) {
      this.game.loop.sleep(); // the capture harness steps the frames itself
      window.__ready = true;
    }
    installEvidenceHotkey(this, 'm4-graphics');
    if (import.meta.env.DEV) window.__scene = this; // for debugging in the console
  }

  runIsOver() {
    return !this.transport.getLocalPlayer().alive || this.transport.world.match.phase === 'won';
  }

  /** Moves every sprite to where the simulation says it is. */
  syncViews(world, local, alpha, dt) {
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
    this.pickupViews.sync(world.pickups, alpha, world.time);
    const open = shopIsOpen(world);
    this.vendorView?.update({ open, near: nearVendor(world, local) && !local.shopOpen, time: this.time.now / 1000 });
    this.abilityViews.sync(world, alpha, this.transport.renderTime);
    const hidden = world.enemies.filter((e) => e.boss);
    if (local.alive) hidden.push(local);
    this.mapView.props?.update(hidden, dt);
  }

  /** Visual reactions to simulation events. */
  handleEvents(events, world) {
    this.mapView.handle(events);
    this.effects.handle(events);
    this.requestHitStop(this.juice?.handle(events) ?? 0);
    this.hud.handle(events);
    for (const e of events) {
      if (e.type === 'shot') this.playerViews.get(e.playerId)?.onShot();
      if (!GFX.boss) continue;
      if (e.type === 'bossSpawned' && e.enemyType === 'crabEmperor') {
        this.bossIntro.play(); // freezes the game until it ends (see update)
        this.camFocus = { id: e.id, until: world.time + 1.8 };
        this.cameraSystem.shake(600, 0.006);
      } else if (e.type === 'enemyDied' && e.enemyType === 'crabEmperor') {
        emperorDeath(this, e.x, e.y, (ms, k) => this.cameraSystem.shake(ms, k));
      }
    }
  }

  requestHitStop(frames) {
    if (frames === 0 || this.time.now < this.nextHitStop) return;
    this.hitStop = frames;
    this.nextHitStop = this.time.now + HIT_STOP_GAP_MS;
  }

  update(_time, deltaMs) {
    // Captures: nothing happens until the harness steps (it sets window.__t), and every
    // step is exactly one tick, so two runs give the same frames.
    if (CAPTURE) {
      if (window.__t === undefined) return;
      deltaMs = 1000 / 60;
    }
    const dt = deltaMs / 1000;

    // 1. Input -> simulation
    let input = { ...this.inputSystem.read(), pick: this.cardScreen.takePick(), shop: this.shopPanel.takeChoice() };
    if (SCRIPTED) input = scriptedInput(this.frame);
    this.frame++;
    this.lastInput = input;
    // Solo: the pause menu and the boss intro freeze the game. (With other players they cannot, milestone 5.)
    const frozen = this.pauseMenu.isOpen || this.bossIntro.isPlaying;
    if (!frozen) this.transport.update(deltaMs, input);
    this.bossIntro.update(this.pauseMenu.isOpen ? 0 : dt);

    // 2. Simulation -> visuals
    const world = this.transport.world;
    const alpha = this.transport.alpha;
    const local = this.transport.getLocalPlayer();
    // Hit-stop: the picture freezes for a few frames; the simulation does not.
    if (this.hitStop > 0) this.hitStop--;
    else this.syncViews(world, local, alpha, dt);

    const events = this.transport.drainEvents();
    this.handleEvents(events, world);
    if (!world.paused && !frozen) this.juice?.update(dt, local);
    this.lighting?.update(dt);
    this.hud.update(world, local);
    this.minimap.update(world, local, shopIsOpen(world), this.time.now / 1000);
    this.cardScreen.update(local);
    this.shopPanel.update(world, local);
    music.play(musicFor(world.match, { paused: this.pauseMenu.isOpen, shopping: local.shopOpen }));

    // 3. Auto-aim target marker
    const target = local.targetId != null ? world.enemies.find((e) => e.id === local.targetId) : null;
    if (target && !target.dead && !(GFX.boss && target.boss)) { // brackets would cover a boss
      const c = this.enemyViews.bodyCenter(target, alpha);
      this.targetMark.setVisible(true).setPosition(c.x, c.y).setScale(Math.max(1, Math.round(target.radius / 5)));
    } else {
      this.targetMark.setVisible(false);
    }

    // 4. Camera
    let px = local.prevX + (local.x - local.prevX) * alpha;
    let py = local.prevY + (local.y - local.prevY) * alpha;
    if (this.camFocus && world.time < this.camFocus.until) {
      const boss = world.enemies.find((e) => e.id === this.camFocus.id);
      if (boss) {
        px = boss.x;
        py = boss.y - 20;
      }
    }
    this.cameraSystem.update(px, py, input.moveX, input.moveY, dt);

    this.fpsText.setVisible(settings.showFps);
    this.fpsTimer -= dt;
    if (this.fpsTimer <= 0) {
      this.fpsTimer = 0.25;
      this.fpsText.setText(`FPS ${Math.round(this.game.loop.actualFps)}  ${world.enemies.length}`);
    }
  }
}
