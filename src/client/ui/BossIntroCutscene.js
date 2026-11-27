// Crab Emperor entrance: a pre-rendered animation (assets/animations/crab_intro_animation 3,
// 90 transparent 480x270 frames) played over the frozen game. GameScene stops the
// simulation while it plays; the music is left alone, so it keeps running.
import { DEPTH } from '../systems/depth.js';

const FRAMES = import.meta.glob(
  '../../../assets/animations/crab_intro_animation 3/frames_overlay/*.png',
  { eager: true, query: '?url', import: 'default' },
);
// Sorted by file name (crab_intro_000...089), not by URL: the build inlines small frames
// as data: URLs, which would sort out of order.
const FRAME_URLS = Object.keys(FRAMES).sort().map((path) => FRAMES[path]);

const KEY = (i) => `crabIntro${i}`;

/**
 * Queues the frames on a scene's loader. Call from a scene's preload().
 * @param {Phaser.Scene} scene
 */
export function preloadBossIntro(scene) {
  FRAME_URLS.forEach((url, i) => scene.load.image(KEY(i), url));
}

/**
 * Which frame shows at a given time, and how opaque the overlay is.
 * Plays once, holds the last frame, then fades out. Pure, for unit tests.
 * @param {number} elapsed - seconds since the start
 * @param {{ fps: number, fadeOutSeconds: number }} timing
 * @param {number} frameCount
 * @returns {{ frame: number, alpha: number, done: boolean }}
 */
export function introFrameAt(elapsed, { fps, fadeOutSeconds }, frameCount) {
  const playSeconds = frameCount / fps;
  const frame = Math.min(frameCount - 1, Math.max(0, Math.floor(elapsed * fps)));
  const fadeT = fadeOutSeconds > 0 ? (elapsed - playSeconds) / fadeOutSeconds : 1;
  const alpha = elapsed <= playSeconds ? 1 : Math.max(0, 1 - fadeT);
  return { frame, alpha, done: elapsed >= playSeconds + fadeOutSeconds };
}

export class BossIntroCutscene {
  /**
   * @param {Phaser.Scene} scene
   * @param {{ fps: number, fadeOutSeconds: number }} timing - CONFIG.finalBoss.introCutscene
   */
  constructor(scene, timing) {
    this.scene = scene;
    this.timing = timing;
    this.frameCount = FRAME_URLS.filter((_, i) => scene.textures.exists(KEY(i))).length;
    this.image = null;
    this.elapsed = 0;
  }

  /** True while the animation is on screen (the game should stay frozen). */
  get isPlaying() {
    return this.image !== null;
  }

  /** Starts the animation. Does nothing if the frames did not load. */
  play() {
    if (this.frameCount === 0 || this.isPlaying) return;
    this.elapsed = 0;
    this.image = this.scene.add.image(0, 0, KEY(0)).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.MENU - 1);
  }

  /**
   * Advances the animation. Call every frame; pass 0 while the game is paused.
   * @param {number} dt - seconds
   */
  update(dt) {
    if (!this.isPlaying) return;
    this.elapsed += dt;
    const { frame, alpha, done } = introFrameAt(this.elapsed, this.timing, this.frameCount);
    if (done) {
      this.image.destroy();
      this.image = null;
      return;
    }
    this.image.setTexture(KEY(frame)).setAlpha(alpha);
  }
}
