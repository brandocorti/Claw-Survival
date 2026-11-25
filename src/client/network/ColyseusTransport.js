// Online play: the server runs the simulation, this class only sends what the
// player pressed and draws what the server says. It offers the same members as
// LocalTransport (update, world, alpha, renderTime, localPlayerId, getLocalPlayer,
// drainEvents), so GameScene does not care which one it gets.
//
// Snapshots arrive config.net.snapshotRate times a second; SnapshotBuffer draws the
// arena slightly in the past, between two of them, so movement stays smooth.
import { parseArena } from '../../shared/sim/map.js';
import { decodeSnapshot } from '../../shared/net/snapshot.js';
import { MSG } from '../../shared/net/messages.js';
import { SnapshotBuffer } from './SnapshotBuffer.js';

/** Snapshot intervals of delay: enough to ride out one late snapshot. */
const DELAY_INTERVALS = 2;
/** Most input messages per second (the server drops clients that flood it). */
const MAX_INPUTS_PER_SECOND = 30;
/** Resend the held keys this often even when nothing changes (a lost message heals itself). */
const KEEPALIVE_SECONDS = 0.25;

export class ColyseusTransport {
  /**
   * @param {{ room: import('@colyseus/sdk').Room, config: object, arena: { id: string, rows: string[] },
   *   now?: () => number }} options - now: local seconds (injectable for tests)
   */
  constructor({ room, config, arena, now = () => performance.now() / 1000 }) {
    this.room = room;
    this.config = config;
    this.now = now;
    this.localPlayerId = room.sessionId;
    this.buffer = new SnapshotBuffer({ delay: DELAY_INTERVALS / config.net.snapshotRate });
    this.events = [];
    this.alpha = 1;
    this.renderTimeValue = 0;
    this.seq = 0;
    this.lastSent = null;
    this.lastSentAt = -Infinity;
    this.pendingRoll = false;
    /** Snapshots received, for the dev overlay. */
    this.stats = { snapshots: 0 };

    /** Looks like a simulation world to the views; refilled from the snapshots. */
    this.world = {
      config,
      map: parseArena(arena, config.display.tileSize),
      time: 0,
      tick: 0,
      paused: false,
      match: { phase: 'waves', round: 1, elapsed: 0 },
      players: [],
      enemies: [],
      bullets: [],
      gems: [],
      fires: [],
    };
    this.shownPair = null;
    this.lastCardChoice = null;

    this.unsubscribe = room.onMessage(MSG.arena, (data) => {
      this.stats.snapshots++;
      const snapshot = decodeSnapshot(data, config);
      this.buffer.push(snapshot, this.now());
    });
  }

  /** True once the first snapshot has arrived (GameScene waits for it). */
  get ready() {
    return this.buffer.ready;
  }

  /**
   * Sends input (when it changes, plus a keep-alive) and moves the drawn world forward.
   * @param {number} _deltaMs - unused: the server keeps the time
   * @param {import('../../shared/protocol.js').PlayerInput} input
   */
  update(_deltaMs, input) {
    this.sendInput(input);
    if (input.pick != null) this.room.send(MSG.pickCard, { index: input.pick });

    const sample = this.buffer.sample(this.now());
    if (!sample) return;
    if (this.shownPair?.from !== sample.from || this.shownPair?.to !== sample.to) {
      this.shownPair = sample;
      this.fillWorld(sample.from, sample.to);
      this.events.push(...this.buffer.takeEvents(sample.to.time));
    }
    this.alpha = sample.alpha;
    this.renderTimeValue = sample.renderTime;
  }

  /** World time matching `alpha`, for smooth animation between snapshots. */
  get renderTime() {
    return this.renderTimeValue;
  }

  /** @returns {object | undefined} the local player as last drawn */
  getLocalPlayer() {
    return this.world.players.find((p) => p.id === this.localPlayerId);
  }

  /** @returns {object[]} events from the snapshots drawn since the last call */
  drainEvents() {
    const events = this.events;
    this.events = [];
    return events;
  }

  /** Leaves the room (back to the menu). */
  leave() {
    this.unsubscribe?.();
    return this.room.leave().catch(() => {});
  }

  // ------------------------------------------------------------------ internals

  sendInput(input) {
    if (input.roll) this.pendingRoll = true;
    const now = this.now();
    const changed = !this.lastSent || input.moveX !== this.lastSent.moveX || input.moveY !== this.lastSent.moveY;
    const due = changed || this.pendingRoll || now - this.lastSentAt >= KEEPALIVE_SECONDS;
    if (!due || now - this.lastSentAt < 1 / MAX_INPUTS_PER_SECOND) return; // try again next frame
    const msg = { seq: ++this.seq, moveX: input.moveX, moveY: input.moveY, roll: this.pendingRoll };
    this.room.send(MSG.input, msg);
    this.lastSent = msg;
    this.lastSentAt = now;
    this.pendingRoll = false;
  }

  /** Fills this.world with `to`, taking prevX / prevY from `from` for each entity. */
  fillWorld(from, to) {
    const w = this.world;
    w.time = to.time;
    w.match = to.match;
    w.players = withPrevious(from.players, to.players);
    w.enemies = withPrevious(from.enemies, to.enemies);
    w.bullets = withPrevious(from.bullets, to.bullets);
    w.gems = withPrevious(from.gems, to.gems);
    w.fires = to.fires;

    // The card screen reopens when cardChoice is a different array; keep the same one
    // while the choice on the server is the same.
    const me = this.getLocalPlayer();
    if (me) {
      const prev = this.lastCardChoice;
      if (me.cardChoice && prev && prev.openedAt === me.cardOpenedAt && sameIds(prev.cards, me.cardChoice)) {
        me.cardChoice = prev.cards;
      }
      this.lastCardChoice = me.cardChoice ? { cards: me.cardChoice, openedAt: me.cardOpenedAt } : null;
    }
  }
}

/**
 * Copies each entity of `to` with prevX / prevY from the same id in `from`.
 * New entities start where they are (no slide in from 0,0).
 */
export function withPrevious(fromList, toList) {
  if (fromList === toList) return toList;
  const before = new Map(fromList.map((e) => [e.id, e]));
  return toList.map((e) => {
    const old = before.get(e.id);
    return old ? { ...e, prevX: old.x, prevY: old.y } : e;
  });
}

function sameIds(a, b) {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}
