// Messages between the browser and the game server, and the checks the server
// runs on everything a client sends. The server is authoritative: a client only
// sends what it pressed and what it picked; anything malformed is dropped.

/** Message names (client -> server and server -> client). */
export const MSG = Object.freeze({
  /** client -> server: { seq, moveX, moveY, roll, interact, shop } */
  input: 'input',
  /** client -> server: { index, targetId? } */
  pickCard: 'pickCard',
  /** client -> server, host only, in the lobby */
  start: 'start',
  addBot: 'addBot',
  removeBot: 'removeBot',
  /** server -> client: one arena snapshot (shared/net/snapshot.js), config.net.snapshotRate per second */
  arena: 'arena',
});

/** What a client may ask the salesman (shared/sim/systems/shop.js). */
const SHOP_CHOICES = ['buy', 'close'];

/** Largest card index a client may send (the sim also checks it is a card on offer). */
const MAX_PICK_INDEX = 9;

/**
 * Checks a client's input message and returns a clean PlayerInput, or null to drop it.
 * moveX / moveY are clamped to -1..1 (non-numbers become 0), roll and interact must be
 * exactly true, shop must be 'buy' or 'close' (anything else becomes null).
 * @param {unknown} msg
 * @returns {{ seq: number, moveX: number, moveY: number, roll: boolean, interact: boolean,
 *   shop: 'buy'|'close'|null } | null}
 */
export function sanitizeInput(msg) {
  if (!isPlainObject(msg)) return null;
  return {
    seq: Number.isSafeInteger(msg.seq) ? msg.seq : 0,
    moveX: clampAxis(msg.moveX),
    moveY: clampAxis(msg.moveY),
    roll: msg.roll === true,
    interact: msg.interact === true,
    shop: SHOP_CHOICES.includes(msg.shop) ? msg.shop : null,
  };
}

/**
 * Checks a card pick. The index must be a small whole number; whether that card is
 * really on offer is checked by the simulation (cards.js).
 * @param {unknown} msg
 * @returns {{ index: number, targetId: string|null } | null}
 */
export function sanitizePick(msg) {
  if (!isPlainObject(msg)) return null;
  const { index, targetId } = msg;
  if (!Number.isInteger(index) || index < 0 || index > MAX_PICK_INDEX) return null;
  return { index, targetId: typeof targetId === 'string' && targetId.length <= 64 ? targetId : null };
}

/**
 * A display name: printable characters only, trimmed, cut to maxLength.
 * @param {unknown} name
 * @param {number} maxLength
 * @param {string} fallback - used when nothing is left
 */
export function sanitizeName(name, maxLength, fallback) {
  if (typeof name !== 'string') return fallback;
  // Drop control characters and collapse spaces.
  const clean = name.replace(/[\p{C}]/gu, '').replace(/\s+/g, ' ').trim().slice(0, maxLength).trim();
  return clean || fallback;
}

function clampAxis(v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0;
  return Math.max(-1, Math.min(1, v));
}

function isPlainObject(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
