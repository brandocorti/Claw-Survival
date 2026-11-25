// Smooth movement from snapshots that arrive config.net.snapshotRate times a second
// (with network jitter). The client draws the arena a little in the past (`delay`),
// between the two snapshots around that moment, so movement stays smooth even when
// a snapshot is late. No Phaser here, so it is unit tested.

/** How fast the estimate of the server clock follows new snapshots (0..1 per snapshot). */
const CLOCK_SMOOTHING = 0.1;
/** If the estimate is off by more than this many seconds (a stall, a hidden tab), jump. */
const CLOCK_SNAP_SECONDS = 0.25;

export class SnapshotBuffer {
  /**
   * @param {{ delay: number, maxSize?: number }} options - delay in seconds (about 2 snapshot intervals)
   */
  constructor({ delay, maxSize = 32 }) {
    this.delay = delay;
    this.maxSize = maxSize;
    /** @type {{ time: number }[]} oldest first */
    this.snapshots = [];
    /** Server time minus local time, smoothed. null until the first snapshot. */
    this.offset = null;
    /** Time of the newest snapshot whose events were handed out. */
    this.eventsUpTo = -Infinity;
    /** Events of snapshots dropped before takeEvents() reached them (never lose a hit or a death). */
    this.pendingEvents = [];
  }

  /** Removes the oldest snapshot, keeping its events if they were not handed out. */
  dropOldest() {
    const s = this.snapshots.shift();
    if (s.time > this.eventsUpTo) {
      if (s.events) this.pendingEvents.push(...s.events);
      this.eventsUpTo = s.time;
    }
  }

  /**
   * Adds a snapshot as it arrives.
   * @param {{ time: number, events?: object[] }} snapshot - time in server seconds
   * @param {number} now - local seconds (e.g. performance.now() / 1000)
   */
  push(snapshot, now) {
    const last = this.snapshots.at(-1);
    if (last && snapshot.time <= last.time) return; // late duplicate or out of order: drop
    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSize) this.dropOldest();

    const measured = snapshot.time - now;
    if (this.offset === null || Math.abs(measured - this.offset) > CLOCK_SNAP_SECONDS) this.offset = measured;
    else this.offset += (measured - this.offset) * CLOCK_SMOOTHING;
  }

  /** True once there is something to draw. */
  get ready() {
    return this.snapshots.length > 0;
  }

  /**
   * The two snapshots around the render time and how far between them.
   * Holds the newest one (alpha 1) when no newer snapshot has arrived yet.
   * @param {number} now - local seconds
   * @returns {{ from: object, to: object, alpha: number, renderTime: number } | null}
   */
  sample(now) {
    const list = this.snapshots;
    if (list.length === 0) return null;
    const renderTime = now + this.offset - this.delay;
    // Forget snapshots that are entirely in the past (keep one before the render time).
    while (list.length > 2 && list[1].time <= renderTime) this.dropOldest();

    const [a, b] = list;
    if (!b || renderTime <= a.time) {
      const only = renderTime <= a.time ? a : list.at(-1);
      return { from: only, to: only, alpha: 1, renderTime: Math.min(renderTime, only.time) };
    }
    if (renderTime >= b.time) return { from: b, to: b, alpha: 1, renderTime: b.time };
    return { from: a, to: b, alpha: (renderTime - a.time) / (b.time - a.time), renderTime };
  }

  /**
   * Events of every snapshot up to `time` that were not handed out yet, in order.
   * Called with the snapshot being drawn, so effects line up with movement.
   * @param {number} time
   * @returns {object[]}
   */
  takeEvents(time) {
    const events = this.pendingEvents;
    this.pendingEvents = [];
    for (const s of this.snapshots) {
      if (s.time > this.eventsUpTo && s.time <= time) {
        if (s.events) events.push(...s.events);
        this.eventsUpTo = s.time;
      }
    }
    return events;
  }
}
