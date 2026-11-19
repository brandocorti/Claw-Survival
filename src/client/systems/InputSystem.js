// Reads the keyboard into a PlayerInput each frame.
// WASD / arrows move, Space rolls. Shooting is automatic; the mouse is left
// free for menus (level-up cards in milestone 3).

export class InputSystem {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    this.keys = scene.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE');
    // Queued so a tap shorter than one frame is never lost.
    this.rollQueued = false;
    scene.input.keyboard.on('keydown-SPACE', () => { this.rollQueued = true; });
  }

  /** @returns {import('../../shared/protocol.js').PlayerInput} */
  read() {
    const k = this.keys;
    const moveX = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    const moveY = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
    const roll = this.rollQueued;
    this.rollQueued = false;
    return { moveX, moveY, roll };
  }
}
