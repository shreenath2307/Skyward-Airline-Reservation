/* Shneiderman's 8 Golden Rules — the cross-cutting pieces of the dashboard:
   progress bar, keyboard shortcuts + help, settings popover, skip link, text size,
   undo-able deletes, row highlighting and the recent-search dropdown. */
import { html, $, $$ } from './util.js';
import { icon } from './icons.js';
import { api, onNet } from './api.js';
import { toast, toastError, openModal, layerCount, closeAllLayers } from './ui.js';
import { emitChange } from './common.js';
import { KEYS, TEXT_STEPS, prefs, setItem, setJSON, emitPrefs, applyPrefs, getRecent, pushRecent } from './prefs.js';

/* ------------------------------------------------------------------ */
/*  HCI-R3: top progress bar while any API request is in flight        */
/* ------------------------------------------------------------------ */
function initProgressBar() {
  const bar = document.createElement('div');
  bar.id = 'netbar'; bar.className = 'netbar'; bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);
  const view = $('#view');
  let showT = null; let hideT = null;
  onNet((n) => {
    if (n > 0) {
      clearTimeout(hideT);
      if (view) view.setAttribute('aria-busy', 'true');
      if (!bar.classList.contains('on') && !showT) showT = setTimeout(() => { showT = null; bar.classList.remove('done'); bar.classList.add('on'); }, 120);
    } else {
      clearTimeout(showT); showT = null;
      if (view) view.removeAttribute('aria-busy');
      if (bar.classList.contains('on')) { bar.classList.add('done'); hideT = setTimeout(() => bar.classList.remove('on', 'done'), 380); }
    }
  });
}

/* ------------------------------------------------------------------ */
/*  Theme + text size (shared by topbar buttons, shortcuts, settings)  */
/* ------------------------------------------------------------------ */
export function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  setItem(KEYS.theme, t);
  const b = $('#themeBtn');
  if (b) { b.innerHTML = String(icon(t === 'dark' ? 'sun' : 'moon', 20)); b.title = t === 'dark' ? 'Switch to light theme (t)' : 'Switch to night theme (t)'; }
  window.dispatchEvent(new Event('themechange'));
  window.dispatchEvent(new Event('skyward:prefs'));
}
export const toggleTheme = () => setTheme(prefs.theme === 'dark' ? 'light' : 'dark');

/* HCI-R2: A- / A+ text size, persisted */
export function stepText(d) {
  const next = Math.min(TEXT_STEPS.length - 1, Math.max(0, prefs.text + d));
  if (next === prefs.text) { toast(d > 0 ? 'Text is already at the largest size.' : 'Text is already at the smallest size.', 'info', 2200); return; }
  setItem(KEYS.text, String(next)); emitPrefs();
  toast(`Text size ${Math.round(TEXT_STEPS[next] * 100)}%`, 'info', 1600);
}
function syncTextButtons() {
  const i = prefs.text;
  const dn = $('#txtDown'); const up = $('#txtUp');
  if (dn) dn.disabled = i === 0;
  if (up) up.disabled = i === TEXT_STEPS.length - 1;
  const lbl = $('#txtVal'); if (lbl) lbl.textContent = `${Math.round(TEXT_STEPS[i] * 100)}%`;
}

/* ------------------------------------------------------------------ */
/*  HCI-R2: keyboard shortcuts + "?" help dialog                       */
/* ------------------------------------------------------------------ */
const GO = { d: ['dashboard', 'Dashboard'], b: ['book', 'Book a seat'], k: ['bookings', 'Bookings'], f: ['flights', 'Flights'], s: ['seats', 'Seat maps'], p: ['passengers', 'Passengers'], y: ['payments', 'Payments'], r: ['reviews', 'Reviews'], i: ['insights', 'Insights'] };
export const SHORTCUTS = [
  ['Navigation', [
    ...Object.entries(GO).map(([k, [, label]]) => [['g', k], `Go to ${label}`]),
    [['g', 'h'], 'Go to the Skyward home page'],
  ]],
  ['Actions', [
    [['n'], 'New booking (opens the booking wizard)'],
    [['/'], 'Search bookings by PNR or name'],
    [['t'], 'Toggle light / night theme'],
    [['+'], 'Larger text'], [['-'], 'Smaller text'],
    [[','], 'Open settings'],
  ]],
  ['Anywhere', [
    [['?'], 'Show this list of shortcuts'],
    [['Esc'], 'Close the open dialog, drawer, menu or popover'],
    [['Enter'], 'Submit the focused form'],
    [['Tab'], 'Move between controls (focus is always visible)'],
  ]],
];
const kbd = (keys) => html`${keys.map((k, i) => html`${i ? html`<span class="kbd-then">then</span>` : ''}<kbd>${k}</kbd>`)}`;
export function openShortcuts() {
  if ($('.layer .hci-keys')) return;
  const m = openModal({
    eyebrow: 'Keyboard', title: 'Keyboard shortcuts', size: 'md',
    subtitle: 'Power users can drive Skyward without the mouse. Shortcuts are ignored while you type in a field.',
    content: html`<div class="hci-keys">${SHORTCUTS.map(([group, rows]) => html`<section><h4>${group}</h4><dl>${rows.map(([keys, label]) => html`<div><dt>${kbd(keys)}</dt><dd>${label}</dd></div>`)}</dl></section>`)}</div>`,
    footer: html`<span class="grow"></span><button type="button" class="btn primary" data-close>${icon('check', 18)}Got it</button>`,
  });
  return m;
}

let gPending = null;
function hint(text) {
  let h = $('#hciKeyHint');
  if (!h) { h = document.createElement('div'); h.id = 'hciKeyHint'; h.className = 'hci-keyhint'; h.setAttribute('aria-live', 'polite'); document.body.appendChild(h); }
  h.innerHTML = text; h.classList.toggle('on', !!text);
}
const isTyping = (t) => t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

function initShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
    if (isTyping(e.target)) return;
    const k = e.key;
    if (gPending) {
      clearTimeout(gPending); gPending = null; hint('');
      if (k === 'h') { e.preventDefault(); location.href = '/'; return; }
      const dest = GO[k.toLowerCase()];
      if (dest) { e.preventDefault(); closeAllLayers(); location.hash = `#/${dest[0]}`; }
      return;
    }
    if (k === '?') { e.preventDefault(); openShortcuts(); return; }
    if (layerCount() > 0) return;          // while a dialog is open only Esc / ? apply
    if (k === 'g') { e.preventDefault(); hint('<kbd>g</kbd> then <kbd>d</kbd> <kbd>b</kbd> <kbd>k</kbd> <kbd>f</kbd> <kbd>s</kbd> <kbd>p</kbd> <kbd>y</kbd> <kbd>r</kbd> <kbd>i</kbd> <kbd>h</kbd> …'); gPending = setTimeout(() => { gPending = null; hint(''); }, 1500); return; }
    if (k === 'n') { e.preventDefault(); location.hash = '#/book'; return; }
    if (k === '/') { e.preventDefault(); const i = $('#pnrInput'); if (i) i.focus(); return; }
    if (k === 't') { e.preventDefault(); toggleTheme(); return; }
    if (k === ',') { e.preventDefault(); toggleSettings(true); return; }
    if (k === '+' || k === '=') { e.preventDefault(); stepText(1); return; }
    if (k === '-') { e.preventDefault(); stepText(-1); }
  });
}

/* ------------------------------------------------------------------ */
/*  HCI-R7: settings popover (theme, text, motion, toasts, dashboard)  */
/* ------------------------------------------------------------------ */
export const DASH_SECTIONS = [
  ['hero', 'Welcome banner'],
  ['kpis', 'Key figures'],
  ['charts', 'Booking charts'],
  ['ops', 'Upcoming flights & attention'],
  ['highlights', 'Revenue, latest bookings & ratings'],
];
const segRow = (name, opts, cur) => html`<div class="seg hci-seg" data-pref="${name}" role="radiogroup">${opts.map(([v, l]) => html`<button type="button" role="radio" aria-checked="${v === cur ? 'true' : 'false'}" class="${v === cur ? 'on' : ''}" data-v="${v}">${l}</button>`)}</div>`;
function settingsHTML() {
  const hidden = prefs.dashHidden;
  return html`<div class="hci-pop-head"><b>Settings</b><button type="button" class="icon-btn" data-pop-close aria-label="Close settings (Esc)" title="Close (Esc)">${icon('x', 18)}</button></div>
    <div class="hci-pop-body">
      <div class="hci-set"><span class="lbl">Theme</span>${segRow('theme', [['light', 'Light'], ['dark', 'Night']], prefs.theme)}</div>
      <div class="hci-set"><span class="lbl">Text size</span><div class="hci-text-ctl"><button type="button" class="btn sm" data-text="-1" aria-label="Smaller text">A−</button><output id="txtVal2">${Math.round(TEXT_STEPS[prefs.text] * 100)}%</output><button type="button" class="btn sm" data-text="1" aria-label="Larger text">A+</button></div></div>
      <div class="hci-set"><span class="lbl">Motion &amp; animation</span>${segRow('motion', [['on', 'On'], ['off', 'Off']], prefs.motion)}</div>
      <div class="hci-set"><span class="lbl">Notifications</span>${segRow('toasts', [['all', 'All'], ['errors', 'Errors only']], prefs.toasts)}<small class="muted">Undo prompts are always shown.</small></div>
      <div class="hci-set"><span class="lbl">Dashboard sections</span>
        <div class="hci-checks">${DASH_SECTIONS.map(([id, label]) => html`<label class="hci-check"><input type="checkbox" data-dash-toggle="${id}" ${hidden.includes(id) ? '' : 'checked'}/><span>${label}</span></label>`)}</div></div>
    </div>
    <div class="hci-pop-foot"><button type="button" class="btn sm ghost" data-reset>${icon('refresh', 15)}Reset to defaults</button><button type="button" class="btn sm" data-keys>${icon('keyboard', 15)}Shortcuts</button></div>`;
}
let pop = null;
export function toggleSettings(force) {
  const btn = $('#settingsBtn');
  const open = force !== undefined ? force : !pop;
  if (!open) { if (pop) { pop.remove(); pop = null; } if (btn) btn.setAttribute('aria-expanded', 'false'); return; }
  if (pop) { const f = $('button, input', pop); if (f) f.focus(); return; }
  pop = document.createElement('div');
  pop.className = 'hci-pop'; pop.id = 'settingsPop';
  pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Settings');
  pop.innerHTML = String(settingsHTML());
  document.body.appendChild(pop);
  if (btn) btn.setAttribute('aria-expanded', 'true');
  const redraw = () => { if (pop) pop.innerHTML = String(settingsHTML()); };
  pop.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('[data-pop-close]')) { toggleSettings(false); if (btn) btn.focus(); return; }
    const s = t.closest('[data-pref] button');
    if (s) {
      const key = s.parentElement.dataset.pref; const v = s.dataset.v;
      if (key === 'theme') setTheme(v);
      else { setItem(KEYS[key], v); emitPrefs(); }
      if (key === 'motion') toast(v === 'off' ? 'Animations turned off.' : 'Animations turned on.', 'info', 1800);
      if (key === 'toasts' && v === 'all') toast('All notifications will be shown.', 'info', 1800);
      redraw(); const again = $(`[data-pref="${key}"] [data-v="${v}"]`, pop); if (again) again.focus();
      return;
    }
    const tx = t.closest('[data-text]');
    if (tx) { stepText(Number(tx.dataset.text)); redraw(); return; }
    if (t.closest('[data-reset]')) {
      [KEYS.text, KEYS.motion, KEYS.toasts, KEYS.dash].forEach((k) => setItem(k, null));
      setTheme('light'); emitPrefs(); redraw(); toast('Preferences reset to defaults.', 'success', 2200); return;
    }
    if (t.closest('[data-keys]')) { toggleSettings(false); openShortcuts(); }
  });
  pop.addEventListener('change', (e) => {
    const c = e.target.closest('[data-dash-toggle]'); if (!c) return;
    const hidden = new Set(prefs.dashHidden);
    if (c.checked) hidden.delete(c.dataset.dashToggle); else hidden.add(c.dataset.dashToggle);
    setJSON(KEYS.dash, [...hidden]); emitPrefs();
  });
  setTimeout(() => { const f = $('[data-pref] .on', pop); if (f) f.focus(); }, 30);
}
export const openSettings = () => toggleSettings(true);

function initSettings() {
  const btn = $('#settingsBtn');
  if (btn) btn.addEventListener('click', (e) => { e.stopPropagation(); toggleSettings(); });
  document.addEventListener('mousedown', (e) => { if (pop && !pop.contains(e.target) && !(btn && btn.contains(e.target))) toggleSettings(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && pop) { e.stopPropagation(); toggleSettings(false); if (btn) btn.focus(); } }, true);
  window.addEventListener('skyward:prefs', () => {
    syncTextButtons();
    const o = $('#txtVal2'); if (o) o.textContent = `${Math.round(TEXT_STEPS[prefs.text] * 100)}%`;
  });
}

/* ------------------------------------------------------------------ */
/*  HCI-R6: undo-able deletes (row disappears now, DELETE fires later) */
/* ------------------------------------------------------------------ */
const UNDO_MS = 6000;
const pending = new Map();      // "entKey:id" -> { run, t }
export const isPendingDelete = (entKey, id) => pending.has(`${entKey}:${id}`);
export const pendingDeleteCount = (entKey) => [...pending.keys()].filter((k) => k.startsWith(`${entKey}:`)).length;

export function scheduleDelete({ entKey, id, label, singular, url }) {
  const key = `${entKey}:${id}`;
  if (pending.has(key)) return false;
  const entry = { done: false };
  const run = async (keepalive = false) => {
    if (entry.done) return; entry.done = true;
    pending.delete(key);
    try {
      await api.del(url, { keepalive });
      if (!keepalive) { emitChange(); toast(`${singular} ${label} deleted permanently.`, 'success', 2600); }
    } catch (e) { toastError(e); emitChange(); }
  };
  entry.run = run;
  pending.set(key, entry);
  emitChange();                    // lists hide the row immediately
  entry.t = toast(`${singular} ${label} deleted.`, 'undo', UNDO_MS, {
    action: {
      label: 'Undo',
      onClick: () => {
        if (entry.done) return; entry.done = true; pending.delete(key); emitChange();
        markTouched(entKey, id);
        toast(`${singular} ${label} restored.`, 'success', 2600);
      },
    },
    onExpire: () => run(false),
  });
  return true;
}
/** Send every queued delete now (route change / page unload). */
export function flushDeletes(keepalive = false) {
  for (const entry of [...pending.values()]) { if (entry.t) entry.t.dismiss(); entry.run(keepalive); }
}

/* ------------------------------------------------------------------ */
/*  HCI-R4: highlight the row that was just created / edited / restored */
/* ------------------------------------------------------------------ */
let touchedRow = null;
export const markTouched = (entKey, id) => { if (id !== undefined && id !== null) touchedRow = { entKey, id: String(id) }; };
export function takeTouched(entKey) {
  if (!touchedRow || touchedRow.entKey !== entKey) return null;
  const id = touchedRow.id; touchedRow = null; return id;
}

/* ------------------------------------------------------------------ */
/*  HCI-R8: recent searches + recently viewed bookings under the PNR box */
/* ------------------------------------------------------------------ */
export const rememberSearch = (q) => pushRecent(KEYS.recentQ, q, (a, b) => String(a).toUpperCase() === String(b).toUpperCase());
export const rememberBooking = (b) => pushRecent(KEYS.recentB, b, (a, c) => String(a.id) === String(c.id));

export function initRecentSearch({ onSearch, onOpenBooking }) {
  const input = $('#pnrInput'); const form = $('#pnrForm');
  if (!input || !form) return;
  const box = document.createElement('div');
  box.className = 'hci-recent'; box.id = 'pnrRecent'; box.hidden = true;
  box.setAttribute('role', 'listbox'); box.setAttribute('aria-label', 'Recent searches and bookings');
  form.appendChild(box);
  input.setAttribute('aria-controls', 'pnrRecent'); input.setAttribute('aria-expanded', 'false');
  const paint = () => {
    const q = input.value.trim().toUpperCase();
    const searches = getRecent(KEYS.recentQ).filter((s) => !q || String(s).toUpperCase().includes(q));
    const books = getRecent(KEYS.recentB).filter((b) => !q || `${b.pnr} ${b.name}`.toUpperCase().includes(q));
    if (!searches.length && !books.length) { box.hidden = true; input.setAttribute('aria-expanded', 'false'); return; }
    box.innerHTML = String(html`
      ${searches.length ? html`<div class="hci-recent-h">Recent searches</div>${searches.map((s) => html`<button type="button" role="option" class="hci-recent-i" data-q="${s}">${icon('history', 16)}<span>${s}</span></button>`)}` : ''}
      ${books.length ? html`<div class="hci-recent-h">Recently viewed bookings</div>${books.map((b) => html`<button type="button" role="option" class="hci-recent-i" data-bid="${b.id}">${icon('ticket', 16)}<span><b class="pnr">${b.pnr}</b> ${b.name}<small>${b.route || ''}</small></span></button>`)}` : ''}
      <div class="hci-recent-f"><button type="button" class="linkish" data-clear-recent>Clear history</button><span class="muted">Press <kbd>/</kbd> to search from anywhere</span></div>`);
    box.hidden = false; input.setAttribute('aria-expanded', 'true');
  };
  const hide = () => { box.hidden = true; input.setAttribute('aria-expanded', 'false'); };
  input.addEventListener('focus', paint);
  input.addEventListener('input', paint);
  form.addEventListener('focusout', () => setTimeout(() => { if (!form.contains(document.activeElement)) hide(); }, 120));
  form.addEventListener('submit', hide);
  const items = () => $$('.hci-recent-i', box);
  form.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    const list = items(); const i = list.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); (list[i + 1] || list[0])?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (i <= 0) input.focus(); else list[i - 1].focus(); }
    else if (e.key === 'Escape') { e.stopPropagation(); hide(); input.focus(); }
  });
  box.addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
  box.addEventListener('click', (e) => {
    const q = e.target.closest('[data-q]'); const b = e.target.closest('[data-bid]');
    if (e.target.closest('[data-clear-recent]')) { setItem(KEYS.recentQ, null); setItem(KEYS.recentB, null); hide(); toast('Search history cleared.', 'success', 2000); input.focus(); return; }
    if (q) { input.value = q.dataset.q; hide(); onSearch(q.dataset.q); }
    if (b) { hide(); onOpenBooking(b.dataset.bid); }
  });
}

/* ------------------------------------------------------------------ */
/*  boot                                                               */
/* ------------------------------------------------------------------ */
export function initHCI() {
  applyPrefs();
  initProgressBar();
  initShortcuts();
  initSettings();
  syncTextButtons();
  /* HCI-R2: skip link moves keyboard focus straight to the page content (hash router safe) */
  const skip = $('#skipLink');
  if (skip) skip.addEventListener('click', (e) => { e.preventDefault(); const v = $('#view'); if (v) v.focus(); });
  const dn = $('#txtDown'); const up = $('#txtUp');
  if (dn) { dn.innerHTML = 'A<span aria-hidden="true">−</span>'; dn.addEventListener('click', () => stepText(-1)); }
  if (up) { up.innerHTML = 'A<span aria-hidden="true">+</span>'; up.addEventListener('click', () => stepText(1)); }
  const sb = $('#settingsBtn'); if (sb) sb.innerHTML = String(icon('gear', 20));
  const hb = $('#helpBtn'); if (hb) { hb.innerHTML = String(icon('keyboard', 20)); hb.addEventListener('click', openShortcuts); }
  /* HCI-R6: queued deletes are sent when the user leaves the page */
  window.addEventListener('beforeunload', () => flushDeletes(true));
}
