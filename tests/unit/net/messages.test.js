// The server's checks on everything a client sends (anti-cheat basics).
import { describe, it, expect } from 'vitest';
import { sanitizeInput, sanitizePick, sanitizeName, sanitizeSpectate } from '../../../src/shared/net/messages.js';

describe('input check', () => {
  it('clamps movement to -1..1 (a client cannot run faster with moveX: 50)', () => {
    expect(sanitizeInput({ moveX: 50, moveY: -7, roll: false })).toEqual({ seq: 0, moveX: 1, moveY: -1, roll: false, interact: false, shop: null });
  });

  it('turns non-numbers into 0 and only a real true rolls', () => {
    for (const bad of [NaN, Infinity, '1', null, undefined, {}, [1]]) {
      expect(sanitizeInput({ moveX: bad, moveY: bad, roll: 'yes' })).toMatchObject({ moveX: 0, moveY: 0, roll: false });
    }
    expect(sanitizeInput({ roll: true }).roll).toBe(true);
  });

  it('passes E and the salesman buttons, and nothing else', () => {
    expect(sanitizeInput({ interact: true, shop: 'buy' })).toMatchObject({ interact: true, shop: 'buy' });
    expect(sanitizeInput({ shop: 'close' }).shop).toBe('close');
    for (const bad of ['steal', 'BUY', 1, true, {}]) expect(sanitizeInput({ shop: bad }).shop).toBe(null);
    expect(sanitizeInput({ interact: 'yes' }).interact).toBe(false);
  });

  it('drops messages that are not objects', () => {
    for (const bad of [null, 'input', 42, [0.5, 0.5]]) expect(sanitizeInput(bad)).toBe(null);
  });

  it('keeps a valid sequence number only', () => {
    expect(sanitizeInput({ seq: 12 }).seq).toBe(12);
    expect(sanitizeInput({ seq: 1.5 }).seq).toBe(0);
  });
});

describe('card pick check', () => {
  it('accepts a small whole index and an optional target id', () => {
    expect(sanitizePick({ index: 2 })).toEqual({ index: 2, targetId: null });
    expect(sanitizePick({ index: 0, targetId: 'abc' })).toEqual({ index: 0, targetId: 'abc' });
  });

  it('drops an index that is negative, fractional, too big or not a number', () => {
    for (const index of [-1, 1.5, 10, 1e9, '1', null]) expect(sanitizePick({ index })).toBe(null);
    expect(sanitizePick(null)).toBe(null);
  });

  it('ignores a target that is not a short string', () => {
    expect(sanitizePick({ index: 1, targetId: 5 }).targetId).toBe(null);
    expect(sanitizePick({ index: 1, targetId: 'x'.repeat(65) }).targetId).toBe(null);
  });
});

describe('name check', () => {
  it('trims, removes control characters and cuts to the maximum length', () => {
    expect(sanitizeName('  Maria\u0000\n ', 12, 'P')).toBe('Maria');
    expect(sanitizeName('A very long player name', 12, 'P')).toBe('A very long');
  });

  it('falls back when nothing usable is left', () => {
    expect(sanitizeName('   ', 12, 'Player 1')).toBe('Player 1');
    expect(sanitizeName(42, 12, 'Player 1')).toBe('Player 1');
  });
});

describe('spectate check', () => {
  it('passes a step of exactly 1 or -1, and nothing else', () => {
    expect(sanitizeSpectate({ step: 1 })).toEqual({ step: 1 });
    expect(sanitizeSpectate({ step: -1 })).toEqual({ step: -1 });
    for (const bad of [0, 2, -5, '1', true, null, 0.5]) expect(sanitizeSpectate({ step: bad })).toBe(null);
    for (const bad of [null, 'next', 1, [1]]) expect(sanitizeSpectate(bad)).toBe(null);
  });
});
