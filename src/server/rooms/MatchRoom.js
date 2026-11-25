// The online room: a lobby, then a match where every player has their own arena
// on one shared clock. All rules live in src/shared/sim/match.js; this class only
// connects them to the network: it checks messages, collects inputs (from clients
// and bots), steps the match at a fixed rate and publishes the summary.
import { Room } from '@colyseus/core';
import { CONFIG } from '../../shared/config.js';
import { BEACH_ARENA } from '../../shared/content/arenas/beach.js';
import {
  createMatch, addMatchPlayer, removeMatchPlayer, startMatch, stepMatch, drainMatchEvents,
  matchSummary, getMatchPlayer,
} from '../../shared/sim/match.js';
import { createEmptyInput } from '../../shared/protocol.js';
import { createBot, botInput } from '../../shared/net/bot.js';
import { MSG, sanitizeInput, sanitizePick, sanitizeName } from '../../shared/net/messages.js';
import { encodeSnapshot } from '../../shared/net/snapshot.js';
import { drainEvents } from '../../shared/sim/world.js';
import { generateRoomCode } from '../../shared/net/roomCode.js';
import { MatchState, PlayerSummary } from './schema.js';

/** Codes of the rooms open in this process. */
const openCodes = new Set();

/**
 * Dev options a room can be created with (from the host's URL, e.g. ?bots=3&fast):
 *   bots: number of bots to add at once, fast: 100 s match, botsTough: bots take no damage from enemies.
 * @param {object} base - the game config
 * @param {object} options - the create options sent by the client
 */
export function roomConfig(base, options) {
  const config = structuredClone(base);
  if (options?.fast === true) config.match.durationSeconds = 100;
  return config;
}

export class MatchRoom extends Room {
  /**
   * @param {{ name?: string, bots?: number, fast?: boolean, botsTough?: boolean, seed?: number }} options
   */
  onCreate(options = {}) {
    this.config = roomConfig(CONFIG, options);
    const net = this.config.net;
    this.code = generateRoomCode(net.roomCodeLength, openCodes);
    openCodes.add(this.code);
    this.roomId = this.code;
    this.maxClients = net.maxPlayers;
    this.maxMessagesPerSecond = net.maxMessagesPerSecond;
    this.autoDispose = true;

    this.botsTough = options.botsTough === true;
    const seed = Number.isSafeInteger(options.seed) ? options.seed : Math.floor(Math.random() * 1e9);
    this.match = createMatch({ config: this.config, arena: BEACH_ARENA, seed });
    /** @type {Map<string, { moveX: number, moveY: number, roll: boolean, pick: number|null }>} latest input per client */
    this.inputs = new Map();
    /** @type {Map<string, import('../../shared/net/bot.js').Bot>} */
    this.bots = new Map();
    this.nextBotNumber = 1;
    this.accumulator = 0;
    this.ticksSinceSnapshot = 0;

    this.setState(new MatchState());
    this.state.phase = 'lobby';
    this.state.code = this.code;
    this.state.round = 1;
    this.state.duration = this.config.match.durationSeconds;
    this.setPatchRate(1000 / net.summaryRate);
    this.pendingBots = clampInt(options.bots, 0, net.maxBots);

    this.onMessage(MSG.input, (client, msg) => this.handleInput(client, msg));
    this.onMessage(MSG.pickCard, (client, msg) => this.handlePick(client, msg));
    this.onMessage(MSG.start, (client) => this.handleStart(client));
    this.onMessage(MSG.addBot, (client) => this.isHost(client) && this.addBot());
    this.onMessage(MSG.removeBot, (client) => this.isHost(client) && this.removeLastBot());

    // The loop runs for the room's whole life, also in the lobby and after a match, and is
    // never stopped: Colyseus's message rate limit reads the room clock, and stopping the
    // loop (setSimulationInterval() with no callback) leaves a stale handle that stops the
    // clock for good. Every client was then dropped after maxMessagesPerSecond messages.
    this.setSimulationInterval((deltaMs) => this.update(deltaMs), 1000 / this.config.sim.tickRate);
  }

  // No onUnhandledMessage on purpose: Colyseus 0.18 disconnects a client that sends a
  // message type with no handler (outside dev mode). Our client never does that, so
  // anyone who does is not running our client. Known types with bad payloads are
  // ignored by the handlers below instead.

  onJoin(client, options = {}) {
    const net = this.config.net;
    const name = sanitizeName(options.name, net.maxNameLength, `Player ${this.state.players.size + 1}`);
    this.addSummary(client.sessionId, name, false);
    addMatchPlayer(this.match, client.sessionId);
    this.inputs.set(client.sessionId, { ...createEmptyInput() });
    if (!this.state.hostId) this.state.hostId = client.sessionId;
    // Bots asked for in the create options join right after the host.
    while (this.pendingBots > 0) {
      this.pendingBots--;
      this.addBot();
    }
  }

  onLeave(client) {
    // Step 6 adds the reconnect grace time; for now leaving during a match counts as dying.
    const id = client.sessionId;
    removeMatchPlayer(this.match, id);
    this.inputs.delete(id);
    if (this.match.phase === 'lobby') this.state.players.delete(id);
    else {
      const summary = this.state.players.get(id);
      if (summary) {
        summary.connected = false;
        summary.alive = false;
      }
    }
    if (this.state.hostId === id) this.state.hostId = this.nextHost() ?? '';
    // Only bots left: nobody is watching, close the room.
    if (this.clients.length === 0) this.disconnect();
  }

  onDispose() {
    openCodes.delete(this.code);
  }

  // ---------------------------------------------------------------- messages

  handleInput(client, msg) {
    const input = sanitizeInput(msg);
    const stored = this.inputs.get(client.sessionId);
    if (!input || !stored) return;
    stored.moveX = input.moveX;
    stored.moveY = input.moveY;
    // A roll press is kept until a tick uses it.
    if (input.roll) stored.roll = true;
  }

  handlePick(client, msg) {
    const pick = sanitizePick(msg);
    const stored = this.inputs.get(client.sessionId);
    if (!pick || !stored) return;
    // Whether this index is a card on offer is checked by the simulation.
    stored.pick = pick.index;
  }

  handleStart(client) {
    const net = this.config.net;
    if (!this.isHost(client) || this.match.phase !== 'lobby') return;
    if (this.match.players.length < net.minPlayers) return;
    if (!startMatch(this.match)) return;
    for (const id of this.bots.keys()) {
      const player = getMatchPlayer(this.match, id);
      if (player) player.pveImmune = this.botsTough;
    }
    this.lock();
    this.accumulator = 0;
    this.ticksSinceSnapshot = 0;
    this.syncSummary();
  }

  // ---------------------------------------------------------------- bots

  /** Adds a bot in the lobby, if there is room. */
  addBot() {
    const net = this.config.net;
    if (this.match.phase !== 'lobby') return;
    if (this.bots.size >= net.maxBots || this.match.players.length >= net.maxPlayers) return;
    const n = this.nextBotNumber++;
    const id = `bot-${n}`;
    this.bots.set(id, createBot(id, this.match.seed + 1000 + n));
    addMatchPlayer(this.match, id);
    this.addSummary(id, `Bot ${n}`, true);
  }

  removeLastBot() {
    if (this.match.phase !== 'lobby') return;
    const id = [...this.bots.keys()].pop();
    if (!id) return;
    this.bots.delete(id);
    removeMatchPlayer(this.match, id);
    this.state.players.delete(id);
  }

  // ---------------------------------------------------------------- simulation

  /**
   * Runs as many fixed ticks as the real time allows (the interval timer is not exact).
   * @param {number} deltaMs
   */
  update(deltaMs) {
    if (this.match.phase !== 'waves') {
      this.accumulator = 0;
      drainMatchEvents(this.match); // e.g. a match ended by a player leaving, outside a tick
      this.syncSummary();
      return;
    }
    const dt = 1 / this.config.sim.tickRate;
    this.accumulator += deltaMs / 1000;
    let ticks = 0;
    while (this.accumulator >= dt && ticks < this.config.sim.maxTicksPerFrame) {
      this.tick(dt);
      this.accumulator -= dt;
      ticks++;
    }
    if (ticks === this.config.sim.maxTicksPerFrame) this.accumulator = 0; // drop time after a stall
    this.syncSummary();
  }

  /** One fixed tick of the whole match. */
  tick(dt) {
    if (this.match.phase !== 'waves') return;
    const inputs = {};
    for (const [id, stored] of this.inputs) {
      inputs[id] = { moveX: stored.moveX, moveY: stored.moveY, roll: stored.roll, pick: stored.pick };
      stored.roll = false;
      stored.pick = null;
    }
    for (const [id, bot] of this.bots) inputs[id] = botInput(bot, getMatchPlayer(this.match, id), this.config, dt);
    stepMatch(this.match, inputs, dt);
    // When the match stops (someone won, or time is up: step 5 continues into the PvP),
    // send the last snapshot at once so every client sees the final moment.
    const ended = drainMatchEvents(this.match).some((e) => e.type === 'matchOver' || e.type === 'wavesOver');
    this.ticksSinceSnapshot++;
    if (ended || this.ticksSinceSnapshot >= this.config.sim.tickRate / this.config.net.snapshotRate) {
      this.sendSnapshots();
    }
  }

  /**
   * Sends every client a snapshot of its own arena (with the events since the last one).
   * Bots' arenas are drained too, so their events do not pile up.
   */
  sendSnapshots() {
    this.ticksSinceSnapshot = 0;
    for (const entry of this.match.players) {
      const data = encodeSnapshot(entry.world, drainEvents(entry.world));
      this.clients.get(entry.id)?.send(MSG.arena, data);
    }
  }

  /** Copies the match summary into the synced state. */
  syncSummary() {
    const summary = matchSummary(this.match);
    this.state.phase = summary.phase;
    this.state.clock = summary.clock;
    this.state.round = summary.round;
    this.state.winnerId = summary.winnerId ?? '';
    for (const p of summary.players) {
      const s = this.state.players.get(p.id);
      if (!s) continue;
      s.level = p.level;
      s.alive = p.alive;
    }
  }

  // ---------------------------------------------------------------- helpers

  addSummary(id, name, isBot) {
    const s = new PlayerSummary();
    s.name = name;
    s.level = 1;
    s.alive = true;
    s.connected = true;
    s.isBot = isBot;
    this.state.players.set(id, s);
  }

  isHost(client) {
    return client.sessionId === this.state.hostId;
  }

  /** The longest-waiting human still in the room. */
  nextHost() {
    return this.match.players.map((p) => p.id).find((id) => this.clients.some((c) => c.sessionId === id));
  }
}

function clampInt(v, min, max) {
  return Number.isInteger(v) ? Math.max(min, Math.min(max, v)) : min;
}
