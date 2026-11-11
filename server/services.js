'use strict';
const crypto = require('crypto');
const { pool, tx, getSchema } = require('./db');
const { HttpError } = require('./errors');
const { ENTITIES } = require('./meta');
const P = require('./pricing');

/* ------------------------------------------------------------------ */
/*  Small helpers                                                       */
/* ------------------------------------------------------------------ */
const pad = (n, w) => String(n).padStart(w, '0');
function todayStr(d = new Date()) { return `${d.getFullYear()}-${pad(d.getMonth() + 1, 2)}-${pad(d.getDate(), 2)}`; }
function nowTime(d = new Date()) { return `${pad(d.getHours(), 2)}:${pad(d.getMinutes(), 2)}:${pad(d.getSeconds(), 2)}`; }
const isEmpty = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

/* ------------------------------------------------------------------ */
/*  Validation + coercion of incoming form data -> column values        */
/* ------------------------------------------------------------------ */
function coerce(col, raw, hint) {
  const empty = isEmpty(raw);
  if (empty) return { value: null, empty: true };
  switch (col.kind) {
    case 'enum': {
      const v = String(raw);
      if (!col.options.includes(v)) return { error: 'Choose one of the listed options' };
      return { value: v };
    }
    case 'bool': {
      const v = raw === true || raw === 1 || raw === '1' || raw === 'true' || raw === 'on';
      return { value: v ? 1 : 0 };
    }
    case 'int': {
      const n = Number(raw);
      if (!Number.isInteger(n)) return { error: 'Enter a whole number' };
      return { value: n };
    }
    case 'decimal': {
      const n = Number(raw);
      if (!Number.isFinite(n)) return { error: 'Enter a valid number' };
      return { value: P.r2(n) };
    }
    case 'date': {
      const s = String(raw);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) return { error: 'Enter a valid date' };
      return { value: s };
    }
    case 'time': {
      const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(raw));
      if (!m || +m[1] > 23 || +m[2] > 59) return { error: 'Enter a valid time' };
      return { value: `${pad(m[1], 2)}:${m[2]}:${m[3] || '00'}` };
    }
    default: {
      let s = String(raw).trim();
      if (hint.transform === 'upper') s = s.toUpperCase();
      if (hint.transform === 'lower') s = s.toLowerCase();
      if (col.maxLength && s.length > col.maxLength) return { error: `Maximum ${col.maxLength} characters` };
      if (hint.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return { error: 'Enter a valid email address' };
      if (hint.type === 'tel' && (s.replace(/\D/g, '').length < 7 || !/^[+\d][\d\s\-()]*$/.test(s))) return { error: 'Enter a valid phone number' };
      return { value: s };
    }
  }
}

/** Build a safe {column: value} object from request data. */
async function buildRow(cfg, body, mode, prefix = '') {
  const schema = await getSchema();
  const t = schema.tables[cfg.table];
  const data = {};
  const errors = {};
  for (const col of t.columns) {
    if (col.pk && col.auto) continue;
    if (col.kind === 'timestamp') continue;
    const hint = cfg.hints[col.name] || {};
    if (hint.readonly) continue;                                   // computed by the server
    if (mode === 'create' && cfg.createFields && !cfg.createFields.includes(col.name)) continue;
    if (mode === 'update') {
      if (cfg.editable ? !cfg.editable.includes(col.name) : hint.lockedOnEdit) continue;
    }
    if (!Object.prototype.hasOwnProperty.call(body, col.name)) {
      if (mode === 'create' && !col.nullable && !col.hasDefault && !hint.hideOnCreate && !hint.autoFill) errors[prefix + col.name] = 'Required';
      continue;
    }
    const r = coerce(col, body[col.name], hint);
    if (r.error) { errors[prefix + col.name] = r.error; continue; }
    if (r.empty) {
      if (!col.nullable) {
        if (mode === 'create' && (col.hasDefault || hint.autoFill)) continue;   // DB default / server fills it in
        errors[prefix + col.name] = 'Required';
        continue;
      }
      data[col.name] = null;
      continue;
    }
    data[col.name] = r.value;
  }
  if (Object.keys(errors).length) throw new HttpError(400, 'Please fix the highlighted fields.', errors);
  return data;
}

/* ------------------------------------------------------------------ */
/*  Generators (IDs stay in sequence and look like real airline refs)   */
/* ------------------------------------------------------------------ */
async function nextInvoice(conn) {
  const [[r]] = await conn.query("SELECT COALESCE(MAX(CAST(SUBSTRING(InvoiceNumber, 8) AS UNSIGNED)), 0) AS n FROM Payment WHERE InvoiceNumber LIKE 'INV%'");
  return `INV${new Date().getFullYear()}${pad(r.n + 1, 5)}`;
}
async function nextTag(conn) {
  const [[r]] = await conn.query("SELECT COALESCE(MAX(CAST(SUBSTRING(TagNumber, 4) AS UNSIGNED)), 0) AS n FROM Baggage WHERE TagNumber LIKE 'TAG%'");
  return `TAG${pad(r.n + 1, 7)}`;
}
const newTransactionId = () => `TXN${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
async function newPNR(conn) {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let i = 0; i < 20; i++) {
    let s = 'PNR';
    const rnd = crypto.randomBytes(6);
    for (let k = 0; k < 6; k++) s += A[rnd[k] % A.length];
    const [[x]] = await conn.query('SELECT COUNT(*) AS c FROM Booking WHERE BookingReference = ?', [s]);
    if (!x.c) return s;
  }
  throw new HttpError(500, 'Could not generate a unique PNR. Try again.');
}

/* ------------------------------------------------------------------ */
/*  Flight counters + seat map                                          */
/* ------------------------------------------------------------------ */
/** AvailableSeats = seats on the plane - seats currently Booked (same rule the triggers use). */
async function syncFlight(conn, flightId) {
  await conn.query(
    `UPDATE Flight f SET
       f.TotalSeats     = (SELECT COUNT(*) FROM Seat WHERE FlightID = f.FlightID),
       f.AvailableSeats = (SELECT COUNT(*) FROM Seat WHERE FlightID = f.FlightID)
                        - (SELECT COUNT(*) FROM Seat WHERE FlightID = f.FlightID AND SeatStatus = 'Booked')
     WHERE f.FlightID = ?`, [flightId]);
}

const SEAT_FLAGS = (cls, letter, letters) => {
  const n = letters.length;
  const left = Math.ceil(n / 2);
  const i = letters.indexOf(letter);
  return {
    WindowSeat: i === 0 || i === n - 1 ? 1 : 0,
    AisleSeat: n > 1 && (i === left - 1 || i === left) ? 1 : 0,
    Recliner: cls === 'First' || cls === 'Business' ? 1 : 0,
    PowerOutlet: cls === 'Economy' ? 0 : 1,
    USBPort: 1,
  };
};
const CLASS_DEFAULTS = {
  First: { type: 'Bulkhead', mult: 3.0 },
  Business: { type: 'Extra Legroom', mult: 2.0 },
  'Premium Economy': { type: 'Standard', mult: 1.5 },
  Economy: { type: 'Standard', mult: 1.0 },
};

function seatRow(flightId, row, letter, letters, cls, type, mult) {
  const f = SEAT_FLAGS(cls, letter, letters);
  return [flightId, `${row}${letter}`, cls, type, mult, 'Available', f.WindowSeat, f.AisleSeat, f.Recliner, f.PowerOutlet, f.USBPort];
}
const SEAT_COLS = '(FlightID, SeatNumber, SeatClass, SeatType, SeatPriceMultiplier, SeatStatus, WindowSeat, AisleSeat, Recliner, PowerOutlet, USBPort)';

/** Default cabin: 1 First row (4 seats), 1 Business row, 1 Premium Economy row, then Economy. */
function defaultLayout(flightId, total) {
  const plan = [['First', 'ABCD'], ['Business', 'ABCDEF'], ['Premium Economy', 'ABCDEF']];
  const out = [];
  let row = 1;
  for (const [cls, letters] of plan) {
    if (out.length >= total) break;
    const take = Math.min(letters.length, total - out.length);
    const used = letters.slice(0, take);
    for (const l of used) out.push(seatRow(flightId, row, l, used, cls, CLASS_DEFAULTS[cls].type, CLASS_DEFAULTS[cls].mult));
    row++;
  }
  let firstEco = true;
  while (out.length < total) {
    const take = Math.min(6, total - out.length);
    const used = 'ABCDEF'.slice(0, take);
    for (const l of used) out.push(seatRow(flightId, row, l, used, 'Economy', firstEco ? 'Extra Legroom' : 'Standard', firstEco ? 1.15 : 1.0));
    firstEco = false;
    row++;
  }
  return out;
}

async function createDefaultSeats(conn, flightId, total) {
  const rows = defaultLayout(flightId, total);
  await conn.query(`INSERT INTO Seat ${SEAT_COLS} VALUES ?`, [rows]);
  await syncFlight(conn, flightId);
}

/** Bulk-add rows of seats to a flight (Seats page -> "Add seats"). */
async function bulkSeats(body) {
  const flightId = Number(body.flightId);
  const cls = body.seatClass;
  if (!CLASS_DEFAULTS[cls]) throw new HttpError(400, 'Choose a cabin class.', { seatClass: 'Required' });
  const from = Number(body.fromRow); const to = Number(body.toRow);
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from || to > 99) {
    throw new HttpError(400, 'Enter a valid row range (1 - 99).', { fromRow: 'Invalid range' });
  }
  const letters = String(body.letters || '').toUpperCase().replace(/[^A-K]/g, '');
  const uniq = [...new Set(letters.split(''))].sort().join('');
  if (!uniq) throw new HttpError(400, 'Enter seat letters, e.g. ABCDEF.', { letters: 'Required' });
  if ((to - from + 1) * uniq.length > 300) throw new HttpError(400, 'That is too many seats at once (max 300).');
  const type = body.seatType || CLASS_DEFAULTS[cls].type;
  const mult = body.multiplier ? Number(body.multiplier) : CLASS_DEFAULTS[cls].mult;
  if (!(mult > 0)) throw new HttpError(400, 'Multiplier must be greater than 0.', { multiplier: 'Invalid' });
  return tx(async (conn) => {
    const [[fl]] = await conn.query('SELECT FlightID, FlightStatus FROM Flight WHERE FlightID = ? FOR UPDATE', [flightId]);
    if (!fl) throw new HttpError(404, 'Flight not found.');
    if (['Cancelled', 'Departed', 'Arrived'].includes(fl.FlightStatus)) {
      throw new HttpError(409, `Cannot modify seats on a ${fl.FlightStatus.toLowerCase()} flight.`);
    }
    const [have] = await conn.query('SELECT SeatNumber FROM Seat WHERE FlightID = ?', [flightId]);
    const exists = new Set(have.map((r) => r.SeatNumber));
    const rows = []; let skipped = 0;
    for (let r = from; r <= to; r++) for (const l of uniq) {
      if (exists.has(`${r}${l}`)) { skipped++; continue; }
      rows.push(seatRow(flightId, r, l, uniq, cls, type, mult));
    }
    if (rows.length) await conn.query(`INSERT INTO Seat ${SEAT_COLS} VALUES ?`, [rows]);
    await syncFlight(conn, flightId);
    return { added: rows.length, skipped };
  });
}

/* ------------------------------------------------------------------ */
/*  Booking (one atomic transaction: passenger? + booking + payment + baggage) */
/* ------------------------------------------------------------------ */
async function bookSeat(input) {
  const schema = await getSchema();
  const b = input.booking || {};
  const pax = Number(b.numberOfPassengers || 1);
  if (!Number.isInteger(pax) || pax < 1 || pax > P.PRICING.MAX_PASSENGERS) throw new HttpError(400, `Passengers must be between 1 and ${P.PRICING.MAX_PASSENGERS}.`);
  const channelCol = schema.tables.Booking.byName.BookingChannel;
  const channel = b.channel || channelCol.default;
  if (!channelCol.options.includes(channel)) throw new HttpError(400, 'Invalid booking channel.');
  const status = b.status || 'Confirmed';
  if (!['Confirmed', 'Pending'].includes(status)) throw new HttpError(400, 'A new booking can only be Confirmed or Pending.');
  if (b.couponCode && !P.findCoupon(b.couponCode)) throw new HttpError(400, 'That coupon code is not valid.', { couponCode: 'Invalid coupon' });
  const createdBy = isEmpty(b.createdBy) ? 'System' : String(b.createdBy).trim().slice(0, 50);

  const pay = input.payment || null;
  if (pay) {
    const mc = schema.tables.Payment.byName.PaymentMethod;
    if (!mc.options.includes(pay.method)) throw new HttpError(400, 'Choose a payment method.', { 'payment.method': 'Required' });
    if (pay.status && !['Success', 'Pending', 'Failed'].includes(pay.status)) throw new HttpError(400, 'Invalid payment status.');
  }
  const bag = input.baggage || null;

  const id = await tx(async (conn) => {
    const [[flight]] = await conn.query('SELECT * FROM Flight WHERE FlightID = ? FOR UPDATE', [input.flightId]);
    if (!flight) throw new HttpError(404, 'Flight not found.');
    if (!['Scheduled', 'Delayed'].includes(flight.FlightStatus)) throw new HttpError(409, `This flight is ${flight.FlightStatus.toLowerCase()} and cannot be booked.`);
    if (flight.AvailableSeats <= 0) throw new HttpError(409, 'This flight is fully booked.');
    if (flight.AvailableSeats < pax) throw new HttpError(409, `Only ${flight.AvailableSeats} seat(s) available on this flight.`);

    const [[seat]] = await conn.query('SELECT * FROM Seat WHERE SeatID = ? AND FlightID = ? FOR UPDATE', [input.seatId, input.flightId]);
    if (!seat) throw new HttpError(404, 'That seat does not belong to the selected flight.');
    if (seat.SeatStatus !== 'Available') throw new HttpError(409, `Seat ${seat.SeatNumber} is ${seat.SeatStatus.toLowerCase()}. Please pick another seat.`);

    let passengerId = Number(input.passengerId);
    if (input.passenger) {
      const row = await buildRow(ENTITIES.passengers, input.passenger, 'create', 'passenger.');
      const [res] = await conn.query('INSERT INTO Passenger SET ?', [row]);
      passengerId = res.insertId;
    } else {
      const [[ex]] = await conn.query('SELECT PassengerID FROM Passenger WHERE PassengerID = ?', [passengerId]);
      if (!ex) throw new HttpError(404, 'Passenger not found.', { passengerId: 'Select a passenger' });
    }

    const q = P.quote({ ticketPrice: flight.TicketPrice, multiplier: seat.SeatPriceMultiplier, pax, couponCode: b.couponCode });
    const reference = await newPNR(conn);
    const bookingStatus = pay && pay.status === 'Success' ? 'Confirmed' : status;
    const [res] = await conn.query('INSERT INTO Booking SET ?', [{
      PassengerID: passengerId, FlightID: flight.FlightID, SeatID: seat.SeatID, BookingReference: reference,
      BookingDate: todayStr(), BookingTime: nowTime(), NumberOfPassengers: pax, BookingStatus: bookingStatus,
      CouponCode: q.coupon ? q.coupon.code : null, Discount: q.discount, Tax: q.tax, TotalFare: q.total,
      BookingChannel: channel, TravelInsurance: b.travelInsurance ? 1 : 0, CreatedBy: createdBy,
    }]);
    const bookingId = res.insertId;

    if (pay) {
      const bd = P.paymentBreakdown({ amount: q.total, method: pay.method, convenienceFee: pay.convenienceFee });
      await conn.query('INSERT INTO Payment SET ?', [{
        BookingID: bookingId, PaymentMethod: pay.method, Amount: q.total, ConvenienceFee: bd.convenienceFee, GST: bd.gst,
        TotalAmount: bd.totalAmount, TransactionID: isEmpty(pay.transactionId) ? newTransactionId() : String(pay.transactionId).trim().toUpperCase(),
        PaymentStatus: pay.status || 'Success', PaymentDate: todayStr(),
        InvoiceNumber: isEmpty(pay.invoiceNumber) ? await nextInvoice(conn) : String(pay.invoiceNumber).trim().toUpperCase(),
      }]);
    }

    if (bag) {
      const allowed = isEmpty(bag.allowedWeight) ? (P.PRICING.FREE_BAGGAGE_KG[seat.SeatClass] || 20) : Number(bag.allowedWeight);
      const weight = Number(bag.bagWeight);
      const bags = Number(bag.numberOfBags || 1);
      if (!(weight >= 0) || !Number.isFinite(weight)) throw new HttpError(400, 'Enter the total bag weight in kg.', { 'baggage.bagWeight': 'Required' });
      if (!Number.isInteger(bags) || bags < 1) throw new HttpError(400, 'Number of bags must be at least 1.', { 'baggage.numberOfBags': 'Invalid' });
      const ch = P.baggageCharges({ bagWeight: weight, allowedWeight: allowed });
      await conn.query('INSERT INTO Baggage SET ?', [{
        BookingID: bookingId, BagWeight: weight, AllowedWeight: allowed, ExtraWeight: ch.extraWeight, ExtraCharge: ch.extraCharge,
        NumberOfBags: bags, BaggageStatus: bag.status || 'Checked-In', TagNumber: isEmpty(bag.tagNumber) ? await nextTag(conn) : String(bag.tagNumber).trim().toUpperCase(),
        CheckInTime: isEmpty(bag.checkInTime) ? nowTime() : (/^\d{1,2}:\d{2}$/.test(bag.checkInTime) ? `${bag.checkInTime}:00` : bag.checkInTime),
        CollectionStatus: bag.collectionStatus || 'Not Collected', SpecialHandling: bag.specialHandling || 'None', BaggageType: bag.baggageType || 'Checked',
      }]);
    }
    return bookingId;     // triggers have already marked the seat Booked and reduced AvailableSeats
  });
  return id;
}

/* ------------------------------------------------------------------ */
/*  Cancellation (calls the project's stored procedure, then fills extras) */
/* ------------------------------------------------------------------ */
async function cancelBooking(bookingId, body) {
  const reason = isEmpty(body.reason || body.Reason) ? '' : String(body.reason || body.Reason).trim();
  if (!reason) throw new HttpError(400, 'Please give a reason for the cancellation.', { Reason: 'Required' });
  if (reason.length > 150) throw new HttpError(400, 'Reason is too long (max 150 characters).', { Reason: 'Maximum 150 characters' });
  const conn = await pool.getConnection();
  try {
    await conn.query('CALL sp_CancelBooking(?, ?)', [bookingId, reason]);   // inserts Cancellation; trigger frees seat + flight count
    const extras = {};
    const mode = body.refundMode || body.RefundMode;
    if (mode) extras.RefundMode = mode;
    const rem = body.remarks ?? body.Remarks;
    if (!isEmpty(rem)) extras.Remarks = String(rem).trim().slice(0, 150);
    const pb = body.processedBy ?? body.ProcessedBy;
    if (!isEmpty(pb)) extras.ProcessedBy = String(pb).trim().slice(0, 50);
    if (Object.keys(extras).length) await conn.query('UPDATE Cancellation SET ? WHERE BookingID = ?', [extras, bookingId]);
    const [[row]] = await conn.query('SELECT * FROM Cancellation WHERE BookingID = ?', [bookingId]);
    return row;
  } finally {
    conn.release();
  }
}

module.exports = {
  todayStr, nowTime, isEmpty, buildRow, coerce, nextInvoice, nextTag, newTransactionId, newPNR,
  syncFlight, createDefaultSeats, bulkSeats, bookSeat, cancelBooking, CLASS_DEFAULTS,
};
