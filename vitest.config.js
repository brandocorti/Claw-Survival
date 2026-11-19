// Unit tests cover the game rules in src/shared (no Phaser, no browser needed).
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js'],
    environment: 'node',
  },
});
