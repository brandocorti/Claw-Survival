// `npm run bench:bandwidth [players] [round] [stress]`: bytes per second each client
// receives, measured on the exact bytes Colyseus puts on the socket for our arena
// snapshots (getMessageBytes), plus a generous allowance for the 5 Hz room summary.
// A client only receives its own arena, so the per-client number does not grow with
// the number of players; the server's total upload does.
import { getMessageBytes, Protocol } from '@colyseus/core';
import { CONFIG } from '../src/shared/config.js';
import { BEACH_ARENA } from '../src/shared/content/arenas/beach.js';
import { createMatch, addMatchPlayer, startMatch, stepMatch, getMatchPlayer } from '../src/shared/sim/match.js';
import { createBot, botInput } from '../src/shared/net/bot.js';
import { roundLength } from '../src/shared/sim/systems/spawner.js';
import { drainEvents } from '../src/shared/sim/world.js';
import { encodeSnapshot } from '../src/shared/net/snapshot.js';
import { MSG } from '../src/shared/net/messages.js';

const players = Number(process.argv[2]) || CONFIG.net.maxPlayers;
const round = Number(process.argv[3]) || CONFIG.rounds.count;
const stress = process.argv[4] === 'stress';
const config = structuredClone(CONFIG);
if (stress) for (const w of Object.values(config.weapons)) w.damage = 0;
const dt = 1 / config.sim.tickRate;
const ticksPerSnapshot = config.sim.tickRate / config.net.snapshotRate;
/** Upper bound for one summary patch with 6 players (names do not change, so patches are small). */
const SUMMARY_BYTES_ALLOWANCE = 200;

const match = createMatch({ config, arena: BEACH_ARENA, seed: 11 });
const bots = [];
for (let i = 0; i < players; i++) {
  addMatchPlayer(match, `bot-${i}`);
  bots.push(createBot(`bot-${i}`, 300 + i));
}
startMatch(match);
for (const bot of bots) getMatchPlayer(match, bot.id).pveImmune = true;
match.clock.elapsed = (round - 1) * roundLength(config);

const measureSeconds = 10;
const warmupSeconds = Math.min(stress ? 45 : 20, roundLength(config) - measureSeconds - 1);
const sizes = [];
let enemies = 0;
const totalTicks = (warmupSeconds + measureSeconds) * config.sim.tickRate;
for (let t = 1; t <= totalTicks; t++) {
  const inputs = {};
  for (const bot of bots) inputs[bot.id] = botInput(bot, getMatchPlayer(match, bot.id), config, dt);
  stepMatch(match, inputs, dt);
  if (t % ticksPerSnapshot !== 0) continue;
  for (const entry of match.players) {
    const data = encodeSnapshot(entry.world, drainEvents(entry.world), t * dt);
    if (t > warmupSeconds * config.sim.tickRate) {
      sizes.push(getMessageBytes.raw(Protocol.ROOM_DATA, MSG.arena, data).length);
      enemies = Math.max(enemies, entry.world.enemies.length);
    }
  }
}
sizes.sort((a, b) => a - b);
const avg = sizes.reduce((a, b) => a + b, 0) / sizes.length;
const perSecond = avg * config.net.snapshotRate + SUMMARY_BYTES_ALLOWANCE * config.net.summaryRate;
const kb = (n) => (n / 1024).toFixed(1);
console.log(`${players} players, round ${round}${stress ? ' (stress: enemies never die)' : ''}, up to ${enemies} enemies in one arena`);
console.log(`snapshot: avg ${Math.round(avg)} B, max ${sizes.at(-1)} B, at ${config.net.snapshotRate} Hz`);
console.log(`per client: ~${kb(perSecond)} KB/s down (${((perSecond * 8) / 1e6).toFixed(2)} Mbit/s)`);
console.log(`server total: ~${kb(perSecond * players)} KB/s up for ${players} clients`);
