// Start menu and online lobby: play solo, create a room, or join one with a code.
// When the host starts the match, the room is handed to GameScene inside a
// ColyseusTransport. A solo dev shortcut in the URL (?round=3, ?boss...) skips this.
import * as Phaser from 'phaser';
import { Client } from '@colyseus/sdk';
import { CONFIG } from '../../shared/config.js';
import { BEACH_ARENA } from '../../shared/content/arenas/beach.js';
import { MSG } from '../../shared/net/messages.js';
import { normalizeRoomCode } from '../../shared/net/roomCode.js';
import { ColyseusTransport } from '../network/ColyseusTransport.js';
import { serverUrl } from '../network/serverUrl.js';
import { LobbyOverlay } from '../ui/LobbyOverlay.js';
import { readDevOptions, readOnlineOptions, wantsSoloStraightAway } from '../devOptions.js';

/** Name of the room type on the server (src/server/createServer.js). */
const ROOM_NAME = 'match';
const NAME_KEY = 'playerName';

export class LobbyScene extends Phaser.Scene {
  constructor() {
    super('Lobby');
  }

  /** @param {{ error?: string }} [data] - e.g. why the last match ended */
  create(data = {}) {
    const search = window.location.search;
    if (wantsSoloStraightAway(search)) {
      this.scene.start('Game', { mode: 'solo' });
      return;
    }
    const { config } = readDevOptions(CONFIG, search);
    this.config = config;
    this.online = readOnlineOptions(search, config.net.maxBots);
    this.url = serverUrl(import.meta.env, window.location);
    this.room = null;

    const net = config.net;
    this.overlay = new LobbyOverlay({
      onSolo: (name) => this.playSolo(name),
      onCreate: (name) => this.connect(name, (client, opts) => client.create(ROOM_NAME, opts)),
      onJoin: (name, typed) => this.join(name, typed),
      onStart: () => this.room?.send(MSG.start),
      onAddBot: () => this.room?.send(MSG.addBot),
      onRemoveBot: () => this.room?.send(MSG.removeBot),
      onLeave: () => this.leaveRoom(),
    }, net);
    this.events.once('shutdown', () => this.overlay.destroy());

    this.showMenu(data.error ?? '');
    if (import.meta.env.DEV) window.__lobby = this;
  }

  showMenu(error = '') {
    const code = normalizeRoomCode(this.online.room ?? '', this.config.net.roomCodeLength) ?? '';
    this.overlay.showMenu({ name: localStorage.getItem(NAME_KEY) ?? '', code, error });
  }

  playSolo(name) {
    this.saveName(name);
    this.scene.start('Game', { mode: 'solo' });
  }

  join(name, typed) {
    const code = normalizeRoomCode(typed, this.config.net.roomCodeLength);
    if (!code) {
      this.overlay.setError(`A room code has ${this.config.net.roomCodeLength} letters or digits.`);
      return;
    }
    this.connect(name, (client, opts) => client.joinById(code, opts), code);
  }

  /**
   * @param {string} name
   * @param {(client: Client, options: object) => Promise<import('@colyseus/sdk').Room>} request
   * @param {string} [code] - when joining, for the error message
   */
  async connect(name, request, code) {
    this.saveName(name);
    this.overlay.busy();
    const { bots, botsTough, fast } = this.online;
    try {
      const room = await request(new Client(this.url), { name, bots, botsTough, fast });
      this.enterRoom(room);
    } catch (err) {
      this.showMenu(describeError(err, this.url, code));
    }
  }

  enterRoom(room) {
    this.room = room;
    // Listen for arena snapshots right away: the server starts sending them on its first
    // ticks, before the state patch that says the match started reaches us.
    this.transport = new ColyseusTransport({ room, config: this.config, arena: BEACH_ARENA });
    const link = shareLink(window.location, room.roomId);
    window.history.replaceState(null, '', link);

    this.onState = (state) => {
      if (!state.players) return;
      if (state.phase === 'lobby') this.overlay.showRoom(state, room.sessionId, link);
      else this.startGame();
    };
    this.onLeave = () => {
      this.room = null;
      this.transport = null;
      this.showMenu('You left the room, or the connection was lost.');
    };
    room.onStateChange(this.onState);
    room.onLeave(this.onLeave);
  }

  startGame() {
    const room = this.room;
    // The server decides the match length (e.g. the host's ?fast); the HUD timer must agree.
    this.config.match.durationSeconds = room.state.duration;
    room.onStateChange.remove(this.onState);
    room.onLeave.remove(this.onLeave);
    this.overlay.hide();
    this.scene.start('Game', { mode: 'online', transport: this.transport });
  }

  async leaveRoom() {
    const room = this.room;
    this.room = null;
    room?.onLeave.remove(this.onLeave);
    await this.transport?.leave();
    this.transport = null;
    window.history.replaceState(null, '', shareLink(window.location, null));
    this.online.room = null;
    this.showMenu();
  }

  saveName(name) {
    if (name) localStorage.setItem(NAME_KEY, name);
  }
}

/** This page's URL with ?room=CODE set (or removed), keeping the other options. */
function shareLink(location, code) {
  const params = new URLSearchParams(location.search);
  if (code) params.set('room', code);
  else params.delete('room');
  const query = params.toString().replace(/=(?=&|$)/g, ''); // "?fast=" -> "?fast"
  return `${location.origin}${location.pathname}${query ? `?${query}` : ''}`;
}

/** A sentence a player can act on, instead of a raw network error. */
function describeError(err, url, code) {
  const text = String(err?.message ?? err);
  if (code && /not found|locked|full|invalid/i.test(text)) {
    return `No open room with code ${code}. It may be full, or its match already started.`;
  }
  if (/fetch|connect|network|refused|ECONN|socket/i.test(text) || err?.code === 0) {
    return `Cannot reach the game server at ${url}. Is it running? (npm run server)`;
  }
  return `Could not connect: ${text}`;
}
