import { describe, it, expect } from 'vitest';
import { serverUrl } from '../../../src/client/network/serverUrl.js';
import { CONFIG } from '../../../src/shared/config.js';

const path = CONFIG.net.proxyPath;

describe('serverUrl', () => {
  it('uses VITE_SERVER_URL when it is set', () => {
    const env = { VITE_SERVER_URL: 'ws://example.test:9999' };
    expect(serverUrl(env, { protocol: 'http:', host: 'localhost:5173' })).toBe('ws://example.test:9999');
  });

  it('goes through the proxy path on the page host, port included (local and Wi-Fi)', () => {
    expect(serverUrl({}, { protocol: 'http:', host: '192.168.1.20:5173' }))
      .toBe(`ws://192.168.1.20:5173${path}`);
  });

  it('uses wss on an https page such as a Cloudflare tunnel', () => {
    expect(serverUrl({}, { protocol: 'https:', host: 'abc.trycloudflare.com' }))
      .toBe(`wss://abc.trycloudflare.com${path}`);
  });
});
