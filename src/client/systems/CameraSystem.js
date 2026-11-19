// Camera that follows the player with smoothing and leads a little in the
// direction they walk, so you see more of what you are walking into.
import { clamp } from '../../shared/sim/math.js';

export class CameraSystem {
  /**
   * @param {Phaser.Scene} scene
   * @param {{ followLerp: number, moveLookAhead: number }} cfg
   * @param {{ width: number, height: number, tileSize: number }} map
   */
  constructor(scene, cfg, map) {
    this.cam = scene.cameras.main;
    this.cfg = cfg;
    this.cam.setBounds(0, 0, map.width * map.tileSize, map.height * map.tileSize);
    this.started = false;
    this.leadX = 0;
    this.leadY = 0;
  }

  /**
   * @param {number} targetX - player position, world pixels
   * @param {number} targetY
   * @param {number} moveX - -1..1 input direction
   * @param {number} moveY
   * @param {number} dtSeconds
   */
  update(targetX, targetY, moveX, moveY, dtSeconds) {
    const { moveLookAhead, followLerp } = this.cfg;
    const k = 1 - Math.pow(1 - clamp(followLerp, 0, 1), dtSeconds * 60);
    const len = Math.hypot(moveX, moveY) || 1;
    this.leadX += ((moveX / len) * moveLookAhead - this.leadX) * k * 0.5;
    this.leadY += ((moveY / len) * moveLookAhead - this.leadY) * k * 0.5;

    const desiredX = targetX + this.leadX - this.cam.width / 2;
    const desiredY = targetY + this.leadY - this.cam.height / 2;
    if (!this.started) {
      this.cam.setScroll(desiredX, desiredY);
      this.started = true;
      return;
    }
    // Frame-rate independent smoothing: followLerp is the fraction per 1/60 s.
    this.cam.setScroll(
      this.cam.scrollX + (desiredX - this.cam.scrollX) * k,
      this.cam.scrollY + (desiredY - this.cam.scrollY) * k,
    );
  }

  /**
   * Screen shake for big hits and explosions.
   * @param {number} [durationMs]
   * @param {number} [intensity] - fraction of the screen size
   */
  shake(durationMs = 90, intensity = 0.004) {
    this.cam.shake(durationMs, intensity);
  }
}
