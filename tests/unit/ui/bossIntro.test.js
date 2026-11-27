// Timeline of the Crab Emperor entrance animation: plays once, holds, fades, ends.
import { describe, it, expect } from 'vitest';
import { introFrameAt } from '../../../src/client/ui/BossIntroCutscene.js';

const TIMING = { fps: 30, fadeOutSeconds: 0.3 };
const FRAMES = 90;

describe('boss intro timeline', () => {
  it('starts on the first frame, fully visible', () => {
    expect(introFrameAt(0, TIMING, FRAMES)).toEqual({ frame: 0, alpha: 1, done: false });
  });

  it('shows the frame for the time at the given fps', () => {
    expect(introFrameAt(1, TIMING, FRAMES).frame).toBe(30);
    expect(introFrameAt(2.99, TIMING, FRAMES).frame).toBe(89);
  });

  it('holds the last frame while it fades out', () => {
    const mid = introFrameAt(3.15, TIMING, FRAMES);
    expect(mid.frame).toBe(FRAMES - 1);
    expect(mid.alpha).toBeCloseTo(0.5);
    expect(mid.done).toBe(false);
  });

  it('is done after playing and fading', () => {
    expect(introFrameAt(3.3, TIMING, FRAMES).done).toBe(true);
  });

  it('ends right after the last frame when there is no fade', () => {
    expect(introFrameAt(3, { fps: 30, fadeOutSeconds: 0 }, FRAMES).done).toBe(true);
  });
});
