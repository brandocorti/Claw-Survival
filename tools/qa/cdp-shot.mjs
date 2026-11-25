#!/usr/bin/env node
// Real-time screenshots of the running game, for QA evidence.
// Headless Chrome's --virtual-time-budget (page-shot.sh) only advances a few
// frames of a Phaser game, so this drives Chrome over the DevTools protocol and
// lets the game play in real time, then captures the screen.
//
// Usage (with the dev server running: npm run dev):
//   node tools/qa/cdp-shot.mjs "<url>" <out.png> [steps...]
// Steps run in order:
//   wait:<ms>        let the game play
//   key:<code>       press and release a key (KeyboardEvent.code: Digit1, KeyE, Space...)
//   hold:<code>:<ms> hold a key down for a while (walk)
//   eval:<js>        run JavaScript in the page and print the result
//   shot             capture now (defaults to <out.png>); shot:<path> for a named one
// Example:
//   node tools/qa/cdp-shot.mjs "http://localhost:5173/?break&rich&seed=3" out.png wait:2000 key:KeyE wait:600 shot
// Needs Node 22+ (global WebSocket) and Google Chrome (or set CHROME=/path/to/chrome).
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const [url, out, ...rawSteps] = process.argv.slice(2);
if (!url || !out) {
  console.error('usage: node tools/qa/cdp-shot.mjs <url> <out.png> [wait:ms|key:Code|hold:Code:ms|eval:js|shot[:path]]...');
  process.exit(2);
}
const steps = rawSteps.length ? rawSteps : ['wait:3000', 'shot'];
if (!steps.some((s) => s.startsWith('shot'))) steps.push('shot');

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9300 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(path.join(tmpdir(), 'cdp-shot-'));
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--window-size=1280,720', '--no-first-run', '--no-default-browser-check', '--autoplay-policy=no-user-gesture-required',
  'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = targets.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* Chrome still starting */ }
    await sleep(200);
  }
  throw new Error('Chrome did not start');
}

let ws;
let nextId = 1;
const pending = new Map();
const consoleLines = [];
function send(method, params = {}) {
  const id = nextId++;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function key(code, type) {
  const keyName = code.startsWith('Digit') ? code.slice(5) : code.startsWith('Key') ? code.slice(3).toLowerCase() : code;
  const keyCode = code.startsWith('Digit') ? 48 + Number(code.slice(5)) : code.startsWith('Key') ? code.charCodeAt(3) : { Space: 32, Escape: 27, F9: 120 }[code] ?? 0;
  await send('Input.dispatchKeyEvent', { type, code, key: keyName, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode });
}

async function shot(file) {
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(file, Buffer.from(data, 'base64'));
  console.log(`shot\t${file}`);
}

try {
  ws = new WebSocket(await connect());
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  ws.addEventListener('message', (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error.message));
      else p.resolve(msg.result);
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      consoleLines.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
    } else if (msg.method === 'Runtime.exceptionThrown') {
      consoleLines.push(`UNCAUGHT ${msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text}`);
    }
  });
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url });
  await sleep(1500); // load + boot

  for (const step of steps) {
    const [kind, ...rest] = step.split(':');
    if (kind === 'wait') await sleep(Number(rest[0]));
    else if (kind === 'key') {
      await key(rest[0], 'keyDown');
      await sleep(60);
      await key(rest[0], 'keyUp');
    } else if (kind === 'hold') {
      await key(rest[0], 'keyDown');
      await sleep(Number(rest[1]));
      await key(rest[0], 'keyUp');
    } else if (kind === 'eval') {
      const r = await send('Runtime.evaluate', { expression: rest.join(':'), returnByValue: true, awaitPromise: true });
      console.log(`eval\t${JSON.stringify(r.result.value ?? r.exceptionDetails?.text)}`);
    } else if (kind === 'shot') await shot(rest.length ? rest.join(':') : out);
    else throw new Error(`unknown step "${step}"`);
  }
  const uncaught = consoleLines.filter((l) => l.startsWith('UNCAUGHT'));
  console.log(`uncaught\t${uncaught.length}`);
  for (const l of uncaught) console.log(l);
} finally {
  ws?.close();
  chrome.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}
