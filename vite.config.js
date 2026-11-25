// Vite config for the browser client.
// The client lives in src/client, but it imports game rules from src/shared,
// so the dev server is allowed to serve files from the whole repo.
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const evidenceDir = path.join(repoRoot, 'production', 'qa', 'evidence');

/**
 * Dev-only endpoint: POST /__evidence?name=<label> with a PNG data URL as the body
 * saves a screenshot to production/qa/evidence/. Press F9 in the game to use it.
 * Not included in production builds.
 */
function saveEvidencePlugin() {
  return {
    name: 'save-evidence',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__evidence', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        const url = new URL(req.url, 'http://localhost');
        const name = (url.searchParams.get('name') || 'screenshot').replace(/[^a-z0-9_-]/gi, '_');
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          const base64 = body.replace(/^data:image\/png;base64,/, '');
          fs.mkdirSync(evidenceDir, { recursive: true });
          const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
          const file = path.join(evidenceDir, `${stamp}_${name}.png`);
          fs.writeFileSync(file, Buffer.from(base64, 'base64'));
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ saved: path.relative(repoRoot, file) }));
        });
      });
    },
  };
}

export default defineConfig({
  base: './', // relative paths, so the game works at brandocorti.github.io/GEN_AI/
  root: path.join(repoRoot, 'src', 'client'),
  server: {
    port: 5173,
    fs: { allow: [repoRoot] },
  },
  build: {
    outDir: path.join(repoRoot, 'dist'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000, // Phaser alone is ~1.2 MB
  },
  plugins: [saveEvidencePlugin()],
});
