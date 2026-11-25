// Unit tests cover the game rules in src/shared (no Phaser, no browser needed).
// Integration tests start the real game server on a free port and connect to it.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.js'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.js'],
          environment: 'node',
          // Colyseus always loads pm2's metrics module, which writes to process.send()
          // when it exists. That clashes with Vitest's child-process pool, so these
          // tests run in worker threads, which have no process.send().
          pool: 'threads',
        },
      },
    ],
  },
});
