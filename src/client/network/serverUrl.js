// Works out the game server's WebSocket URL from the page's own address.
import { CONFIG } from '../../shared/config.js';

/**
 * Where the game server is: VITE_SERVER_URL, or the proxy path on the host that served this
 * page. Vite forwards that path to the game server, so the same URL works on localhost, on
 * another computer on the Wi-Fi and through a Cloudflare tunnel (`npm run online`).
 * @param {Record<string, string|undefined>} env - import.meta.env
 * @param {{ protocol: string, host: string }} location - host includes the port, if any
 * @returns {string} e.g. "wss://abc.trycloudflare.com/colyseus"
 */
export function serverUrl(env, location) {
  if (env.VITE_SERVER_URL) return env.VITE_SERVER_URL;
  const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${scheme}://${location.host}${CONFIG.net.proxyPath}`;
}
