// `npm run bench:server [players] [round] [stress]`: how long one server tick takes
// for a full room, so we know whether the server keeps up with config.sim.tickRate.
// Bots play every arena and take no enemy damage. With "stress" their shots do no
// damage either, so every arena fills up to spawning.maxAlive (the worst case).
import { CONFIG } from '../src/shared/config.js';
import { BEACH_ARENA } from '../src/shared/content/arenas/beach.js';
import { createMatch, addMatchPlayer, startMatch, stepMatch, getMatchPlayer } from '../src/shared/sim/match.js';
import { createBot, botInput } from '../src/shared/net/bot.js';
import { roundLength } from '../src/shared/sim/systems/spawner.js';

const players = Number(process.argv[2]) || CONFIG.net.maxPlayers;
const round = Number(process.argv[3]) || CONFIG.rounds.count;
const stress = process.argv[4] === 'stress';
const config = structuredClone(CONFIG);
if (stress) for (const w of Object.values(config.weapons)) w.damage = 0;
const dt = 1 / config.sim.tickRate;

const match = createMatch({ config, arena: BEACH_ARENA, seed: 7 });
const bots = [];
for (let i = 0; i < players; i++) {
  addMatchPlayer(match, `bot-${i}`);
  bots.push(createBot(`bot-${i}`, 100 + i));
}
startMatch(match);
for (const bot of bots) getMatchPlayer(match, bot.id).pveImmune = true;
match.clock.elapsed = (round - 1) * roundLength(CONFIG);

const step = () => {
  const inputs = {};
  for (const bot of bots) inputs[bot.id] = botInput(bot, getMatchPlayer(match, bot.id), config, dt);
  stepMatch(match, inputs, dt);
  for (const entry of match.players) entry.world.events.length = 0;
};

// Warm up until the arenas fill with enemies. Warm-up + measuring must fit in the
// round, or the clock runs out and the arenas empty (the last round ends the waves).
const measureSeconds = 10;
const warmupSeconds = Math.min(stress ? 45 : 20, roundLength(config) - measureSeconds - 1);
for (let i = 0; i < warmupSeconds * config.sim.tickRate; i++) step();
const enemies = match.players.reduce((n, e) => n + e.world.enemies.length, 0);

const ticks = measureSeconds * config.sim.tickRate;
const times = [];
for (let i = 0; i < ticks; i++) {
  const t0 = performance.now();
  step();
  times.push(performance.now() - t0);
}
times.sort((a, b) => a - b);
const avg = times.reduce((a, b) => a + b, 0) / times.length;
const p99 = times[Math.floor(times.length * 0.99)];
const budget = 1000 / CONFIG.sim.tickRate;
console.log(`${players} arenas, round ${round}${stress ? ' (stress: enemies never die)' : ''}, ${enemies} enemies in total after warm-up`);
console.log(`tick: avg ${avg.toFixed(2)} ms, p99 ${p99.toFixed(2)} ms, max ${times.at(-1).toFixed(2)} ms (budget ${budget.toFixed(2)} ms)`);
console.log(`server load at ${CONFIG.sim.tickRate} Hz: ${((avg / budget) * 100).toFixed(0)}% of one CPU core`);
