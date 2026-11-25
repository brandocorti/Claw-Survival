/**
 * Which track fits the moment of a run. (The start menu always plays 'menu'.)
 *   menu  Island Pixel Waves     start menu, pause, salesman, victory
 *   game  Under the Canopy       the five rounds
 *   boss  Claws of the Mangrove  the final boss
 * @param {{ phase: string }} match
 * @param {{ paused?: boolean, shopping?: boolean }} [state]
 * @returns {'menu'|'game'|'boss'}
 */
export function musicFor(match, { paused = false, shopping = false } = {}) {
  if (paused || shopping || match.phase === 'won') return 'menu';
  return match.phase === 'waves' ? 'game' : 'boss';
}
