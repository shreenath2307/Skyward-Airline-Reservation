import { html, raw, mount, $, on, money, compactINR, fnum, fdate, ftime, todayStr } from '../util.js';
import { icon } from '../icons.js';
import { api, city } from '../api.js';
import { statusChip, skeletonRows, stars, idChip } from '../ui.js';
import { airlineAvatar, personAvatar, routeHTML, occBar, onChange, flightLabel } from '../common.js';
import { openFlight, openBooking } from '../drawers.js';
import { prefs } from '../prefs.js';
import { openSettings } from '../hci.js';

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

export default async function render(root) {
  mount(root, html`<div class="fade-in">${skeletonRows(10)}</div>`);
  let charts = [];
  let alive = true;

  const draw = async () => {
    const d = await api.get('/dashboard');
    if (!alive) return;
    const { kpi, attention, byStatus, byAirline, byMonth, byClass, upcoming, upcomingLabel, recent, topRated } = d;
    const occ = Math.round(kpi.occupancy || 0);
    const todayLong = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const next = upcoming[0];
    const flagged = attention.delayedFlights + attention.lostBags + attention.flaggedReviews;

    mount(root, html`<div class="fade-in dash">
      <!-- HCI-R7: dashboard is customisable (sections can be shown / hidden from Settings) -->
      <div class="hci-dash-empty" hidden>${icon('grid', 34)}<h4>All dashboard sections are hidden</h4><p>Turn some back on in Settings.</p><button type="button" class="btn primary" data-customize>${icon('gear', 16)}Customize dashboard</button></div>

      <header class="dash-head" data-dash="hero">
        <div class="dash-head__text">
          <div class="eyebrow">${greeting()} · ${todayLong}</div>
          <h1>Overview</h1>
          <p>${fnum(kpi.openFlights)} flights open for booking${next ? html`. Next departure: <b>${next.FlightNumber}</b>, ${city(next.SourceAirport) || next.SourceAirport} to ${city(next.DestinationAirport) || next.DestinationAirport} on ${fdate(next.DepartureDate)}` : ''}.</p>
        </div>
        <div class="dash-head__actions">
          <a class="btn" href="#/flights">Browse flights</a>
          <button type="button" class="icon-btn" data-customize aria-label="Customize dashboard" title="Choose which dashboard sections are shown">${icon('gear', 18)}</button>
        </div>
      </header>

      <section class="dash-kpis" data-dash="kpis" aria-label="Key figures">
        <div class="dash-kpi"><div class="lbl">Booked revenue</div><div class="val num">${compactINR(kpi.bookedRevenue)}</div><div class="sub">${compactINR(kpi.collected)} collected</div></div>
        <div class="dash-kpi"><div class="lbl">Active bookings</div><div class="val num">${fnum(kpi.activeBookings)}</div><div class="sub">of ${fnum(kpi.totalBookings)} in total</div></div>
        <div class="dash-kpi"><div class="lbl">Seat occupancy</div><div class="val num">${occ}%</div><div class="bar" role="img" aria-label="${occ}% of seats booked"><i style="width:${occ}%"></i></div></div>
        <div class="dash-kpi"><div class="lbl">Passengers</div><div class="val num">${fnum(kpi.passengers)}</div><div class="sub">across ${fnum(kpi.flights)} flights</div></div>
      </section>

      <div class="dash-grid" data-dash="charts">
        <section class="card dash-wide"><div class="card-head"><div><h3>Bookings over time</h3><div class="sub">Reservations per month</div></div></div><div class="chart-box"><canvas id="chMonth" aria-label="Bookings per month"></canvas></div></section>
        <section class="card"><div class="card-head"><div><h3>Booking status</h3><div class="sub">${fnum(kpi.totalBookings)} bookings</div></div></div><div class="chart-box"><canvas id="chStatus" aria-label="Bookings by status"></canvas></div></section>
      </div>

      <div class="dash-grid" data-dash="ops">
        <section class="card dash-wide"><div class="card-head"><div><h3>${upcomingLabel}</h3><div class="sub">Select a flight for occupancy and revenue</div></div><a class="dash-link right-act" href="#/flights">All flights ${icon('arrowR', 15)}</a></div>
          <div class="list">${upcoming.map((f) => html`<div class="li click" data-flight="${f.FlightID}" tabindex="0" role="button">
            ${airlineAvatar(f.AirlineName)}<div class="grow"><div class="t1">${f.FlightNumber} · ${routeHTML(f.SourceAirport, f.DestinationAirport)}</div><div class="t2">${fdate(f.DepartureDate)} at ${ftime(f.DepartureTime)}</div></div>
            ${occBar(f.SeatsBooked, f.TotalSeats)}${statusChip(f.FlightStatus)}</div>`)}</div></section>
        <section class="card"><div class="card-head"><div><h3>Needs attention</h3><div class="sub">${flagged ? `${fnum(flagged)} items flagged` : 'Nothing flagged'}</div></div></div>
          <ul class="dash-attn">${[
    ['Delayed flights', attention.delayedFlights, '#/flights?FlightStatus=Delayed', true],
    ['Pending refunds', attention.pendingRefunds, '#/cancellations?RefundStatus=Pending', false],
    ['Pending payments', attention.pendingPayments, '#/payments?PaymentStatus=Pending', false],
    ['Pending bookings', attention.pendingBookings, '#/bookings?BookingStatus=Pending', false],
    ['Lost baggage', attention.lostBags, '#/baggage?BaggageStatus=Lost', true],
    ['Flagged reviews', attention.flaggedReviews, '#/reviews?ReviewStatus=Flagged', true],
  ].map(([l, n, href, hot]) => html`<li><a href="${href}" class="${n === 0 ? 'zero' : hot ? 'hot' : ''}"><span>${l}</span><b class="num">${n}</b></a></li>`)}</ul>
          <p class="dash-note">Pending refunds total <b class="num">${money(kpi.pendingRefunds)}</b></p></section>
      </div>

      <div class="dash-grid" data-dash="highlights">
        <section class="card dash-wide"><div class="card-head"><div><h3>Latest bookings</h3><div class="sub">Most recent reservations</div></div><a class="dash-link right-act" href="#/bookings">All bookings ${icon('arrowR', 15)}</a></div>
          <div class="list">${recent.map((b) => html`<div class="li click" data-booking="${b.BookingID}" tabindex="0" role="button">${personAvatar(b.PassengerName)}
            <div class="grow"><div class="t1">${b.PassengerName}</div><div class="t2"><span class="pnr">${b.BookingReference}</span> · ${b.SourceAirport} → ${b.DestinationAirport}</div></div>
            <div class="right"><div class="t1 num">${money(b.TotalFare)}</div>${statusChip(b.BookingStatus)}</div></div>`)}</div></section>
        <div class="dash-col">
          <section class="card"><div class="card-head"><div><h3>Revenue by airline</h3><div class="sub">Active bookings, ₹</div></div></div><div class="chart-box sm"><canvas id="chAirline" aria-label="Revenue by airline"></canvas></div></section>
          <section class="card"><div class="card-head"><div><h3>Top rated flights</h3><div class="sub">From passenger reviews</div></div><a class="dash-link right-act" href="#/insights">Insights ${icon('arrowR', 15)}</a></div>
            <div class="dash-rank">${topRated.length ? topRated.map((r, i) => html`<div class="rank"><span class="no num">${String(i + 1).padStart(2, '0')}</span><div class="grow"><b>${r.FlightNumber}</b><small>${r.AirlineName} · ${r.ReviewCount} review${r.ReviewCount > 1 ? 's' : ''}</small></div><div class="val">${stars(r.AvgRating)} <div class="num">${Number(r.AvgRating).toFixed(1)}</div></div></div>`)
    : html`<p class="dash-note">No reviews yet.</p>`}</div></section>
        </div>
      </div>
    </div>`);
    drawCharts(d);
    applyLayout();
  };

  /* HCI-R7: apply the user's dashboard layout (hidden sections) — live, without reloading */
  function applyLayout() {
    const hidden = new Set(prefs.dashHidden);
    const secs = [...root.querySelectorAll('[data-dash]')];
    secs.forEach((el) => { el.hidden = hidden.has(el.dataset.dash); });
    const empty = root.querySelector('.hci-dash-empty');
    if (empty) empty.hidden = secs.some((el) => !el.hidden);
    charts.forEach((c) => { try { c.resize(); } catch (_) { /* hidden */ } });
  }

  function drawCharts(d) {
    charts.forEach((c) => c.destroy()); charts = [];
    if (!window.Chart) return;
    const text = css('--muted'); const grid = css('--line'); const primary = css('--primary');
    const C = window.Chart;
    C.defaults.font.family = "'Montserrat', system-ui, sans-serif"; C.defaults.font.size = 12; C.defaults.color = text;
    const tip = { backgroundColor: css('--text'), titleColor: css('--bg'), bodyColor: css('--bg'), padding: 10, cornerRadius: 8, titleFont: { weight: '600' }, displayColors: false };

    const m = $('#chMonth', root).getContext('2d');
    const monthLabels = d.byMonth.map((x) => { const [y, mo] = x.label.split('-'); return new Date(+y, +mo - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }); });
    charts.push(new C(m, { type: 'line', data: { labels: monthLabels, datasets: [{ data: d.byMonth.map((x) => x.value), borderColor: primary, backgroundColor: css('--primary-soft'), fill: true, tension: .3, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, pointHoverBackgroundColor: primary }] },
      options: { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false }, tooltip: { ...tip, callbacks: { label: (c) => ` ${c.parsed.y} bookings` } } }, scales: { x: { grid: { display: false }, border: { display: false } }, y: { beginAtZero: true, grid: { color: grid }, border: { display: false }, ticks: { precision: 0 } } } } }));

    /* brand colours only: sky-deep = confirmed, sky-light = completed, taupe = cancelled, warn = pending */
    const statusColors = { Confirmed: primary, Completed: css('--sky-light'), Cancelled: css('--taupe'), Pending: css('--warn') };
    charts.push(new C($('#chStatus', root), { type: 'doughnut', data: { labels: d.byStatus.map((x) => x.label), datasets: [{ data: d.byStatus.map((x) => x.value), backgroundColor: d.byStatus.map((x) => statusColors[x.label] || css('--taupe')), borderWidth: 2, borderColor: css('--surface'), hoverOffset: 4 }] },
      options: { maintainAspectRatio: false, cutout: '74%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 14, boxWidth: 7 } }, tooltip: { ...tip } } } }));

    charts.push(new C($('#chAirline', root), { type: 'bar', data: { labels: d.byAirline.map((x) => x.label), datasets: [{ data: d.byAirline.map((x) => x.value), backgroundColor: primary, hoverBackgroundColor: css('--sky-light'), borderRadius: 4, borderSkipped: false, maxBarThickness: 18 }] },
      options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { ...tip, callbacks: { label: (c) => ` ${compactINR(c.parsed.x)}` } } }, scales: { x: { grid: { color: grid }, border: { display: false }, ticks: { callback: (v) => compactINR(v) } }, y: { grid: { display: false }, border: { display: false } } } } }));
  }

  on(root, 'click', '[data-flight]', (e, el) => openFlight(el.dataset.flight));
  on(root, 'click', '[data-booking]', (e, el) => openBooking(el.dataset.booking));
  on(root, 'keydown', '[data-flight], [data-booking]', (e, el) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } });
  on(root, 'click', '[data-customize]', (e) => { e.stopPropagation(); openSettings(); });
  try { await draw(); } catch (e) { mount(root, html`<div class="card card-pad" role="alert">Couldn't load the dashboard: ${e.message}</div>`); }
  const off = onChange(() => draw().catch(() => {}));
  const onTheme = () => draw().catch(() => {});
  window.addEventListener('themechange', onTheme);
  window.addEventListener('skyward:prefs', applyLayout);
  return () => { alive = false; off(); window.removeEventListener('themechange', onTheme); window.removeEventListener('skyward:prefs', applyLayout); charts.forEach((c) => c.destroy()); };
}
