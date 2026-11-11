/* Tiny helpers: safe HTML templating, formatting, DOM utilities. No framework needed. */

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
export const raw = (s) => new Raw(String(s ?? ''));

function val(v) {
  if (v === null || v === undefined || v === false) return '';
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(val).join('');
  return esc(v);
}
/** html`<b>${userText}</b>` -> escapes interpolations unless they are html`` themselves. */
export function html(strings, ...vals) {
  let out = '';
  strings.forEach((s, i) => { out += s; if (i < vals.length) out += val(vals[i]); });
  return new Raw(out);
}
export const mount = (el, content) => { el.innerHTML = String(content); return el; };
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Delegated event listener: on(root, 'click', '[data-act]', (e, el) => ...) */
export function on(root, type, selector, handler) {
  root.addEventListener(type, (e) => {
    const t = e.target.closest(selector);
    if (t && root.contains(t)) handler(e, t);
  });
}
export const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const uid = (() => { let n = 0; return (p = 'id') => `${p}${++n}`; })();

/* ---------------- formatting ---------------- */
const inr0 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = new Intl.NumberFormat('en-IN');
export const money = (n) => (n === null || n === undefined || n === '' ? '—' : inr0.format(Number(n)));
export const money2 = (n) => (n === null || n === undefined || n === '' ? '—' : inr2.format(Number(n)));
export const fnum = (n) => (n === null || n === undefined ? '—' : num.format(Number(n)));
/** 12,34,567 -> "12.3 L" style compact for big KPI numbers */
export function compactINR(n) {
  n = Number(n || 0);
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return inr0.format(n);
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function fdate(s, opts = {}) {
  if (!s) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return s;
  const d = `${m[3]} ${MONTHS[+m[2] - 1]}`;
  return opts.noYear ? d : `${d} ${m[1]}`;
}
export const ftime = (s) => (s ? String(s).slice(0, 5) : '—');
export function fdur(min) {
  if (min === null || min === undefined || Number.isNaN(Number(min)) || min <= 0) return '—';
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`;
}
export const initials = (name) => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
export const plural = (n, one, many) => `${fnum(n)} ${n === 1 ? one : many || `${one}s`}`;
export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function nowHM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
export const pad = (n, w = 2) => String(n).padStart(w, '0');

/* ---------------- tiny event bus ---------------- */
const listeners = {};
export const bus = {
  on(evt, fn) { (listeners[evt] = listeners[evt] || new Set()).add(fn); return () => listeners[evt].delete(fn); },
  emit(evt, data) { (listeners[evt] || []).forEach((fn) => fn(data)); },
};
