/* Boarding-pass style ticket for a booking */
import { html, raw, fdate, ftime, fdur, esc } from './util.js';
import { icon } from './icons.js';
import { city } from './api.js';
import { statusChip } from './ui.js';

/** Deterministic pseudo-barcode drawn from the PNR (visual only). */
export function barcode(text) {
  let x = 0; const bars = [];
  let seed = 7;
  for (const ch of `${text}${text}`) seed = (seed * 31 + ch.charCodeAt(0)) % 9973;
  for (let i = 0; i < 46; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const w = 1 + (seed % 3);
    const gap = 1 + ((seed >> 4) % 2);
    bars.push(`<rect x="${x}" y="0" width="${w}" height="60" rx=".4"/>`);
    x += w + gap;
  }
  return raw(`<svg class="barcode" viewBox="0 0 ${x} 60" preserveAspectRatio="none" fill="#0b1a35" aria-hidden="true">${bars.join('')}</svg>`);
}

function boardingTime(date, time) {
  if (!date || !time) return '—';
  const d = new Date(`${date}T${time}`);
  if (Number.isNaN(d.getTime())) return '—';
  d.setMinutes(d.getMinutes() - 45);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function ticketHTML({ booking: b, passenger: p, flight: f, seat: s }) {
  const full = `${p.FirstName} ${p.MiddleName ? `${p.MiddleName} ` : ''}${p.LastName}`.toUpperCase();
  return html`
  <div class="ticket-wrap">
    <article class="ticket" style="${b.BookingStatus === 'Cancelled' ? 'filter:grayscale(.85) opacity(.85)' : ''}">
      <div class="ticket-main">
        <div class="ticket-top">
          <div class="brandline">${icon('plane', 22, 'rot45')} Skyward · ${f.AirlineName}</div>
          <span>Boarding pass</span>
        </div>
        <div class="ticket-route">
          <div><div class="cd">${f.SourceAirport}</div><div class="cn">${city(f.SourceAirport) || 'Departure'}</div></div>
          <div class="mid"><span>${fdur(f.DurationMin)}</span><div class="line">${icon('plane', 20)}</div><span>${f.FlightNumber} · ${f.AircraftModel}</span></div>
          <div style="text-align:right"><div class="cd">${f.DestinationAirport}</div><div class="cn">${city(f.DestinationAirport) || 'Arrival'}</div></div>
        </div>
        <dl class="ticket-grid">
          <div><dt>Passenger</dt><dd>${full}</dd></div>
          <div><dt>Date</dt><dd>${fdate(f.DepartureDate)}</dd></div>
          <div><dt>Departs</dt><dd class="big">${ftime(f.DepartureTime)}</dd></div>
          <div><dt>Arrives</dt><dd class="big">${ftime(f.ArrivalTime)}</dd></div>
          <div><dt>Terminal</dt><dd>${f.Terminal || '—'}</dd></div>
          <div><dt>Gate</dt><dd>${f.Gate || '—'}</dd></div>
          <div><dt>Boarding</dt><dd>${boardingTime(f.DepartureDate, f.DepartureTime)}</dd></div>
          <div><dt>Cabin</dt><dd>${s.SeatClass}</dd></div>
        </dl>
      </div>
      <div class="ticket-stub">
        <div><div class="lab">Seat</div><div class="seatbig">${s.SeatNumber}</div></div>
        <div><div class="lab">Booking reference</div><div class="pnrbig">${b.BookingReference}</div>
          <div class="lab" style="margin-top:8px">${b.NumberOfPassengers} passenger${b.NumberOfPassengers > 1 ? 's' : ''} · ${s.SeatType}</div></div>
        ${barcode(b.BookingReference)}
        <div class="lab" style="letter-spacing:.14em">${esc(b.BookingReference)}${String(b.BookingID)}</div>
      </div>
    </article>
  </div>`;
}
