// Prototype graphics upgrades, switched on from the URL: ?gfx=all or ?gfx=terrain,props,light,juice,hud
const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
const raw = params.get('gfx') ?? '';
const all = raw === 'all';
const set = new Set(raw.split(',').filter(Boolean));
export const GFX = Object.freeze({
  terrain: all || set.has('terrain'),
  props: all || set.has('props'),
  light: all || set.has('light'),
  juice: all || set.has('juice'),
  hud: all || set.has('hud'),
  boss: all || set.has('boss'),
  hero: all || set.has('hero'),
});
export const SCRIPTED = params.has('script');
export const CAPTURE = params.has('capture');
