// Player settings, remembered in this browser. Reading and writing never throws
// (storage can be blocked or empty); bad values fall back to the defaults.

const KEY = 'claw-survival-settings';

export const DEFAULT_SETTINGS = Object.freeze({
  /** 0 to 10 */
  musicVolume: 6,
  muted: false,
  screenShake: true,
  minimap: true,
  showFps: false,
});

/** Keeps only known settings with valid values. */
export function cleanSettings(raw) {
  const clean = { ...DEFAULT_SETTINGS };
  if (typeof raw !== 'object' || raw === null) return clean;
  for (const key of Object.keys(clean)) {
    if (typeof raw[key] !== typeof clean[key]) continue;
    if (typeof raw[key] === 'number') {
      if (Number.isFinite(raw[key])) clean[key] = Math.max(0, Math.min(10, Math.round(raw[key])));
    } else {
      clean[key] = raw[key];
    }
  }
  return clean;
}

function load() {
  try {
    return cleanSettings(JSON.parse(localStorage.getItem(KEY)));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** The current settings. Read them directly; change them with setSetting(). */
export const settings = load();
const listeners = new Set();

export function setSetting(key, value) {
  Object.assign(settings, cleanSettings({ ...settings, [key]: value }));
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Not remembered, but still applied.
  }
  for (const fn of listeners) fn(settings);
}

/** Calls fn now and after every change. */
export function onSettings(fn) {
  listeners.add(fn);
  fn(settings);
}
