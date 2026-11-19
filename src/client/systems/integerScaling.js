// Pixel-perfect scaling: the 480x270 canvas is enlarged by a whole number of
// DEVICE pixels (x2, x3, x4...), never a fraction, so every game pixel is the
// same size. Works with Windows display scaling (125%, 150%) too.

/**
 * @param {Phaser.Game} game - created with scale.mode NONE
 * @param {number} baseWidth
 * @param {number} baseHeight
 */
export function installIntegerScaling(game, baseWidth, baseHeight) {
  const apply = () => {
    const dpr = window.devicePixelRatio || 1;
    const deviceZoom = Math.max(
      1,
      Math.floor(Math.min((window.innerWidth * dpr) / baseWidth, (window.innerHeight * dpr) / baseHeight)),
    );
    game.scale.setZoom(deviceZoom / dpr);
  };
  window.addEventListener('resize', apply);
  apply();
}
