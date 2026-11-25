// Interpolation between snapshots: smooth, delayed, tolerant of jitter, never loses events.
import { describe, it, expect } from 'vitest';
import { SnapshotBuffer } from '../../../src/client/network/SnapshotBuffer.js';

const RATE = 20;
const STEP = 1 / RATE;
const DELAY = 2 * STEP;
const snap = (i, events = []) => ({ time: 10 + i * STEP, id: i, events });

describe('snapshot interpolation', () => {
  it('draws the arena `delay` seconds in the past, between the two snapshots around then', () => {
    const buffer = new SnapshotBuffer({ delay: DELAY });
    for (let i = 0; i <= 4; i++) buffer.push(snap(i), i * STEP); // server time 10 = local 0
    const s = buffer.sample(4 * STEP);
    // Render time = newest (index 4) minus 2 intervals = index 2 exactly.
    expect(s.renderTime).toBeCloseTo(10 + 2 * STEP, 9);
    expect([s.from.id, s.to.id, s.alpha]).toEqual([2, 2, 1]);
    const half = buffer.sample(4 * STEP + STEP / 2);
    expect([half.from.id, half.to.id]).toEqual([2, 3]);
    expect(half.alpha).toBeCloseTo(0.5, 9);
  });

  it('moves smoothly forward: alpha rises steadily between frames', () => {
    const buffer = new SnapshotBuffer({ delay: DELAY });
    for (let i = 0; i <= 10; i++) buffer.push(snap(i), i * STEP);
    let lastTime = -Infinity;
    // 11 frames at 120 Hz stay inside the delay window (after it, the newest snapshot is held).
    for (let f = 0; f < 11; f++) {
      const s = buffer.sample(10 * STEP + f / 120);
      const t = s.from.time + (s.to.time - s.from.time) * s.alpha;
      expect(t).toBeGreaterThan(lastTime);
      lastTime = t;
    }
  });

  it('a late snapshot does not make anything jump back; it holds the newest one', () => {
    const buffer = new SnapshotBuffer({ delay: DELAY });
    for (let i = 0; i <= 3; i++) buffer.push(snap(i), i * STEP);
    // No snapshot for a while: the render time passes the newest one.
    const s = buffer.sample(3 * STEP + 0.3);
    expect([s.from.id, s.to.id, s.alpha]).toEqual([3, 3, 1]);
    expect(buffer.sample(3 * STEP + 0.31).to.id).toBe(3);
  });

  it('ignores snapshots that arrive out of order or twice', () => {
    const buffer = new SnapshotBuffer({ delay: DELAY });
    buffer.push(snap(0), 0);
    buffer.push(snap(2), 2 * STEP);
    buffer.push(snap(1), 2 * STEP);
    buffer.push(snap(2), 2 * STEP);
    expect(buffer.snapshots.map((s) => s.id)).toEqual([0, 2]);
  });

  it('jitter of a few ms does not shake the clock estimate', () => {
    const buffer = new SnapshotBuffer({ delay: DELAY });
    const jitter = [0, 0.012, -0.004, 0.02, 0.003, -0.01, 0.015, 0];
    jitter.forEach((j, i) => buffer.push(snap(i), i * STEP + 0.05 + j));
    expect(buffer.offset).toBeCloseTo(10 - 0.05, 1);
  });

  it('hands out each snapshot\'s events once, in order, even when snapshots are skipped', () => {
    const buffer = new SnapshotBuffer({ delay: DELAY, maxSize: 4 });
    for (let i = 0; i <= 8; i++) buffer.push(snap(i, [`e${i}`]), i * STEP); // 0..4 overflow the buffer
    const taken = [];
    // A long stall, then one frame far ahead.
    const s = buffer.sample(8 * STEP);
    taken.push(...buffer.takeEvents(s.to.time));
    taken.push(...buffer.takeEvents(s.to.time));
    const later = buffer.sample(9 * STEP + 1);
    taken.push(...buffer.takeEvents(later.to.time));
    expect(taken).toEqual(['e0', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8']);
  });
});
