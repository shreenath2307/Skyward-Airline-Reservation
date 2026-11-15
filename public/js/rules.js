/* "8 Golden Rules" live walkthrough.
   Instead of a separate screen, the tour drives the real app: it opens the right page,
   performs a small demo action (opens a form, shows a toast, opens Settings…), spotlights
   the actual element and explains the rule beside it, with the exact file:line where it is
   implemented. Steps and code locations come from rules-data.js (scripts/build-rules.js). */
import { $ } from './util.js';
import { icon } from './icons.js';
import { toast, closeAllLayers } from './ui.js';
import { RULES } from './rules-data.js';

const STEPS = RULES.flatMap((r) => r.steps.map((s, k) => ({ ...s, rule: r, k, of: r.steps.length })));
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- demo actions run before a step ---------- */
function clearToasts() { $('#toasts')?.replaceChildren(); }
function closeSettings() { if ($('#settingsBtn')?.getAttribute('aria-expanded') === 'true') $('#settingsBtn').click(); }
async function reset() { closeSettings(); closeAllLayers(); clearToasts(); await sleep(250); }
async function openCreate() {
  if ($('.layer [data-save]')) return;
  await reset(); (await import('./forms.js')).createRecord('flights');
}
const ACTIONS = {
  reset,
  openCreate,
  shortcuts: async () => { await reset(); (await import('./hci.js')).openShortcuts(); },
  toast: async () => { clearToasts(); toast('Flight 6E829 updated — changes saved.', 'success', 12000); },
  undo: async () => {
    await reset();
    toast('Booking PNR1234 deleted. (Tour demo — nothing was deleted)', 'undo', 12000, { action: { label: 'Undo', onClick: () => toast('Restored — that is rule 6.', 'success') } });
  },
  settings: async () => { await reset(); $('#settingsBtn')?.click(); },
  search: async () => { await reset(); const i = $('#pnrInput'); i?.focus(); i?.click(); },
  dirtyClose: async () => {
    await openCreate(); await sleep(300);
    const inp = $('.layer .sheet-body input:not([type=hidden])');
    if (inp) { inp.value = 'AI 101'; inp.dispatchEvent(new Event('input', { bubbles: true })); }
    await sleep(150);
    $('.layer [data-close]')?.click();
  },
};

/* ---------- tour state + DOM ---------- */
let idx = -1; let spot = null; let card = null; let target = null; let follow = null; let busy = false;

function waitFor(sel, ms = 4000) {
  return new Promise((res) => {
    const t0 = performance.now();
    (function poll() {
      const el = sel && document.querySelector(sel);
      if (el && el.getClientRects().length) return res(el);
      if (performance.now() - t0 > ms) return res(null);
      setTimeout(poll, 100);
    })();
  });
}
async function goRoute(route) {
  if (!route || location.hash.split('?')[0] === route) return;
  location.hash = route;
  await sleep(500);
}

function place() {
  if (!card) return;
  const vw = innerWidth; const vh = innerHeight; const pad = 8;
  if (!target || !target.isConnected) {
    spot.style.cssText = `left:${vw / 2}px;top:${vh / 2}px;width:0;height:0`;
  } else {
    const r = target.getBoundingClientRect();
    spot.style.cssText = `left:${r.left - pad}px;top:${r.top - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px`;
  }
  if (vw < 640) { // phone: dock the card to whichever half of the screen the target is NOT in
    const low = target && target.isConnected && target.getBoundingClientRect().top + 40 > vh / 2;
    card.style.cssText = low ? 'left:12px;right:12px;top:12px;bottom:auto' : 'left:12px;right:12px;bottom:12px;top:auto';
    return;
  }
  const cw = card.offsetWidth; const ch = card.offsetHeight; const gap = 18;
  let left; let top;
  if (!target || !target.isConnected) { left = (vw - cw) / 2; top = (vh - ch) / 2; } else {
    const r = target.getBoundingClientRect();
    const below = vh - r.bottom; const above = r.top; const right = vw - r.right;
    if (below >= ch + gap + pad) { top = r.bottom + gap + pad; left = r.left; }
    else if (above >= ch + gap + pad) { top = r.top - ch - gap - pad; left = r.left; }
    else if (right >= cw + gap + pad) { left = r.right + gap + pad; top = r.top; }
    else if (r.left >= cw + gap + pad) { left = r.left - cw - gap - pad; top = r.top; }
    else { left = vw - cw - 24; top = vh - ch - 24; }
  }
  left = Math.max(12, Math.min(left, vw - cw - 12)); top = Math.max(12, Math.min(top, vh - ch - 12));
  card.style.cssText = `left:${left}px;top:${top}px`;
}

function render() {
  const s = STEPS[idx]; const r = s.rule;
  card.innerHTML = `
    <div class="tour-top"><span class="tour-num">${String(r.n).padStart(2, '0')}</span>
      <div><div class="tour-eyebrow">Golden rule ${r.n} of ${RULES.length}${s.of > 1 ? ` · part ${s.k + 1} of ${s.of}` : ''}</div>
      <h3 class="tour-title" id="tourTitle">${esc(r.title)}</h3></div>
      <button type="button" class="tour-x" data-tour="end" aria-label="End tour (Esc)" title="End tour (Esc)">${icon('x', 18)}</button></div>
    <p class="tour-text">${esc(s.text)}</p>
    <div class="tour-where"><span>Implemented in</span>${s.where.map((w) => `<code>${esc(w)}</code>`).join('')}</div>
    <div class="tour-dots" aria-hidden="true">${RULES.map((x) => `<button type="button" tabindex="-1" data-rule="${x.n}" class="${x.n === r.n ? 'on' : x.n < r.n ? 'seen' : ''}" title="Rule ${x.n}: ${esc(x.title)}">${x.n}</button>`).join('')}</div>
    <div class="tour-foot"><button type="button" class="btn ghost sm" data-tour="end">End tour</button><span class="grow"></span>
      <button type="button" class="btn sm" data-tour="prev" ${idx === 0 ? 'disabled' : ''}>${icon('arrowL', 16)}Back</button>
      <button type="button" class="btn primary sm" data-tour="next">${idx === STEPS.length - 1 ? `${icon('check', 16)}Finish` : `Next${icon('arrowR', 16)}`}</button></div>`;
  card.setAttribute('aria-labelledby', 'tourTitle');
}

async function show(k) {
  if (busy || k < 0 || k >= STEPS.length) return;
  busy = true; idx = k; const s = STEPS[k];
  card.classList.add('moving');
  await goRoute(s.route);
  if (s.prep && ACTIONS[s.prep]) await ACTIONS[s.prep]();
  target = await waitFor(s.target);
  if (target) {
    const r = target.getBoundingClientRect();
    if (r.top < 70 || r.bottom > innerHeight - 20) { target.scrollIntoView({ block: 'center', behavior: 'smooth' }); await sleep(450); }
  }
  render(); place();
  card.classList.remove('moving');
  card.querySelector('[data-tour="next"]')?.focus({ preventScroll: true });
  busy = false;
}

function onKey(e) {
  if (idx < 0) return;
  if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); endTour(); return; }
  const t = e.target; if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && !card.contains(t)) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); e.stopImmediatePropagation(); next(); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopImmediatePropagation(); show(idx - 1); }
}
const next = () => (idx === STEPS.length - 1 ? endTour(true) : show(idx + 1));

export function endTour(finished = false) {
  if (idx < 0) return;
  idx = -1; clearInterval(follow);
  window.removeEventListener('keydown', onKey, true);
  window.removeEventListener('resize', place);
  spot?.remove(); card?.remove(); spot = card = target = null;
  reset();
  if (finished) toast('Tour finished — all 8 golden rules covered. Press 8 to take it again.', 'success');
}

export function openRulesTour(start = 0) {
  if (idx >= 0) return;
  spot = document.createElement('div'); spot.className = 'tour-spot'; spot.setAttribute('aria-hidden', 'true');
  card = document.createElement('div'); card.className = 'tour-card'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-live', 'polite');
  document.body.append(spot, card);
  card.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tour],[data-rule]'); if (!b) return;
    if (b.dataset.rule) return show(STEPS.findIndex((s) => s.rule.n === Number(b.dataset.rule)));
    if (b.dataset.tour === 'end') endTour();
    else if (b.dataset.tour === 'prev') show(idx - 1);
    else next();
  });
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('resize', place);
  follow = setInterval(place, 120); // follows the element while pages animate or scroll
  const first = STEPS.findIndex((s) => s.rule.n === start + 1);
  show(Math.max(0, first));
}

/* topbar button, "8" key, and deep link from the landing page (?rules=1 or ?rules=N) */
export function initRulesTour() {
  const b = $('#rulesBtn');
  if (b) { b.innerHTML = `${icon('star', 18)}<span>8 Rules tour</span>`; b.addEventListener('click', () => openRulesTour()); }
  document.addEventListener('keydown', (e) => {
    if (e.key !== '8' || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target; if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    e.preventDefault(); openRulesTour();
  });
  const m = location.hash.match(/[?&]rules=(\d+)/);
  if (m) {
    history.replaceState(null, '', location.hash.replace(/[?&]rules=\d+/, ''));
    setTimeout(() => openRulesTour(Math.max(0, Number(m[1]) - 1)), 900);
  }
}
