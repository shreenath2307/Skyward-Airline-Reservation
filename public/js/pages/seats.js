/* Seat manager: view a flight's cabin, edit any seat, add seats in bulk */
import { html, mount, $, on, fdate, ftime, money, fnum } from '../util.js';
import { icon } from '../icons.js';
import { api, store, city } from '../api.js';
import { combo, statusChip, toast, toastError, openModal, busy, skeletonRows, emptyState } from '../ui.js';
import { emitChange, onChange, flightLabel } from '../common.js';
import { editRecord } from '../forms.js';
import { seatMapHTML, legendHTML, seatInfoHTML } from '../seatmap.js';

export default async function render(root, params = {}) {
  const S = { flightId: params.flight || null, data: null, view: 'map', pick: null };
  let cb;
  mount(root, html`<div class="fade-in">
    <header class="page-head"><div class="titles"><div class="eyebrow">Operations</div><h1>Seat <em>maps</em></h1><p>Inspect any flight’s cabin, adjust individual seats, or add rows in bulk.</p></div>
      <div class="actions"><button class="btn primary" id="addSeats" disabled>${icon('plus', 18)}Add seats</button></div></header>
    <section class="card card-pad" style="margin-bottom:20px"><span class="lbl">Flight</span><div id="fc"></div></section>
    <div id="body"></div></div>`);
  const body = $('#body', root);

  const summary = () => {
    const s = S.data.seats; const c = (k) => s.filter((x) => x.SeatStatus === k).length;
    return html`<div class="row wrap" style="gap:10px;margin-bottom:16px"><span class="chip">${fnum(s.length)} seats</span><span class="chip tone-ok">${c('Available')} available</span><span class="chip tone-info">${c('Booked')} booked</span><span class="chip tone-warn">${s.length - c('Available') - c('Booked')} blocked</span></div>`;
  };
  const draw = () => {
    if (!S.flightId) { body.innerHTML = String(emptyState({ icon: 'seat', title: 'Select a flight', text: 'Choose a flight above to see its seat map.' })); return; }
    if (!S.data) { body.innerHTML = String(skeletonRows(8)); return; }
    const { flight, seats } = S.data;
    body.innerHTML = String(html`${summary()}
      <div class="seg" style="max-width:260px;margin-bottom:16px"><button data-view="map" class="${S.view === 'map' ? 'on' : ''}">${icon('seat', 16)} Map</button><button data-view="table" class="${S.view === 'table' ? 'on' : ''}">${icon('list', 16)} Table</button></div>
      ${!seats.length ? emptyState({ icon: 'seat', title: 'No seats yet', text: 'Use “Add seats” to create the cabin layout for this flight.' }) :
      S.view === 'map' ? html`<div class="seat-layout"><section class="card">${seatMapHTML(seats, { manage: true, selectedId: S.pick && S.pick.SeatID })}${legendHTML()}</section>
        <div id="sinfo">${seatInfoHTML(S.pick, flight, { manage: true })}${S.pick ? html`<button class="btn primary" id="editSeat" style="width:100%;margin-top:12px">${icon('edit', 16)}Edit seat ${S.pick.SeatNumber}</button>` : ''}</div></div>`
      : html`<section class="card"><div class="table-wrap"><table class="tbl"><thead><tr><th>Seat</th><th>Class</th><th>Type</th><th>Multiplier</th><th>Price</th><th>Status</th><th>Booked by</th></tr></thead><tbody>
        ${seats.map((s) => html`<tr class="click" data-seat="${s.SeatID}"><td><b>${s.SeatNumber}</b></td><td>${s.SeatClass}</td><td>${s.SeatType}</td><td>×${Number(s.SeatPriceMultiplier).toFixed(2)}</td><td>${money(s.SeatPrice)}</td><td>${statusChip(s.SeatStatus)}</td><td>${s.PassengerName || '—'}</td></tr>`)}</tbody></table></div></section>`}`);
  };
  const load = async () => {
    if (!S.flightId) { draw(); return; }
    try { S.data = await api.get(`/flights/${S.flightId}/seats`); if (S.pick) S.pick = S.data.seats.find((x) => x.SeatID === S.pick.SeatID) || null; } catch (e) { toastError(e); S.data = null; }
    $('#addSeats', root).disabled = !S.data; draw();
  };
  cb = combo($('#fc', root), { kind: 'flights', value: S.flightId, placeholder: 'Search flight number, route or airline…',
    onChange: (id) => { S.flightId = id; S.data = null; S.pick = null; location.hash = id ? `#/seats?flight=${id}` : '#/seats'; } });
  if (S.flightId) { try { const r = await api.get(`/lookup/flights?id=${S.flightId}`); if (r[0]) cb.setValue(r[0].id, r[0].label); } catch (_) {} }

  on(root, 'click', '[data-view]', (e, el) => { S.view = el.dataset.view; draw(); });
  const pickSeat = (id) => { S.pick = S.data.seats.find((x) => String(x.SeatID) === String(id)); draw(); };
  on(root, 'click', '.seat[data-seat]', (e, el) => pickSeat(el.dataset.seat));
  on(root, 'click', 'tr[data-seat]', (e, el) => { pickSeat(el.dataset.seat); S.view = 'map'; draw(); });
  on(root, 'click', '#editSeat', () => editRecord('seats', S.pick));
  on(root, 'click', '#addSeats', () => {
    const m = openModal({ title: 'Add seats', eyebrow: 'Seat map', size: "md", content: html`<form id="gen" class="gen-form" style="display:grid;gap:14px;grid-template-columns:1fr 1fr">
      <div style="grid-column:1/-1"><span class="lbl">Cabin class</span><select class="inp" name="seatClass">${['First', 'Business', 'Premium Economy', 'Economy'].map((c) => html`<option>${c}</option>`)}</select></div>
      <div><span class="lbl">From row</span><input class="inp" name="fromRow" type="number" min="1" max="99" value="1" required/></div>
      <div><span class="lbl">To row</span><input class="inp" name="toRow" type="number" min="1" max="99" value="5" required/></div>
      <div style="grid-column:1/-1"><span class="lbl">Seat letters</span><input class="inp" name="letters" value="ABCDEF" maxlength="11" style="text-transform:uppercase" required/><div class="fhint">First/last letters become window seats, middle letters beside the aisle become aisle seats.</div></div>
      <div><span class="lbl">Fare multiplier (optional)</span><input class="inp" name="multiplier" type="number" step="0.05" min="0.1" placeholder="class default"/></div>
      <div><span class="lbl">Seat type (optional)</span><select class="inp" name="seatType"><option value="">Class default</option>${(store.meta.lists.seatTypes || ['Standard', 'Extra Legroom', 'Recliner', 'Lie-Flat']).map((t) => html`<option>${t}</option>`)}</select></div>
      <div style="grid-column:1/-1;display:flex;gap:10px;justify-content:flex-end"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary" type="submit">${icon('plus', 16)}Add seats</button></div></form>` });
    const form = m.el.querySelector('#gen');
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); const f = Object.fromEntries(new FormData(form).entries());
      await busy(form.querySelector('[type=submit]'), async () => {
        try { const r = await api.post('/seats/generate', { ...f, flightId: S.flightId }); toast(`${r.added} seat(s) added${r.skipped ? `, ${r.skipped} already existed` : ''}.`); m.close(); emitChange(); }
        catch (err) { toastError(err); }
      });
    });
  });
  await load();
  const off = onChange(() => load());
  return () => { off(); cb && cb.destroy && cb.destroy(); };
}
