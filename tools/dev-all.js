// `npm run dev:all`: starts the game server and the Vite client together.
// Ctrl+C stops both. (A tiny script instead of an extra dependency.)
import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = ['server', 'dev'].map((script) =>
  spawn(npm, ['run', script], { stdio: 'inherit', shell: process.platform === 'win32' }));

let stopping = false;
const stopAll = (code = 0) => {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
};
for (const child of children) child.on('exit', (code) => stopAll(code ?? 0));
process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
