/* App shell: navigation, theme, router, global PNR finder */
import { html, mount, $, $$, on } from './util.js';
import { icon } from './icons.js';
import { api, loadMeta, qs } from './api.js';
import { toast, toastError, closeAllLayers } from './ui.js';
import { initHCI, setTheme, toggleTheme, initRecentSearch, rememberSearch, flushDeletes } from './hci.js';

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

/* ---------- chrome ---------- */
/* HCI-R1: shortcut letters shown next to nav items so the same pattern is visible everywhere */
const NAV_KEYS = { dashboard: 'g d', book: 'g b', bookings: 'g k', flights: 'g f', seats: 'g s', passengers: 'g p', payments: 'g y', reviews: 'g r', insights: 'g i' };
function buildChrome() {
  $('#nav').innerHTML = NAV.map(([label, items]) => `<div class="nav-label">${label}</div>${items.map(([key, text, ic]) =>
    `<a href="#/${key}" data-nav="${key}"${NAV_KEYS[key] ? ` title="${text} (${NAV_KEYS[key]})"` : ''}>${icon(ic, 20)}<span>${text}</span>${NAV_KEYS[key] ? `<kbd class="nav-kbd" aria-hidden="true">${NAV_KEYS[key]}</kbd>` : ''}</a>`).join('')}`).join('');
  $('#menuBtn').innerHTML = String(icon('menu', 22));
  $('#pnrIcon').innerHTML = String(icon('search', 18));
  $('#topBook').innerHTML = `${icon('plus', 18)}<span>New booking</span>`;
  const homeIc = $('#homeIc'); if (homeIc) homeIc.innerHTML = String(icon('home', 16));
  setTheme(document.documentElement.getAttribute('data-theme') || 'light');
  $('#themeBtn').addEventListener('click', toggleTheme);
  const side = $('#sidebar'); const scrim = $('#navScrim');
  const toggle = (open) => { side.classList.toggle('open', open); scrim.classList.toggle('show', open); $('#menuBtn').setAttribute('aria-expanded', String(open)); };
  $('#menuBtn').addEventListener('click', () => toggle(!side.classList.contains('open')));
  scrim.addEventListener('click', () => toggle(false));
  on($('#nav'), 'click', 'a', () => toggle(false));

  const findBooking = async (q) => {
    q = String(q || '').trim(); if (!q) return;
    try {
      const r = await api.get(`/bookings${qs({ q, pageSize: 5 })}`);
      if (!r.rows.length) { toast(`No booking matches "${q}". Check the PNR (e.g. SKY…) or try a passenger name.`, 'error'); return; }
      rememberSearch(q);                                               // HCI-R8
      const exact = r.rows.find((b) => b.BookingReference.toUpperCase() === q.toUpperCase()) || r.rows[0];
      if (r.rows.length > 1 && exact.BookingReference.toUpperCase() !== q.toUpperCase()) toast(`${r.total} bookings match "${q}" — showing the closest. See all on the Bookings page.`, 'info', 4500);
      const { openBooking } = await import('./drawers.js');
      closeAllLayers(); openBooking(exact.BookingID);
      $('#pnrInput').value = '';
    } catch (err) { toastError(err); }
  };
  $('#pnrForm').addEventListener('submit', (e) => { e.preventDefault(); findBooking($('#pnrInput').value); });
  /* HCI-R8: dropdown of recent searches and recently viewed bookings */
  initRecentSearch({
    onSearch: findBooking,
    onOpenBooking: async (id) => { const { openBooking } = await import('./drawers.js'); closeAllLayers(); openBooking(id); },
  });
}

/* HCI-R3: live database status pill (re-checked every 30 s, with a toast when it changes) */
let dbOnline = null;
async function checkHealth() {
  try {
    const h = await api.get('/health', { silent: dbOnline !== null });
    $('#dbPulse').classList.remove('off');
    $('#dbName').textContent = h.database;
    $('#dbVer').textContent = `Connected · ${h.version.split('-')[0]}`;
    $('#dbStatus')?.setAttribute('title', `MySQL database "${h.database}" is connected`);
    if (dbOnline === false) toast('Database connection restored.', 'success', 3000);
    dbOnline = true;
    return true;
  } catch (e) {
    $('#dbPulse').classList.add('off'); $('#dbName').textContent = 'Database offline'; $('#dbVer').textContent = 'Check the .env file';
    $('#dbStatus')?.setAttribute('title', 'The database cannot be reached');
    if (dbOnline === true) toast('Lost connection to the database. Changes cannot be saved until it is back.', 'error', 8000);
    dbOnline = false;
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
  flushDeletes();               // HCI-R6: queued (undo-able) deletes are committed when the user moves on
  closeAllLayers();
  $$('#nav a').forEach((a) => { const on2 = a.dataset.nav === name; a.classList.toggle('active', on2); if (on2) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  /* HCI-R8: breadcrumb shows where you are; HCI-R1: same header pattern on every page */
  $('#crumb').innerHTML = `<a href="/" title="Skyward home page">Skyward</a> <span class="faint">/</span> ${name === 'dashboard' ? '' : '<a href="#/dashboard">Dashboard</a> <span class="faint">/</span> '}<b aria-current="page">${TITLES[name]}</b>`;
  document.title = `${TITLES[name]} · Skyward`;
  mount(view, html`<div class="page-loading"><span class="spin"></span></div>`);
  try {
    const mod = await PAGES[name]();
    if (token !== routeToken) return;
    view.scrollTo?.(0, 0); window.scrollTo(0, 0);
    /* HCI-R1: each page gets a fresh container, so one page's click handlers never fire on another page */
    const host = document.createElement('div'); host.className = 'page-host';
    view.replaceChildren(host);
    cleanup = (await mod.default(host, params)) || null;
  } catch (e) {
    console.error(e);
    if (token === routeToken) mount(view, html`<div class="card error-screen">${icon('alert', 40)}<h2>Something went wrong</h2><p class="muted">${e.message}</p></div>`);
  }
}

(async function boot() {
  initHCI();
  buildChrome();
  const health = await checkHealth();
  setInterval(checkHealth, 30000);

  if (health !== true) return errorScreen(health);
  try { await loadMeta(); } catch (e) { return errorScreen(e); }
  window.addEventListener('hashchange', route);
  route();
})();
