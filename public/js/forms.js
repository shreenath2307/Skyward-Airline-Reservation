/* Shared create / edit / delete / cancel flows, used by list pages and detail drawers */
import { html, raw, money, money2, $, todayStr } from './util.js';
import { icon } from './icons.js';
import { api, store, ent, ApiError } from './api.js';
import { formModal, confirmDialog, toast, toastError, openModal, busy, statusChip } from './ui.js';
import { emitChange, flightLabel } from './common.js';

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/* ---------- live-calculated fields per table ---------- */
const COMPUTE = {
  payments: (vals, changed, items) => {
    const P = store.meta.pricing; const patch = {};
    if (changed === 'BookingID' && items.BookingID) patch.Amount = items.BookingID.fare;
    const amount = Number(patch.Amount ?? vals.Amount) || 0;
    if (changed === null || ['BookingID', 'PaymentMethod', 'Amount'].includes(changed)) {
      patch.ConvenienceFee = r2((amount * (P.CONVENIENCE_PCT[vals.PaymentMethod] ?? 0)) / 100);
      patch.GST = r2(amount * P.GST_RATE);
    }
    const fee = Number(patch.ConvenienceFee ?? vals.ConvenienceFee) || 0;
    const gst = Number(patch.GST ?? vals.GST) || 0;
    patch.TotalAmount = r2(amount + fee + gst);
    return patch;
  },
  baggage: (vals, changed, items) => {
    const P = store.meta.pricing; const patch = {};
    if (changed === 'BookingID' && items.BookingID) patch.AllowedWeight = P.FREE_BAGGAGE_KG[items.BookingID.seatClass] ?? 20;
    const bw = Number(vals.BagWeight) || 0;
    const aw = Number(patch.AllowedWeight ?? vals.AllowedWeight) || 0;
    const extra = Math.max(0, r2(bw - aw));
    patch.ExtraWeight = extra; patch.ExtraCharge = r2(extra * P.EXCESS_BAGGAGE_RATE);
    return patch;
  },
  reviews: (vals, changed) => (changed === 'PassengerID' ? { FlightID: '' } : {}),
  seats: (vals, changed, items, mode) => {
    const M = { First: 3, Business: 2, 'Premium Economy': 1.5, Economy: 1 };
    return changed === 'SeatClass' && M[vals.SeatClass] ? { SeatPriceMultiplier: M[vals.SeatClass] } : {};
  },
};

const LOOKUP_PARAMS = { reviews: { FlightID: (vals) => ({ passengerId: vals.PassengerID || '' }) } };

/** Display labels for picker fields when editing a row that carries joined columns. */
function labelsFor(entKey, row) {
  const l = {};
  if (row.PassengerName && row.PassengerID) l.PassengerID = row.PassengerName;
  if (row.FlightNumber && row.FlightID && row.SourceAirport) l.FlightID = flightLabel(row);
  else if (row.FlightNumber && row.FlightID) l.FlightID = row.FlightNumber;
  if (row.BookingReference && row.BookingID && entKey !== 'bookings') l.BookingID = `${row.BookingReference}${row.PassengerName ? ` · ${row.PassengerName}` : ''}`;
  return l;
}

export function createRecord(entKey, defaults = {}, { labels = {}, title } = {}) {
  const meta = ent(entKey);
  if (meta.canCreate === 'wizard') { location.hash = '#/book'; return; }
  const isCancel = entKey === 'cancellations';
  const baseCompute = COMPUTE[entKey];
  const compute = isCancel
    ? (vals, changed, items) => {
      const box = document.getElementById('cx-preview');
      if (box && changed === 'BookingID' && items.BookingID) {
        const fare = Number(items.BookingID.fare); const charge = r2(fare * 0.1);
        box.innerHTML = `<div class="t"><b>Booking total ${money(fare)}</b> · cancellation charge (10%) <b>${money2(charge)}</b> · refund <b>${money2(r2(fare - charge))}</b>. The seat is released automatically.</div>`;
      }
      return {};
    }
    : baseCompute ? (v, c, i) => baseCompute(v, c, i, 'create') : null;
  const { modal } = formModal({
    entKey, mode: 'create',
    title: title || (isCancel ? 'Cancel a booking' : `New ${meta.singular.toLowerCase()}`),
    eyebrow: isCancel ? 'Cancellation' : meta.plural,
    subtitle: isCancel ? 'Pick the booking, say why, and choose how the refund is paid.' : 'Fill in the details below. Fields marked * are required.',
    values: defaults, labels, compute, size: isCancel ? 'md' : 'lg',
    only: isCancel ? meta.createFields : null,
    lookupParams: LOOKUP_PARAMS[entKey] || {},
    collapse: entKey === 'passengers' ? ['Loyalty programme'] : [],
    saveText: isCancel ? 'Cancel booking' : 'Create',
    before: isCancel ? html`<div class="callout" id="cx-preview" style="margin-bottom:16px">${icon('info', 20)}<div class="t">Choose a booking to preview the refund.</div></div>` : '',
    onSave: async (vals) => {
      const rec = await api.post(`/${meta.key}`, vals);
      toast(isCancel ? 'Booking cancelled — seat released.' : `${meta.singular} created.`);
      emitChange();
      return rec;
    },
  });
  return modal;
}

export function editRecord(entKey, row, { title } = {}) {
  const meta = ent(entKey);
  const base = COMPUTE[entKey];
  const { modal } = formModal({
    entKey, mode: 'edit', title: title || `Edit ${meta.singular.toLowerCase()}`, eyebrow: meta.plural,
    subtitle: `Record ${row[meta.pk]} · locked fields cannot be changed once saved.`,
    values: row, labels: labelsFor(entKey, row),
    compute: base ? (v, c, i) => base(v, c, i, 'edit') : null,
    lookupParams: LOOKUP_PARAMS[entKey] || {},
    saveText: 'Save changes',
    onSave: async (vals) => {
      const rec = await api.put(`/${meta.key}/${row[meta.pk]}`, vals);
      toast(`${meta.singular} updated.`);
      emitChange();
      return rec;
    },
  });
  return modal;
}

export async function deleteRecord(entKey, row, label) {
  const meta = ent(entKey);
  let impact = [];
  try { impact = (await api.get(`/${meta.key}/${row[meta.pk]}/impact`)).items; } catch (_) { /* ignore */ }
  const list = impact.length
    ? `<p style="margin-top:10px">This will also permanently remove:</p><ul>${impact.map((i) => `<li><b>${i.n}</b> ${i.label}</li>`).join('')}</ul>` : '';
  const extra = entKey === 'bookings' && row.BookingStatus !== 'Cancelled' ? '<p style="margin-top:10px">The seat will be released back to the flight.</p>' : '';
  const ok = await confirmDialog({
    title: `Delete ${meta.singular.toLowerCase()}?`, tone: 'danger', confirmText: 'Delete', icon: 'trash',
    message: `<p>You are about to delete <b>${label || row[meta.pk]}</b>. This cannot be undone.</p>${list}${extra}`,
  });
  if (!ok) return false;
  try {
    await api.del(`/${meta.key}/${row[meta.pk]}`);
    toast(`${meta.singular} deleted.`);
    emitChange();
    return true;
  } catch (e) { toastError(e); return false; }
}

/** Cancel a booking via sp_CancelBooking (+ refund mode / remarks). */
export function cancelDialog(booking, onDone) {
  const fare = Number(booking.TotalFare);
  const charge = r2(fare * 0.1);
  const reasons = ['Change of plans', 'Medical reasons', 'Found a better fare', 'Flight rescheduled', 'Duplicate booking'];
  const m = openModal({
    eyebrow: 'Cancel booking', title: `${booking.BookingReference}`, size: 'md', persistent: true,
    subtitle: `${booking.PassengerName} · ${booking.FlightNumber} ${booking.SourceAirport} → ${booking.DestinationAirport} · Seat ${booking.SeatNumber}`,
    content: html`
      <div class="callout warn" style="margin-bottom:18px">${icon('alert', 20)}<div class="t">Cancelling releases <b>seat ${booking.SeatNumber}</b> back to the flight. Cancellation charge <b>${money2(charge)}</b> (10%) · refund <b>${money2(r2(fare - charge))}</b> of ${money2(fare)}.</div></div>
      <div class="stack" style="gap:18px">
        <div class="field" data-field="Reason"><label>Reason <span class="req">*</span></label>
          <input class="inp" id="cx-reason" maxlength="150" placeholder="Why is this booking being cancelled?" />
          <div class="coupon-chips">${reasons.map((r) => html`<button type="button" data-reason="${r}">${r}</button>`)}</div><div class="ferr"></div></div>
        <div class="two">
          <div class="field"><label>Refund to</label><div class="seg" id="cx-mode">
            <button type="button" class="on" data-v="Original Payment Method">Original method</button><button type="button" data-v="Wallet">Wallet</button><button type="button" data-v="Bank Transfer">Bank</button></div></div>
          <div class="field"><label>Processed by</label><input class="inp" id="cx-by" placeholder="e.g. Agent-01" maxlength="50" /></div>
        </div>
        <div class="field"><label>Remarks</label><input class="inp" id="cx-rem" maxlength="150" placeholder="Optional note for the record" /></div>
      </div>`,
    footer: html`<span class="foot-msg" data-msg></span><button class="btn ghost" data-close>Keep booking</button><button class="btn danger" data-go>${icon('ban', 18)}Cancel booking</button>`,
  });
  let mode = 'Original Payment Method';
  m.el.addEventListener('click', (e) => {
    const r = e.target.closest('[data-reason]'); if (r) { $('#cx-reason', m.el).value = r.dataset.reason; }
    const s = e.target.closest('#cx-mode button');
    if (s) { mode = s.dataset.v; [...s.parentElement.children].forEach((b) => b.classList.toggle('on', b === s)); }
  });
  $('[data-go]', m.el).addEventListener('click', (e) => busy(e.currentTarget, async () => {
    const reason = $('#cx-reason', m.el).value.trim();
    if (!reason) { $('[data-msg]', m.el).textContent = 'Please give a reason.'; $('#cx-reason', m.el).focus(); return; }
    try {
      await api.post(`/bookings/${booking.BookingID}/cancel`, { reason, refundMode: mode, processedBy: $('#cx-by', m.el).value, remarks: $('#cx-rem', m.el).value });
      toast('Booking cancelled — seat released.');
      m.close(); emitChange(); if (onDone) onDone();
    } catch (err) { $('[data-msg]', m.el).textContent = err.message; }
  }));
  return m;
}

export const recordPayment = (booking) => createRecord('payments', { BookingID: booking.BookingID, Amount: booking.TotalFare, PaymentMethod: 'Credit Card', PaymentStatus: 'Success', PaymentDate: todayStr() },
  { labels: { BookingID: `${booking.BookingReference} · ${booking.PassengerName}` }, title: 'Record payment' });
export const addBaggage = (booking, seatClass) => createRecord('baggage', { BookingID: booking.BookingID, AllowedWeight: store.meta.pricing.FREE_BAGGAGE_KG[seatClass || booking.SeatClass] ?? 20 },
  { labels: { BookingID: `${booking.BookingReference} · ${booking.PassengerName}` }, title: 'Add baggage' });
