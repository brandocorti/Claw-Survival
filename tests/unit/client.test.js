import { describe, it, expect } from 'vitest';
import { cleanSettings, DEFAULT_SETTINGS } from '../../src/client/settings.js';
import { musicFor } from '../../src/client/audio/musicFor.js';

describe('settings', () => {
  it.each([null, undefined, 'x', 3, [], {}])('falls back to the defaults for %s', (raw) => {
    expect(cleanSettings(raw)).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid values, drops wrong types and unknown keys, and limits the volume', () => {
    const clean = cleanSettings({ musicVolume: 99, muted: true, screenShake: 'no', hacked: 1 });
    expect(clean).toEqual({ ...DEFAULT_SETTINGS, musicVolume: 10, muted: true });
    expect(cleanSettings({ musicVolume: -4 }).musicVolume).toBe(0);
    expect(cleanSettings({ musicVolume: NaN }).musicVolume).toBe(DEFAULT_SETTINGS.musicVolume);
  });
});

describe('music', () => {
  it.each([
    ['waves', {}, 'game'], ['bossIntro', {}, 'boss'], ['boss', {}, 'boss'], ['won', {}, 'menu'],
    ['waves', { paused: true }, 'menu'], ['boss', { paused: true }, 'menu'], ['waves', { shopping: true }, 'menu'],
  ])('%s with %o plays %s', (phase, state, track) => {
    expect(musicFor({ phase }, state)).toBe(track);
  });
});
