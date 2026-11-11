/* Detail drawers: booking, passenger, flight, and a generic record view */
import { html, raw, esc, $, on, money, money2, fdate, ftime, fdur, fnum, initials } from './util.js';
import { icon } from './icons.js';
import { api, ent, city } from './api.js';
import { openDrawer, openModal, statusChip, tierChip, idChip, stars, kv, yesNo, skeletonRows, toastError, emptyState } from './ui.js';
import { personAvatar, airlineAvatar, routeHTML, flightLabel, onChange, emitChange } from './common.js';
import { editRecord, deleteRecord, cancelDialog, recordPayment, addBaggage } from './forms.js';
import { ticketHTML } from './ticket.js';

const MONEY = new Set(['TicketPrice', 'TotalFare', 'Discount', 'Tax', 'Amount', 'ConvenienceFee', 'GST', 'TotalAmount', 'RefundAmount', 'CancellationCharges', 'ExtraCharge', 'SeatPrice']);
const sec = (title, body, count) => html`<section class="sec"><h4>${title}${count !== undefined ? html`<span class="count">${count}</span>` : ''}</h4>${body}</section>`;
const setHead = (d, eyebrow, title, subtitle, extra = '') => {
  const t = $('.sheet-titles', d.el);
  t.innerHTML = String(html`<div class="eyebrow">${eyebrow}</div><h3>${title}</h3>${subtitle ? html`<p>${subtitle}</p>` : ''}`);
  $('.sheet-head-extra', d.el).innerHTML = String(extra);
};
const failed = (d, e) => d.setContent(String(emptyState({ icon: 'alert', title: 'Could not load this record', text: e.message })));

/** value renderer shared by the generic view */
export function valueHTML(entKey, f, row) {
  const v = row[f.name];
  if (v === null || v === undefined || v === '') return raw('<span class="muted">—</span>');
  if (f.lookup || f.name === 'SeatID') {
    if (f.name === 'PassengerID') return html`${row.PassengerName || ''} ${idChip(v)}`;
    if (f.name === 'FlightID') return html`${row.FlightNumber ? flightLabel(row) : ''} ${idChip(v)}`;
    if (f.name === 'BookingID') return html`<span class="pnr">${row.BookingReference || ''}</span> ${idChip(v)}`;
    return idChip(v);
  }
  if (f.kind === 'enum') return statusChip(v);
  if (f.kind === 'bool') return yesNo(v);
  if (f.type === 'rating') return stars(v);
  if (f.kind === 'date') return fdate(v);
  if (f.kind === 'time') return ftime(v);
  if (MONEY.has(f.name)) return money2(v);
  if (f.kind === 'decimal' || f.kind === 'int') return fnum(v);
  return v;
}

/* ================================================================== */
/*  Generic record drawer (payments, cancellations, reviews, baggage…)  */
/* ================================================================== */
export function openRecord(entKey, row, { subtitle, extra } = {}) {
  const meta = ent(entKey);
  const id = row[meta.pk];
  const d = openDrawer({
    eyebrow: meta.singular, title: html`<span class="mono" style="font-family:var(--mono);font-size:.7em">${id}</span>`, subtitle, size: 'lg',
    footer: ' ',
  });
  const render = (r) => {
    d.setContent(html`${extra ? extra(r) : ''}${meta.groups.map((g) => sec(g.title, html`<dl class="kvs">${g.fields.map((n) => {
      const f = meta.fields.find((x) => x.name === n); if (!f) return '';
      return kv(f.label, valueHTML(entKey, f, r), f.type === 'textarea' || f.span === 3 ? 'wide' : '');
    })}</dl>`))}`);
    d.foot.innerHTML = String(html`
      ${r.BookingID && entKey !== 'bookings' ? html`<button class="btn ghost" data-act="booking">${icon('ticket', 18)}Open booking</button>` : ''}
      <span style="flex:1"></span>
      ${meta.canDelete ? html`<button class="btn danger-ghost" data-act="delete">${icon('trash', 18)}Delete</button>` : ''}
      <button class="btn primary" data-act="edit">${icon('edit', 18)}Edit</button>`);
  };
  let cur = row;
  render(cur);
  const reload = async () => { try { cur = await api.get(`/${meta.key}/${id}`); render(cur); } catch (e) { d.close(); } };
  const off = onChange(reload);
  d.el.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    if (a.dataset.act === 'edit') editRecord(entKey, cur);
    if (a.dataset.act === 'delete') { if (await deleteRecord(entKey, cur, `${meta.singular} ${id}`)) d.close(); }
    if (a.dataset.act === 'booking') openBooking(cur.BookingID);
  });
  const origClose = d.close.bind(d);
  d.close = (r) => { off(); origClose(r); };
  return d;
}

/* ================================================================== */
/*  Booking                                                             */
/* ================================================================== */
export function showTicket(ov) {
  const m = openModal({
    eyebrow: 'Boarding pass', title: ov.booking.BookingReference, size: 'lg',
    subtitle: 'Print this or save it as a PDF from the print dialog.',
    content: ticketHTML(ov),
    footer: html`<button class="btn ghost" data-close>Close</button><button class="btn primary" data-print>${icon('print', 18)}Print ticket</button>`,
  });
  $('[data-print]', m.el).addEventListener('click', () => window.print());
  return m;
}

export function openBooking(id) {
  let ov = null;
  const d = openDrawer({ eyebrow: 'Booking', title: '…', size: 'xl', content: skeletonRows(8), footer: ' ' });
  const bagRow = (g) => html`<tr><td><span class="mono">${g.TagNumber}</span><br><small class="muted">${g.BaggageType} · ${g.SpecialHandling}</small></td><td>${g.NumberOfBags}</td>
    <td>${g.BagWeight} / ${g.AllowedWeight} kg</td><td>${g.ExtraCharge ? money2(g.ExtraCharge) : '—'}</td><td>${statusChip(g.BaggageStatus)}</td>
    <td class="right"><button class="icon-btn" data-act="edit-bag" data-id="${g.BaggageID}" aria-label="Edit">${icon('edit', 17)}</button><button class="icon-btn danger" data-act="del-bag" data-id="${g.BaggageID}" aria-label="Delete">${icon('trash', 17)}</button></td></tr>`;

  const render = () => {
    const { booking: b, passenger: p, flight: f, seat: s, payment: pay, baggage, cancellation: c } = ov;
    setHead(d, 'Booking', html`<span class="pnr" style="font-size:.8em">${b.BookingReference}</span>`,
      html`${p.FirstName} ${p.LastName} · booked ${fdate(b.BookingDate)} at ${ftime(b.BookingTime)}`, statusChip(b.BookingStatus));
    d.setContent(html`
      <div class="panel soft" style="display:grid;grid-template-columns:auto 1fr auto;gap:22px;align-items:center">
        <div><div style="font-family:var(--display);font-size:46px;line-height:1">${f.SourceAirport}</div><div class="muted">${city(f.SourceAirport)}</div></div>
        <div class="tl" style="min-width:0"><span>${fdur(f.DurationMin)}</span><div class="line">${icon('plane', 20)}</div><span>${f.FlightNumber} · ${f.AirlineName}</span></div>
        <div class="right"><div style="font-family:var(--display);font-size:46px;line-height:1">${f.DestinationAirport}</div><div class="muted">${city(f.DestinationAirport)}</div></div>
      </div>
      <dl class="kvs c3" style="margin-top:18px">
        ${kv('Departs', html`${fdate(f.DepartureDate)} · ${ftime(f.DepartureTime)}`)}${kv('Arrives', html`${fdate(f.ArrivalDate)} · ${ftime(f.ArrivalTime)}`)}
        ${kv('Terminal / Gate', `${f.Terminal || '—'} / ${f.Gate || '—'}`)}${kv('Flight status', statusChip(f.FlightStatus))}${kv('Aircraft', f.AircraftModel)}${kv('Flight', html`<a href="javascript:void 0" data-act="open-flight">${f.FlightNumber} ${idChip(f.FlightID)}</a>`)}
      </dl>

      ${sec('Passenger & seat', html`<div class="grid g2">
        <div class="panel"><div class="row">${personAvatar(`${p.FirstName} ${p.LastName}`)}<div class="grow"><b><a href="javascript:void 0" data-act="open-passenger">${p.FirstName} ${p.LastName}</a></b><div class="muted" style="font-size:12.5px">${p.Email}</div></div>${idChip(p.PassengerID)}</div>
          <dl class="kvs" style="margin-top:14px">${kv('Phone', p.Phone)}${kv('Passport', p.PassportNumber)}${kv('Membership', tierChip(p.FrequentFlyerMembership))}${kv('Travellers', b.NumberOfPassengers)}</dl></div>
        <div class="panel"><div class="row"><span class="avatar" style="background:var(--primary)">${s.SeatNumber}</span><div class="grow"><b>${s.SeatClass}</b><div class="muted" style="font-size:12.5px">${s.SeatType} · ×${s.SeatPriceMultiplier.toFixed(2)}</div></div>${statusChip(s.SeatStatus)}</div>
          <dl class="kvs" style="margin-top:14px">${kv('Window', yesNo(s.WindowSeat))}${kv('Aisle', yesNo(s.AisleSeat))}${kv('Recliner', yesNo(s.Recliner))}${kv('Power / USB', html`${yesNo(s.PowerOutlet)} / ${yesNo(s.USBPort)}`)}</dl></div></div>`)}

      ${sec('Fare', html`<dl class="kvs c3">${kv('Coupon', b.CouponCode ? html`<span class="chip tone-success">${b.CouponCode}</span>` : '—')}${kv('Discount', money2(b.Discount))}${kv('Tax', money2(b.Tax))}
        ${kv('Total fare', html`<b style="font-family:var(--display);font-size:28px">${money2(b.TotalFare)}</b>`)}${kv('Channel', b.BookingChannel)}${kv('Booked by', b.CreatedBy)}${kv('Travel insurance', yesNo(b.TravelInsurance))}</dl>`)}

      ${sec('Payment', pay ? html`<div class="panel"><dl class="kvs c3">${kv('Status', statusChip(pay.PaymentStatus))}${kv('Method', pay.PaymentMethod)}${kv('Date', fdate(pay.PaymentDate))}
          ${kv('Amount', money2(pay.Amount))}${kv('Convenience fee', money2(pay.ConvenienceFee))}${kv('GST', money2(pay.GST))}
          ${kv('Total charged', html`<b>${money2(pay.TotalAmount)}</b>`)}${kv('Transaction', html`<span class="mono">${pay.TransactionID}</span>`)}${kv('Invoice', html`<span class="mono">${pay.InvoiceNumber}</span>`)}</dl>
          <div class="actions-bar"><button class="btn sm" data-act="edit-pay">${icon('edit', 16)}Edit payment</button></div></div>`
        : html`<div class="callout warn">${icon('alert', 20)}<div class="t" style="flex:1">No payment has been recorded for this booking yet.</div>${b.BookingStatus !== 'Cancelled' ? html`<button class="btn sm primary" data-act="pay">Record payment</button>` : ''}</div>`)}

      ${sec('Baggage', baggage.length ? html`<table class="mini-table"><thead><tr><th>Tag</th><th>Bags</th><th>Weight</th><th>Excess</th><th>Status</th><th></th></tr></thead><tbody>${baggage.map(bagRow)}</tbody></table>`
        : html`<div class="muted">No baggage checked in.</div>`, baggage.length)}
      ${b.BookingStatus !== 'Cancelled' ? html`<div class="actions-bar"><button class="btn sm" data-act="bag">${icon('plus', 16)}Add baggage</button></div>` : ''}

      ${c ? sec('Cancellation', html`<div class="panel" style="border-color:color-mix(in srgb,var(--danger) 35%,var(--line))"><dl class="kvs c3">${kv('Cancelled on', html`${fdate(c.CancellationDate)} · ${ftime(c.CancellationTime)}`)}${kv('Status', statusChip(c.CancellationStatus))}${kv('Refund status', statusChip(c.RefundStatus))}
          ${kv('Refund', money2(c.RefundAmount))}${kv('Charges', money2(c.CancellationCharges))}${kv('Refund mode', c.RefundMode)}${kv('Reason', c.Reason, 'wide')}${kv('Processed by', c.ProcessedBy)}${kv('Approved by', c.ApprovedBy)}${kv('Remarks', c.Remarks)}</dl>
          <div class="actions-bar"><button class="btn sm" data-act="edit-cancel">${icon('edit', 16)}Update refund</button></div></div>`) : ''}`);
    d.foot.innerHTML = String(html`
      <button class="btn danger-ghost" data-act="delete">${icon('trash', 18)}Delete</button><span style="flex:1"></span>
      ${b.BookingStatus !== 'Cancelled' ? html`<button class="btn ghost" data-act="cancel">${icon('ban', 18)}Cancel booking</button>` : ''}
      <button class="btn ghost" data-act="edit">${icon('edit', 18)}Edit</button>
      <button class="btn primary" data-act="ticket">${icon('ticket', 18)}View ticket</button>`);
  };

  const load = async () => { try { ov = await api.get(`/bookings/${id}/overview`); render(); } catch (e) { failed(d, e); } };
  load();
  const off = onChange(load);
  const origClose = d.close.bind(d); d.close = (r) => { off(); origClose(r); };

  d.el.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-act]'); if (!a || !ov) return;
    const { booking: b, passenger: p, flight: f, seat: s, payment: pay, baggage, cancellation: c } = ov;
    const rowCtx = { BookingReference: b.BookingReference, PassengerName: `${p.FirstName} ${p.LastName}` };
    switch (a.dataset.act) {
      case 'ticket': showTicket(ov); break;
      case 'edit': editRecord('bookings', b); break;
      case 'cancel': cancelDialog(b); break;
      case 'delete': if (await deleteRecord('bookings', b, b.BookingReference)) d.close(); break;
      case 'pay': recordPayment(b); break;
      case 'bag': addBaggage(b, s.SeatClass); break;
      case 'edit-pay': editRecord('payments', { ...pay, ...rowCtx }); break;
      case 'edit-bag': editRecord('baggage', { ...baggage.find((g) => String(g.BaggageID) === a.dataset.id), ...rowCtx }); break;
      case 'del-bag': { const g = baggage.find((x) => String(x.BaggageID) === a.dataset.id); await deleteRecord('baggage', g, `bag ${g.TagNumber}`); break; }
      case 'edit-cancel': editRecord('cancellations', { ...c, ...rowCtx }); break;
      case 'open-passenger': openPassenger(p.PassengerID); break;
      case 'open-flight': openFlight(f.FlightID); break;
      default: break;
    }
  });
  return d;
}

/* ================================================================== */
/*  Passenger                                                           */
/* ================================================================== */
export function openPassenger(id) {
  let ov = null;
  const d = openDrawer({ eyebrow: 'Passenger', title: '…', size: 'xl', content: skeletonRows(8), footer: ' ' });
  const render = () => {
    const { passenger: p, history, spend, reviews } = ov;
    const name = `${p.FirstName} ${p.MiddleName ? `${p.MiddleName} ` : ''}${p.LastName}`;
    setHead(d, 'Passenger', name, html`${p.Email}`, tierChip(p.FrequentFlyerMembership));
    d.setContent(html`
      <div class="profile-head">${personAvatar(name, 'lg')}<div class="grow"><div class="row wrap"><span class="muted">Passenger ID</span>${idChip(p.PassengerID)}</div>
        <div class="muted" style="margin-top:6px">${p.Gender} · ${p.Age} years · ${p.City}, ${p.Country}</div></div></div>
      <div class="stat-row">
        <div class="stat"><b>${spend ? spend.TotalBookings : 0}</b><span>bookings (${spend ? spend.CancelledBookings : 0} cancelled)</span></div>
        <div class="stat"><b>${money(spend ? spend.TotalSpend : 0)}</b><span>lifetime spend</span></div>
        <div class="stat"><b>${fnum(p.LoyaltyPoints)}</b><span>loyalty points · ${p.FlightsTaken} flights taken</span></div></div>
      ${sec('Personal & contact', html`<dl class="kvs c3">${kv('Date of birth', fdate(p.DOB))}${kv('Gender', p.Gender)}${kv('Nationality', p.Nationality)}
        ${kv('Phone', p.Phone)}${kv('Emergency contact', p.EmergencyContact)}${kv('Email', p.Email)}
        ${kv('Address', `${p.Address}, ${p.City}, ${p.State} ${p.ZipCode}, ${p.Country}`, 'wide')}</dl>`)}
      ${sec('Travel documents & preferences', html`<dl class="kvs c3">${kv('Passport', html`<span class="mono">${p.PassportNumber}</span>`)}${kv('Government ID', html`<span class="mono">${p.GovernmentID}</span>`)}${kv('Membership', tierChip(p.FrequentFlyerMembership))}
        ${kv('Meal', p.MealPreference)}${kv('Seat preference', p.SeatPreference)}${kv('Member since', fdate(String(p.CreatedAt).slice(0, 10)))}</dl>`)}
      ${sec('Booking history', history.length ? html`<table class="mini-table"><thead><tr><th>PNR</th><th>Flight</th><th>Journey</th><th>Seat</th><th>Fare</th><th>Status</th></tr></thead><tbody>
        ${history.map((h) => html`<tr class="click" data-act="open-booking" data-id="${h.BookingID}"><td><span class="pnr">${h.BookingReference}</span></td><td>${h.FlightNumber}<br><small class="muted">${routeHTML(h.SourceAirport, h.DestinationAirport)}</small></td>
          <td>${fdate(h.JourneyDate)}</td><td>${h.SeatNumber}<br><small class="muted">${h.SeatClass}</small></td><td>${money(h.TotalFare)}</td><td>${statusChip(h.BookingStatus)}</td></tr>`)}</tbody></table>`
        : html`<div class="muted">No bookings yet.</div>`, history.length)}
      ${reviews && reviews.n ? sec('Reviews', html`<div class="row">${stars(reviews.avg)}<b>${reviews.avg}</b><span class="muted">average over ${reviews.n} review${reviews.n > 1 ? 's' : ''}</span></div>`) : ''}`);
    d.foot.innerHTML = String(html`<button class="btn danger-ghost" data-act="delete">${icon('trash', 18)}Delete</button><span style="flex:1"></span>
      <button class="btn ghost" data-act="edit">${icon('edit', 18)}Edit</button><button class="btn primary" data-act="book">${icon('ticket', 18)}Book a seat</button>`);
  };
  const load = async () => { try { ov = await api.get(`/passengers/${id}/overview`); render(); } catch (e) { failed(d, e); } };
  load();
  const off = onChange(load);
  const origClose = d.close.bind(d); d.close = (r) => { off(); origClose(r); };
  d.el.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-act]'); if (!a || !ov) return;
    const p = ov.passenger;
    if (a.dataset.act === 'edit') editRecord('passengers', p);
    if (a.dataset.act === 'delete') { if (await deleteRecord('passengers', p, `${p.FirstName} ${p.LastName}`)) d.close(); }
    if (a.dataset.act === 'book') { d.close(); location.hash = `#/book?passenger=${p.PassengerID}`; }
    if (a.dataset.act === 'open-booking') openBooking(a.dataset.id);
  });
  return d;
}

/* ================================================================== */
/*  Flight                                                              */
/* ================================================================== */
export function openFlight(id) {
  let ov = null;
  const d = openDrawer({ eyebrow: 'Flight', title: '…', size: 'xl', content: skeletonRows(8), footer: ' ' });
  const render = () => {
    const { flight: f, report, occupancy, classes, rating, bookings } = ov;
    setHead(d, 'Flight', html`${f.FlightNumber} <span class="muted" style="font-size:.6em">${f.AirlineName}</span>`, `${city(f.SourceAirport) || f.SourceAirport} → ${city(f.DestinationAirport) || f.DestinationAirport}`, statusChip(f.FlightStatus));
    d.setContent(html`
      <div class="panel soft" style="display:grid;grid-template-columns:auto 1fr auto;gap:22px;align-items:center">
        <div><div style="font-family:var(--display);font-size:46px;line-height:1">${f.SourceAirport}</div><div class="muted">${fdate(f.DepartureDate)} · ${ftime(f.DepartureTime)}</div></div>
        <div class="tl" style="min-width:0"><span>${fdur(f.DurationMin)} · ${fnum(f.DistanceKM)} km</span><div class="line">${icon('plane', 20)}</div><span>${f.AircraftModel}</span></div>
        <div class="right"><div style="font-family:var(--display);font-size:46px;line-height:1">${f.DestinationAirport}</div><div class="muted">${fdate(f.ArrivalDate)} · ${ftime(f.ArrivalTime)}</div></div>
      </div>
      <div class="grid g2" style="margin-top:18px">
        <div class="panel row" style="gap:20px"><div class="ring" style="--p:${occupancy}" data-label="${Math.round(occupancy)}%"></div>
          <div><b>Seat occupancy</b><div class="muted" style="font-size:13px">${f.SeatsBooked} of ${f.TotalSeats} seats booked<br>${f.AvailableSeats} still available</div></div></div>
        <div class="panel"><dl class="kvs">${kv('Net revenue', html`<b style="font-family:var(--display);font-size:28px">${money(report && report.NetRevenue)}</b>`)}${kv('Base ticket price', money2(f.TicketPrice))}
          ${kv('Bookings', report ? `${report.TotalBookings} (${report.CancelledBookings} cancelled)` : '—')}${kv('Rating', rating ? html`${stars(rating.AvgRating)} <b>${rating.AvgRating}</b> <span class="muted">(${rating.ReviewCount})</span>` : html`<span class="muted">No reviews</span>`)}</dl></div></div>
      ${sec('Cabin availability', html`<div class="cabin-bars">${classes.map((c) => html`<div class="cb"><b>${c.SeatClass}</b><div class="bar"><i style="width:${c.total ? Math.round((c.booked / c.total) * 100) : 0}%"></i></div><span class="muted right">${c.open} open / ${c.total}</span></div>`)}</div>`)}
      ${sec('Operations', html`<dl class="kvs c3">${kv('Terminal / Gate', `${f.Terminal || '—'} / ${f.Gate || '—'}`)}${kv('Captain', f.PilotName)}${kv('Cabin crew', f.CabinCrewCount)}</dl>`)}
      ${sec('Latest bookings', bookings.length ? html`<table class="mini-table"><thead><tr><th>PNR</th><th>Passenger</th><th>Seat</th><th>Fare</th><th>Status</th></tr></thead><tbody>
        ${bookings.map((b) => html`<tr class="click" data-act="open-booking" data-id="${b.BookingID}"><td><span class="pnr">${b.BookingReference}</span></td><td>${b.PassengerName}</td><td>${b.SeatNumber}</td><td>${money(b.TotalFare)}</td><td>${statusChip(b.BookingStatus)}</td></tr>`)}</tbody></table>`
        : html`<div class="muted">No bookings on this flight yet.</div>`)}`);
    d.foot.innerHTML = String(html`<button class="btn danger-ghost" data-act="delete">${icon('trash', 18)}Delete</button><span style="flex:1"></span>
      <button class="btn ghost" data-act="seats">${icon('seat', 18)}Manage seats</button><button class="btn ghost" data-act="edit">${icon('edit', 18)}Edit</button>
      ${['Scheduled', 'Delayed'].includes(f.FlightStatus) ? html`<button class="btn primary" data-act="book">${icon('ticket', 18)}Book a seat</button>` : ''}`);
  };
  const load = async () => { try { ov = await api.get(`/flights/${id}/overview`); render(); } catch (e) { failed(d, e); } };
  load();
  const off = onChange(load);
  const origClose = d.close.bind(d); d.close = (r) => { off(); origClose(r); };
  d.el.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-act]'); if (!a || !ov) return;
    const f = ov.flight;
    if (a.dataset.act === 'edit') editRecord('flights', f);
    if (a.dataset.act === 'delete') { if (await deleteRecord('flights', f, `${f.FlightNumber} (${f.SourceAirport} → ${f.DestinationAirport})`)) d.close(); }
    if (a.dataset.act === 'seats') { d.close(); location.hash = `#/seats?flight=${f.FlightID}`; }
    if (a.dataset.act === 'book') { d.close(); location.hash = `#/book?flight=${f.FlightID}`; }
    if (a.dataset.act === 'open-booking') openBooking(a.dataset.id);
  });
  return d;
}
