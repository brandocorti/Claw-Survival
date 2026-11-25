// Graphics upgrades are all on. For before/after comparisons:
//   ?classic              the old look
//   ?gfx=terrain,props    only these (terrain, props, light, juice, hud, boss, hero)
// Dev capture options: ?capture (a harness steps the frames), ?script (scripted input).
const AREAS = ['terrain', 'props', 'light', 'juice', 'hud', 'boss', 'hero'];

/**
 * @param {string} search - window.location.search
 * @returns {Record<string, boolean>} which upgrades are on
 */
export function readFlags(search) {
  const params = new URLSearchParams(search);
  const only = params.get('gfx');
  const on = (area) => !params.has('classic') && (only === null || only === 'all' || only.split(',').includes(area));
  return Object.fromEntries(AREAS.map((area) => [area, on(area)]));
}

const search = typeof window !== 'undefined' ? window.location.search : '';
const dev = import.meta.env?.DEV ?? false;
export const GFX = Object.freeze(readFlags(search));
export const SCRIPTED = dev && new URLSearchParams(search).has('script');
export const CAPTURE = dev && new URLSearchParams(search).has('capture');
