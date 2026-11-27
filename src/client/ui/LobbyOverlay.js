// The start menu and the room lobby, as plain HTML on top of the canvas (typing a
// name or a room code is far easier in real inputs than in Phaser). It only shows
// things and reports clicks; LobbyScene does the networking.
import { PALETTE as P } from '../art/palette.js';

const STYLE = `
#lobby { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
  font: 16px/1.4 ui-monospace, Menlo, Consolas, monospace; color: ${P.band}; pointer-events: none; }
#lobby .panel { pointer-events: auto; background: ${P.outline}ee; border: 4px solid ${P.wood};
  box-shadow: 0 0 0 4px ${P.woodDark}; padding: 20px 24px; width: min(420px, 90vw); }
#lobby h1 { margin: 0 0 4px; font-size: 26px; color: ${P.shotRim}; letter-spacing: 2px; }
#lobby h2 { margin: 0 0 14px; font-size: 14px; font-weight: normal; color: ${P.sandDark}; }
#lobby label { display: block; font-size: 13px; color: ${P.sandDark}; margin: 10px 0 4px; }
#lobby input { width: 100%; box-sizing: border-box; font: inherit; padding: 8px; background: ${P.cliffBase};
  color: ${P.white}; border: 2px solid ${P.rockDark}; text-transform: uppercase; }
#lobby input:focus { outline: none; border-color: ${P.shotRim}; }
#lobby .row { display: flex; gap: 8px; margin-top: 10px; }
#lobby .row > * { flex: 1; }
#lobby button { font: inherit; padding: 9px 8px; cursor: pointer; background: ${P.wood}; color: ${P.white};
  border: 2px solid ${P.woodDark}; }
#lobby button:hover:not(:disabled) { background: ${P.shotRim}; color: ${P.outline}; }
#lobby button:disabled { opacity: 0.45; cursor: default; }
#lobby button.main { background: ${P.jungle}; border-color: ${P.jungleDark}; }
#lobby .code { font-size: 40px; letter-spacing: 10px; color: ${P.white}; text-align: center; margin: 4px 0; }
#lobby .hint { font-size: 12px; color: ${P.sandDark}; text-align: center; }
#lobby ul { list-style: none; padding: 0; margin: 12px 0; }
#lobby li { padding: 5px 8px; background: ${P.cliffBase}; margin-bottom: 4px; display: flex; justify-content: space-between; }
#lobby li .tag { font-size: 12px; color: ${P.sandDark}; }
#lobby li.me { outline: 2px solid ${P.water}; }
#lobby .error { color: ${P.enemyShot}; min-height: 1.4em; margin-top: 10px; font-size: 13px; }
`;

/**
 * @typedef {object} LobbyHandlers
 * @property {(name: string) => void} onBack - back to the start menu (solo is played from there)
 * @property {(name: string) => void} onCreate
 * @property {(name: string, code: string) => void} onJoin
 * @property {() => void} onStart
 * @property {() => void} onAddBot
 * @property {() => void} onRemoveBot
 * @property {() => void} onLeave
 */

export class LobbyOverlay {
  /**
   * @param {LobbyHandlers} handlers
   * @param {{ maxNameLength: number, roomCodeLength: number, minPlayers: number, maxPlayers: number }} limits
   */
  constructor(handlers, limits) {
    this.handlers = handlers;
    this.limits = limits;
    if (!document.getElementById('lobby-style')) {
      const style = document.createElement('style');
      style.id = 'lobby-style';
      style.textContent = STYLE;
      document.head.append(style);
    }
    this.root = document.createElement('div');
    this.root.id = 'lobby';
    document.body.append(this.root);
  }

  /** The first screen: name, then solo / create / join. */
  showMenu({ name = '', code = '', error = '' } = {}) {
    const { maxNameLength, roomCodeLength } = this.limits;
    this.root.innerHTML = `
      <div class="panel">
        <h1>${escapeHtml(document.title)}</h1>
        <h2>Online: 2 to 6 players, each on their own island. Cards and the salesman only stop your own.</h2>
        <label for="lobby-name">Your name</label>
        <input id="lobby-name" maxlength="${maxNameLength}" autocomplete="off" spellcheck="false">
        <div class="row"><button class="main" data-act="create">Create room</button></div>
        <label for="lobby-code">Room code</label>
        <div class="row">
          <input id="lobby-code" maxlength="${roomCodeLength}" autocomplete="off" spellcheck="false" placeholder="ABCD">
          <button data-act="join">Join room</button>
        </div>
        <div class="row"><button data-act="back">Back to menu</button></div>
        <div class="error" role="alert"></div>
      </div>`;
    const nameInput = this.root.querySelector('#lobby-name');
    const codeInput = this.root.querySelector('#lobby-code');
    nameInput.value = name;
    codeInput.value = code;
    this.setError(error);
    (code ? codeInput : nameInput).focus();

    const name$ = () => nameInput.value.trim();
    this.root.querySelector('[data-act=back]').onclick = () => this.handlers.onBack(name$());
    this.root.querySelector('[data-act=create]').onclick = () => this.busy() && this.handlers.onCreate(name$());
    const join = () => this.busy() && this.handlers.onJoin(name$(), codeInput.value.trim());
    this.root.querySelector('[data-act=join]').onclick = join;
    codeInput.onkeydown = (e) => { if (e.key === 'Enter') join(); };
    // Keys typed here must not reach the game behind.
    this.root.onkeydown = (e) => e.stopPropagation();
  }

  /**
   * The waiting room. Call again whenever the room state changes.
   * @param {{ code: string, hostId: string, players: Map<string, { name: string, isBot: boolean }> }} state
   * @param {string} myId
   * @param {string} shareLink - a link that opens the menu with the code filled in
   */
  showRoom(state, myId, shareLink) {
    const { minPlayers, maxPlayers } = this.limits;
    const isHost = state.hostId === myId;
    const players = [...state.players.entries()];
    const items = players.map(([id, p]) => {
      const tags = [id === state.hostId ? 'host' : '', p.isBot ? 'bot' : '', id === myId ? 'you' : ''].filter(Boolean);
      return `<li class="${id === myId ? 'me' : ''}"><span>${escapeHtml(p.name)}</span><span class="tag">${tags.join(' · ')}</span></li>`;
    }).join('');
    const canStart = players.length >= minPlayers;
    this.root.innerHTML = `
      <div class="panel">
        <h2>Room code (share it, or the link)</h2>
        <div class="code">${escapeHtml(state.code)}</div>
        <div class="hint"><a href="${escapeHtml(shareLink)}" style="color:${P.waterLight}">${escapeHtml(shareLink)}</a></div>
        <ul>${items}</ul>
        <div class="hint">${players.length} / ${maxPlayers} players${canStart ? '' : ` (at least ${minPlayers} to start)`}</div>
        ${isHost ? `
          <div class="row">
            <button data-act="addBot" ${players.length >= maxPlayers ? 'disabled' : ''}>Add bot</button>
            <button data-act="removeBot" ${players.some(([, p]) => p.isBot) ? '' : 'disabled'}>Remove bot</button>
          </div>
          <div class="row"><button class="main" data-act="start" ${canStart ? '' : 'disabled'}>Start</button></div>`
        : '<div class="hint" style="margin-top:12px">Waiting for the host to start...</div>'}
        <div class="row"><button data-act="leave">Leave</button></div>
        <div class="error" role="alert"></div>
      </div>`;
    const on = (act, fn) => { const b = this.root.querySelector(`[data-act=${act}]`); if (b) b.onclick = fn; };
    on('addBot', () => this.handlers.onAddBot());
    on('removeBot', () => this.handlers.onRemoveBot());
    on('start', () => this.handlers.onStart());
    on('leave', () => this.handlers.onLeave());
  }

  /** "Connecting..." while a request is in flight. Returns true so it can be chained. */
  busy() {
    for (const b of this.root.querySelectorAll('button')) b.disabled = true;
    this.setError('Connecting...');
    return true;
  }

  setError(text) {
    const el = this.root.querySelector('.error');
    if (el) el.textContent = text;
  }

  hide() {
    this.root.innerHTML = '';
  }

  destroy() {
    this.root.remove();
  }
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
