/* Shared display helpers used by several pages */
import { html, raw, initials, fdate, ftime, bus } from './util.js';
import { icon } from './icons.js';
import { city } from './api.js';

/* muted brand-family tones; every one keeps white initials above 4.5:1 */
const AIRLINE_COLORS = ['#015AA9', '#312726', '#2f5d73', '#6b4f3a', '#013f78', '#5a5048', '#3f5c8a', '#7a4b3c', '#1f4e5f', '#4d5b3c'];
export function colorFor(str) {
  let h = 0; for (const c of String(str || '?')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AIRLINE_COLORS[h % AIRLINE_COLORS.length];
}
export const airlineAvatar = (name, cls = '') =>
  html`<span class="avatar ${cls}" style="background:${colorFor(name)}">${initials(name)}</span>`;
export const personAvatar = (name, cls = 'round') =>
  html`<span class="avatar ${cls}" style="background:${colorFor(name)}">${initials(name)}</span>`;

export const routeHTML = (src, dst) => html`<span class="route">${src}${icon('arrowR', 15)}${dst}</span>`;
export const cityRoute = (src, dst) => `${city(src) || src} → ${city(dst) || dst}`;
export const cell2 = (main, sub) => html`<div class="cell-2"><b>${main}</b>${sub !== undefined && sub !== null && sub !== '' ? html`<small>${sub}</small>` : ''}</div>`;
export const flightLabel = (f) => `${f.FlightNumber} · ${f.SourceAirport} → ${f.DestinationAirport}`;
export const whenHTML = (d, t) => cell2(fdate(d), ftime(t));
export const occBar = (booked, total) => {
  const pct = total ? Math.round((booked / total) * 100) : 0;
  return html`<div style="min-width:110px"><div class="row" style="justify-content:space-between;font-size:12px;margin-bottom:5px"><span class="muted">${booked}/${total} seats</span><b>${pct}%</b></div><div class="bar ${pct > 85 ? 'warn' : ''}"><i style="width:${pct}%"></i></div></div>`;
};

/** Cross-page "something changed" bus so open lists refresh after edits made in drawers/modals. */
export const emitChange = () => bus.emit('data-changed');
export const onChange = (fn) => bus.on('data-changed', fn);
export { raw };
