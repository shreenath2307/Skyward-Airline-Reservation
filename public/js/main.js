/* App shell: navigation, theme, router, global PNR finder */
import { html, mount, $, $$, on } from './util.js';
import { icon } from './icons.js';
import { api, loadMeta, qs } from './api.js';
import { toast, toastError, closeAllLayers } from './ui.js';

const NAV = [
  ['Overview', [['dashboard', 'Dashboard', 'dashboard']]],
  ['Reservations', [['book', 'Book a seat', 'ticket'], ['bookings', 'Bookings', 'receipt'], ['payments', 'Payments', 'card'], ['cancellations', 'Cancellations', 'ban'], ['baggage', 'Baggage', 'bag']]],
  ['Operations', [['flights', 'Flights', 'plane'], ['seats', 'Seat maps', 'seat']]],
  ['People & feedback', [['passengers', 'Passengers', 'users'], ['reviews', 'Reviews', 'star'], ['insights', 'Insights', 'chart']]],
];
const TITLES = { dashboard: 'Dashboard', book: 'Book a seat', bookings: 'Bookings', payments: 'Payments', cancellations: 'Cancellations', baggage: 'Baggage', flights: 'Flights', seats: 'Seat maps', passengers: 'Passengers', reviews: 'Reviews', insights: 'Insights' };
const PAGES = {
  dashboard: () => import('./pages/dashboard.js'),
  book: () => import('./pages/book.js'),
  seats: () => import('./pages/seats.js'),
  insights: () => import('./pages/insights.js'),
  bookings: () => import('./pages/crud.js').then((m) => ({ default: (r, p) => m.default(r, p, 'bookings') })),
  payments: () => import('./pages/crud.js').then((m) => ({ default: (r, p) => m.default(r, p, 'payments') })),
  cancellations: () => import('./pages/crud.js').then((m) => ({ default: (r, p) => m.default(r, p, 'cancellations') })),
  baggage: () => import('./pages/crud.js').then((m) => ({ default: (r, p) => m.default(r, p, 'baggage') })),
  flights: () => import('./pages/crud.js').then((m) => ({ default: (r, p) => m.default(r, p, 'flights') })),
  passengers: () => import('./pages/crud.js').then((m) => ({ default: (r, p) => m.default(r, p, 'passengers') })),
  reviews: () => import('./pages/crud.js').then((m) => ({ default: (r, p) => m.default(r, p, 'reviews') })),
};

const view = $('#view');
let cleanup = null;
let routeToken = 0;

/* ---------- theme ---------- */
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem('skyward-theme', t); } catch (e) { /* private mode */ }
  $('#themeBtn').innerHTML = String(icon(t === 'dark' ? 'sun' : 'moon', 20));
  window.dispatchEvent(new Event('themechange'));
}

/* ---------- chrome ---------- */
function buildChrome() {
  $('#nav').innerHTML = NAV.map(([label, items]) => `<div class="nav-label">${label}</div>${items.map(([key, text, ic]) =>
    `<a href="#/${key}" data-nav="${key}">${icon(ic, 20)}<span>${text}</span></a>`).join('')}`).join('');
  $('#menuBtn').innerHTML = String(icon('menu', 22));
  $('#pnrIcon').innerHTML = String(icon('search', 18));
  $('#topBook').innerHTML = `${icon('plus', 18)}<span>New booking</span>`;
  const t = document.documentElement.getAttribute('data-theme') || 'light';
  $('#themeBtn').innerHTML = String(icon(t === 'dark' ? 'sun' : 'moon', 20));
  $('#themeBtn').addEventListener('click', () => applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));
  const side = $('#sidebar'); const scrim = $('#navScrim');
  const toggle = (open) => { side.classList.toggle('open', open); scrim.classList.toggle('show', open); };
  $('#menuBtn').addEventListener('click', () => toggle(!side.classList.contains('open')));
  scrim.addEventListener('click', () => toggle(false));
  on($('#nav'), 'click', 'a', () => toggle(false));

  $('#pnrForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = $('#pnrInput').value.trim(); if (!q) return;
    try {
      const r = await api.get(`/bookings${qs({ q, pageSize: 5 })}`);
      if (!r.rows.length) { toast(`No booking matches "${q}".`, 'error'); return; }
      const exact = r.rows.find((b) => b.BookingReference.toUpperCase() === q.toUpperCase()) || r.rows[0];
      const { openBooking } = await import('./drawers.js');
      closeAllLayers(); openBooking(exact.BookingID);
      $('#pnrInput').value = '';
    } catch (err) { toastError(err); }
  });
}

async function checkHealth() {
  try {
    const h = await api.get('/health');
    $('#dbPulse').classList.remove('off');
    $('#dbName').textContent = h.database;
    $('#dbVer').textContent = `Connected · ${h.version.split('-')[0]}`;
    return true;
  } catch (e) {
    $('#dbPulse').classList.add('off'); $('#dbName').textContent = 'Database offline'; $('#dbVer').textContent = 'Check the .env file';
    return e;
  }
}

function errorScreen(e) {
  mount(view, html`<div class="card error-screen fade-in">${icon('alert', 44)}<h2>Can’t reach the database</h2>
    <p class="muted">${e.message}</p>
    <pre>1. Start MySQL (MySQL Workbench → Server Status should say "Running").
2. Run  database/AirlineReservationSystem.sql  in MySQL Workbench.
3. Open the .env file in this folder and set DB_USER and DB_PASSWORD.
4. Restart this app:  npm start   — then refresh this page.</pre>
    <div style="margin-top:20px"><button class="btn primary" onclick="location.reload()">${icon('refresh', 18)}Try again</button></div></div>`);
}

/* ---------- router ---------- */
function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '') || 'dashboard';
  const [name, query = ''] = raw.split('?');
  const params = Object.fromEntries(new URLSearchParams(query));
  return { name: PAGES[name] ? name : 'dashboard', params };
}

async function route() {
  const token = ++routeToken;
  const { name, params } = parseHash();
  if (cleanup) { try { cleanup(); } catch (_) { /* ignore */ } cleanup = null; }
  closeAllLayers();
  $$('#nav a').forEach((a) => a.classList.toggle('active', a.dataset.nav === name));
  $('#crumb').innerHTML = `Skyward <span class="faint">/</span> <b>${TITLES[name]}</b>`;
  document.title = `${TITLES[name]} · Skyward`;
  mount(view, html`<div class="page-loading"><span class="spin"></span></div>`);
  try {
    const mod = await PAGES[name]();
    if (token !== routeToken) return;
    view.scrollTo?.(0, 0); window.scrollTo(0, 0);
    mount(view, '');
    cleanup = (await mod.default(view, params)) || null;
  } catch (e) {
    console.error(e);
    if (token === routeToken) mount(view, html`<div class="card error-screen">${icon('alert', 40)}<h2>Something went wrong</h2><p class="muted">${e.message}</p></div>`);
  }
}

(async function boot() {
  buildChrome();
  const health = await checkHealth();
  if (health !== true) return errorScreen(health);
  try { await loadMeta(); } catch (e) { return errorScreen(e); }
  window.addEventListener('hashchange', route);
  route();
})();
