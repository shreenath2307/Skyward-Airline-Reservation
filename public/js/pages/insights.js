/* Insights: occupancy, top spenders, ratings, routes, payment methods (driven by the SQL views) */
import { html, mount, $, compactINR, money, fnum } from '../util.js';
import { icon } from '../icons.js';
import { api, city } from '../api.js';
import { skeletonRows, stars } from '../ui.js';
import { personAvatar, airlineAvatar } from '../common.js';

const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

export default async function render(root) {
  mount(root, html`<div class="fade-in">${skeletonRows(10)}</div>`);
  let charts = []; let alive = true; let data;
  const draw = () => {
    const d = data; if (!d || !alive) return;
    mount(root, html`<div class="fade-in">
      <header class="page-head"><div class="titles"><div class="eyebrow">Analytics</div><h1>Airline <em>insights</em></h1><p>Live figures from the database views: occupancy, spending, ratings and routes.</p></div></header>
      <div class="grid g-main">
        <section class="card"><div class="card-head"><div><h3>Flight occupancy</h3><div class="sub">Share of seats booked, busiest flights first</div></div></div><div class="chart-box"><canvas id="chOcc"></canvas></div></section>
        <section class="card"><div class="card-head"><div><h3>Payment methods</h3><div class="sub">Successful payments by value</div></div></div><div class="chart-box"><canvas id="chPay"></canvas></div></section>
      </div>
      <div class="grid g3" style="margin-top:20px">
        <section class="card"><div class="card-head"><div><h3>Top spenders</h3><div class="sub">Passengers by total spend</div></div></div><div style="margin-top:12px">${d.spenders.length ? d.spenders.map((p, i) => html`<div class="rank"><span class="no">${i + 1}</span>${personAvatar(p.PassengerName || p.FullName || '?')}<div class="grow"><b>${p.PassengerName || p.FullName}</b><small>${p.TotalBookings} booking${p.TotalBookings == 1 ? '' : 's'}</small></div><div class="val num">${money(p.TotalSpend)}</div></div>`) : html`<div class="muted" style="padding:20px 24px">No data yet.</div>`}</div></section>
        <section class="card"><div class="card-head"><div><h3>Best routes</h3><div class="sub">By revenue, active bookings</div></div></div><div style="margin-top:12px">${d.routes.length ? d.routes.map((r, i) => html`<div class="rank"><span class="no">${i + 1}</span><div class="grow"><b>${r.SourceAirport} → ${r.DestinationAirport}</b><small>${city(r.SourceAirport) || ''} to ${city(r.DestinationAirport) || ''} · ${r.bookings} booking${r.bookings == 1 ? '' : 's'}</small></div><div class="val num">${compactINR(r.revenue)}</div></div>`) : html`<div class="muted" style="padding:20px 24px">No data yet.</div>`}</div></section>
        <section class="card"><div class="card-head"><div><h3>Top rated flights</h3><div class="sub">Average passenger rating</div></div></div><div style="margin-top:12px">${d.rated.length ? d.rated.map((r, i) => html`<div class="rank"><span class="no">${i + 1}</span><div class="grow"><b>${r.FlightNumber}</b><small>${r.AirlineName} · ${r.ReviewCount} review${r.ReviewCount == 1 ? '' : 's'}</small></div><div class="val">${stars(r.AvgRating)}<div>${Number(r.AvgRating).toFixed(1)}</div></div></div>`) : html`<div class="muted" style="padding:20px 24px">No reviews yet.</div>`}</div></section>
      </div></div>`);
    drawCharts(d);
  };
  function drawCharts(d) {
    charts.forEach((c) => c.destroy()); charts = [];
    const C = window.Chart; if (!C) return;
    C.defaults.font.family = "'Inter', system-ui, sans-serif"; C.defaults.color = css('--muted');
    const grid = css('--line'); const tip = { backgroundColor: '#0b1730', padding: 12, cornerRadius: 10, displayColors: false };
    const occ = d.occupancy;
    charts.push(new C($('#chOcc', root), { type: 'bar', data: { labels: occ.map((o) => o.FlightNumber), datasets: [{ data: occ.map((o) => Number(o.OccupancyPercent)), backgroundColor: css('--primary'), borderRadius: 8, borderSkipped: false, maxBarThickness: 30 }] },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { ...tip, callbacks: { label: (c) => ` ${c.parsed.y}% full` } } }, scales: { x: { grid: { display: false }, border: { display: false } }, y: { beginAtZero: true, max: 100, grid: { color: grid }, border: { display: false }, ticks: { callback: (v) => `${v}%` } } } } }));
    const pal = ['#0b5fff', '#26b6e8', '#7a5af8', '#f5a623', '#17a99b'];
    charts.push(new C($('#chPay', root), { type: 'doughnut', data: { labels: d.payments.map((p) => p.label), datasets: [{ data: d.payments.map((p) => Number(p.amount)), backgroundColor: pal, borderWidth: 3, borderColor: css('--surface'), hoverOffset: 6 }] },
      options: { maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 14, boxWidth: 8 } }, tooltip: { ...tip, callbacks: { label: (c) => ` ${c.label}: ${compactINR(c.parsed)}` } } } } }));
  }
  const onTheme = () => draw();
  window.addEventListener('themechange', onTheme);
  try { data = await api.get('/insights'); draw(); } catch (e) { mount(root, html`<div class="card card-pad">${e.message}</div>`); }
  return () => { alive = false; window.removeEventListener('themechange', onTheme); charts.forEach((c) => c.destroy()); };
}
