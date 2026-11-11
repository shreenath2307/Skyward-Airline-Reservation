import { html, raw, mount, $, on, money, compactINR, fnum, fdate, ftime, todayStr } from '../util.js';
import { icon } from '../icons.js';
import { api, city } from '../api.js';
import { statusChip, skeletonRows, stars, idChip } from '../ui.js';
import { airlineAvatar, personAvatar, routeHTML, occBar, onChange, flightLabel } from '../common.js';
import { openFlight, openBooking } from '../drawers.js';

/* Original illustration: a stylised airliner crossing a sky with soft clouds + contrails */
const heroArt = () => raw(`
<svg viewBox="0 0 700 380" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
  <defs>
    <filter id="blur14"><feGaussianBlur stdDeviation="14"/></filter>
    <filter id="blur6"><feGaussianBlur stdDeviation="6"/></filter>
    <linearGradient id="body" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#cfe2ff"/></linearGradient>
    <linearGradient id="trail" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".75"/></linearGradient>
    <g id="plane">
      <path d="M200 12C214 12 220 42 220 78V296C220 326 212 366 200 386C188 366 180 326 180 296V78C180 42 186 12 200 12Z" fill="url(#body)"/>
      <path d="M219 142 392 244V262L219 212Z" fill="url(#body)"/><path d="M181 142 8 244V262L181 212Z" fill="url(#body)"/>
      <path d="M392 244V262L350 250Z" fill="#7fb7ff"/><path d="M8 244V262L50 250Z" fill="#7fb7ff"/>
      <ellipse cx="292" cy="196" rx="13" ry="27" fill="#e6f0ff"/><ellipse cx="108" cy="196" rx="13" ry="27" fill="#e6f0ff"/>
      <ellipse cx="292" cy="174" rx="9" ry="6" fill="#0b2c7a" opacity=".55"/><ellipse cx="108" cy="174" rx="9" ry="6" fill="#0b2c7a" opacity=".55"/>
      <path d="M219 322 296 356V368L219 346Z" fill="url(#body)"/><path d="M181 322 104 356V368L181 346Z" fill="url(#body)"/>
      <path d="M186 60Q200 46 214 60L209 70Q200 63 191 70Z" fill="#0b2c7a" opacity=".8"/>
      <path d="M200 90V300" stroke="#0b5fff" stroke-width="5" stroke-opacity=".28" stroke-linecap="round"/>
    </g>
  </defs>
  <g opacity=".5" fill="none" stroke="#fff" stroke-opacity=".28"><circle cx="470" cy="190" r="150"/><circle cx="470" cy="190" r="230" stroke-dasharray="3 9"/><circle cx="470" cy="190" r="310"/></g>
  <g filter="url(#blur14)" fill="#fff"><ellipse cx="560" cy="320" rx="150" ry="34" opacity=".28"/><ellipse cx="300" cy="350" rx="130" ry="26" opacity=".2"/><ellipse cx="640" cy="60" rx="110" ry="24" opacity=".22"/></g>
  <path d="M-10 380C130 320 250 270 380 200" fill="none" stroke="url(#trail)" stroke-width="5" stroke-linecap="round" stroke-dasharray="2 12" opacity=".8"/>
  <path d="M60 390C190 330 300 290 420 215" fill="none" stroke="url(#trail)" stroke-width="3" stroke-linecap="round" opacity=".6"/>
  <g transform="translate(470 205) rotate(38) scale(.74) translate(-200 -200)" filter="url(#blur6)" opacity=".35"><use href="#plane" fill="#001a5c" style="filter:brightness(0)"/></g>
  <g transform="translate(446 180) rotate(38) scale(.74) translate(-200 -200)"><use href="#plane"/></g>
  <g transform="translate(615 70) rotate(50) scale(.2) translate(-200 -200)" opacity=".75"><use href="#plane"/></g>
</svg>`);

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

    mount(root, html`<div class="fade-in">
      <section class="hero">
        <div class="hero-art">${heroArt()}</div>
        <div class="eyebrow">${greeting()} · ${todayLong}</div>
        <h1>Your seat <em>in the sky.</em></h1>
        <p>Search flights, pick the exact seat, take payment and issue a boarding pass — every reservation in one calm, connected place.</p>
        <div class="cta"><a class="btn white lg" href="#/book">${icon('ticket', 20)}Book a seat</a><a class="btn glass lg" href="#/flights">${icon('plane', 20)}Browse flights</a></div>
        <div class="stamp"><b>${fnum(kpi.openFlights)}</b>flights open for booking</div>
      </section>

      <section class="kpis">
        <div class="kpi accent"><span class="bubble">${icon('receipt', 22)}</span><div class="lbl">Booked revenue</div><div class="val">${compactINR(kpi.bookedRevenue)}</div><div class="sub">${compactINR(kpi.collected)} collected so far</div></div>
        <div class="kpi"><span class="bubble">${icon('ticket', 22)}</span><div class="lbl">Active bookings</div><div class="val">${fnum(kpi.activeBookings)}</div><div class="sub">of ${fnum(kpi.totalBookings)} bookings in total</div></div>
        <div class="kpi"><span class="bubble">${icon('seat', 22)}</span><div class="lbl">Seat occupancy</div><div class="val">${occ}%</div><div class="bar" style="margin-top:12px"><i style="width:${occ}%"></i></div></div>
        <div class="kpi"><span class="bubble">${icon('users', 22)}</span><div class="lbl">Passengers</div><div class="val">${fnum(kpi.passengers)}</div><div class="sub">across ${fnum(kpi.flights)} scheduled flights</div></div>
      </section>

      <div class="grid g-main">
        <section class="card"><div class="card-head"><div><h3>Bookings over time</h3><div class="sub">Number of reservations made each month</div></div></div><div class="chart-box"><canvas id="chMonth"></canvas></div></section>
        <section class="card"><div class="card-head"><div><h3>Booking status</h3><div class="sub">Where every reservation stands</div></div></div><div class="chart-box"><canvas id="chStatus"></canvas></div></section>
      </div>

      <div class="grid g-main" style="margin-top:20px">
        <section class="card"><div class="card-head"><div><h3>${upcomingLabel}</h3><div class="sub">Click a flight to see occupancy, revenue and bookings</div></div><a class="btn sm right-act" href="#/flights">All flights ${icon('arrowR', 15)}</a></div>
          <div class="list" style="margin-top:14px">${upcoming.map((f) => html`<div class="li click" data-flight="${f.FlightID}">
            ${airlineAvatar(f.AirlineName)}<div class="grow"><div class="t1">${f.FlightNumber} · ${routeHTML(f.SourceAirport, f.DestinationAirport)}</div><div class="t2">${city(f.SourceAirport) || ''} → ${city(f.DestinationAirport) || ''} · ${fdate(f.DepartureDate)} at ${ftime(f.DepartureTime)}</div></div>
            ${occBar(f.SeatsBooked, f.TotalSeats)}${statusChip(f.FlightStatus)}</div>`)}</div></section>
        <section class="card"><div class="card-head"><div><h3>Needs attention</h3><div class="sub">Open items across the system</div></div></div>
          <div class="attn" style="padding-top:16px">${[
    ['Delayed flights', attention.delayedFlights, '#/flights?FlightStatus=Delayed', true],
    ['Pending refunds', attention.pendingRefunds, '#/cancellations?RefundStatus=Pending', false],
    ['Pending payments', attention.pendingPayments, '#/payments?PaymentStatus=Pending', false],
    ['Pending bookings', attention.pendingBookings, '#/bookings?BookingStatus=Pending', false],
    ['Lost baggage', attention.lostBags, '#/baggage?BaggageStatus=Lost', true],
    ['Flagged reviews', attention.flaggedReviews, '#/reviews?ReviewStatus=Flagged', true],
  ].map(([l, n, href, hot]) => html`<a href="${href}" class="${n === 0 ? 'zero' : hot ? 'hot' : ''}"><b>${n}</b><span>${l}</span></a>`)}</div>
          <div style="padding:0 24px 22px"><div class="callout">${icon('info', 18)}<div class="t">Pending refunds total <b>${money(kpi.pendingRefunds)}</b>.</div></div></div></section>
      </div>

      <div class="grid g3" style="margin-top:20px">
        <section class="card"><div class="card-head"><div><h3>Revenue by airline</h3><div class="sub">Active bookings, ₹</div></div></div><div class="chart-box sm"><canvas id="chAirline"></canvas></div></section>
        <section class="card"><div class="card-head"><div><h3>Latest bookings</h3><div class="sub">Most recent reservations</div></div><a class="btn sm right-act" href="#/bookings">View all</a></div>
          <div class="list" style="margin-top:12px">${recent.map((b) => html`<div class="li click" data-booking="${b.BookingID}">${personAvatar(b.PassengerName)}
            <div class="grow"><div class="t1">${b.PassengerName}</div><div class="t2"><span class="pnr">${b.BookingReference}</span> · ${b.SourceAirport} → ${b.DestinationAirport}</div></div>
            <div class="right"><div class="t1 num">${money(b.TotalFare)}</div>${statusChip(b.BookingStatus)}</div></div>`)}</div></section>
        <section class="card"><div class="card-head"><div><h3>Top rated flights</h3><div class="sub">From passenger reviews</div></div><a class="btn sm right-act" href="#/insights">Insights</a></div>
          <div style="margin-top:12px">${topRated.length ? topRated.map((r, i) => html`<div class="rank"><span class="no">${i + 1}</span><div class="grow"><b>${r.FlightNumber}</b><small>${r.AirlineName} · ${r.ReviewCount} review${r.ReviewCount > 1 ? 's' : ''}</small></div><div class="val">${stars(r.AvgRating)} <div>${Number(r.AvgRating).toFixed(1)}</div></div></div>`)
    : html`<div class="muted" style="padding:20px 24px">No reviews yet.</div>`}</div></section>
      </div>
    </div>`);
    drawCharts(d);
  };

  function drawCharts(d) {
    charts.forEach((c) => c.destroy()); charts = [];
    if (!window.Chart) return;
    const text = css('--muted'); const grid = css('--line'); const primary = css('--primary');
    const C = window.Chart;
    C.defaults.font.family = "'Inter', system-ui, sans-serif"; C.defaults.color = text;
    const palette = ['#0b5fff', '#26b6e8', '#7a5af8', '#f5a623', '#17a99b', '#e5484d', '#8ea3cc'];
    const tip = { backgroundColor: '#0b1730', padding: 12, cornerRadius: 10, titleFont: { weight: '600' }, displayColors: false };

    const m = $('#chMonth', root).getContext('2d');
    const gr = m.createLinearGradient(0, 0, 0, 260); gr.addColorStop(0, 'rgba(11,95,255,.30)'); gr.addColorStop(1, 'rgba(11,95,255,0)');
    const monthLabels = d.byMonth.map((x) => { const [y, mo] = x.label.split('-'); return new Date(+y, +mo - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }); });
    charts.push(new C(m, { type: 'line', data: { labels: monthLabels, datasets: [{ data: d.byMonth.map((x) => x.value), borderColor: primary, backgroundColor: gr, fill: true, tension: .38, borderWidth: 3, pointRadius: 4, pointBackgroundColor: css('--surface'), pointBorderColor: primary, pointBorderWidth: 2.5, pointHoverRadius: 6 }] },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { ...tip, callbacks: { label: (c) => ` ${c.parsed.y} bookings` } } }, scales: { x: { grid: { display: false }, border: { display: false } }, y: { beginAtZero: true, grid: { color: grid }, border: { display: false }, ticks: { precision: 0 } } } } }));

    const statusColors = { Confirmed: '#0d9467', Pending: '#f5a623', Cancelled: '#e5484d', Completed: '#0b5fff' };
    charts.push(new C($('#chStatus', root), { type: 'doughnut', data: { labels: d.byStatus.map((x) => x.label), datasets: [{ data: d.byStatus.map((x) => x.value), backgroundColor: d.byStatus.map((x) => statusColors[x.label] || '#8ea3cc'), borderWidth: 3, borderColor: css('--surface'), hoverOffset: 6 }] },
      options: { maintainAspectRatio: false, cutout: '72%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 16, boxWidth: 8 } }, tooltip: { ...tip } } } }));

    charts.push(new C($('#chAirline', root), { type: 'bar', data: { labels: d.byAirline.map((x) => x.label), datasets: [{ data: d.byAirline.map((x) => x.value), backgroundColor: palette, borderRadius: 8, borderSkipped: false, maxBarThickness: 26 }] },
      options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { ...tip, callbacks: { label: (c) => ` ${compactINR(c.parsed.x)}` } } }, scales: { x: { grid: { color: grid }, border: { display: false }, ticks: { callback: (v) => compactINR(v) } }, y: { grid: { display: false }, border: { display: false } } } } }));
  }

  on(root, 'click', '[data-flight]', (e, el) => openFlight(el.dataset.flight));
  on(root, 'click', '[data-booking]', (e, el) => openBooking(el.dataset.booking));
  try { await draw(); } catch (e) { mount(root, html`<div class="card card-pad">${e.message}</div>`); }
  const off = onChange(() => draw().catch(() => {}));
  const onTheme = () => draw().catch(() => {});
  window.addEventListener('themechange', onTheme);
  return () => { alive = false; off(); window.removeEventListener('themechange', onTheme); charts.forEach((c) => c.destroy()); };
}
