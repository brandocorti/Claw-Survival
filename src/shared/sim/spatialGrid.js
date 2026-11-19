// Uniform grid for fast "who is near this point?" queries.
// Rebuilt every tick from the live enemies; keeps 150 enemies x many bullets cheap.

export class SpatialGrid {
  /**
   * @param {number} worldWidth - pixels
   * @param {number} worldHeight - pixels
   * @param {number} cellSize - pixels; about 2x the biggest entity radius
   */
  constructor(worldWidth, worldHeight, cellSize = 32) {
    this.cellSize = cellSize;
    this.cols = Math.ceil(worldWidth / cellSize) + 1;
    this.rows = Math.ceil(worldHeight / cellSize) + 1;
    /** @type {object[][]} */
    this.cells = Array.from({ length: this.cols * this.rows }, () => []);
  }

  clear() {
    for (const cell of this.cells) cell.length = 0;
  }

  /** @param {{ x: number, y: number }} item */
  insert(item) {
    this.cells[this.indexOf(item.x, item.y)].push(item);
  }

  /**
   * Calls fn(item) for every item in the cells overlapping the square around (x, y).
   * Callers still check the exact distance.
   * @param {number} x
   * @param {number} y
   * @param {number} radius
   * @param {(item: any) => void} fn
   */
  forEachNear(x, y, radius, fn) {
    const cs = this.cellSize;
    const c0 = Math.max(0, Math.floor((x - radius) / cs));
    const c1 = Math.min(this.cols - 1, Math.floor((x + radius) / cs));
    const r0 = Math.max(0, Math.floor((y - radius) / cs));
    const r1 = Math.min(this.rows - 1, Math.floor((y + radius) / cs));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const cell = this.cells[r * this.cols + c];
        for (let i = 0; i < cell.length; i++) fn(cell[i]);
      }
    }
  }

  indexOf(x, y) {
    const c = Math.min(this.cols - 1, Math.max(0, Math.floor(x / this.cellSize)));
    const r = Math.min(this.rows - 1, Math.max(0, Math.floor(y / this.cellSize)));
    return r * this.cols + c;
  }
}
