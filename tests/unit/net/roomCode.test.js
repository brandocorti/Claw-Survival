import { describe, it, expect } from 'vitest';
import { generateRoomCode, normalizeRoomCode, CODE_ALPHABET } from '../../../src/shared/net/roomCode.js';
import { createRng } from '../../../src/shared/sim/rng.js';

describe('room codes', () => {
  it('are the right length and use only easy-to-read characters', () => {
    const rng = createRng(3);
    for (let i = 0; i < 200; i++) {
      const code = generateRoomCode(4, new Set(), rng.next);
      expect(code).toMatch(/^[A-Z2-9]{4}$/);
      for (const ch of code) expect(CODE_ALPHABET).toContain(ch);
      expect(code).not.toMatch(/[01OIL]/);
    }
  });

  it('never repeat a code that is in use', () => {
    const rng = createRng(1);
    const first = generateRoomCode(4, new Set(), createRng(1).next);
    expect(generateRoomCode(4, new Set([first]), rng.next)).not.toBe(first);
  });

  it('accept what a player typed, in any case, and refuse anything else', () => {
    expect(normalizeRoomCode(' k7qd ', 4)).toBe('K7QD');
    expect(normalizeRoomCode('K7Q', 4)).toBe(null);
    expect(normalizeRoomCode('K0QD', 4)).toBe(null); // 0 is not in the alphabet
    expect(normalizeRoomCode(1234, 4)).toBe(null);
  });
});
