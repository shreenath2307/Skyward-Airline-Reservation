/* Aircraft cabin seat map (shared by the booking wizard and the seat manager) */
import { html, raw, money, money2 } from './util.js';
import { icon } from './icons.js';
import { statusChip } from './ui.js';

const parse = (n) => { const m = /^(\d+)([A-Z]+)$/.exec(n); return m ? [Number(m[1]), m[2]] : [0, n]; };
const CLS_COLOR = { First: 'var(--c-first)', Business: 'var(--c-business)', 'Premium Economy': 'var(--c-premium)', Economy: 'var(--c-economy)' };

export function seatMapHTML(seats, { selectedId = null, manage = false, ticketPrice = 0 } = {}) {
  const rows = new Map();
  for (const s of seats) { const [r] = parse(s.SeatNumber); (rows.get(r) || rows.set(r, []).get(r)).push(s); }
  const keys = [...rows.keys()].sort((a, b) => a - b);
  let last = null; const out = [];
  for (const r of keys) {
    const rs = rows.get(r).sort((a, b) => parse(a.SeatNumber)[1].localeCompare(parse(b.SeatNumber)[1]));
    const cls = rs[0].SeatClass;
    if (cls !== last) {
      out.push(html`<div class="cabin-sec" style="--sc:${CLS_COLOR[cls]}"><span><i></i>${cls} · ×${Number(rs[0].SeatPriceMultiplier).toFixed(2)}</span></div>`);
      last = cls;
    }
    const half = Math.ceil(rs.length / 2);
    /* HCI-R5: in the booking wizard, booked / blocked seats are rendered disabled so they cannot be picked */
  const btn = (s) => html`<button type="button" class="seat ${manage ? 'mgr' : ''} ${selectedId === s.SeatID ? 'sel' : ''}" data-seat="${s.SeatID}" data-cls="${s.SeatClass}" data-status="${s.SeatStatus}"
      ${!manage && s.SeatStatus !== 'Available' ? raw('disabled') : ''} aria-label="Seat ${s.SeatNumber}, ${s.SeatClass}, ${s.SeatStatus}" title="${s.SeatNumber} · ${s.SeatClass} · ${s.SeatStatus}"><span>${parse(s.SeatNumber)[1]}</span></button>`;
    out.push(html`<div class="srow"><div class="sgrp l">${rs.slice(0, half).map(btn)}</div><div class="rnum">${r}</div><div class="sgrp r">${rs.slice(half).map(btn)}</div></div>`);
  }
  return html`<div class="cabin-wrap"><div class="cabin">${out}</div></div>`;
}

export const legendHTML = () => html`<div class="legend">
  <span style="--sc:var(--c-first)"><i></i>First</span><span style="--sc:var(--c-business)"><i></i>Business</span>
  <span style="--sc:var(--c-premium)"><i></i>Premium Economy</span><span style="--sc:var(--c-economy)"><i></i>Economy</span>
  <span><i class="sl"></i>Selected</span><span><i class="bk"></i>Booked</span><span><i class="bl"></i>Blocked / maintenance</span></div>`;

export function seatInfoHTML(seat, flight, { manage = false } = {}) {
  if (!seat) return html`<div class="card seat-info"><div class="empty" style="padding:30px 6px">${icon('seat', 34)}<h4>Pick your seat</h4><p>Hover over a seat to see what comes with it, then click to select.</p></div></div>`;
  const price = seat.SeatPrice ?? Number(flight.TicketPrice) * Number(seat.SeatPriceMultiplier);
  const am = (on, ic, label) => html`<div class="${on ? 'on' : 'off'}">${icon(ic, 17)}${label}</div>`;
  return html`<div class="card seat-info"><div class="eyebrow">${seat.SeatClass}</div>
    <div class="row" style="justify-content:space-between;align-items:flex-end"><div class="big">${seat.SeatNumber}</div>${statusChip(seat.SeatStatus)}</div>
    <div class="muted" style="margin:6px 0 14px">${seat.SeatType} seat · fare ×${Number(seat.SeatPriceMultiplier).toFixed(2)}</div>
    <div class="price">${money(price)}</div><div class="muted" style="font-size:12.5px">per passenger, before tax</div>
    <div class="amen">${am(seat.WindowSeat, 'window', 'Window')}${am(seat.AisleSeat, 'aisle', 'Aisle')}${am(seat.Recliner, 'recliner', 'Recliner')}${am(seat.PowerOutlet, 'bolt', 'Power outlet')}${am(seat.USBPort, 'usb', 'USB port')}</div>
    ${manage && seat.BookingReference ? html`<div class="callout" style="margin-top:16px">${icon('ticket', 18)}<div class="t">Booked by <b>${seat.PassengerName}</b><br><span class="pnr">${seat.BookingReference}</span></div></div>` : ''}</div>`;
}
