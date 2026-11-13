/* Config-driven list page used by passengers, flights, bookings, payments, cancellations, reviews, baggage */
import { html, raw, mount, $, $$, on, debounce, money, money2, fdate, ftime, fdur, fnum, plural } from '../util.js';
import { icon } from '../icons.js';
import { api, qs, ent, city } from '../api.js';
import { statusChip, tierChip, idChip, stars, skeletonRows, emptyState, toastError, yesNo } from '../ui.js';
import { personAvatar, airlineAvatar, routeHTML, cell2, occBar, onChange, flightLabel } from '../common.js';
import { openBooking, openPassenger, openFlight, openRecord } from '../drawers.js';
import { createRecord, editRecord, deleteRecord } from '../forms.js';
import { isPendingDelete, takeTouched } from '../hci.js';
import { KEYS, getJSON, setJSON, prefs } from '../prefs.js';

const person = (name, sub) => html`<div class="row" style="gap:12px">${personAvatar(name)}${cell2(name, sub)}</div>`;
const pnr = (r) => html`<span class="pnr">${r.BookingReference}</span>`;

const PAGES = {
  passengers: {
    eyebrow: 'People', title: html`Our <em>passengers</em>`, desc: 'Everyone who has travelled — or plans to — with their documents, preferences and loyalty status.', newText: 'Add passenger',
    cols: [
      { label: 'ID', sort: 'PassengerID', render: (r) => idChip(r.PassengerID) },
      { label: 'Passenger', sort: 'FullName', render: (r) => person(r.FullName, r.Email) },
      { label: 'Age', sort: 'Age', render: (r) => r.Age },
      { label: 'Location', sort: 'Country', render: (r) => cell2(r.City, r.Country) },
      { label: 'Phone', render: (r) => r.Phone },
      { label: 'Flights', sort: 'FlightsTaken', render: (r) => r.FlightsTaken },
      { label: 'Membership', sort: 'FrequentFlyerMembership', render: (r) => tierChip(r.FrequentFlyerMembership) },
    ],
    open: (r) => openPassenger(r.PassengerID), label: (r) => r.FullName,
  },
  flights: {
    eyebrow: 'Operations', title: html`Scheduled <em>flights</em>`, desc: 'Routes, schedules, fares and crew. Creating a flight also generates its seat map.', newText: 'Add flight', order: 'Departure',
    cols: [
      { label: 'ID', sort: 'FlightID', render: (r) => idChip(r.FlightID) },
      { label: 'Flight', sort: 'FlightNumber', render: (r) => html`<div class="row" style="gap:12px">${airlineAvatar(r.AirlineName)}${cell2(r.FlightNumber, r.AirlineName)}</div>` },
      { label: 'Route', sort: 'Route', render: (r) => cell2(routeHTML(r.SourceAirport, r.DestinationAirport), `${city(r.SourceAirport) || ''} → ${city(r.DestinationAirport) || ''}`) },
      { label: 'Departure', sort: 'Departure', render: (r) => cell2(fdate(r.DepartureDate), `${ftime(r.DepartureTime)} · ${fdur(r.DurationMin)}`) },
      { label: 'Aircraft', render: (r) => cell2(r.AircraftModel, `${r.Terminal || '—'} · Gate ${r.Gate || '—'}`) },
      { label: 'Fare', sort: 'TicketPrice', render: (r) => money(r.TicketPrice) },
      { label: 'Seats', sort: 'Seats', render: (r) => occBar(r.SeatsBooked, r.TotalSeats) },
      { label: 'Status', sort: 'FlightStatus', render: (r) => statusChip(r.FlightStatus) },
    ],
    open: (r) => openFlight(r.FlightID), label: (r) => `${r.FlightNumber} (${r.SourceAirport} → ${r.DestinationAirport})`, sort: ['Departure', 'asc'],
  },
  bookings: {
    eyebrow: 'Reservations', title: html`All <em>bookings</em>`, desc: 'Every reservation with its flight, seat and payment status. Click a row for the full picture.', newText: 'New booking',
    cols: [
      { label: 'ID', sort: 'BookingID', render: (r) => idChip(r.BookingID) },
      { label: 'PNR', sort: 'BookingReference', render: pnr },
      { label: 'Passenger', sort: 'PassengerName', render: (r) => person(r.PassengerName, r.PassengerEmail) },
      { label: 'Flight & departure', sort: 'Departure', render: (r) => cell2(`${r.FlightNumber} · ${r.SourceAirport} → ${r.DestinationAirport}`, `${fdate(r.DepartureDate, { noYear: true })} · ${ftime(r.DepartureTime)}`) },
      { label: 'Seat', sort: 'SeatNumber', render: (r) => cell2(r.SeatNumber, r.SeatClass === 'Premium Economy' ? 'Prem. Eco' : r.SeatClass) },
      { label: 'Fare', sort: 'TotalFare', render: (r) => money(r.TotalFare) },
      { label: 'Payment', render: (r) => (r.PaymentStatus ? statusChip(r.PaymentStatus) : raw('<span class="chip tone-warn">Unpaid</span>')) },
      { label: 'Status', sort: 'BookingStatus', render: (r) => statusChip(r.BookingStatus) },
    ],
    open: (r) => openBooking(r.BookingID), label: (r) => r.BookingReference,
  },
  payments: {
    eyebrow: 'Reservations', title: html`<em>Payments</em> & invoices`, desc: 'Amounts, fees, GST and transaction references for every booking.', newText: 'Record payment',
    cols: [
      { label: 'ID', sort: 'PaymentID', render: (r) => idChip(r.PaymentID) },
      { label: 'Invoice', sort: 'InvoiceNumber', render: (r) => cell2(html`<span class="mono">${r.InvoiceNumber}</span>`, fdate(r.PaymentDate)) },
      { label: 'Booking', render: (r) => cell2(pnr(r), r.PassengerName) },
      { label: 'Method', sort: 'PaymentMethod', render: (r) => r.PaymentMethod },
      { label: 'Amount', sort: 'Amount', render: (r) => money2(r.Amount) },
      { label: 'Fee + GST', render: (r) => cell2(money2(Number(r.ConvenienceFee) + Number(r.GST)), `fee ${money2(r.ConvenienceFee)}`) },
      { label: 'Total', sort: 'TotalAmount', render: (r) => html`<b>${money2(r.TotalAmount)}</b>` },
      { label: 'Status', sort: 'PaymentStatus', render: (r) => statusChip(r.PaymentStatus) },
    ],
    open: (r) => openRecord('payments', r, { subtitle: html`${r.BookingReference} · ${r.PassengerName}` }), label: (r) => `invoice ${r.InvoiceNumber}`,
  },
  cancellations: {
    eyebrow: 'Reservations', title: html`<em>Cancellations</em> & refunds`, desc: 'Cancelling a booking releases its seat and creates a refund to process. Records are kept as an audit trail.', newText: 'Cancel a booking',
    cols: [
      { label: 'ID', sort: 'CancellationID', render: (r) => idChip(r.CancellationID) },
      { label: 'Booking', render: (r) => cell2(pnr(r), r.PassengerName) },
      { label: 'Flight', render: (r) => r.FlightNumber },
      { label: 'Cancelled', sort: 'CancellationDate', render: (r) => cell2(fdate(r.CancellationDate), ftime(r.CancellationTime)) },
      { label: 'Reason', render: (r) => html`<span title="${r.Reason}" style="display:block;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.Reason}</span>` },
      { label: 'Refund', sort: 'RefundAmount', render: (r) => cell2(money2(r.RefundAmount), `charge ${money2(r.CancellationCharges)}`) },
      { label: 'Refund status', sort: 'RefundStatus', render: (r) => statusChip(r.RefundStatus) },
      { label: 'Status', sort: 'CancellationStatus', render: (r) => statusChip(r.CancellationStatus) },
    ],
    open: (r) => openRecord('cancellations', r, { subtitle: html`${r.BookingReference} · ${r.PassengerName}` }), label: (r) => `cancellation ${r.CancellationID}`,
  },
  reviews: {
    eyebrow: 'Feedback', title: html`Passenger <em>reviews</em>`, desc: 'Ratings across cabin, food, staff, comfort and entertainment. One-star reviews are flagged automatically for moderation.', newText: 'Add review',
    cols: [
      { label: 'ID', sort: 'ReviewID', render: (r) => idChip(r.ReviewID) },
      { label: 'Passenger', sort: 'PassengerName', render: (r) => person(r.PassengerName, fdate(r.ReviewDate)) },
      { label: 'Flight', render: (r) => cell2(r.FlightNumber, r.AirlineName) },
      { label: 'Rating', sort: 'Rating', render: (r) => html`<div class="row" style="gap:6px">${stars(r.Rating)}<b>${r.Rating}</b></div>` },
      { label: 'Review', render: (r) => cell2(r.ReviewTitle, String(r.ReviewDescription).slice(0, 60) + (r.ReviewDescription.length > 60 ? '…' : '')) },
      { label: 'Recommends', render: (r) => yesNo(r.Recommend) },
      { label: 'Status', sort: 'ReviewStatus', render: (r) => statusChip(r.ReviewStatus) },
    ],
    open: (r) => openRecord('reviews', r, { subtitle: html`${r.PassengerName} on ${flightLabel(r)}` }), label: (r) => `review ${r.ReviewID}`,
  },
  baggage: {
    eyebrow: 'Reservations', title: html`<em>Baggage</em> tracking`, desc: 'Tags, weights and excess charges (₹500 per extra kg) from check-in to collection.', newText: 'Add baggage',
    cols: [
      { label: 'ID', sort: 'BaggageID', render: (r) => idChip(r.BaggageID) },
      { label: 'Tag', sort: 'TagNumber', render: (r) => cell2(html`<span class="mono">${r.TagNumber}</span>`, `${r.BaggageType} · ${r.SpecialHandling}`) },
      { label: 'Booking', render: (r) => cell2(pnr(r), r.PassengerName) },
      { label: 'Route', render: (r) => routeHTML(r.SourceAirport, r.DestinationAirport) },
      { label: 'Bags', sort: 'NumberOfBags', render: (r) => r.NumberOfBags },
      { label: 'Weight', sort: 'BagWeight', render: (r) => cell2(`${r.BagWeight} kg`, `allowed ${r.AllowedWeight} kg`) },
      { label: 'Excess', sort: 'ExtraCharge', render: (r) => (r.ExtraCharge ? cell2(money2(r.ExtraCharge), `${r.ExtraWeight} kg over`) : raw('<span class="muted">—</span>')) },
      { label: 'Status', sort: 'BaggageStatus', render: (r) => statusChip(r.BaggageStatus) },
      { label: 'Collected', render: (r) => statusChip(r.CollectionStatus) },
    ],
    open: (r) => openRecord('baggage', r, { subtitle: html`${r.BookingReference} · ${r.PassengerName}` }), label: (r) => `bag ${r.TagNumber}`,
  },
};

export default async function render(root, params, entKey) {
  const cfg = PAGES[entKey];
  const meta = ent(entKey);
  const filterCol = meta.filter && meta.filter.column;
  const st = {
    q: '', page: 1, pageSize: 12,
    sort: cfg.sort ? cfg.sort[0] : '', dir: cfg.sort ? cfg.sort[1] : 'desc',
    filters: {}, rows: [], total: 0, facets: null,
  };
  // deep links from the dashboard, e.g. #/flights?FlightStatus=Delayed
  let deepLinked = false;
  for (const [k, v] of Object.entries(params || {})) if (meta.fields.some((f) => f.name === k)) { st.filters[k] = v; deepLinked = true; }
  /* HCI-R8: remember the last search / filter / sort used on each list page */
  const memKey = KEYS.filters + entKey;
  let restored = false;
  if (!deepLinked) {
    const mem = getJSON(memKey, null);
    if (mem && typeof mem === 'object') {
      if (typeof mem.q === 'string') st.q = mem.q;
      if (mem.filters && typeof mem.filters === 'object') st.filters = mem.filters;
      if (mem.sort) { st.sort = mem.sort; st.dir = mem.dir === 'asc' ? 'asc' : 'desc'; }
      restored = !!(st.q || Object.keys(st.filters).length);
    }
  }
  const remember = () => setJSON(memKey, { q: st.q, filters: st.filters, sort: st.sort, dir: st.dir });

  const canNew = meta.canCreate !== false;
  mount(root, html`<div class="fade-in">
    <header class="page-head"><div class="titles"><div class="eyebrow">${cfg.eyebrow}</div><h1>${cfg.title}</h1><p>${cfg.desc}</p></div>
      <div class="page-actions">${canNew ? html`<button class="btn primary lg" id="newBtn">${icon('plus', 20)}${cfg.newText}</button>` : ''}</div></header>
    <section class="card">
      <div class="toolbar"><label class="search">${icon('search', 18)}<input id="q" type="search" placeholder="Search ${meta.plural.toLowerCase()}…" autocomplete="off" aria-label="Search ${meta.plural.toLowerCase()}" value="${st.q}"/></label><div class="filters" id="filters"></div></div>
      <div id="memo"></div>
      <div id="tbl">${skeletonRows(8)}</div><div id="pager" class="pager"></div>
    </section></div>`);

  const fcol = filterCol;
  const fopts = (meta.filter && meta.filter.options) || [];

  const drawFilters = () => {
    if (!fcol) return;
    const cur = st.filters[fcol] || '';
    const total = st.facets ? Object.values(st.facets).reduce((a, b) => a + b, 0) : null;
    $('#filters', root).innerHTML = String(html`<button class="fchip ${cur === '' ? 'on' : ''}" data-f="">All${total !== null ? html` <small>${total}</small>` : ''}</button>${fopts.map((o) =>
      html`<button class="fchip ${cur === o ? 'on' : ''}" data-f="${o}">${o}${st.facets && st.facets[o] !== undefined ? html` <small>${st.facets[o]}</small>` : ''}</button>`)}`);
  };

  /* HCI-R8 + R7: tell the user their previous filters were restored, and let them reset in one click */
  const drawMemo = () => {
    const box = $('#memo', root); if (!box) return;
    const active = st.q || Object.keys(st.filters).length;
    box.innerHTML = restored && active ? String(html`<div class="hci-memo">${icon('history', 16)}<span>Showing your last view${st.q ? html` · search “<b>${st.q}</b>”` : ''}${Object.values(st.filters).map((v) => html` · <b>${v}</b>`)}</span><button type="button" class="linkish" data-reset-view>Reset filters</button></div>`) : '';
  };
  const drawTable = () => {
    const box = $('#tbl', root);
    drawMemo();
    if (!st.rows.length) {
      box.innerHTML = String(emptyState({ icon: 'search', title: 'Nothing found', text: st.q || Object.keys(st.filters).length ? 'Try a different search or clear the filters.' : `No ${meta.plural.toLowerCase()} yet.` }));
      $('#pager', root).innerHTML = ''; return;
    }
    box.innerHTML = String(html`<div class="table-wrap"><table class="t"><thead><tr>${cfg.cols.map((c) => html`<th class="${c.sort ? 'sortable' : ''} ${st.sort === c.sort ? 'sorted' : ''}" ${c.sort ? raw(`data-sort="${c.sort}" tabindex="0" aria-sort="${st.sort === c.sort ? (st.dir === 'asc' ? 'ascending' : 'descending') : 'none'}"`) : ''}>${c.label}${c.sort ? html`<span class="sort-ar">${st.sort === c.sort ? (st.dir === 'asc' ? '↑' : '↓') : '↕'}</span>` : ''}</th>`)}<th></th></tr></thead>
      <tbody>${st.rows.map((r, i) => html`<tr class="click" data-i="${i}" tabindex="0" aria-label="Open ${cfg.label(r)}">${cfg.cols.map((c) => html`<td>${c.render(r)}</td>`)}
        <td class="act"><button class="icon-btn" data-edit="${i}" aria-label="Edit ${cfg.label(r)}" title="Edit">${icon('edit', 18)}</button>${meta.canDelete ? html`<button class="icon-btn danger" data-del="${i}" aria-label="Delete ${cfg.label(r)}" title="Delete (you can undo)">${icon('trash', 18)}</button>` : ''}</td></tr>`)}</tbody></table></div>`);
    /* HCI-R4: flash + scroll to the row that was just created, edited or restored */
    const hit = takeTouched(entKey);
    if (hit !== null) {
      const i = st.rows.findIndex((r) => String(r[meta.pk]) === hit);
      const tr = i >= 0 ? $(`tr[data-i="${i}"]`, box) : null;
      if (tr) { tr.classList.add('hci-flash'); tr.scrollIntoView({ block: 'center', behavior: prefs.motion === 'off' ? 'auto' : 'smooth' }); setTimeout(() => tr.classList.remove('hci-flash'), 2600); }
    }
    const pages = Math.max(1, Math.ceil(st.total / st.pageSize));
    const from = (st.page - 1) * st.pageSize + 1; const to = Math.min(st.total, st.page * st.pageSize);
    const nums = []; for (let p = Math.max(1, st.page - 2); p <= Math.min(pages, st.page + 2); p++) nums.push(p);
    $('#pager', root).innerHTML = String(html`<span>Showing <b>${from}–${to}</b> of <b>${fnum(st.total)}</b></span><span style="flex:1"></span>
      <button class="pg" data-p="${st.page - 1}" ${st.page === 1 ? 'disabled' : ''} aria-label="Previous page" title="Previous page">${icon('chevronL', 16)}</button>
      ${nums.map((p) => html`<button class="pg ${p === st.page ? 'on' : ''}" data-p="${p}" aria-label="Page ${p}" ${p === st.page ? raw('aria-current="page"') : ''}>${p}</button>`)}
      <button class="pg" data-p="${st.page + 1}" ${st.page >= pages ? 'disabled' : ''} aria-label="Next page" title="Next page">${icon('chevronR', 16)}</button>`);
  };

  let seq = 0;
  const load = async () => {
    const my = ++seq;
    try {
      const f = Object.fromEntries(Object.entries(st.filters).map(([k, v]) => [`f_${k}`, v]));
      const r = await api.get(`/${meta.key}${qs({ q: st.q, page: st.page, pageSize: st.pageSize, sort: st.sort, dir: st.dir, ...f })}`);
      if (my !== seq) return;
      /* HCI-R6: rows waiting on an Undo toast are hidden straight away */
      const rows = r.rows.filter((x) => !isPendingDelete(entKey, x[meta.pk]));
      Object.assign(st, { rows, total: Math.max(0, r.total - (r.rows.length - rows.length)), facets: r.facets });
      if (st.page > 1 && !r.rows.length) { st.page = 1; return load(); }
      drawFilters(); drawTable();
    } catch (e) { toastError(e); }
  };

  $('#q', root).addEventListener('input', debounce((e) => { st.q = e.target.value.trim(); st.page = 1; restored = false; remember(); load(); }, 250));
  on(root, 'click', '[data-f]', (e, el) => { if (el.dataset.f) st.filters[fcol] = el.dataset.f; else delete st.filters[fcol]; st.page = 1; restored = false; remember(); load(); });
  on(root, 'click', '[data-reset-view]', () => { st.q = ''; st.filters = {}; st.page = 1; restored = false; $('#q', root).value = ''; remember(); load(); });
  on(root, 'click', '[data-p]', (e, el) => { if (el.disabled) return; st.page = Number(el.dataset.p); load(); window.scrollTo({ top: 0, behavior: prefs.motion === 'off' ? 'auto' : 'smooth' }); });
  on(root, 'click', 'th[data-sort]', (e, el) => {
    const k = el.dataset.sort; if (st.sort === k) st.dir = st.dir === 'asc' ? 'desc' : 'asc'; else { st.sort = k; st.dir = 'asc'; } remember(); load();
  });

  /* HCI-R2: sortable headers work from the keyboard too */
  on(root, 'keydown', 'th[data-sort]', (e, el) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } });
  on(root, 'click', '[data-edit]', (e, el) => { e.stopPropagation(); editRecord(entKey, st.rows[el.dataset.edit]); });
  on(root, 'click', '[data-del]', (e, el) => { e.stopPropagation(); const r = st.rows[el.dataset.del]; deleteRecord(entKey, r, cfg.label(r)); });
  on(root, 'click', 'tr[data-i]', (e, el) => cfg.open(st.rows[el.dataset.i]));
  on(root, 'keydown', 'tr[data-i]', (e, el) => { if (e.key === 'Enter' && e.target === el) cfg.open(st.rows[el.dataset.i]); });   // HCI-R2: rows open with Enter
  const nb = $('#newBtn', root); if (nb) nb.addEventListener('click', () => createRecord(entKey));

  await load();
  return onChange(load);
}
