// Simulated rivals (gossip source) and the Salesman's lines.
import { describe, it, expect } from 'vitest';
import { BotRivalSource } from '../../../src/shared/rivals/BotRivalSource.js';
import { RivalStatusSource } from '../../../src/shared/rivals/RivalStatusSource.js';
import { FixedSalesmanLines, FIXED_LINES, MAX_WORDS, gossipLine } from '../../../src/shared/dialogue/SalesmanLines.js';
import { EFFECTS } from '../../../src/shared/content/effects/index.js';
import { TEST_CONFIG } from '../helpers/fixtures.js';

const cfg = TEST_CONFIG.rivals;
const bots = (seed, time) => new BotRivalSource({ seed, clock: () => time, config: cfg });

describe('BotRivalSource', () => {
  it('is a RivalStatusSource with count bots and different names', () => {
    const source = bots(1, 0);
    expect(source).toBeInstanceOf(RivalStatusSource);
    const rivals = source.getRivals();
    expect(rivals.length).toBe(cfg.count);
    expect(new Set(rivals.map((r) => r.name)).size).toBe(cfg.count);
  });

  it('returns the same snapshot for the same seed and time', () => {
    for (const t of [0, 17, 95, 400, 599]) expect(bots(42, t).getRivals()).toEqual(bots(42, t).getRivals());
    expect(JSON.stringify(bots(42, 300).getRivals())).not.toEqual(JSON.stringify(bots(43, 300).getRivals()));
  });

  it('rooms and levels never go down over match time; effects come from the effect pool', () => {
    let last = bots(5, 0).getRivals();
    for (let t = 10; t <= 600; t += 10) {
      const now = bots(5, t).getRivals();
      now.forEach((r, i) => {
        expect(r.room).toBeGreaterThanOrEqual(last[i].room);
        expect(r.level).toBeGreaterThanOrEqual(last[i].level);
        for (const id of r.buffs) expect(EFFECTS[id].kind).toBe('buff');
        for (const id of r.debuffs) expect(EFFECTS[id].kind).toBe('debuff');
      });
      last = now;
    }
    expect(last.some((r) => r.room > 1)).toBe(true);
  });

  it('a bot that washed out stays out', () => {
    let wasDead = new Set();
    for (let t = 0; t <= 1200; t += 15) {
      const now = bots(9, t).getRivals();
      for (const name of wasDead) expect(now.find((r) => r.name === name).alive).toBe(false);
      wasDead = new Set(now.filter((r) => !r.alive).map((r) => r.name));
    }
  });
});

describe('Salesman lines', () => {
  it('every fixed line has at most ~12 words', () => {
    for (const [kind, lines] of Object.entries(FIXED_LINES)) {
      for (const line of lines) expect(line.split(/\s+/).length, `${kind}: ${line}`).toBeLessThanOrEqual(MAX_WORDS);
    }
  });

  it('answers through the async interface and rotates its lines', async () => {
    const lines = new FixedSalesmanLines();
    const a = await lines.line('greeting');
    const b = await lines.line('greeting');
    expect(FIXED_LINES.greeting).toContain(a);
    expect(b).not.toBe(a);
  });

  it('gossip names a cursed rival first, in the style of the brief', () => {
    const rivals = [
      { name: 'BARNACLE BEA', level: 3, room: 4, buffs: [], debuffs: [], alive: true },
      { name: 'MARIA', level: 6, room: 11, buffs: [], debuffs: ['sunburn'], alive: true },
    ];
    expect(gossipLine(rivals)).toBe('Maria? Level 6, room 11. And cursed. Heh.');
    expect(gossipLine([rivals[0]])).toBe('Barnacle Bea? Level 3, room 4.');
    expect(gossipLine([])).toMatch(/washed out/i);
  });

  it('gossip lines from real bot snapshots stay within the word limit', () => {
    for (let t = 0; t < 600; t += 37) {
      expect(gossipLine(bots(3, t).getRivals()).split(/\s+/).length).toBeLessThanOrEqual(MAX_WORDS);
    }
  });
});
