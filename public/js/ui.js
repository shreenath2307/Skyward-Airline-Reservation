/* UI kit: toasts, modal/drawer layers, chips, pickers and the metadata-driven form builder */
import { html, raw, esc, $, $$, on, debounce, uid, money, fdate } from './util.js';
import { icon } from './icons.js';
import { api, qs, store, ent, ApiError } from './api.js';

/* ================================================================== */
/*  Chips / small display pieces                                        */
/* ================================================================== */
const TONE = {
  Confirmed: 'success', Success: 'success', Scheduled: 'success', Available: 'success', Published: 'success', Processed: 'success',
  Completed: 'success', Delivered: 'success', Collected: 'success', Approved: 'success',
  Pending: 'warn', Delayed: 'warn', Requested: 'warn', 'Under Maintenance': 'warn', 'In Transit': 'warn',
  'Checked-In': 'info', Loaded: 'info', Departed: 'info', Booked: 'info', Refunded: 'info', Arrived: 'info',
  Cancelled: 'danger', Failed: 'danger', Lost: 'danger', Rejected: 'danger', Flagged: 'danger', Blocked: 'danger',
  'Not Collected': 'neutral', None: 'neutral',
};
export const statusChip = (v) => (v === null || v === undefined || v === '' ? raw('<span class="muted">—</span>') :
  html`<span class="chip tone-${TONE[v] || 'neutral'}"><i class="dot"></i>${v}</span>`);
export const tierChip = (v) => html`<span class="chip tier tier-${String(v || 'None').toLowerCase()}">${v === 'None' || !v ? 'Standard' : v}</span>`;
export const idChip = (n) => html`<span class="idchip">${n}</span>`;
export const stars = (n, max = 5) => {
  const v = Math.round(Number(n) || 0);
  return html`<span class="stars" title="${n} / ${max}">${Array.from({ length: max }, (_, i) => icon('star', 14, i < v ? 'on' : ''))}</span>`;
};
export const emptyState = ({ icon: ic = 'inbox', title, text = '', action = '' }) =>
  html`<div class="empty">${icon(ic, 34)}<h4>${title}</h4>${text ? html`<p>${text}</p>` : ''}${raw(action)}</div>`;
export const spinner = () => raw('<span class="spin" aria-label="Loading"></span>');
export const skeletonRows = (n = 6) => html`<div class="skel-list">${Array.from({ length: n }, () => raw('<div class="skel"></div>'))}</div>`;

/* ================================================================== */
/*  Toasts                                                              */
/* ================================================================== */
export function toast(message, type = 'success', ms = 4200) {
  let host = $('#toasts');
  if (!host) { host = document.createElement('div'); host.id = 'toasts'; document.body.appendChild(host); }
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `${icon(type === 'error' ? 'alert' : type === 'info' ? 'info' : 'check', 18)}<span>${esc(message)}</span>`;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  const kill = () => { el.classList.remove('in'); setTimeout(() => el.remove(), 250); };
  setTimeout(kill, ms);
  el.addEventListener('click', kill);
}
export const toastError = (e) => toast(e instanceof ApiError || e instanceof Error ? e.message : String(e), 'error', 6000);

/* ================================================================== */
/*  Layers: modal + drawer                                              */
/* ================================================================== */
const stack = [];
function layerHost() {
  let h = $('#layers');
  if (!h) { h = document.createElement('div'); h.id = 'layers'; document.body.appendChild(h); }
  return h;
}
function syncScroll() { document.body.classList.toggle('no-scroll', stack.length > 0); }

function openLayer(kind, { title, subtitle, eyebrow, content, footer, size = 'md', persistent = false, onClose, headExtra = '' }) {
  const layer = document.createElement('div');
  layer.className = `layer layer-${kind}`;
  layer.innerHTML = `
    <div class="scrim"></div>
    <section class="sheet ${kind} size-${size}" role="dialog" aria-modal="true">
      <header class="sheet-head">
        <div class="sheet-titles">
          ${eyebrow ? `<div class="eyebrow">${esc(eyebrow)}</div>` : ''}
          <h3>${title instanceof Object ? title : esc(title || '')}</h3>
          ${subtitle ? `<p>${subtitle instanceof Object ? subtitle : esc(subtitle)}</p>` : ''}
        </div>
        <div class="sheet-head-extra">${headExtra}</div>
        <button class="icon-btn" data-close aria-label="Close">${icon('x', 20)}</button>
      </header>
      <div class="sheet-body"></div>
      ${footer ? '<footer class="sheet-foot"></footer>' : ''}
    </section>`;
  layerHost().appendChild(layer);
  const body = $('.sheet-body', layer);
  const foot = $('.sheet-foot', layer);
  const setContent = (c) => { if (c instanceof Node) { body.replaceChildren(c); } else { body.innerHTML = String(c); } };
  setContent(content ?? '');
  if (foot) foot.innerHTML = String(footer);
  const ctl = {
    el: layer, body, foot, setContent,
    close(result) {
      const i = stack.indexOf(ctl);
      if (i < 0) return;
      stack.splice(i, 1);
      layer.classList.remove('in');
      setTimeout(() => layer.remove(), 220);
      syncScroll();
      if (onClose) onClose(result);
    },
  };
  stack.push(ctl);
  syncScroll();
  requestAnimationFrame(() => layer.classList.add('in'));
  layer.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) ctl.close();
    else if (e.target.classList.contains('scrim') && !persistent) ctl.close();
  });
  setTimeout(() => { const f = $('input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea', body); if (f && kind === 'modal') f.focus({ preventScroll: true }); }, 120);
  return ctl;
}
export const openModal = (o) => openLayer('modal', o);
export const openDrawer = (o) => openLayer('drawer', { size: 'lg', ...o });
export const closeAllLayers = () => [...stack].reverse().forEach((l) => l.close());
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && stack.length) {
    if ($('.combo-menu.open')) return;       // let the picker close first
    stack[stack.length - 1].close();
  }
});

export function confirmDialog({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', tone = 'primary', icon: ic = 'alert' }) {
  return new Promise((resolve) => {
    let done = false;
    const m = openModal({
      title: html`<span class="confirm-title ${tone}">${icon(ic, 22)}${title}</span>`, size: 'sm',
      content: html`<div class="confirm-body">${raw(message)}</div>`,
      footer: html`<button class="btn ghost" data-close>${cancelText}</button><button class="btn ${tone === 'danger' ? 'danger' : 'primary'}" data-ok>${confirmText}</button>`,
      onClose: () => { if (!done) resolve(false); },
    });
    $('[data-ok]', m.el).addEventListener('click', () => { done = true; resolve(true); m.close(); });
  });
}

/** Run an async action on a button with a spinner + disabled state. */
export async function busy(btn, fn) {
  const label = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spin sm"></span>`;
  btn.style.minWidth = `${btn.offsetWidth}px`;
  try { return await fn(); } finally { btn.disabled = false; btn.innerHTML = label; btn.style.minWidth = ''; }
}

/* ================================================================== */
/*  Search-as-you-type picker (passengers / flights / bookings)         */
/* ================================================================== */
export function combo(container, { kind, scope = '', value = null, label = null, placeholder = 'Search…', params = null, onChange = null, disabled = false }) {
  const id = uid('cb');
  container.classList.add('combo');
  container.innerHTML = `
    <div class="combo-input">${icon('search', 18)}
      <input type="text" id="${id}" autocomplete="off" placeholder="${esc(placeholder)}" ${disabled ? 'disabled' : ''}/>
      <button type="button" class="combo-clear" tabindex="-1" aria-label="Clear" hidden>${icon('x', 16)}</button>
    </div>`;
  const input = $('input', container);
  const clear = $('.combo-clear', container);
  const menu = document.createElement('div');
  menu.className = 'combo-menu';
  document.body.appendChild(menu);

  let selected = null;          // {id, label, ...}
  let items = []; let hi = -1; let open = false; let seq = 0;

  const place = () => {
    const r = input.parentElement.getBoundingClientRect();
    menu.style.left = `${r.left}px`; menu.style.width = `${r.width}px`;
    const below = window.innerHeight - r.bottom;
    if (below < 260 && r.top > below) { menu.style.top = 'auto'; menu.style.bottom = `${window.innerHeight - r.top + 6}px`; }
    else { menu.style.bottom = 'auto'; menu.style.top = `${r.bottom + 6}px`; }
  };
  const close = () => { open = false; menu.classList.remove('open'); };
  const paint = () => {
    menu.innerHTML = items.length
      ? items.map((it, i) => `<button type="button" class="combo-item ${i === hi ? 'hi' : ''}" data-i="${i}">
            <span class="ci-main"><b>${esc(it.label)}</b><small>${esc(it.sub || '')}</small></span>
            ${it.tag ? `<span class="ci-tag">${String(statusOrTier(it.tag))}</span>` : ''}</button>`).join('')
      : '<div class="combo-none">No matches</div>';
  };
  const statusOrTier = (t) => (['None', 'Silver', 'Gold', 'Platinum'].includes(t) ? tierChip(t) : statusChip(t));
  const load = async (q) => {
    const my = ++seq;
    try {
      const extra = params ? params() : {};
      const r = await api.get(`/lookup/${kind}${qs({ q, scope, ...extra })}`);
      if (my !== seq) return;
      items = r; hi = items.length ? 0 : -1; paint();
    } catch (e) { menu.innerHTML = `<div class="combo-none">${esc(e.message)}</div>`; }
  };
  const openMenu = () => { if (disabled) return; open = true; place(); menu.classList.add('open'); load(selected && input.value === selected.label ? '' : input.value); };
  const choose = (it) => {
    selected = it; input.value = it.label; clear.hidden = disabled; close();
    container.dataset.value = it.id;
    if (onChange) onChange(it.id, it);
  };
  const setValue = async (v, lbl) => {
    if (v === null || v === undefined || v === '') { selected = null; input.value = ''; clear.hidden = true; container.dataset.value = ''; return; }
    if (lbl) { selected = { id: v, label: lbl }; }
    else {
      try { const r = await api.get(`/lookup/${kind}${qs({ id: v })}`); selected = r[0] || { id: v, label: `#${v}` }; }
      catch (_) { selected = { id: v, label: `#${v}` }; }
    }
    input.value = selected.label; clear.hidden = disabled; container.dataset.value = v;
  };

  input.addEventListener('focus', openMenu);
  input.addEventListener('input', debounce(() => { if (!open) openMenu(); else load(input.value); }, 200));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) openMenu(); hi = Math.min(items.length - 1, hi + 1); paint(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); hi = Math.max(0, hi - 1); paint(); }
    else if (e.key === 'Enter') { if (open && items[hi]) { e.preventDefault(); choose(items[hi]); } }
    else if (e.key === 'Escape') { if (open) { e.stopPropagation(); close(); } }
  });
  input.addEventListener('blur', () => setTimeout(() => { close(); if (selected) input.value = selected.label; else input.value = ''; }, 150));
  menu.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const b = e.target.closest('.combo-item');
    if (b) choose(items[Number(b.dataset.i)]);
  });
  clear.addEventListener('click', () => { selected = null; input.value = ''; clear.hidden = true; container.dataset.value = ''; if (onChange) onChange(null, null); input.focus(); });
  window.addEventListener('resize', () => open && place());
  document.addEventListener('scroll', () => open && place(), true);

  if (value !== null && value !== undefined && value !== '') setValue(value, label);
  return {
    get value() { return selected ? selected.id : null; },
    get item() { return selected; },
    setValue, clear: () => clear.click(),
    destroy() { menu.remove(); },
  };
}

/* ================================================================== */
/*  Metadata-driven form builder                                        */
/* ================================================================== */
const isSegmented = (f) => f.type === 'select' && f.options && f.options.length <= 4 && f.options.join('').length <= 26;
const ymd = (v) => (v ? String(v).slice(0, 10) : '');
const hm = (v) => (v ? String(v).slice(0, 5) : '');

/**
 * buildForm('passengers', { mode, values, compute, only, labels, lookupParams, onChange })
 *  compute(vals, changedName, items) -> patch object (computed fields)
 */
export function buildForm(entKey, opts = {}) {
  const { mode = 'create', values = {}, compute = null, only = null, labels = {}, lookupParams = {}, onChange = null, exclude = [], collapse = [] } = opts;
  const meta = ent(entKey);
  const vals = {};
  const items = {};
  const combos = {};
  const root = document.createElement('div');
  root.className = 'form fwrap';

  const visible = meta.fields.filter((f) =>
    !exclude.includes(f.name)
    && (!only || only.includes(f.name))
    && !(mode === 'create' && f.hideOnCreate));
  const byName = Object.fromEntries(visible.map((f) => [f.name, f]));

  const isLocked = (f) => (mode === 'edit' && f.lockedOnEdit) || f.readonly;

  // initial values
  for (const f of visible) {
    let v = values[f.name];
    if (v === undefined || v === null) {
      if (mode === 'create') {
        if (f.type === 'switch') v = f.default === '1' || f.default === 1 ? 1 : 0;
        else if (f.default !== null && f.default !== undefined && !/^current_timestamp/i.test(f.default)) v = f.default;
        else v = f.type === 'select' && f.notNull && !isSegmented(f) ? '' : '';
      } else v = f.type === 'switch' ? 0 : '';
    }
    if (f.type === 'date') v = ymd(v);
    if (f.type === 'time') v = hm(v);
    vals[f.name] = v;
  }

  const controlHTML = (f, id) => {
    const dis = isLocked(f) ? 'disabled' : '';
    const v = vals[f.name];
    if (f.lookup) return `<div class="combo-host" data-combo="${f.name}"></div>`;
    if (f.type === 'rating') {
      return `<div class="rating ${dis ? 'disabled' : ''}" data-rating="${f.name}">${[1, 2, 3, 4, 5].map((n) =>
        `<button type="button" data-v="${n}" ${dis} class="${Number(v) >= n ? 'on' : ''}" aria-label="${n} star">${icon('star', 24)}</button>`).join('')}<span class="rating-num">${v || '–'}/5</span></div>`;
    }
    if (f.type === 'switch') {
      return `<label class="switch"><input type="checkbox" id="${id}" name="${f.name}" ${Number(v) ? 'checked' : ''} ${dis}/><i></i><span class="switch-text">${Number(v) ? 'Yes' : 'No'}</span></label>`;
    }
    if (f.type === 'select') {
      if (isSegmented(f)) {
        return `<div class="seg" data-seg="${f.name}">${f.options.map((o) =>
          `<button type="button" class="${o === v ? 'on' : ''}" data-v="${esc(o)}" ${dis}>${esc(o)}</button>`).join('')}</div>`;
      }
      return `<select id="${id}" name="${f.name}" ${dis}>${f.notNull && v === '' ? '<option value="" disabled selected>Select…</option>' : ''}${
        !f.notNull ? '<option value="">—</option>' : ''}${f.options.map((o) => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    }
    if (f.type === 'textarea') {
      return `<textarea id="${id}" name="${f.name}" rows="3" maxlength="${f.maxLength || 400}" placeholder="${esc(f.placeholder || '')}" ${dis}>${esc(v)}</textarea>
              <div class="counter" data-counter="${f.name}">${String(v).length} / ${f.maxLength || 400}</div>`;
    }
    const type = f.type === 'number' ? 'number' : f.type; // text, email, tel, date, time
    const step = f.type === 'number' ? ` step="${f.step || 1}"` : '';
    const dl = f.datalist ? ` list="dl-${f.datalist}"` : '';
    const ml = f.maxLength && type === 'text' ? ` maxlength="${f.maxLength}"` : '';
    return `<input type="${type}" id="${id}" name="${f.name}" value="${esc(v)}"${step}${dl}${ml} placeholder="${esc(f.placeholder || '')}" ${dis}
             ${f.transform === 'upper' ? 'style="text-transform:uppercase"' : ''} ${f.type === 'number' ? 'inputmode="decimal"' : ''} autocomplete="off"/>`;
  };

  const fieldHTML = (f) => {
    const id = uid('f');
    const locked = isLocked(f);
    return `<div class="field ${locked ? 'is-locked' : ''} t-${f.type}" data-field="${f.name}" data-span="${Math.min(3, f.span || 1)}">
      <label for="${id}">${esc(f.label)}${f.required && !locked ? '<span class="req" title="Required">*</span>' : ''}${locked ? icon('lock', 12) : ''}</label>
      <div class="control">${controlHTML(f, id)}</div>
      ${f.hint ? `<div class="fhint">${esc(f.hint)}</div>` : ''}
      <div class="ferr" role="alert"></div></div>`;
  };

  const groupsHTML = meta.groups.map((g) => {
    const fs = g.fields.filter((n) => byName[n]).map((n) => byName[n]);
    if (!fs.length) return '';
    const folded = collapse.includes(g.title);
    return `<section class="fgroup ${folded ? 'folded' : ''}">
      <h4 ${folded ? 'data-fold' : ''}>${esc(g.title)}${folded ? icon('chevronD', 16) : ''}</h4>
      <div class="fgrid">${fs.map(fieldHTML).join('')}</div></section>`;
  }).join('');

  const lists = store.meta.lists || {};
  const dls = Object.entries({ airlines: lists.airlines, aircraft: lists.aircraft }).filter(([, v]) => v)
    .map(([k, v]) => `<datalist id="dl-${k}">${v.map((o) => `<option value="${esc(o)}">`).join('')}</datalist>`).join('');
  root.innerHTML = groupsHTML + dls;

  /* ---- DOM sync helpers ---- */
  const fieldEl = (name) => $(`[data-field="${name}"]`, root);
  const setDom = (name, v) => {
    const f = byName[name]; const el = fieldEl(name); if (!f || !el) return;
    if (f.lookup) return;
    if (f.type === 'rating') {
      $$('.rating button', el).forEach((b) => b.classList.toggle('on', Number(b.dataset.v) <= Number(v)));
      $('.rating-num', el).textContent = `${v || '–'}/5`;
    } else if (f.type === 'switch') {
      const cb = $('input', el); cb.checked = !!Number(v); $('.switch-text', el).textContent = Number(v) ? 'Yes' : 'No';
    } else if (isSegmented(f)) {
      $$('.seg button', el).forEach((b) => b.classList.toggle('on', b.dataset.v === v));
    } else {
      const inp = $('input, select, textarea', el); if (inp) inp.value = v ?? '';
      const c = $('[data-counter]', el); if (c) c.textContent = `${String(v ?? '').length} / ${f.maxLength || 400}`;
    }
  };
  const setError = (name, msg) => {
    const el = fieldEl(name); if (!el) return false;
    el.classList.toggle('has-error', !!msg);
    $('.ferr', el).textContent = msg || '';
    return true;
  };
  const changed = (name) => {
    setError(name, '');
    if (compute) {
      const patch = compute(vals, name, items) || {};
      for (const [k, v] of Object.entries(patch)) {
        if (!(k in vals) && !byName[k]) continue;
        vals[k] = v; setDom(k, v);
        if (combos[k] && (v === '' || v === null)) combos[k].clear();
      }
    }
    if (onChange) onChange(vals, name, items);
  };

  /* ---- events ---- */
  root.addEventListener('input', (e) => {
    const inp = e.target.closest('input, textarea, select'); if (!inp || !inp.name) return;
    const f = byName[inp.name]; if (!f) return;
    if (f.type === 'switch') { vals[f.name] = inp.checked ? 1 : 0; $('.switch-text', fieldEl(f.name)).textContent = inp.checked ? 'Yes' : 'No'; }
    else vals[f.name] = inp.value;
    const c = $('[data-counter]', fieldEl(f.name)); if (c) c.textContent = `${inp.value.length} / ${f.maxLength || 400}`;
    changed(f.name);
  });
  root.addEventListener('click', (e) => {
    const seg = e.target.closest('.seg button');
    if (seg && !seg.disabled) { const n = seg.parentElement.dataset.seg; vals[n] = seg.dataset.v; setDom(n, vals[n]); changed(n); return; }
    const st = e.target.closest('.rating button');
    if (st && !st.disabled) { const n = st.parentElement.dataset.rating; vals[n] = Number(st.dataset.v); setDom(n, vals[n]); changed(n); return; }
    const fold = e.target.closest('[data-fold]');
    if (fold) fold.parentElement.classList.toggle('folded');
  });

  /* ---- pickers ---- */
  for (const f of visible.filter((x) => x.lookup)) {
    const [kind, scope] = f.lookup.split(':');
    const host = $(`[data-combo="${f.name}"]`, root);
    combos[f.name] = combo(host, {
      kind, scope: scope || '', value: vals[f.name] || null, label: labels[f.name] || null,
      placeholder: `Search ${f.label.toLowerCase()}…`, disabled: isLocked(f),
      params: lookupParams[f.name] ? () => lookupParams[f.name](vals) : null,
      onChange: (id, item) => { vals[f.name] = id || ''; items[f.name] = item; changed(f.name); },
    });
  }

  // initial computed values
  if (compute && mode === 'create') {
    const patch = compute(vals, null, items) || {};
    for (const [k, v] of Object.entries(patch)) { vals[k] = v; setDom(k, v); }
  }

  return {
    el: root, vals, combos, items,
    getValues() { return { ...vals }; },
    set(name, v) { vals[name] = v; setDom(name, v); },
    setLookup(name, id, label) { vals[name] = id; return combos[name] && combos[name].setValue(id, label); },
    setError,
    setErrors(fields = {}, prefix = '') {
      let first = null;
      for (const [k, msg] of Object.entries(fields)) {
        const name = prefix ? (k.startsWith(prefix) ? k.slice(prefix.length) : null) : k;
        if (name && setError(name, msg)) first = first || name;
      }
      if (first) { const el = fieldEl(first); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      return !!first;
    },
    validate() {
      let first = null;
      for (const f of visible) {
        if (isLocked(f)) continue;
        const v = vals[f.name];
        const empty = v === '' || v === null || v === undefined;
        let msg = '';
        if (f.required && empty) msg = 'Required';
        else if (!empty && f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) msg = 'Enter a valid email address';
        else if (!empty && f.type === 'tel' && (String(v).replace(/\D/g, '').length < 7)) msg = 'Enter a valid phone number';
        else if (!empty && f.type === 'number' && !Number.isFinite(Number(v))) msg = 'Enter a number';
        else if (!empty && f.type === 'rating' && !(v >= 1 && v <= 5)) msg = 'Pick 1 – 5 stars';
        if (msg && !first) first = f.name;
        setError(f.name, msg);
      }
      if (first) { const el = fieldEl(first); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); const i = $('input,select,textarea', el); if (i) i.focus({ preventScroll: true }); }
      return !first;
    },
    destroy() { Object.values(combos).forEach((c) => c.destroy()); },
  };
}

/** Standard create/edit modal around buildForm. onSave(values) must return the saved record or throw ApiError. */
export function formModal({ entKey, mode, title, subtitle, eyebrow, values, labels, compute, only, exclude, lookupParams, collapse, size = 'lg', saveText, onSave, before = '', after = '' }) {
  const form = buildForm(entKey, { mode, values, labels, compute, only, exclude, lookupParams, collapse });
  const wrap = document.createElement('div');
  wrap.className = 'form-modal-body';
  if (before) wrap.insertAdjacentHTML('beforeend', String(before));
  wrap.appendChild(form.el);
  if (after) wrap.insertAdjacentHTML('beforeend', String(after));
  const m = openModal({
    title, subtitle, eyebrow, size, persistent: true, content: wrap,
    footer: html`<span class="foot-msg" data-msg></span><button class="btn ghost" data-close>Cancel</button><button class="btn primary" data-save>${icon('check', 18)}${saveText || (mode === 'edit' ? 'Save changes' : 'Create')}</button>`,
    onClose: () => form.destroy(),
  });
  const btn = $('[data-save]', m.el);
  const msg = $('[data-msg]', m.el);
  const submit = async () => {
    msg.textContent = '';
    if (!form.validate()) { msg.textContent = 'Please fix the highlighted fields.'; return; }
    await busy(btn, async () => {
      try {
        const saved = await onSave(form.getValues(), form);
        m.close(saved);
      } catch (e) {
        if (e instanceof ApiError) {
          const hit = e.fields ? form.setErrors(e.fields) : false;
          msg.textContent = hit ? e.message : '';
          if (!hit) toastError(e);
        } else toastError(e);
      }
    });
  };
  btn.addEventListener('click', submit);
  m.el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && !e.target.closest('.combo')) { e.preventDefault(); submit(); } });
  return { modal: m, form };
}

/* ---- small reusable renderers for key/value blocks ---- */
export const kv = (label, value, cls = '') => html`<div class="kv ${cls}"><dt>${label}</dt><dd>${value === null || value === undefined || value === '' ? raw('<span class="muted">—</span>') : value}</dd></div>`;
export const yesNo = (v) => (Number(v) ? raw(`<span class="yn yes">${String(icon('check', 14))}Yes</span>`) : raw('<span class="yn no">No</span>'));
