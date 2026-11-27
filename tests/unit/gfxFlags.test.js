import { describe, it, expect } from 'vitest';
import { readFlags } from '../../src/client/gfx/flags.js';

const on = (search) => Object.entries(readFlags(search)).filter(([, v]) => v).map(([k]) => k).sort();
const ALL = ['boss', 'hero', 'hud', 'juice', 'light', 'props', 'terrain'];

describe('graphics flags', () => {
  it.each([['', ALL], ['?gfx=all', ALL], ['?fast&seed=3', ALL], ['?classic', []], ['?classic&gfx=all', []],
    ['?gfx=terrain', ['terrain']], ['?gfx=hud,boss', ['boss', 'hud']], ['?gfx=', []]])('%s turns on %j', (search, expected) => {
    expect(on(search)).toEqual(expected);
  });
});
