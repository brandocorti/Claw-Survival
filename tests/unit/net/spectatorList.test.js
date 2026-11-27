// The spectator bar's list and label (client/network/spectatorList.js).
import { describe, it, expect } from 'vitest';
import { watchablePlayers, watchLabel } from '../../../src/client/network/spectatorList.js';

const summary = (name, extra = {}) => ({ name, alive: true, bossBeaten: false, connected: true, ...extra });

describe('spectator list', () => {
  it('lists the players still playing, in join order, without you', () => {
    const players = new Map([
      ['me', summary('ME', { alive: false })],
      ['a', summary('ANA')],
      ['b', summary('BOB', { alive: false })],
      ['c', summary('CY', { bossBeaten: true })],
      ['d', summary('DEE', { connected: false })],
      ['e', summary('EVA')],
    ]);
    expect(watchablePlayers(players, 'me')).toEqual([{ id: 'a', name: 'ANA' }, { id: 'e', name: 'EVA' }]);
  });

  it('shows the position and the keys only when there is a choice', () => {
    const two = [{ id: 'a', name: 'ANA' }, { id: 'e', name: 'EVA' }];
    expect(watchLabel(two, 'e', 'EVA')).toBe('WATCHING EVA  2/2   Q < > E   M MENU');
    expect(watchLabel([two[0]], 'a', 'ANA')).toBe('WATCHING ANA   M MENU');
    // The watched player just dropped out (the server moves on after a moment).
    expect(watchLabel(two, 'x', 'XAV')).toBe('WATCHING XAV   Q < > E   M MENU');
  });
});
