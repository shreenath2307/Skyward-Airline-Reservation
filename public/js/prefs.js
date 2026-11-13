/* User preferences (theme, text size, motion, toast level, dashboard layout, recents, list filters).
   Dependency-free so every module can import it. Every storage access is wrapped in try/catch. */

/* HCI-R7: persisted user preferences (internal locus of control) */
export const KEYS = {
  theme: 'skyward-theme',
  text: 'skyward-text',          // text-size step index
  motion: 'skyward-motion',      // 'on' | 'off' (same key as the landing page)
  toasts: 'skyward-toasts',      // 'all' | 'errors'
  dash: 'skyward-dash-hidden',   // JSON array of hidden dashboard section ids
  recentQ: 'skyward-recent-searches',
  recentB: 'skyward-recent-bookings',
  filters: 'skyward-filters-',   // + list page key
};

export function getItem(k, fallback = null) {
  try { const v = localStorage.getItem(k); return v === null ? fallback : v; } catch (e) { return fallback; }
}
export function setItem(k, v) {
  try { if (v === null || v === undefined) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* storage blocked */ }
}
export function getJSON(k, fallback) {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
}
export const setJSON = (k, v) => setItem(k, v === null ? null : JSON.stringify(v));

/* HCI-R2: text-size steps (A- / A+) */
export const TEXT_STEPS = [0.9, 1, 1.1, 1.2, 1.3];
export const textStep = () => {
  const n = Number(getItem(KEYS.text, '1'));
  return Number.isInteger(n) && n >= 0 && n < TEXT_STEPS.length ? n : 1;
};

export const prefs = {
  get theme() { return document.documentElement.getAttribute('data-theme') || 'light'; },
  get text() { return textStep(); },
  get motion() { return getItem(KEYS.motion, matchMedia('(prefers-reduced-motion: reduce)').matches ? 'off' : 'on'); },
  get toasts() { return getItem(KEYS.toasts, 'all'); },
  get dashHidden() { const v = getJSON(KEYS.dash, []); return Array.isArray(v) ? v : []; },
};

/** Apply text size + motion to <html>; called at boot and whenever a setting changes. */
export function applyPrefs() {
  const root = document.documentElement;
  root.style.setProperty('--hci-scale', String(TEXT_STEPS[textStep()]));       /* HCI-R2: text size */
  root.classList.toggle('reduce-motion', prefs.motion === 'off');             /* HCI-R2/R7: motion off */
}
export const emitPrefs = () => { applyPrefs(); window.dispatchEvent(new Event('skyward:prefs')); };

/* HCI-R8: recently used searches / recently viewed bookings (max 6 each) */
const MAX_RECENT = 6;
export function pushRecent(key, item, same = (a, b) => a === b) {
  const list = getJSON(key, []);
  const next = [item, ...(Array.isArray(list) ? list : []).filter((x) => !same(x, item))].slice(0, MAX_RECENT);
  setJSON(key, next);
  return next;
}
export const getRecent = (key) => { const v = getJSON(key, []); return Array.isArray(v) ? v : []; };
