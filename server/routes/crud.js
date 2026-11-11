'use strict';
const express = require('express');
const { pool, tx, getSchema } = require('../db');
const { HttpError } = require('../errors');
const { ENTITIES } = require('../meta');
const S = require('../services');
const P = require('../pricing');

const router = express.Router();
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function entityOf(req) {
  const e = ENTITIES[req.params.entity];
  if (!e) throw new HttpError(404, 'Unknown resource.');
  return e;
}

async function fetchOne(cfg, id, conn = pool) {
  const [rows] = await conn.query(`SELECT ${cfg.select} FROM ${cfg.from} WHERE ${cfg.alias}.${cfg.pk} = ?`, [id]);
  return rows[0] || null;
}
async function rawOne(cfg, id, conn = pool, lock = false) {
  const [rows] = await conn.query(`SELECT * FROM ?? WHERE ?? = ?${lock ? ' FOR UPDATE' : ''}`, [cfg.table, cfg.pk, id]);
  return rows[0] || null;
}

/* ------------------------------------------------------------------ */
/*  LIST  (search, filter, sort, paginate)                              */
/* ------------------------------------------------------------------ */
router.get('/:entity', ah(async (req, res) => {
  const cfg = entityOf(req);
  const schema = await getSchema();
  const cols = schema.tables[cfg.table].byName;
  const where = []; const params = [];

  const q = String(req.query.q || '').trim();
  if (q) {
    for (const token of q.split(/\s+/).slice(0, 5)) {
      where.push(`(${cfg.search.map((e) => `${e} LIKE ?`).join(' OR ')})`);
      cfg.search.forEach(() => params.push(`%${token}%`));
    }
  }
  for (const [k, v] of Object.entries(req.query)) {
    if (!k.startsWith('f_') || v === '') continue;
    const col = k.slice(2);
    if (!cols[col]) continue;
    where.push(`${cfg.alias}.${col} = ?`); params.push(v);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const dir = String(req.query.dir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  let order = cfg.order;
  const sort = String(req.query.sort || '');
  if (sort && cfg.sortKeys && cfg.sortKeys[sort]) order = cfg.sortKeys[sort].split(',').map((p) => `${p.trim()} ${dir}`).join(', ');
  else if (sort && cols[sort]) order = `${cfg.alias}.${sort} ${dir}`;

  const pageSize = Math.min(500, Math.max(1, Number(req.query.pageSize) || 15));
  const page = Math.max(1, Number(req.query.page) || 1);

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM ${cfg.from} ${whereSql}`, params);
  const [rows] = await pool.query(
    `SELECT ${cfg.select} FROM ${cfg.from} ${whereSql} ORDER BY ${order} LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]);

  // status counts for the filter chips (ignores the status filter itself, honours search)
  let facets = null;
  if (cfg.filter) {
    const w2 = []; const p2 = [];
    if (q) for (const token of q.split(/\s+/).slice(0, 5)) { w2.push(`(${cfg.search.map((e) => `${e} LIKE ?`).join(' OR ')})`); cfg.search.forEach(() => p2.push(`%${token}%`)); }
    for (const [k, v] of Object.entries(req.query)) {
      if (!k.startsWith('f_') || v === '' || k === `f_${cfg.filter}`) continue;
      if (cols[k.slice(2)]) { w2.push(`${cfg.alias}.${k.slice(2)} = ?`); p2.push(v); }
    }
    const [fr] = await pool.query(
      `SELECT ${cfg.alias}.${cfg.filter} AS v, COUNT(*) AS n FROM ${cfg.from} ${w2.length ? `WHERE ${w2.join(' AND ')}` : ''} GROUP BY ${cfg.alias}.${cfg.filter}`, p2);
    facets = Object.fromEntries(fr.map((r) => [r.v, r.n]));
  }
  res.json({ rows, total, page, pageSize, facets });
}));

router.get('/:entity/:id', ah(async (req, res) => {
  const cfg = entityOf(req);
  const row = await fetchOne(cfg, req.params.id);
  if (!row) throw new HttpError(404, `${cfg.singular} not found.`);
  res.json(row);
}));

/* ------------------------------------------------------------------ */
/*  Business rules per table                                            */
/* ------------------------------------------------------------------ */
function checkFlightTimes(d) {
  if (d.DepartureDate && d.DepartureTime && d.ArrivalDate && d.ArrivalTime) {
    const dep = Date.parse(`${d.DepartureDate}T${d.DepartureTime}`);
    const arr = Date.parse(`${d.ArrivalDate}T${d.ArrivalTime}`);
    if (arr <= dep) throw new HttpError(400, 'Arrival must be after departure.', { ArrivalDate: 'Must be after departure', ArrivalTime: 'Must be after departure' });
  }
}

const HOOKS = {
  flights: {
    async beforeCreate(conn, d) {
      checkFlightTimes(d);
      if (d.SourceAirport && d.DestinationAirport && d.SourceAirport === d.DestinationAirport) {
        throw new HttpError(400, 'Source and destination airports must be different.', { DestinationAirport: 'Cannot match departure airport' });
      }
      const n = Number(d.TotalSeats);
      if (!Number.isInteger(n) || n < 4 || n > 500) throw new HttpError(400, 'Total seats must be between 4 and 500.', { TotalSeats: 'Enter 4 - 500' });
      d.AvailableSeats = n;
    },
    async afterCreate(conn, id, d) { await S.createDefaultSeats(conn, id, d.TotalSeats); },
    async beforeUpdate(conn, id, d, ex) {
      const merged = { ...ex, ...d };
      checkFlightTimes(merged);
      if (merged.SourceAirport === merged.DestinationAirport) {
        throw new HttpError(400, 'Source and destination airports must be different.', { DestinationAirport: 'Cannot match departure airport' });
      }
    },
  },

  seats: {
    async beforeUpdate(conn, id, d, ex) {
      if (d.SeatStatus && d.SeatStatus !== ex.SeatStatus) {
        if (ex.SeatStatus === 'Booked') throw new HttpError(409, 'This seat has an active booking. Cancel the booking to free it.', { SeatStatus: 'Seat is booked' });
        if (d.SeatStatus === 'Booked') throw new HttpError(409, 'Seats become Booked automatically when a booking is made.', { SeatStatus: 'Use the booking flow' });
      }
    },
    async afterCreate(conn, id, d) { await S.syncFlight(conn, d.FlightID); },
    async afterUpdate(conn, id, d, ex) { await S.syncFlight(conn, ex.FlightID); },
    async beforeDelete(conn, id, ex) {
      const [[c]] = await conn.query('SELECT COUNT(*) AS c FROM Booking WHERE SeatID = ?', [id]);
      if (c.c) throw new HttpError(409, 'This seat has bookings on record, so it cannot be deleted. Set its status to Blocked instead.');
    },
    async afterDelete(conn, id, ex) { await S.syncFlight(conn, ex.FlightID); },
  },

  bookings: {
    async beforeCreate() { throw new HttpError(405, 'Create bookings from the "Book a seat" page.'); },
    async beforeUpdate(conn, id, d, ex) {
      if (d.BookingStatus && d.BookingStatus !== ex.BookingStatus) {
        if (d.BookingStatus === 'Cancelled') throw new HttpError(409, 'Use the "Cancel booking" action so the seat and refund are handled.', { BookingStatus: 'Use Cancel booking' });
        if (ex.BookingStatus === 'Cancelled') throw new HttpError(409, 'A cancelled booking cannot be re-opened. Create a new booking instead.', { BookingStatus: 'Already cancelled' });
      }
    },
    async beforeDelete(conn, id, ex) { ex.__free = ex.BookingStatus !== 'Cancelled'; },
    async afterDelete(conn, id, ex) {
      if (ex.__free) await conn.query("UPDATE Seat SET SeatStatus = 'Available' WHERE SeatID = ? AND SeatStatus = 'Booked'", [ex.SeatID]);
      await S.syncFlight(conn, ex.FlightID);
    },
  },

  payments: {
    async beforeCreate(conn, d) {
      const [[b]] = await conn.query('SELECT BookingID, TotalFare, BookingStatus FROM Booking WHERE BookingID = ?', [d.BookingID]);
      if (!b) throw new HttpError(404, 'Booking not found.', { BookingID: 'Select a booking' });
      if (b.BookingStatus === 'Cancelled') throw new HttpError(409, 'This booking is cancelled, so no payment can be recorded.', { BookingID: 'Booking is cancelled' });
      const [[x]] = await conn.query('SELECT COUNT(*) AS c FROM Payment WHERE BookingID = ?', [d.BookingID]);
      if (x.c) throw new HttpError(409, 'This booking already has a payment.', { BookingID: 'Already paid' });
      if (d.Amount === undefined || d.Amount === null) d.Amount = b.TotalFare;
      const bd = P.paymentBreakdown({ amount: d.Amount, method: d.PaymentMethod, convenienceFee: d.ConvenienceFee });
      d.ConvenienceFee = bd.convenienceFee;
      d.GST = d.GST === undefined || d.GST === null ? bd.gst : d.GST;
      d.TotalAmount = P.r2(d.Amount + d.ConvenienceFee + d.GST);
      if (!d.TransactionID) d.TransactionID = S.newTransactionId();
      if (!d.InvoiceNumber) d.InvoiceNumber = await S.nextInvoice(conn);
      if (!d.PaymentDate) d.PaymentDate = S.todayStr();
      if (d.PaymentStatus === 'Success') await conn.query("UPDATE Booking SET BookingStatus = 'Confirmed' WHERE BookingID = ? AND BookingStatus = 'Pending'", [d.BookingID]);
    },
    async beforeUpdate(conn, id, d, ex) {
      const m = { ...ex, ...d };
      d.TotalAmount = P.r2(Number(m.Amount) + Number(m.ConvenienceFee) + Number(m.GST));
      if (d.PaymentStatus === 'Success' && ex.PaymentStatus !== 'Success') {
        await conn.query("UPDATE Booking SET BookingStatus = 'Confirmed' WHERE BookingID = ? AND BookingStatus = 'Pending'", [ex.BookingID]);
      }
    },
  },

  cancellations: {
    async beforeUpdate(conn, id, d, ex) {
      if (d.RefundStatus === 'Processed' && ex.RefundStatus !== 'Processed') {
        if (!d.RefundDate && !ex.RefundDate) d.RefundDate = S.todayStr();
        await conn.query("UPDATE Payment SET PaymentStatus = 'Refunded' WHERE BookingID = ? AND PaymentStatus = 'Success'", [ex.BookingID]);
      }
    },
  },

  reviews: {
    async beforeCreate(conn, d) {
      const [[x]] = await conn.query("SELECT COUNT(*) AS c FROM Booking WHERE PassengerID = ? AND FlightID = ? AND BookingStatus <> 'Cancelled'", [d.PassengerID, d.FlightID]);
      if (!x.c) throw new HttpError(409, 'Only passengers with a booking on this flight can review it.', { FlightID: 'No booking on this flight' });
      const [[existing]] = await conn.query("SELECT COUNT(*) AS c FROM Review WHERE PassengerID = ? AND FlightID = ?", [d.PassengerID, d.FlightID]);
      if (existing.c) throw new HttpError(409, 'This passenger has already submitted a review for this flight.', { FlightID: 'Already reviewed' });
      if (!d.ReviewDate) d.ReviewDate = S.todayStr();
    },
    async beforeUpdate(conn, id, d, ex) {
      const rating = Number(d.Rating ?? ex.Rating);
      if (rating === 1 && !d.ReviewStatus) d.ReviewStatus = 'Flagged';
    },
  },

  baggage: {
    async beforeCreate(conn, d) {
      const [[b]] = await conn.query(
        `SELECT b.BookingStatus, s.SeatClass FROM Booking b JOIN Seat s ON s.SeatID = b.SeatID WHERE b.BookingID = ?`, [d.BookingID]);
      if (!b) throw new HttpError(404, 'Booking not found.', { BookingID: 'Select a booking' });
      if (b.BookingStatus === 'Cancelled') throw new HttpError(409, 'This booking is cancelled.', { BookingID: 'Booking is cancelled' });
      if (d.AllowedWeight === undefined || d.AllowedWeight === null) d.AllowedWeight = P.PRICING.FREE_BAGGAGE_KG[b.SeatClass] || 20;
      const ch = P.baggageCharges({ bagWeight: d.BagWeight, allowedWeight: d.AllowedWeight });
      d.ExtraWeight = ch.extraWeight; d.ExtraCharge = ch.extraCharge;
      if (!d.TagNumber) d.TagNumber = await S.nextTag(conn);
      if (!d.CheckInTime) d.CheckInTime = S.nowTime();
    },
    async beforeUpdate(conn, id, d, ex) {
      const [[b]] = await conn.query('SELECT BookingStatus FROM Booking WHERE BookingID = ?', [ex.BookingID]);
      if (b && b.BookingStatus === 'Cancelled') throw new HttpError(409, 'Cannot modify baggage for a cancelled booking.');
      const m = { ...ex, ...d };
      const ch = P.baggageCharges({ bagWeight: m.BagWeight, allowedWeight: m.AllowedWeight });
      d.ExtraWeight = ch.extraWeight; d.ExtraCharge = ch.extraCharge;
    },
  },

  passengers: {
    async beforeCreate(conn, d) {
      if (d.DOB) {
        const t = Date.parse(d.DOB);
        if (Number.isNaN(t) || t > Date.now()) throw new HttpError(400, 'Date of birth cannot be in the future.', { DOB: 'Cannot be in the future' });
        const age = new Date().getFullYear() - new Date(d.DOB).getFullYear();
        if (age > 125) throw new HttpError(400, 'Please enter a valid date of birth.', { DOB: 'Invalid year' });
      }
    },
    async beforeUpdate(conn, id, d, ex) {
      const dob = d.DOB || ex.DOB;
      if (dob) {
        const t = Date.parse(dob);
        if (Number.isNaN(t) || t > Date.now()) throw new HttpError(400, 'Date of birth cannot be in the future.', { DOB: 'Cannot be in the future' });
      }
    },
    async beforeDelete(conn, id, ex) {
      const [rows] = await conn.query("SELECT DISTINCT FlightID FROM Booking WHERE PassengerID = ? AND BookingStatus <> 'Cancelled'", [id]);
      ex.__flights = rows.map((r) => r.FlightID);
      await conn.query(
        `UPDATE Seat s JOIN Booking b ON b.SeatID = s.SeatID
            SET s.SeatStatus = 'Available' WHERE b.PassengerID = ? AND b.BookingStatus <> 'Cancelled' AND s.SeatStatus = 'Booked'`, [id]);
    },
    async afterDelete(conn, id, ex) { for (const f of ex.__flights || []) await S.syncFlight(conn, f); },
  },
};

/* ------------------------------------------------------------------ */
/*  CREATE / UPDATE / DELETE                                            */
/* ------------------------------------------------------------------ */
router.post('/:entity', ah(async (req, res) => {
  const cfg = entityOf(req);
  if (cfg.key === 'bookings') throw new HttpError(405, 'Create bookings from the "Book a seat" page.');
  if (cfg.key === 'cancellations') {                         // goes through sp_CancelBooking
    const bookingId = Number(req.body.BookingID);
    if (!bookingId) throw new HttpError(400, 'Select the booking to cancel.', { BookingID: 'Required' });
    const row = await S.cancelBooking(bookingId, req.body);
    return res.status(201).json(await fetchOne(cfg, row.CancellationID));
  }
  const hooks = HOOKS[cfg.key] || {};
  const id = await tx(async (conn) => {
    const data = await S.buildRow(cfg, req.body, 'create');
    if (hooks.beforeCreate) await hooks.beforeCreate(conn, data);
    const [r] = await conn.query('INSERT INTO ?? SET ?', [cfg.table, data]);
    if (hooks.afterCreate) await hooks.afterCreate(conn, r.insertId, data);
    return r.insertId;
  });
  res.status(201).json(await fetchOne(cfg, id));
}));

router.put('/:entity/:id', ah(async (req, res) => {
  const cfg = entityOf(req);
  const hooks = HOOKS[cfg.key] || {};
  const id = req.params.id;
  await tx(async (conn) => {
    const ex = await rawOne(cfg, id, conn, true);
    if (!ex) throw new HttpError(404, `${cfg.singular} not found.`);
    const data = await S.buildRow(cfg, req.body, 'update');
    if (hooks.beforeUpdate) await hooks.beforeUpdate(conn, id, data, ex);
    if (Object.keys(data).length) await conn.query('UPDATE ?? SET ? WHERE ?? = ?', [cfg.table, data, cfg.pk, id]);
    if (hooks.afterUpdate) await hooks.afterUpdate(conn, id, data, ex);
  });
  res.json(await fetchOne(cfg, id));
}));

router.delete('/:entity/:id', ah(async (req, res) => {
  const cfg = entityOf(req);
  if (!cfg.canDelete) throw new HttpError(405, `${cfg.plural} are kept as an audit trail and cannot be deleted.`);
  const hooks = HOOKS[cfg.key] || {};
  const id = req.params.id;
  await tx(async (conn) => {
    const ex = await rawOne(cfg, id, conn, true);
    if (!ex) throw new HttpError(404, `${cfg.singular} not found.`);
    if (hooks.beforeDelete) await hooks.beforeDelete(conn, id, ex);
    await conn.query('DELETE FROM ?? WHERE ?? = ?', [cfg.table, cfg.pk, id]);
    if (hooks.afterDelete) await hooks.afterDelete(conn, id, ex);
  });
  res.json({ ok: true });
}));

/** What else disappears with this record? (shown in the delete confirmation) */
router.get('/:entity/:id/impact', ah(async (req, res) => {
  const cfg = entityOf(req);
  const id = req.params.id;
  const count = async (sql) => (await pool.query(sql, [id]))[0][0].c;
  const out = [];
  if (cfg.key === 'passengers') {
    out.push(['booking(s)', await count('SELECT COUNT(*) c FROM Booking WHERE PassengerID = ?')]);
    out.push(['review(s)', await count('SELECT COUNT(*) c FROM Review WHERE PassengerID = ?')]);
  } else if (cfg.key === 'flights') {
    out.push(['seat(s)', await count('SELECT COUNT(*) c FROM Seat WHERE FlightID = ?')]);
    out.push(['booking(s)', await count('SELECT COUNT(*) c FROM Booking WHERE FlightID = ?')]);
    out.push(['review(s)', await count('SELECT COUNT(*) c FROM Review WHERE FlightID = ?')]);
  } else if (cfg.key === 'bookings') {
    out.push(['payment(s)', await count('SELECT COUNT(*) c FROM Payment WHERE BookingID = ?')]);
    out.push(['baggage record(s)', await count('SELECT COUNT(*) c FROM Baggage WHERE BookingID = ?')]);
    out.push(['cancellation record(s)', await count('SELECT COUNT(*) c FROM Cancellation WHERE BookingID = ?')]);
  }
  res.json({ items: out.filter(([, n]) => n > 0).map(([label, n]) => ({ label, n })) });
}));

module.exports = router;
