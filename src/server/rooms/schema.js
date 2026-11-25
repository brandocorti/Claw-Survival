// Room state synced to every client by Colyseus (patched config.net.summaryRate
// times per second). It is only the small summary: lobby, clock and who is alive.
// The arenas themselves are sent as separate snapshot messages, one arena per client.
import { schema, t } from '@colyseus/schema';

/** One player as everyone else sees them (HUD list, lobby list). */
export const PlayerSummary = schema({
  name: t.string(),
  level: t.number(),
  alive: t.boolean(),
  connected: t.boolean(),
  isBot: t.boolean(),
}, 'PlayerSummary');

/** Everything every client in the room knows. */
export const MatchState = schema({
  /** 'lobby' | 'waves' | 'wavesOver' | 'over' (PvP phases come with step 5) */
  phase: t.string(),
  /** The room code, e.g. "K7QD". */
  code: t.string(),
  /** sessionId of the host (the only one who can start or add bots). */
  hostId: t.string(),
  /** Seconds since the match started (shared by every arena). */
  clock: t.number(),
  /** Length of the waves in seconds. The server decides it (dev option ?fast), clients follow. */
  duration: t.number(),
  round: t.number(),
  /** Empty while nobody has won; also empty if everyone died on the same tick. */
  winnerId: t.string(),
  /** By player id: sessionId, or "bot-N". */
  players: t.map(PlayerSummary),
}, 'MatchState');
