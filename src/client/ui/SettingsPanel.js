// Settings list, shown from the start menu and the pause menu.
import { MenuList } from './MenuList.js';
import { settings, setSetting } from '../settings.js';

/**
 * @param {Phaser.Scene} scene
 * @param {{ x: number, y: number, depth: number, onBack: () => void }} o
 * @returns {MenuList}
 */
export function openSettings(scene, { x, y, depth, onBack }) {
  const toggle = (key, name) => ({
    label: () => `${name}: ${settings[key] ? 'on' : 'off'}`,
    choose: () => setSetting(key, !settings[key]),
  });
  return new MenuList(scene, {
    x,
    y,
    depth,
    width: 200,
    items: [
      {
        label: () => `< Music volume: ${settings.musicVolume} >`,
        choose: () => {},
        change: (step) => setSetting('musicVolume', settings.musicVolume + step),
      },
      { label: () => `Sound: ${settings.muted ? 'off' : 'on'}`, choose: () => setSetting('muted', !settings.muted) },
      toggle('screenShake', 'Screen shake'),
      toggle('minimap', 'Map'),
      toggle('showFps', 'Show FPS'),
      {
        label: () => `Full screen: ${document.fullscreenElement ? 'on' : 'off'}`,
        choose: () => {
          const done = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
          done?.catch(() => {});
        },
      },
      { label: () => 'Back', choose: onBack },
    ],
  });
}
