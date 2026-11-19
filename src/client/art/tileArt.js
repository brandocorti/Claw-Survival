// Procedural 16x16 tileset (placeholder until the milestone 4 art pass).
// Tiles are drawn left to right into one texture, so Phaser's Tilemap can use it.
import { PALETTE as P } from './palette.js';
import { createRng } from '../../shared/sim/rng.js';

/** Index of each tile image in the tileset texture. */
export const TILE_ART = Object.freeze({
  SAND_0: 0,
  SAND_1: 1,
  SAND_2: 2,
  SAND_SHELL: 3,
  CLIFF_TOP: 4,
  CLIFF_FACE: 5,
  WATER: 6,
  WATER_EDGE: 7,
});

const COUNT = 8;

/**
 * Draws the tileset into a canvas texture.
 * @param {Phaser.Scene} scene
 * @param {string} key
 * @param {number} ts - tile size in pixels
 */
export function createTileset(scene, key, ts) {
  const tex = scene.textures.createCanvas(key, ts * COUNT, ts);
  const ctx = tex.getContext();
  const rng = createRng(7);
  const px = (ox, x, y, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(ox + x, y, 1, 1);
  };
  const fill = (ox, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(ox, 0, ts, ts);
  };
  const speckle = (ox, count, colors) => {
    for (let i = 0; i < count; i++) px(ox, rng.int(0, ts - 1), rng.int(0, ts - 1), colors[i % colors.length]);
  };

  // Sand variants
  [6, 10, 4].forEach((n, i) => {
    const ox = i * ts;
    fill(ox, P.sand);
    speckle(ox, n, [P.sandDark, P.sandLight]);
  });
  {
    const ox = TILE_ART.SAND_SHELL * ts;
    fill(ox, P.sand);
    speckle(ox, 5, [P.sandDark, P.sandLight]);
    px(ox, 9, 9, P.shell);
    px(ox, 10, 9, P.shell);
    px(ox, 9, 10, P.white);
  }

  // Cliff top: dense jungle seen from above
  {
    const ox = TILE_ART.CLIFF_TOP * ts;
    fill(ox, P.jungle);
    for (let i = 0; i < 7; i++) {
      const x = rng.int(0, ts - 3);
      const y = rng.int(0, ts - 3);
      px(ox, x, y, P.jungleLight);
      px(ox, x + 1, y, P.jungleLight);
      px(ox, x, y + 1, P.jungleDark);
      px(ox, x + 1, y + 2, P.jungleDark);
    }
  }

  // Cliff face: grass lip on top, rock strata below, dark base
  {
    const ox = TILE_ART.CLIFF_FACE * ts;
    fill(ox, P.cliffFace);
    for (let x = 0; x < ts; x++) {
      px(ox, x, 0, P.jungle);
      px(ox, x, 1, P.jungle);
      if (x % 3 !== 1) px(ox, x, 2, P.jungleDark); // hanging grass
      px(ox, x, 7, P.cliffStrata);
      px(ox, x, 12, P.cliffStrata);
      px(ox, x, ts - 1, P.cliffBase);
      px(ox, x, ts - 2, P.cliffCrack);
    }
    for (let y = 4; y < 12; y++) px(ox, 5 + (y % 2), y, P.cliffCrack);
    px(ox, 11, 9, P.cliffCrack);
    px(ox, 12, 10, P.cliffCrack);
  }

  // Water
  const drawWater = (ox) => {
    fill(ox, P.water);
    for (let i = 0; i < 4; i++) {
      const x = rng.int(0, ts - 4);
      const y = rng.int(3, ts - 1);
      for (let k = 0; k < 3; k++) px(ox, x + k, y, k === 1 ? P.waterLight : P.waterDark);
    }
  };
  drawWater(TILE_ART.WATER * ts);

  // Water with the sand bank's front face above it (3/4 view)
  {
    const ox = TILE_ART.WATER_EDGE * ts;
    drawWater(ox);
    for (let x = 0; x < ts; x++) {
      px(ox, x, 0, P.wetSand);
      px(ox, x, 1, P.wetSand);
      px(ox, x, 2, P.waterDark);
      if (x % 4 !== 0) px(ox, x, 3, P.foam);
    }
  }

  tex.refresh();
  return tex;
}
