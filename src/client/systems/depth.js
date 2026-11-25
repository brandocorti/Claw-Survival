// Draw order. Characters, rocks and bullets use their ground y as depth
// (y-sorting, so things lower on screen are drawn in front); these constants
// sit below or above that range.
export const DEPTH = Object.freeze({
  FLOOR: -1000,
  SHADOW: -500,
  GROUND_FX: -400,
  FX: 5000,
  HUD: 9000,
  MENU: 9500,
  RETICLE: 10000,
});
