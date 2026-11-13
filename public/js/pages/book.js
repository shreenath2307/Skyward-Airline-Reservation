/* Booking wizard: Flight -> Seat -> Passenger -> Details (booking, payment, baggage) -> Review -> Ticket */
import { html, raw, mount, $, $$, on, money, money2, fdate, ftime, fdur, fnum, nowHM, todayStr } from '../util.js';
import { icon } from '../icons.js';
import { api, qs, store, ent, city } from '../api.js';
import { combo, buildForm, statusChip, tierChip, idChip, toast, toastError, busy, skeletonRows, emptyState } from '../ui.js';
import { airlineAvatar, personAvatar, routeHTML, emitChange } from '../common.js';
import { seatMapHTML, legendHTML, seatInfoHTML } from '../seatmap.js';
import { ticketHTML } from '../ticket.js';
import { showTicket, openBooking } from '../drawers.js';
import { prefs } from '../prefs.js';
import { markTouched } from '../hci.js';

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const STEPS = ['Flight', 'Seat', 'Passenger', 'Details', 'Review'];
const METHODS = [['Credit Card', 'card'], ['Debit Card', 'card'], ['UPI', 'phone'], ['Net Banking', 'bank'], ['Wallet', 'wallet']];
const CHANNELS = [['Website', 'globe'], ['Mobile App', 'phone'], ['Travel Agent', 'users'], ['Airport Counter', 'pin']];

export default async function render(root, params = {}) {
  const P = store.meta.pricing;
  const S = {
    step: 1, flights: [], airports: [], filters: { from: '', to: '', date: '', airline: '' }, loadingFlights: true,
    flight: null, seatsData: null, seat: null, hover: null,
    pMode: 'existing', passengerId: null, passengerItem: null, passengerRow: null, newForm: null,
    pax: 1, channel: 'Website', coupon: '', couponInfo: null, insurance: false, status: 'Confirmed', createdBy: 'Agent-01',
    payNow: true, method: 'Credit Card', payStatus: 'Success', txn: '', invoice: '',
    bagOn: false, bag: { count: 1, weight: '', allowed: '', type: 'Checked', handling: 'None', status: 'Checked-In', collection: 'Not Collected', time: nowHM() },
    done: null,
  };
  let passengerCombo = null;

  /* ---------------- pricing ---------------- */
  const calc = () => {
    if (!S.flight || !S.seat) return null;
    const base = r2(Number(S.flight.TicketPrice) * Number(S.seat.SeatPriceMultiplier) * S.pax);
    const disc = S.couponInfo ? r2((base * S.couponInfo.pct) / 100) : 0;
    const taxable = r2(base - disc); const tax = r2(taxable * P.TAX_RATE); const total = r2(taxable + tax);
    const fee = S.payNow ? r2((total * (P.CONVENIENCE_PCT[S.method] ?? 0)) / 100) : 0;
    const gst = S.payNow ? r2(total * P.GST_RATE) : 0;
    const allowed = S.bag.allowed === '' ? (P.FREE_BAGGAGE_KG[S.seat.SeatClass] ?? 20) : Number(S.bag.allowed);
    const extraKg = S.bagOn ? Math.max(0, r2((Number(S.bag.weight) || 0) - allowed)) : 0;
    return { base, disc, tax, total, fee, gst, payable: r2(total + fee + gst), allowed, extraKg, extraCharge: r2(extraKg * P.EXCESS_BAGGAGE_RATE) };
  };

  /* ---------------- shell ---------------- */
  mount(root, html`<div class="fade-in">
    <header class="page-head"><div class="titles"><div class="eyebrow">Reservations</div><h1>Book a <em>seat</em></h1><p>Five quick steps: choose the flight, pick the exact seat, add the passenger, set payment and baggage, then confirm.</p></div></header>
    <div id="stepper"></div><div class="wiz" id="wiz"><div class="wiz-main" id="main"></div><aside class="wiz-side" id="side"></aside></div></div>`);
  const main = $('#main', root); const side = $('#side', root);

  const drawStepper = () => {
    $('#stepper', root).innerHTML = String(S.done ? '' : html`<nav class="stepper" aria-label="Progress">${STEPS.map((s, i) => html`
      <button class="step ${S.step === i + 1 ? 'active' : ''} ${S.step > i + 1 ? 'done' : ''}" data-goto="${i + 1}" ${S.step > i + 1 ? '' : 'disabled'}>
        <span class="n">${S.step > i + 1 ? icon('check', 16) : i + 1}</span><span>${s}</span></button>${i < STEPS.length - 1 ? html`<span class="step-line ${S.step > i + 1 ? 'done' : ''}"></span>` : ''}`)}</nav>`);
  };

  /* ---------------- summary side panel ---------------- */
  /* HCI-R8: persistent trip summary — flight, seat, passenger and price stay visible on every step */
  const pending = (txt) => html`<span class="hci-sum-pending">${txt}</span>`;
  const drawSide = () => {
    if (S.done) { side.innerHTML = ''; return; }
    const f = S.flight; const c = calc();
    const p = S.pMode === 'existing' ? (S.passengerItem && S.passengerItem.label) : (S.newForm && `${S.newForm.vals.FirstName || ''} ${S.newForm.vals.LastName || ''}`.trim());
    side.innerHTML = String(html`
      <section class="card sum hci-sum ${c && S.step >= 4 ? 'accent' : ''}" aria-label="Trip summary" aria-live="polite"><h4>Trip summary <small class="hci-sum-step">Step ${S.step} of ${STEPS.length}</small></h4>
        ${f ? html`<div class="mini-route"><div><div class="cd">${f.SourceAirport}</div></div><div class="grow" style="text-align:center">${icon('plane', 22, 'rot90')}</div><div style="text-align:right"><div class="cd">${f.DestinationAirport}</div></div></div>
          <div class="sum-line"><span>Flight</span><span>${f.FlightNumber} · ${f.AirlineName}</span></div>
          <div class="sum-line"><span>Departs</span><span>${fdate(f.DepartureDate, { noYear: true })} · ${ftime(f.DepartureTime)}</span></div>`
        : html`<div class="sum-line"><span>Flight</span>${pending('Not chosen yet')}</div>`}
        <div class="sum-line"><span>Seat</span>${S.seat ? html`<span><b>${S.seat.SeatNumber}</b> · ${S.seat.SeatClass}</span>` : pending('Not chosen yet')}</div>
        <div class="sum-line"><span>Passenger</span>${p ? html`<span>${p}</span>` : pending('Not chosen yet')}</div>
        ${c ? '' : html`<div class="sum-line"><span>Price</span>${pending('Shown once a seat is picked')}</div>`}
        ${c ? html`<div style="height:6px"></div>
          <div class="sum-line"><span>Base fare${S.pax > 1 ? ` × ${S.pax}` : ''}</span><span>${money2(c.base)}</span></div>
          ${c.disc ? html`<div class="sum-line disc"><span>Coupon ${S.couponInfo.code}</span><span>− ${money2(c.disc)}</span></div>` : ''}
          <div class="sum-line"><span>Tax (${P.TAX_RATE * 100}%)</span><span>${money2(c.tax)}</span></div>
          ${S.step >= 4 && S.payNow ? html`<div class="sum-line"><span>Convenience fee</span><span>${money2(c.fee)}</span></div><div class="sum-line"><span>GST (${P.GST_RATE * 100}%)</span><span>${money2(c.gst)}</span></div>` : ''}
          <div class="sum-line total"><span>${S.step >= 4 && S.payNow ? 'Amount payable' : 'Total fare'}</span><span>${money2(S.step >= 4 && S.payNow ? c.payable : c.total)}</span></div>
          ${c.extraCharge ? html`<div class="sum-line" style="margin-top:6px"><span>Excess baggage (${c.extraKg} kg)</span><span>${money2(c.extraCharge)}</span></div>` : ''}` : ''}
      </section>`);
  };

  /* ================= STEP 1: flight ================= */
  const loadFlights = async () => {
    S.loadingFlights = true; drawFlightsList();
    try {
      const r = await api.get(`/flights/search${qs(S.filters)}`);
      S.flights = r.flights; if (!S.airports.length) S.airports = r.airports;
    } catch (e) { toastError(e); }
    S.loadingFlights = false;
    if (S.step === 1) drawFlightsList(!S.airports.length);
  };
  const flightStrip = (f) => html`<button class="strip ${S.flight && S.flight.FlightID === f.FlightID ? 'sel' : ''}" data-flight="${f.FlightID}">
    <div class="al">${airlineAvatar(f.AirlineName)}<div><b>${f.FlightNumber}</b><small>${f.AirlineName}</small><small>${f.AircraftModel}</small></div></div>
    <div class="trip"><div class="tp"><span class="tm">${ftime(f.DepartureTime)}</span><span class="cd">${f.SourceAirport}</span><span class="cn">${city(f.SourceAirport)} · ${fdate(f.DepartureDate, { noYear: true })}</span></div>
      <div class="tl"><span>${fdur(f.DurationMin)}</span><div class="line">${icon('plane', 18)}</div><span>${f.Terminal || ''} ${f.Gate ? `· Gate ${f.Gate}` : ''}</span></div>
      <div class="tp r"><span class="tm">${ftime(f.ArrivalTime)}</span><span class="cd">${f.DestinationAirport}</span><span class="cn">${city(f.DestinationAirport)}</span></div></div>
    <div class="buy"><div class="price"><small>from</small>${money(f.FromPrice ?? f.TicketPrice)}</div><div class="row" style="gap:8px">${statusChip(f.FlightStatus)}<span class="chip ${f.SeatsOpen < 5 ? 'tone-warn' : ''}">${f.SeatsOpen} seats left</span></div></div></button>`;
  function drawFlightsList() {
    const box = $('#flights', root); if (!box) return;
    box.innerHTML = String(S.loadingFlights ? skeletonRows(4) : S.flights.length ? html`<div class="flight-list">${S.flights.map(flightStrip)}</div>`
      : emptyState({ icon: 'plane', title: 'No flights match', text: 'Try another route or date — or clear the filters.' }));
  }
  const drawStep1 = () => {
    const f = S.filters;
    const opts = (list, sel) => list.map((a) => html`<option value="${a}" ${a === sel ? 'selected' : ''}>${a}${city(a) ? ` — ${city(a)}` : ''}</option>`);
    main.innerHTML = String(html`<div class="step-title"><h2>Where is the passenger <em>flying</em>?</h2><p>Select a flight, then press <b>Continue</b>. Nothing moves on until you say so.</p></div>
      <section class="card"><form class="fsearch" id="fform">
        <div class="field"><label>From</label><select name="from"><option value="">Any airport</option>${opts(S.airports, f.from)}</select></div>
        <div class="field"><label>To</label><select name="to"><option value="">Any airport</option>${opts(S.airports, f.to)}</select></div>
        <div class="field"><label>Departure date</label><input type="date" name="date" value="${f.date}"/></div>
        <div class="field"><label>Airline</label><select name="airline"><option value="">All airlines</option>${(store.meta.lists.airlines || []).map((a) => html`<option ${a === f.airline ? 'selected' : ''}>${a}</option>`)}</select></div>
        <button type="button" class="btn ghost" id="clearF" style="height:44px">${icon('x', 16)}Clear</button></form></section>
      <div id="flights"></div>${navButtons(false, !!S.flight, 'Select a flight to continue')}`);
    drawFlightsList();
  };

  /* ================= STEP 2: seat ================= */
  const loadSeats = async () => {
    S.seatsData = null; drawSeatStep();
    try { S.seatsData = await api.get(`/flights/${S.flight.FlightID}/seats`); } catch (e) { toastError(e); }
    if (S.step === 2) drawSeatStep();
  };
  const drawSeatStep = () => {
    const d = S.seatsData; const f = S.flight;
    main.innerHTML = String(html`<div class="step-title"><h2>Choose the <em>seat</em></h2><p>${f.FlightNumber} · ${f.SourceAirport} → ${f.DestinationAirport} · ${fdate(f.DepartureDate)}</p></div>
      <div class="seat-layout"><section class="card">${d ? html`${seatMapHTML(d.seats, { selectedId: S.seat && S.seat.SeatID })}${legendHTML()}` : skeletonRows(8)}</section>
      <div id="seatinfo">${seatInfoHTML(S.hover || S.seat, f)}</div></div>${navButtons(true, !!S.seat, 'Pick an available seat to continue')}`);
  };

  /* ================= STEP 3: passenger ================= */
  const drawStep3 = () => {
    main.innerHTML = String(html`<div class="step-title"><h2>Who is <em>travelling</em>?</h2></div>
      <section class="card sect"><div class="seg" id="pmode" style="max-width:420px;margin-bottom:20px"><button type="button" data-pm="existing" class="${S.pMode === 'existing' ? 'on' : ''}">${icon('search', 16)} Existing passenger</button>
        <button type="button" data-pm="new" class="${S.pMode === 'new' ? 'on' : ''}">${icon('plus', 16)} New passenger</button></div>
        <div id="pbody"></div></section>${navButtons(true, canNext3(), 'Select or register the passenger to continue')}`);
    const body = $('#pbody', root);
    if (S.pMode === 'existing') {
      body.innerHTML = String(html`<label class="lbl">Search by name, email, phone or passport</label><div id="pcombo"></div><div id="pprofile"></div>`);
      if (passengerCombo) passengerCombo.destroy();
      passengerCombo = combo($('#pcombo', root), { kind: 'passengers', value: S.passengerId, label: S.passengerItem && S.passengerItem.label, placeholder: 'Start typing a passenger name…',
        onChange: async (id, item) => { S.passengerId = id; S.passengerItem = item; S.passengerRow = null; drawProfile(); drawSide(); syncNext(); if (id) { try { S.passengerRow = await api.get(`/passengers/${id}`); drawProfile(); } catch (_) { /* ignore */ } } } });
      drawProfile();
    } else {
      if (!S.newForm) S.newForm = buildForm('passengers', { mode: 'create', collapse: ['Loyalty programme'], onChange: () => drawSide(), onValidity: () => syncNext() });
      body.appendChild(S.newForm.el);
    }
    syncNext();
  };
  /* HCI-R5: Continue is only enabled when the current step is complete */
  function canNext3() { return S.pMode === 'existing' ? !!S.passengerId : !!(S.newForm && S.newForm.isValid()); }
  const canNext4 = () => !S.bagOn || (S.bag.weight !== '' && Number(S.bag.weight) >= 0 && Number(S.bag.weight) <= 200);
  function syncNext() {
    const b = $('[data-next]', root); if (!b) return;
    const ok = S.step === 1 ? !!S.flight : S.step === 2 ? !!S.seat : S.step === 3 ? canNext3() : S.step === 4 ? canNext4() : true;
    b.disabled = !ok;
    const h = $('.wiz-hint', root); if (h) h.hidden = ok;
  }
  const drawProfile = () => {
    const box = $('#pprofile', root); if (!box) return;
    const p = S.passengerRow;
    if (!S.passengerId) { box.innerHTML = String(html`<div class="callout" style="margin-top:16px">${icon('info', 20)}<div class="t">Can’t find them? Switch to <b>New passenger</b> to register a new traveller — they’ll be saved together with this booking.</div></div>`); return; }
    if (!p) { box.innerHTML = String(skeletonRows(2)); return; }
    const pref = S.seat && p.SeatPreference !== 'No Preference' && ((p.SeatPreference === 'Window' && !S.seat.WindowSeat) || (p.SeatPreference === 'Aisle' && !S.seat.AisleSeat));
    box.innerHTML = String(html`<div class="profile-card">${personAvatar(p.FullName, 'lg')}<div class="grow"><div class="row wrap" style="margin-bottom:10px"><b style="font-size:18px">${p.FullName}</b>${idChip(p.PassengerID)}${tierChip(p.FrequentFlyerMembership)}</div>
      <div class="pc-grid"><div class="kv"><dt>Email</dt><dd>${p.Email}</dd></div><div class="kv"><dt>Phone</dt><dd>${p.Phone}</dd></div><div class="kv"><dt>Age</dt><dd>${p.Age} · ${p.Gender}</dd></div>
        <div class="kv"><dt>Passport</dt><dd class="mono">${p.PassportNumber}</dd></div><div class="kv"><dt>Meal / seat pref.</dt><dd>${p.MealPreference} · ${p.SeatPreference}</dd></div><div class="kv"><dt>Loyalty points</dt><dd>${fnum(p.LoyaltyPoints)}</dd></div></div></div></div>
      ${pref ? html`<div class="callout warn" style="margin-top:14px">${icon('alert', 20)}<div class="t">This passenger prefers a <b>${p.SeatPreference.toLowerCase()}</b> seat but <b>${S.seat.SeatNumber}</b> isn’t one. You can go back and pick another.</div></div>` : ''}`);
  };

  /* ================= STEP 4: details ================= */
  const stepper = (id, val, min, max) => html`<div class="stepper-num"><button type="button" data-step="${id}:-1" aria-label="Decrease">${icon('minus', 16)}</button><output id="${id}">${val}</output><button type="button" data-step="${id}:1" aria-label="Increase">${icon('plus', 16)}</button></div>`;
  const seg = (name, opts, cur) => html`<div class="seg" data-segx="${name}">${opts.map((o) => html`<button type="button" data-v="${o}" class="${o === cur ? 'on' : ''}">${o}</button>`)}</div>`;
  const drawStep4 = () => {
    const c = calc(); const bg = S.bag;
    main.innerHTML = String(html`<div class="step-title"><h2>Booking, payment & <em>baggage</em></h2></div>
      <section class="card sect"><div class="sect-head"><span class="badge-ic">${icon('ticket', 22)}</span><div><h3>Booking details</h3><p>How this reservation was made and any discounts.</p></div></div>
        <div class="two"><div><span class="lbl">Passengers on this booking</span>${stepper('pax', S.pax)}</div>
          <div><span class="lbl">Booking status</span>${seg('status', ['Confirmed', 'Pending'], S.status)}</div></div>
        <div style="margin-top:18px"><span class="lbl">Booking channel</span><div class="choices">${CHANNELS.map(([n, ic]) => html`<button type="button" class="choice ${S.channel === n ? 'on' : ''}" data-channel="${n}">${icon(ic, 20)}<b>${n}</b></button>`)}</div></div>
        <div class="two" style="margin-top:18px"><div><span class="lbl">Coupon code</span><div class="coupon-row"><input class="inp" id="coupon" value="${S.coupon}" placeholder="Enter code" maxlength="20"/><button type="button" class="btn" id="applyCoupon">Apply</button></div>
          <div class="coupon-chips">${Object.keys(P.COUPONS).map((k) => html`<button type="button" data-coupon="${k}" title="${P.COUPONS[k].label}">${k} · ${P.COUPONS[k].pct}%</button>`)}</div>
          ${S.couponInfo ? html`<div class="applied">${icon('check', 16)}${S.couponInfo.code} — ${S.couponInfo.pct}% off (${S.couponInfo.label}) <button type="button" class="linkish" id="removeCoupon" title="Remove this coupon">Remove</button></div>` : ''}</div>
          <div><span class="lbl">Booked by</span><input class="inp" id="createdBy" value="${S.createdBy}" maxlength="50" placeholder="Agent or system name"/>
            <div style="margin-top:16px"><label class="switch"><input type="checkbox" id="insurance" ${S.insurance ? 'checked' : ''}/><i></i><span class="switch-text">Travel insurance</span></label></div></div></div>
        <div class="fhint" style="margin-top:14px">Booking date &amp; time (<b>${fdate(todayStr())}</b>) are recorded automatically.</div></section>

      <section class="card sect"><div class="sect-head"><span class="badge-ic">${icon('card', 22)}</span><div><h3>Payment</h3><p>Record the payment now, or leave it to pay later.</p></div>
        <label class="switch right-act"><input type="checkbox" id="payNow" ${S.payNow ? 'checked' : ''}/><i></i><span class="switch-text">${S.payNow ? 'Pay now' : 'Pay later'}</span></label></div>
        ${S.payNow ? html`<span class="lbl">Method</span><div class="choices">${METHODS.map(([n, ic]) => html`<button type="button" class="choice ${S.method === n ? 'on' : ''}" data-method="${n}">${icon(ic, 20)}<b>${n}</b><small>${(P.CONVENIENCE_PCT[n] ?? 0) ? `${P.CONVENIENCE_PCT[n]}% fee` : 'No fee'}</small></button>`)}</div>
          <div class="three" style="margin-top:18px"><div><span class="lbl">Payment status</span>${seg('payStatus', ['Success', 'Pending', 'Failed'], S.payStatus)}</div>
            <div><span class="lbl">Transaction ID</span><input class="inp" id="txn" value="${S.txn}" placeholder="Auto-generated" maxlength="30" style="text-transform:uppercase"/></div>
            <div><span class="lbl">Invoice number</span><input class="inp" id="invoice" value="${S.invoice}" placeholder="Next in sequence" maxlength="20" style="text-transform:uppercase"/></div></div>
          <dl class="kvs c3" style="margin-top:18px"><div class="kv"><dt>Booking amount</dt><dd>${money2(c.total)}</dd></div><div class="kv"><dt>Convenience fee + GST</dt><dd>${money2(c.fee + c.gst)}</dd></div><div class="kv"><dt>Total to charge</dt><dd><b>${money2(c.payable)}</b></dd></div></dl>`
        : html`<div class="callout">${icon('info', 20)}<div class="t">No payment will be recorded. You can add it later from the <b>Payments</b> page or the booking.</div></div>`}</section>

      <section class="card sect"><div class="sect-head"><span class="badge-ic">${icon('bag', 22)}</span><div><h3>Baggage</h3><p>Optional — free allowance for ${S.seat.SeatClass} is <b>${P.FREE_BAGGAGE_KG[S.seat.SeatClass] ?? 20} kg</b>.</p></div>
        <label class="switch right-act"><input type="checkbox" id="bagOn" ${S.bagOn ? 'checked' : ''}/><i></i><span class="switch-text">${S.bagOn ? 'Add baggage' : 'No baggage'}</span></label></div>
        ${S.bagOn ? html`<div class="three"><div><span class="lbl">Number of bags</span>${stepper('bagCount', bg.count)}</div><div><span class="lbl">Total weight (kg) <span class="req">*</span></span><input class="inp" id="bagW" type="number" step="0.1" min="0" max="200" value="${bg.weight}" placeholder="e.g. 23.5" aria-required="true"/></div>
            <div><span class="lbl">Allowed weight (kg)</span><input class="inp" id="bagA" type="number" step="0.5" min="0" max="100" value="${bg.allowed === '' ? c.allowed : bg.allowed}"/></div></div>
          <div class="three" style="margin-top:18px"><div><span class="lbl">Type</span>${seg('bagType', ['Checked', 'Cabin'], bg.type)}</div><div><span class="lbl">Special handling</span>${seg('bagHandling', ['None', 'Fragile', 'Priority'], bg.handling)}</div>
            <div><span class="lbl">Check-in time</span><input class="inp" id="bagT" type="time" value="${bg.time}"/></div></div>
          <div class="three" style="margin-top:18px"><div><span class="lbl">Baggage status</span><select class="inp" id="bagS">${['Checked-In', 'Loaded', 'In Transit', 'Delivered', 'Lost'].map((o) => html`<option ${o === bg.status ? 'selected' : ''}>${o}</option>`)}</select></div>
            <div><span class="lbl">Collection</span>${seg('bagCollect', ['Not Collected', 'Collected'], bg.collection)}</div>
            <div><span class="lbl">Excess charge</span><div class="inp" id="bagX" style="display:flex;align-items:center;background:var(--surface-3)">${c.extraKg ? `${c.extraKg} kg over · ${money2(c.extraCharge)}` : 'None — within allowance'}</div></div></div>
          <div class="fhint" style="margin-top:12px">The tag number is generated automatically (next in sequence). Excess baggage is billed at ₹${P.EXCESS_BAGGAGE_RATE} per extra kg.</div>` : ''}</section>
      ${navButtons(true, canNext4(), 'Enter the bag weight (0–200 kg) or switch baggage off')}`);
  };

  /* ================= STEP 5: review ================= */
  const drawStep5 = () => {
    const f = S.flight; const s = S.seat; const c = calc(); const b = S.bag;
    const pName = S.pMode === 'existing' ? (S.passengerItem && S.passengerItem.label) : `${S.newForm.vals.FirstName} ${S.newForm.vals.LastName}`;
    const blk = (title, step, body) => html`<section class="card sect"><div class="sect-head"><h3>${title}</h3><button class="btn sm right-act" data-goto="${step}">${icon('edit', 15)}Change</button></div>${body}</section>`;
    main.innerHTML = String(html`<div class="step-title"><h2>Review & <em>confirm</em></h2><p>Check everything below — then confirm to issue the ticket.</p></div>
      ${blk('Flight & seat', 2, html`<dl class="kvs c3"><div class="kv"><dt>Flight</dt><dd>${f.FlightNumber} · ${f.AirlineName}</dd></div><div class="kv"><dt>Route</dt><dd>${routeHTML(f.SourceAirport, f.DestinationAirport)}</dd></div><div class="kv"><dt>Departs</dt><dd>${fdate(f.DepartureDate)} · ${ftime(f.DepartureTime)}</dd></div>
        <div class="kv"><dt>Seat</dt><dd><b>${s.SeatNumber}</b> · ${s.SeatClass} · ${s.SeatType}</dd></div><div class="kv"><dt>Terminal / Gate</dt><dd>${f.Terminal || '—'} / ${f.Gate || '—'}</dd></div><div class="kv"><dt>Aircraft</dt><dd>${f.AircraftModel}</dd></div></dl>`)}
      ${blk('Passenger', 3, html`<dl class="kvs c3"><div class="kv"><dt>Name</dt><dd>${pName}</dd></div><div class="kv"><dt>Type</dt><dd>${S.pMode === 'existing' ? 'Existing passenger' : 'New passenger (will be registered)'}</dd></div>
        <div class="kv"><dt>Travellers</dt><dd>${S.pax}</dd></div></dl>`)}
      ${blk('Booking & payment', 4, html`<dl class="kvs c3"><div class="kv"><dt>Status</dt><dd>${statusChip(S.payNow && S.payStatus === 'Success' ? 'Confirmed' : S.status)}</dd></div><div class="kv"><dt>Channel</dt><dd>${S.channel}</dd></div><div class="kv"><dt>Booked by</dt><dd>${S.createdBy || 'System'}</dd></div>
        <div class="kv"><dt>Coupon</dt><dd>${S.couponInfo ? S.couponInfo.code : '—'}</dd></div><div class="kv"><dt>Insurance</dt><dd>${S.insurance ? 'Yes' : 'No'}</dd></div><div class="kv"><dt>Payment</dt><dd>${S.payNow ? html`${S.method} · ${statusChip(S.payStatus)}` : 'Pay later'}</dd></div>
        <div class="kv"><dt>Baggage</dt><dd>${S.bagOn ? `${b.count} bag(s) · ${b.weight || 0} kg · ${b.type}` : 'None'}</dd></div><div class="kv"><dt>Total fare</dt><dd><b>${money2(c.total)}</b></dd></div><div class="kv"><dt>Amount payable</dt><dd><b>${money2(S.payNow ? c.payable : c.total)}</b></dd></div></dl>`)}
      <div class="wiz-nav"><button class="btn ghost lg" data-goto="4">${icon('arrowL', 18)}Back</button><span class="grow"></span><button class="btn primary lg" id="confirm">${icon('check', 20)}Confirm booking</button></div>`);
  };

  /* ================= DONE ================= */
  /* HCI-R4: closure — a dedicated "Booking confirmed" screen with PNR, seat, amount and clear next steps */
  const drawDone = () => {
    const ov = S.done;
    const paid = ov.payment ? ov.payment.TotalAmount : ov.booking.TotalFare;
    main.innerHTML = String(html`<div class="done-hero" role="status" aria-live="polite"><div class="tick">${icon('check', 38)}</div><h2>Booking <em style="color:var(--primary)">confirmed</em></h2>
      <p>Seat <b>${ov.seat.SeatNumber}</b> on ${ov.flight.FlightNumber} is reserved for <b>${ov.passenger.FirstName} ${ov.passenger.LastName}</b>. PNR <span class="pnr">${ov.booking.BookingReference}</span>${ov.payment ? html` · invoice <span class="mono">${ov.payment.InvoiceNumber}</span>` : ''}.</p></div>
      <dl class="kvs c3 hci-done-sum no-print">
        <div class="kv"><dt>PNR</dt><dd><span class="pnr">${ov.booking.BookingReference}</span></dd></div>
        <div class="kv"><dt>Flight</dt><dd>${ov.flight.FlightNumber} · ${routeHTML(ov.flight.SourceAirport, ov.flight.DestinationAirport)}</dd></div>
        <div class="kv"><dt>Seat</dt><dd><b>${ov.seat.SeatNumber}</b> · ${ov.seat.SeatClass}</dd></div>
        <div class="kv"><dt>${ov.payment ? 'Amount charged' : 'Total fare (unpaid)'}</dt><dd><b>${money2(paid)}</b></dd></div>
        <div class="kv"><dt>Status</dt><dd>${statusChip(ov.booking.BookingStatus)}</dd></div>
        <div class="kv"><dt>Payment</dt><dd>${ov.payment ? html`${ov.payment.PaymentMethod} · ${statusChip(ov.payment.PaymentStatus)}` : 'Pay later'}</dd></div></dl>
      ${ticketHTML(ov)}
      <div class="wiz-nav no-print hci-done-actions"><button class="btn lg" id="again">${icon('plus', 20)}Book another</button><button class="btn lg" id="viewB">${icon('receipt', 20)}View booking</button><span class="grow"></span><button class="btn primary lg" id="printT">${icon('print', 20)}Print boarding pass</button></div>`);
    root.querySelector('#wiz').style.gridTemplateColumns = '1fr';
    setTimeout(() => { const h = $('.done-hero h2', root); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } }, 50);
  };

  /* HCI-R1: wizard footer — Back on the left, Continue (primary) on the right on every step */
  const navButtons = (back, canNext, why = '') => html`<div class="wiz-nav">${back ? html`<button class="btn ghost lg" data-back title="Back — your choices are kept">${icon('arrowL', 18)}Back</button>` : ''}<span class="grow"></span>${why ? html`<span class="wiz-hint muted" ${canNext ? raw('hidden') : ''}>${why}</span>` : ''}<button class="btn primary lg" data-next ${canNext ? '' : 'disabled'}>Continue${icon('arrowR', 18)}</button></div>`;

  /* ---------------- drawing + navigation ---------------- */
  const draw = () => {
    drawStepper(); drawSide();
    if (S.done) return drawDone();
    ({ 1: drawStep1, 2: drawSeatStep, 3: drawStep3, 4: drawStep4, 5: drawStep5 })[S.step]();
    window.scrollTo({ top: 0, behavior: prefs.motion === 'off' ? 'auto' : 'smooth' });
  };
  /* HCI-R6: Back / stepper jumps keep every choice already made (state lives in S, not in the DOM) */
  const go = (n) => { S.step = n; if (n === 1) { draw(); loadFlights(); } else { draw(); if (n === 2 && !S.seatsData) loadSeats(); } };

  /* HCI-R7: picking a flight only selects it — the wizard never auto-advances; the user presses Continue */
  const selectFlight = (f, jump = false) => {
    if (!S.flight || S.flight.FlightID !== f.FlightID) { S.seat = null; S.seatsData = null; S.hover = null; }
    S.flight = f;
    if (jump) { S.step = 2; draw(); loadSeats(); return; }
    drawFlightsList(); drawSide(); syncNext();
    const nb = $('[data-next]', root); if (nb) nb.focus({ preventScroll: true });
  };

  const next = async () => {
    if (S.step === 1) { if (!S.flight) return; S.step = 2; draw(); loadSeats(); return; }
    if (S.step === 2 && !S.seat) return;
    if (S.step === 3) {
      if (S.pMode === 'existing') { if (!S.passengerId) { toast('Select a passenger, or switch to “New passenger”.', 'error'); return; } }
      else if (!S.newForm.validate()) { toast('Please complete the highlighted passenger fields.', 'error'); return; }
    }
    if (S.step === 4 && !canNext4()) { toast('Enter the total bag weight (0–200 kg).', 'error'); $('#bagW', root)?.focus(); return; }
    go(S.step + 1);
  };

  const confirm = async (btn) => {
    const c = calc(); const b = S.bag;
    const payload = {
      flightId: S.flight.FlightID, seatId: S.seat.SeatID,
      ...(S.pMode === 'existing' ? { passengerId: S.passengerId } : { passenger: S.newForm.getValues() }),
      booking: { numberOfPassengers: S.pax, channel: S.channel, couponCode: S.couponInfo ? S.couponInfo.code : '', travelInsurance: S.insurance, status: S.status, createdBy: S.createdBy },
      payment: S.payNow ? { method: S.method, status: S.payStatus, transactionId: S.txn, invoiceNumber: S.invoice } : null,
      baggage: S.bagOn ? { bagWeight: Number(b.weight), numberOfBags: b.count, allowedWeight: b.allowed === '' ? c.allowed : Number(b.allowed), baggageType: b.type, specialHandling: b.handling, status: b.status, collectionStatus: b.collection, checkInTime: b.time } : null,
    };
    await busy(btn, async () => {
      try {
        S.done = await api.post('/book', payload);
        markTouched('bookings', S.done.booking.BookingID);
        emitChange(); toast(`Booking confirmed — PNR ${S.done.booking.BookingReference}, seat ${S.done.seat.SeatNumber}.`); draw();
      } catch (e) {
        if (e.fields && Object.keys(e.fields).some((k) => k.startsWith('passenger.'))) { S.pMode = 'new'; S.step = 3; draw(); S.newForm.setErrors(e.fields, 'passenger.'); toastError(e); }
        else if (e.status === 409 && /seat/i.test(e.message)) { toastError(e); S.seat = null; S.step = 2; draw(); loadSeats(); }
        else toastError(e);
      }
    });
  };

  /* ---------------- events ---------------- */
  on(root, 'click', '[data-goto]', (e, el) => { if (!el.disabled) go(Number(el.dataset.goto)); });
  on(root, 'click', '[data-back]', () => go(S.step - 1));
  on(root, 'click', '[data-next]', next);
  on(root, 'click', '[data-flight]', (e, el) => selectFlight(S.flights.find((f) => String(f.FlightID) === el.dataset.flight)));
  on(root, 'click', '#clearF', () => { S.filters = { from: '', to: '', date: '', airline: '' }; drawStep1(); loadFlights(); });
  on(root, 'change', '#fform select, #fform input', (e) => { S.filters[e.target.name] = e.target.value; loadFlights(); });
  on(root, 'click', '[data-seat]', (e, el) => {
    /* HCI-R5: booked / blocked seats are disabled in the map and rejected here too */
    const s = S.seatsData.seats.find((x) => String(x.SeatID) === el.dataset.seat);
    if (!s || s.SeatStatus !== 'Available') { if (s) toast(`Seat ${s.SeatNumber} is ${s.SeatStatus.toLowerCase()} — please choose an available seat.`, 'error', 3000); return; }
    S.seat = s; S.hover = null; drawSeatStep(); drawSide();
    toast(`Seat ${s.SeatNumber} selected (${s.SeatClass}).`, 'info', 1800);
  });
  const hoverSeat = (e) => {
    const el = e.target.closest('[data-seat]'); if (!el || !S.seatsData) return;
    S.hover = S.seatsData.seats.find((x) => String(x.SeatID) === el.dataset.seat);
    const box = $('#seatinfo', root); if (box) box.innerHTML = String(seatInfoHTML(S.hover, S.flight));
  };
  root.addEventListener('mouseover', hoverSeat);
  root.addEventListener('focusin', hoverSeat);
  root.addEventListener('mouseout', (e) => { if (e.target.closest('[data-seat]') && S.step === 2) { S.hover = null; const box = $('#seatinfo', root); if (box) box.innerHTML = String(seatInfoHTML(S.seat, S.flight)); } });
  on(root, 'click', '[data-pm]', (e, el) => { S.pMode = el.dataset.pm; drawStep3(); drawSide(); });

  // step 4
  const stepVal = { pax: [1, P.MAX_PASSENGERS], bagCount: [1, 20] };
  on(root, 'click', '[data-step]', (e, el) => {
    const [id, d] = el.dataset.step.split(':'); const [mn, mx] = stepVal[id];
    if (id === 'pax') S.pax = Math.min(mx, Math.max(mn, S.pax + Number(d))); else S.bag.count = Math.min(mx, Math.max(mn, S.bag.count + Number(d)));
    $(`#${id}`, root).textContent = id === 'pax' ? S.pax : S.bag.count; drawSide(); if (id === 'pax') drawStep4Money();
  });
  const drawStep4Money = () => { /* payment totals live in step 4 - cheap to redraw it fully */ const y = window.scrollY; drawStep4(); window.scrollTo(0, y); };
  on(root, 'click', '[data-channel]', (e, el) => { S.channel = el.dataset.channel; $$('[data-channel]', root).forEach((b) => b.classList.toggle('on', b === el)); });
  on(root, 'click', '[data-method]', (e, el) => { S.method = el.dataset.method; drawSide(); drawStep4Money(); });
  on(root, 'click', '[data-segx] button', (e, el) => {
    const key = el.parentElement.dataset.segx;
    const map = { status: () => { S.status = el.dataset.v; }, payStatus: () => { S.payStatus = el.dataset.v; }, bagType: () => { S.bag.type = el.dataset.v; }, bagHandling: () => { S.bag.handling = el.dataset.v; }, bagCollect: () => { S.bag.collection = el.dataset.v; } };
    map[key](); [...el.parentElement.children].forEach((b) => b.classList.toggle('on', b === el));
  });
  /* HCI-R6: coupon changes can be undone (restores the previous coupon, or none) */
  const setCoupon = (info, code) => { S.couponInfo = info; S.coupon = code; drawSide(); drawStep4Money(); };
  const offerUndo = (prevInfo, prevCode, msg) => toast(msg, 'undo', 6000, { action: { label: 'Undo', onClick: () => { setCoupon(prevInfo, prevCode); toast(prevInfo ? `Coupon ${prevInfo.code} restored.` : 'Coupon removed — back to the full fare.', 'info', 2200); } } });
  const applyCoupon = async (code) => {
    const prevInfo = S.couponInfo; const prevCode = S.coupon;
    S.coupon = (code || '').trim().toUpperCase();
    if (!S.coupon) { setCoupon(null, ''); if (prevInfo) offerUndo(prevInfo, prevCode, `Coupon ${prevInfo.code} removed.`); return; }
    try {
      S.couponInfo = await api.get(`/coupon/${encodeURIComponent(S.coupon)}`);
      offerUndo(prevInfo, prevCode, `Coupon ${S.couponInfo.code} applied — ${S.couponInfo.pct}% off.`);
    } catch (e) { S.couponInfo = prevInfo; S.coupon = prevCode; toastError(e); }
    drawSide(); drawStep4Money();
  };
  on(root, 'click', '#removeCoupon', () => applyCoupon(''));
  on(root, 'click', '#applyCoupon', () => applyCoupon($('#coupon', root).value));
  on(root, 'click', '[data-coupon]', (e, el) => applyCoupon(el.dataset.coupon));
  on(root, 'keydown', '#coupon', (e) => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon(e.target.value); } });
  root.addEventListener('input', (e) => {
    const id = e.target.id;
    if (id === 'createdBy') S.createdBy = e.target.value;
    else if (id === 'txn') S.txn = e.target.value;
    else if (id === 'invoice') S.invoice = e.target.value;
    else if (id === 'bagW' || id === 'bagA') {
      if (id === 'bagW') S.bag.weight = e.target.value; else S.bag.allowed = e.target.value;
      const c = calc(); drawSide(); const x = $('#bagX', root); if (x) x.textContent = c.extraKg ? `${c.extraKg} kg over · ${money2(c.extraCharge)}` : 'None — within allowance';
      syncNext();
    } else if (id === 'bagT') S.bag.time = e.target.value;
  });
  root.addEventListener('change', (e) => {
    const id = e.target.id;
    if (id === 'insurance') S.insurance = e.target.checked;
    else if (id === 'payNow') { S.payNow = e.target.checked; drawSide(); drawStep4Money(); }
    else if (id === 'bagOn') { S.bagOn = e.target.checked; drawSide(); drawStep4Money(); }
    else if (id === 'bagS') S.bag.status = e.target.value;
  });
  on(root, 'click', '#confirm', (e, el) => confirm(el));
  on(root, 'click', '#printT', () => window.print());
  on(root, 'click', '#viewB', () => openBooking(S.done.booking.BookingID));
  /* HCI-R4: "Book another" restarts the wizard in place (no full page reload) */
  on(root, 'click', '#again', () => { if (location.hash === '#/book') window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = '#/book'; });

  /* ---------------- start ---------------- */
  draw(); await loadFlights();
  if (params.passenger) {
    try { const r = await api.get(`/lookup/passengers${qs({ id: params.passenger })}`); if (r[0]) { S.passengerId = r[0].id; S.passengerItem = r[0]; S.passengerRow = await api.get(`/passengers/${r[0].id}`); } } catch (_) { /* ignore */ }
  }
  if (params.flight) {
    const f = S.flights.find((x) => String(x.FlightID) === String(params.flight));
    if (f) selectFlight(f, true); else toast('That flight is not open for booking.', 'error');   // explicit deep link from a flight's "Book" button

  }
  return () => { if (passengerCombo) passengerCombo.destroy(); if (S.newForm) S.newForm.destroy(); };
}
