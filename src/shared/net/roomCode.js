// Short room codes such as "K7QD" that players can read out loud.
// No 0/O or 1/I/L, so a code cannot be misread.

export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Makes a code that is not in `taken`.
 * @param {number} length
 * @param {Set<string>} taken - codes of rooms that are open now
 * @param {() => number} [random] - 0..1, injectable for tests
 * @returns {string}
 */
export function generateRoomCode(length, taken, random = Math.random) {
  for (let attempt = 0; attempt < 1000; attempt++) {
    let code = '';
    for (let i = 0; i < length; i++) code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
    if (!taken.has(code)) return code;
  }
  throw new Error('No free room code: too many rooms open');
}

/**
 * Normalises what a player typed ("k7qd ", "?room=k7qd") into a code, or null.
 * @param {unknown} text
 * @param {number} length
 * @returns {string|null}
 */
export function normalizeRoomCode(text, length) {
  if (typeof text !== 'string') return null;
  const code = text.trim().toUpperCase();
  if (code.length !== length) return null;
  for (const ch of code) if (!CODE_ALPHABET.includes(ch)) return null;
  return code;
}
