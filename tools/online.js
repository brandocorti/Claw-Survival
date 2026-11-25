// `npm run online`: play with people on other computers and other networks.
// Starts the game server, the Vite client and a Cloudflare quick tunnel (no account needed),
// then prints the public link to share. Ctrl+C stops all three.
// Needs `cloudflared` installed: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
import { spawn } from 'node:child_process';

const VITE_PORT = 5173; // must match server.port in vite.config.js
const isWindows = process.platform === 'win32';
const npm = isWindows ? 'npm.cmd' : 'npm';

const children = [];
let stopping = false;

/** Stops every child process and exits with `code`. */
function stopAll(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}

/** Starts a child process and stops everything when it exits. */
function start(command, args, stdio) {
  const child = spawn(command, args, { stdio, shell: isWindows });
  child.on('error', (err) => {
    if (err.code === 'ENOENT') {
      console.error(`\n"${command}" was not found. Install it first (macOS: brew install cloudflared).\n`);
    } else {
      console.error(err);
    }
    stopAll(1);
  });
  child.on('exit', (code) => stopAll(code ?? 0));
  children.push(child);
  return child;
}

start(npm, ['run', 'server'], 'inherit');
start(npm, ['run', 'dev'], 'inherit');

const tunnel = start('cloudflared', ['tunnel', '--no-autoupdate', '--url', `http://127.0.0.1:${VITE_PORT}`],
  ['ignore', 'pipe', 'pipe']);

// cloudflared logs the public URL among its other output; show only that line, loudly.
let announced = false;
const findUrl = (chunk) => {
  const match = !announced && /https:\/\/[a-z0-9-]+\.trycloudflare\.com/.exec(chunk.toString());
  if (!match) return;
  announced = true;
  console.log(`\n  ==============================================================`);
  console.log(`   Share this link with the other players:  ${match[0]}`);
  console.log(`   (it can take ~10 s before it answers; it changes every run)`);
  console.log(`  ==============================================================\n`);
};
tunnel.stdout.on('data', findUrl);
tunnel.stderr.on('data', findUrl);

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
