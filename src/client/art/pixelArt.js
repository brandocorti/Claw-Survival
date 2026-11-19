// Turns small pixel grids into Phaser textures. All placeholder art is made this
// way until real sprite sheets exist; replace a texture by loading an image with
// the same key in BootScene.

/**
 * Builds a color grid from strings, one character per pixel.
 * '.' is transparent; other characters are looked up in `colors`.
 * @param {string[]} rows
 * @param {Record<string, string>} colors
 * @returns {(string|null)[][]}
 */
export function gridFromStrings(rows, colors) {
  return rows.map((row) => [...row].map((ch) => (ch === '.' ? null : colors[ch] ?? null)));
}

/**
 * Adds a 1 px outline around every non-transparent pixel (8 directions).
 * The result is 2 px wider and taller.
 * @param {(string|null)[][]} grid
 * @param {string} color
 */
export function addOutline(grid, color) {
  const h = grid.length;
  const w = grid[0].length;
  const out = Array.from({ length: h + 2 }, () => Array(w + 2).fill(null));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!grid[y][x]) continue;
      for (let oy = 0; oy <= 2; oy++) {
        for (let ox = 0; ox <= 2; ox++) {
          if (!out[y + oy][x + ox]) out[y + oy][x + ox] = color;
        }
      }
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (grid[y][x]) out[y + 1][x + 1] = grid[y][x];
    }
  }
  return out;
}

/** Draws a grid onto a 2D canvas context at (ox, oy). */
export function drawGrid(ctx, grid, ox = 0, oy = 0) {
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const c = grid[y][x];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }
}

/**
 * Creates a single-frame texture from a grid.
 * @param {Phaser.Scene} scene
 * @param {string} key
 * @param {(string|null)[][]} grid
 */
export function createTextureFromGrid(scene, key, grid) {
  const tex = scene.textures.createCanvas(key, grid[0].length, grid.length);
  drawGrid(tex.getContext(), grid);
  tex.refresh();
  return tex;
}

/**
 * Creates one texture holding several same-size frames side by side,
 * each reachable by name: scene.add.sprite(x, y, key, 'down_0').
 * @param {Phaser.Scene} scene
 * @param {string} key
 * @param {{ name: string, grid: (string|null)[][] }[]} frames
 */
export function createSpritesheet(scene, key, frames) {
  const fw = frames[0].grid[0].length;
  const fh = frames[0].grid.length;
  const tex = scene.textures.createCanvas(key, fw * frames.length, fh);
  const ctx = tex.getContext();
  frames.forEach((frame, i) => {
    drawGrid(ctx, frame.grid, i * fw, 0);
    tex.add(frame.name, 0, i * fw, 0, fw, fh);
  });
  tex.refresh();
  return tex;
}
