// Background music: one looping track at a time, cross-fading on change. Uses <audio>
// elements, which stream (decoding whole songs would take ~60 MB of memory each).
// Browsers only allow sound after a click or key press, so it waits for one.
import menu from '../../../assets/audio/music/island-pixel-waves.mp3';
import game from '../../../assets/audio/music/under-the-canopy.mp3';
import boss from '../../../assets/audio/music/claws-of-the-mangrove.mp3';
import { onSettings } from '../settings.js';

const TRACKS = { menu, game, boss };
const FADE_SECONDS = 0.8;

class MusicPlayer {
  constructor() {
    /** @type {Map<string, { audio: HTMLAudioElement, level: number }>} */
    this.tracks = new Map();
    this.current = null;
    this.volume = 0;
    this.lastTime = 0;
    onSettings((s) => { this.volume = s.muted ? 0 : (s.musicVolume / 10) ** 1.6; });
    // Every press retries, until the browser lets the track play.
    for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, () => this.resume());
    setInterval(() => this.fade(), 50);
  }

  /** @param {keyof typeof TRACKS} id - does nothing if it is already playing */
  play(id) {
    if (this.current === id) return;
    this.current = id;
    if (!this.tracks.has(id)) {
      const audio = new Audio(TRACKS[id]);
      audio.loop = true;
      audio.volume = 0;
      this.tracks.set(id, { audio, level: 0 });
    }
    this.resume();
  }

  /** Makes the tracks of a run start from the beginning (a new run). */
  rewind() {
    for (const id of ['game', 'boss']) {
      const track = this.tracks.get(id);
      if (track) track.audio.currentTime = 0;
    }
  }

  resume() {
    const track = this.tracks.get(this.current);
    if (track?.audio.paused) track.audio.play().catch(() => {}); // not allowed yet: the next press retries
  }

  fade() {
    const now = performance.now();
    const step = Math.min(0.25, (now - this.lastTime) / 1000) / FADE_SECONDS;
    this.lastTime = now;
    for (const [id, t] of this.tracks) {
      t.level = Math.max(0, Math.min(1, t.level + (id === this.current ? step : -step)));
      t.audio.volume = t.level * this.volume;
      // Keeps its position: closing the pause menu or the shop continues the song.
      if (t.level === 0 && id !== this.current && !t.audio.paused) t.audio.pause();
    }
  }
}

/** The one music player: it keeps playing while scenes change. */
export const music = new MusicPlayer();
