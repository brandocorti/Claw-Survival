// Dev only: F9 saves a 3x screenshot of the game to production/qa/evidence/
// (through the dev server, see vite.config.js). Also callable from the console:
//   await window.__saveEvidence('my-label')

/**
 * @param {Phaser.Game} game
 * @param {string} name - file label
 * @param {number} [scale] - integer upscale, keeps pixels sharp
 * @returns {Promise<{ saved: string }>}
 */
export function saveEvidence(game, name, scale = 3) {
  return new Promise((resolve, reject) => {
    game.renderer.snapshot((image) => {
      const canvas = document.createElement('canvas');
      canvas.width = image.width * scale;
      canvas.height = image.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      fetch(`/__evidence?name=${encodeURIComponent(name)}`, { method: 'POST', body: canvas.toDataURL('image/png') })
        .then((r) => r.json())
        .then(resolve, reject);
    });
  });
}

/**
 * @param {Phaser.Scene} scene
 * @param {string} label
 */
export function installEvidenceHotkey(scene, label) {
  if (!import.meta.env.DEV) return;
  window.__saveEvidence = (name = label) => saveEvidence(scene.game, name);
  scene.input.keyboard.on('keydown-F9', () => {
    saveEvidence(scene.game, label).then((r) => console.info('[evidence] saved', r.saved));
  });
}
