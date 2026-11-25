// Runs the simulation inside the browser (solo play, milestones 1-4).
// From milestone 5, ColyseusTransport offers the same methods but gets the
// world state from the server, so scenes do not care which one they use.
import { createWorld, addPlayer, stepWorld, drainEvents } from '../../shared/sim/world.js';

export class LocalTransport {
  /**
   * @param {{ config: object, arena: { id: string, rows: string[] }, seed?: number, playerId?: string, startRound?: number, startCards?: number, startAtBoss?: boolean }} options
   */
  constructor({ config, arena, seed = 1, playerId = 'local', startRound = 1, startCards = 0, startAtBoss = false }) {
    this.config = config;
    this.localPlayerId = playerId;
    this.world = createWorld({ config, arena, seed });
    const player = addPlayer(this.world, playerId);
    // Dev shortcut (?cards=N): start with N level-ups to spend.
    player.level += startCards;
    player.pendingLevelUps += startCards;
    if (startRound > 1) {
      // Dev shortcut (?round=N): jump the match clock to the start of round N.
      const len = config.match.durationSeconds / config.rounds.count;
      this.world.match.elapsed = (startRound - 1) * len;
      this.world.match.round = startRound;
    }
    if (startAtBoss) {
      // Dev shortcut (?boss): the waves are over, go straight to the final boss.
      this.world.match.elapsed = config.match.durationSeconds;
      this.world.match.round = config.rounds.count;
    }
    this.accumulator = 0;
    this.pendingRoll = false;
    this.pendingPick = null;
    /** 0..1: how far the render time is between the last two ticks. */
    this.alpha = 0;
  }

  /**
   * Runs as many fixed ticks as the elapsed time allows.
   * @param {number} deltaMs - time since the last frame
   * @param {import('../../shared/protocol.js').PlayerInput} input - this frame's input
   */
  update(deltaMs, input) {
    const dt = 1 / this.config.sim.tickRate;
    // A roll press is kept until a tick actually uses it (high refresh screens can
    // render a frame with zero ticks).
    if (input.roll) this.pendingRoll = true;
    if (input.pick != null) this.pendingPick = input.pick;
    this.accumulator += deltaMs / 1000;

    let ticks = 0;
    while (this.accumulator >= dt && ticks < this.config.sim.maxTicksPerFrame) {
      stepWorld(this.world, { [this.localPlayerId]: { ...input, roll: this.pendingRoll, pick: this.pendingPick } }, dt);
      this.pendingRoll = false;
      this.pendingPick = null;
      this.accumulator -= dt;
      ticks++;
    }
    if (ticks === this.config.sim.maxTicksPerFrame) this.accumulator = 0; // drop time after a long stall
    // While paused for a card choice nothing moves, so there is nothing to interpolate.
    this.alpha = this.world.paused ? 1 : this.accumulator / dt;
  }

  /** World time matching `alpha`, for smooth animation between ticks. */
  get renderTime() {
    return this.world.time - (1 - this.alpha) / this.config.sim.tickRate;
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
