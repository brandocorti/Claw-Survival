// Runs the simulation inside the browser (solo play, milestones 1-4).
// From milestone 5, a network transport offers the same methods but gets the
// world state from the server, so scenes do not care which one they use.
import { createWorld, addPlayer, stepWorld, drainEvents, startRun } from '../../shared/sim/world.js';
import { applyAction } from '../../shared/sim/systems/breakRoom.js';
import { applyEffect } from '../../shared/sim/systems/effects.js';
import { xpToNextLevel } from '../../shared/sim/systems/xp.js';
import { BotRivalSource } from '../../shared/rivals/BotRivalSource.js';

export class LocalTransport {
  /**
   * @param {object} options
   * @param {object} options.config
   * @param {number} [options.seed]
   * @param {string} [options.playerId]
   * @param {number} [options.startDepth] - dev: start deeper (?room / ?depth)
   * @param {'fight'|'break'} [options.startIn] - dev: start in a break room (?break)
   * @param {string[]} [options.effects] - dev: effects to start with (?effect)
   * @param {boolean} [options.rich] - dev: level 3, XP bar nearly full (?rich)
   * @param {number} [options.startTime] - dev: seconds already gone on the match clock (?time)
   */
  constructor({ config, seed = 1, playerId = 'local', startDepth = 0, startIn = 'fight', effects = [], rich = false, startTime = 0 }) {
    this.config = config;
    this.localPlayerId = playerId;
    // The rivals' clock is the match clock, so gossip changes as the match goes on.
    let world = null;
    const rivals = new BotRivalSource({ seed, clock: () => (world ? world.match.elapsed : 0), config: config.rivals });
    world = createWorld({ config, seed, rivals });
    this.world = world;
    const player = addPlayer(world, playerId);
    if (rich) {
      player.level = 3;
      player.xp = xpToNextLevel(3, config.xp.curve) - 1;
    }
    for (const id of effects) applyEffect(world, player, id, { sourceId: 'dev' });
    world.match.elapsed = Math.min(startTime, config.match.durationSeconds - 1);
    startRun(world, { depth: startDepth, startIn });

    this.accumulator = 0;
    this.pendingRoll = false;
    this.pendingInteract = false;
    /** While true (a menu is open), update() does not advance the simulation. */
    this.paused = false;
    /** 0..1: how far the render time is between the last two ticks. */
    this.alpha = 0;
  }

  /**
   * Runs as many fixed ticks as the elapsed time allows.
   * @param {number} deltaMs - time since the last frame
   * @param {import('../../shared/protocol.js').PlayerInput} input - this frame's input
   */
  update(deltaMs, input) {
    if (this.paused) return;
    const dt = 1 / this.config.sim.tickRate;
    // Button presses are kept until a tick actually uses them (high refresh screens
    // can render a frame with zero ticks).
    if (input.roll) this.pendingRoll = true;
    if (input.interact) this.pendingInteract = true;
    this.accumulator += deltaMs / 1000;

    let ticks = 0;
    while (this.accumulator >= dt && ticks < this.config.sim.maxTicksPerFrame) {
      const tickInput = { ...input, roll: this.pendingRoll, interact: this.pendingInteract };
      stepWorld(this.world, { [this.localPlayerId]: tickInput }, dt);
      this.pendingRoll = false;
      this.pendingInteract = false;
      this.accumulator -= dt;
      ticks++;
    }
    if (ticks === this.config.sim.maxTicksPerFrame) this.accumulator = 0; // drop time after a long stall
    this.alpha = this.accumulator / dt;
  }

  /**
   * Sends a player action (break-room purchases). Locally it is applied at once;
   * over the network (milestone 5) the server applies it and answers.
   * @param {{ type: 'rest' } | { type: 'buy', item: 'roll'|'intel' }} action
   * @returns {import('../../shared/sim/systems/breakRoom.js').ActionResult}
   */
  sendAction(action) {
    return applyAction(this.world, this.localPlayerId, action);
  }

  /** Stops (true) or resumes (false) the simulation, e.g. while the Salesman's menu is open. */
  setPaused(paused) {
    this.paused = paused;
    this.accumulator = 0;
  }

  /** @returns {import('../../shared/sim/entities/player.js').Player | undefined} */
  getLocalPlayer() {
    return this.world.players.find((p) => p.id === this.localPlayerId);
  }

  /** @returns {import('../../shared/protocol.js').SimEvent[]} */
  drainEvents() {
    return drainEvents(this.world);
  }
}
