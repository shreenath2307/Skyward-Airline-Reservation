'use strict';
const express = require('express');
const { pool, getSchema, DB_NAME } = require('../db');
const { HttpError } = require('../errors');
const { ENTITIES, buildClientMeta } = require('../meta');
const S = require('../services');
const P = require('../pricing');

const router = express.Router();
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const q = async (sql, params) => (await pool.query(sql, params))[0];

/* ------------------------------------------------------------------ */
/*  Health + meta                                                       */
/* ------------------------------------------------------------------ */
router.get('/health', ah(async (req, res) => {
  const [[v]] = await pool.query('SELECT VERSION() AS version, NOW() AS now');
  await getSchema();
  res.json({ ok: true, database: DB_NAME, version: v.version });
}));

router.get('/meta', ah(async (req, res) => {
  const meta = await buildClientMeta();
  const [airlines, aircraft] = await Promise.all([
    q('SELECT DISTINCT AirlineName v FROM Flight ORDER BY 1'), q('SELECT DISTINCT AircraftModel v FROM Flight ORDER BY 1')]);
  meta.lists = { airlines: airlines.map((r) => r.v), aircraft: aircraft.map((r) => r.v) };
  res.json(meta);
}));

/* ------------------------------------------------------------------ */
/*  Look-ups for the search-as-you-type pickers                         */
/* ------------------------------------------------------------------ */
router.get('/lookup/:kind', ah(async (req, res) => {
  const kind = req.params.kind;
  const scope = req.query.scope || '';
  const text = String(req.query.q || '').trim();
  const id = req.query.id ? Number(req.query.id) : null;
  const like = `%${text}%`;
  let rows;

  if (kind === 'passengers') {
    rows = await q(
      `SELECT PassengerID AS id, CONCAT(FirstName, ' ', LastName) AS label, CONCAT(Email, ' · ', City) AS sub,
              FrequentFlyerMembership AS tag
         FROM Passenger
        WHERE ${id ? 'PassengerID = ?' : "CONCAT_WS(' ', PassengerID, FirstName, LastName, Email, Phone, PassportNumber) LIKE ?"}
        ORDER BY PassengerID DESC LIMIT 20`, [id || like]);
  } else if (kind === 'flights') {
    const w = []; const p = [];
    if (id) { w.push('f.FlightID = ?'); p.push(id); }
    else {
      w.push("CONCAT_WS(' ', f.FlightNumber, f.AirlineName, f.SourceAirport, f.DestinationAirport, f.FlightID) LIKE ?"); p.push(like);
      if (scope === 'bookable') w.push("f.FlightStatus IN ('Scheduled','Delayed')");
      if (scope === 'reviewable' && req.query.passengerId) {
        w.push("EXISTS (SELECT 1 FROM Booking b WHERE b.FlightID = f.FlightID AND b.PassengerID = ? AND b.BookingStatus <> 'Cancelled')");
        p.push(Number(req.query.passengerId));
      }
    }
    rows = await q(
      `SELECT f.FlightID AS id, CONCAT(f.FlightNumber, ' · ', f.SourceAirport, ' → ', f.DestinationAirport) AS label,
              CONCAT(f.AirlineName, ' · ', f.DepartureDate) AS sub, f.FlightStatus AS tag
         FROM Flight f WHERE ${w.join(' AND ')} ORDER BY f.DepartureDate DESC LIMIT 20`, p);
  } else if (kind === 'bookings') {
    const w = []; const p = [];
    if (id) { w.push('b.BookingID = ?'); p.push(id); }
    else {
      w.push("CONCAT_WS(' ', b.BookingReference, b.BookingID, pa.FirstName, pa.LastName, f.FlightNumber) LIKE ?"); p.push(like);
      if (scope === 'unpaid') w.push("b.BookingStatus <> 'Cancelled' AND NOT EXISTS (SELECT 1 FROM Payment py WHERE py.BookingID = b.BookingID)");
      if (scope === 'cancellable' || scope === 'active') w.push("b.BookingStatus <> 'Cancelled'");
    }
    rows = await q(
      `SELECT b.BookingID AS id, CONCAT(b.BookingReference, ' · ', pa.FirstName, ' ', pa.LastName) AS label,
              CONCAT(f.FlightNumber, ' ', f.SourceAirport, '→', f.DestinationAirport, ' · Seat ', s.SeatNumber, ' · ₹', FORMAT(b.TotalFare, 0)) AS sub,
              b.BookingStatus AS tag, b.TotalFare AS fare, s.SeatClass AS seatClass
         FROM Booking b JOIN Passenger pa ON pa.PassengerID = b.PassengerID
         JOIN Flight f ON f.FlightID = b.FlightID JOIN Seat s ON s.SeatID = b.SeatID
        WHERE ${w.join(' AND ')} ORDER BY b.BookingID DESC LIMIT 20`, p);
  } else {
    throw new HttpError(404, 'Unknown look-up.');
  }
  res.json(rows);
}));

/* ------------------------------------------------------------------ */
/*  Flights: search, seat map, overview                                 */
/* ------------------------------------------------------------------ */
router.get('/flights/search', ah(async (req, res) => {
  const w = []; const p = [];
  const { from, to, date, airline } = req.query;
  if (from) { w.push('f.SourceAirport = ?'); p.push(String(from).toUpperCase()); }
  if (to) { w.push('f.DestinationAirport = ?'); p.push(String(to).toUpperCase()); }
  if (date) { w.push('f.DepartureDate = ?'); p.push(date); }
  if (airline) { w.push('f.AirlineName = ?'); p.push(airline); }
  if (req.query.status !== 'all') w.push("f.FlightStatus IN ('Scheduled','Delayed')");
  const rows = await q(
    `SELECT f.*, TIMESTAMPDIFF(MINUTE, TIMESTAMP(f.DepartureDate, f.DepartureTime), TIMESTAMP(f.ArrivalDate, f.ArrivalTime)) AS DurationMin,
            (SELECT COUNT(*) FROM Seat s WHERE s.FlightID = f.FlightID AND s.SeatStatus = 'Available') AS SeatsOpen,
            (SELECT ROUND(MIN(f.TicketPrice * s.SeatPriceMultiplier)) FROM Seat s WHERE s.FlightID = f.FlightID AND s.SeatStatus = 'Available') AS FromPrice
       FROM Flight f ${w.length ? `WHERE ${w.join(' AND ')}` : ''}
      ORDER BY f.DepartureDate, f.DepartureTime LIMIT 60`, p);
  const [opts] = await Promise.all([q(
    `SELECT DISTINCT SourceAirport a FROM Flight WHERE FlightStatus IN ('Scheduled','Delayed') UNION
     SELECT DISTINCT DestinationAirport FROM Flight WHERE FlightStatus IN ('Scheduled','Delayed') ORDER BY 1`)]);
  res.json({ flights: rows, airports: opts.map((r) => r.a) });
}));

router.get('/flights/:id/seats', ah(async (req, res) => {
  const [flight] = await q('SELECT * FROM Flight WHERE FlightID = ?', [req.params.id]);
  if (!flight) throw new HttpError(404, 'Flight not found.');
  const seats = await q(
    `SELECT s.*, ROUND(f.TicketPrice * s.SeatPriceMultiplier, 2) AS SeatPrice, bk.BookingID, bk.BookingReference,
            CONCAT(pa.FirstName, ' ', pa.LastName) AS PassengerName
       FROM Seat s JOIN Flight f ON f.FlightID = s.FlightID
       LEFT JOIN Booking bk ON bk.SeatID = s.SeatID AND bk.BookingStatus <> 'Cancelled'
       LEFT JOIN Passenger pa ON pa.PassengerID = bk.PassengerID
      WHERE s.FlightID = ? ORDER BY LENGTH(s.SeatNumber), s.SeatNumber`, [req.params.id]);
  res.json({ flight, seats });
}));

router.get('/flights/:id/overview', ah(async (req, res) => {
  const id = Number(req.params.id);
  const cfg = ENTITIES.flights;
  const [flight] = await q(`SELECT ${cfg.select} FROM ${cfg.from} WHERE f.FlightID = ?`, [id]);
  if (!flight) throw new HttpError(404, 'Flight not found.');
  const [[report]] = await pool.query('CALL sp_FlightRevenueReport(?)', [id]);         // stored procedure
  const [[occ]] = await pool.query('SELECT fn_FlightOccupancyPercent(?) AS pct', [id]); // stored function
  const classes = await q(
    `SELECT SeatClass, COUNT(*) AS total, SUM(SeatStatus = 'Available') AS open, SUM(SeatStatus = 'Booked') AS booked
       FROM Seat WHERE FlightID = ? GROUP BY SeatClass ORDER BY MIN(SeatPriceMultiplier) DESC`, [id]);
  const rating = (await q('SELECT * FROM vw_TopRatedFlights WHERE FlightID = ?', [id]))[0] || null;
  const bookings = await q(
    `SELECT b.BookingID, b.BookingReference, b.BookingStatus, b.TotalFare, s.SeatNumber, CONCAT(p.FirstName, ' ', p.LastName) AS PassengerName
       FROM Booking b JOIN Seat s ON s.SeatID = b.SeatID JOIN Passenger p ON p.PassengerID = b.PassengerID
      WHERE b.FlightID = ? ORDER BY b.BookingID DESC LIMIT 8`, [id]);
  res.json({ flight, report: report[0] || null, occupancy: occ.pct, classes, rating, bookings });
}));

/* ------------------------------------------------------------------ */
/*  Passengers + bookings overview                                      */
/* ------------------------------------------------------------------ */
router.get('/passengers/:id/overview', ah(async (req, res) => {
  const id = Number(req.params.id);
  const cfg = ENTITIES.passengers;
  const [passenger] = await q(`SELECT ${cfg.select}, fn_GetPassengerFullName(p.PassengerID) AS FullNameWithMiddle FROM ${cfg.from} WHERE p.PassengerID = ?`, [id]);
  if (!passenger) throw new HttpError(404, 'Passenger not found.');
  const [[history]] = await pool.query('CALL sp_GetPassengerBookingHistory(?)', [id]);   // stored procedure
  const spend = (await q('SELECT * FROM vw_PassengerSpending WHERE PassengerID = ?', [id]))[0] || null;
  const reviews = (await q('SELECT COUNT(*) AS n, ROUND(AVG(Rating), 1) AS avg FROM Review WHERE PassengerID = ?', [id]))[0];
  res.json({ passenger, history, spend, reviews });
}));

router.get('/bookings/:id/overview', ah(async (req, res) => {
  const id = Number(req.params.id);
  res.json(await bookingOverview(id));
}));

async function bookingOverview(id) {
  const cfg = ENTITIES.bookings;
  const [booking] = await q(`SELECT ${cfg.select} FROM ${cfg.from} WHERE b.BookingID = ?`, [id]);
  if (!booking) throw new HttpError(404, 'Booking not found.');
  const [passenger] = await q(`SELECT p.*, fn_CalculateAge(p.DOB) AS Age FROM Passenger p WHERE PassengerID = ?`, [booking.PassengerID]);
  const [flight] = await q(
    `SELECT f.*, TIMESTAMPDIFF(MINUTE, TIMESTAMP(f.DepartureDate, f.DepartureTime), TIMESTAMP(f.ArrivalDate, f.ArrivalTime)) AS DurationMin
       FROM Flight f WHERE FlightID = ?`, [booking.FlightID]);
  const [seat] = await q('SELECT * FROM Seat WHERE SeatID = ?', [booking.SeatID]);
  const [payment] = await q('SELECT * FROM Payment WHERE BookingID = ?', [id]);
  const baggage = await q('SELECT * FROM Baggage WHERE BookingID = ? ORDER BY BaggageID', [id]);
  const [cancellation] = await q('SELECT * FROM Cancellation WHERE BookingID = ?', [id]);
  return { booking, passenger, flight, seat, payment: payment || null, baggage, cancellation: cancellation || null };
}

router.post('/bookings/:id/cancel', ah(async (req, res) => {
  const row = await S.cancelBooking(Number(req.params.id), req.body || {});
  res.status(201).json({ cancellation: row, ...(await bookingOverview(Number(req.params.id))) });
}));

router.post('/book', ah(async (req, res) => {
  const id = await S.bookSeat(req.body || {});
  res.status(201).json(await bookingOverview(id));
}));

router.post('/seats/generate', ah(async (req, res) => {
  res.status(201).json(await S.bulkSeats(req.body || {}));
}));

router.get('/coupon/:code', (req, res) => {
  const c = P.findCoupon(req.params.code);
  if (!c) throw new HttpError(404, 'That coupon code is not valid.');
  res.json(c);
});

/* ------------------------------------------------------------------ */
/*  Dashboard + insights (powered by the project's SQL views)          */
/* ------------------------------------------------------------------ */
router.get('/dashboard', ah(async (req, res) => {
  const [[kpi]] = await pool.query(
    `SELECT (SELECT COUNT(*) FROM Passenger) AS passengers,
            (SELECT COUNT(*) FROM Flight) AS flights,
            (SELECT COUNT(*) FROM Flight WHERE FlightStatus IN ('Scheduled','Delayed')) AS openFlights,
            (SELECT COUNT(*) FROM Booking WHERE BookingStatus <> 'Cancelled') AS activeBookings,
            (SELECT COUNT(*) FROM Booking) AS totalBookings,
            (SELECT COALESCE(SUM(TotalFare), 0) FROM Booking WHERE BookingStatus <> 'Cancelled') AS bookedRevenue,
            (SELECT COALESCE(SUM(TotalAmount), 0) FROM Payment WHERE PaymentStatus = 'Success') AS collected,
            (SELECT COALESCE(SUM(RefundAmount), 0) FROM Cancellation WHERE RefundStatus = 'Pending') AS pendingRefunds,
            (SELECT COALESCE(SUM(TotalSeats - AvailableSeats), 0) / NULLIF(SUM(TotalSeats), 0) * 100 FROM Flight WHERE FlightStatus <> 'Cancelled') AS occupancy`);
  const attention = (await pool.query(
    `SELECT (SELECT COUNT(*) FROM Flight WHERE FlightStatus = 'Delayed') AS delayedFlights,
            (SELECT COUNT(*) FROM Cancellation WHERE RefundStatus = 'Pending') AS pendingRefunds,
            (SELECT COUNT(*) FROM Payment WHERE PaymentStatus = 'Pending') AS pendingPayments,
            (SELECT COUNT(*) FROM Booking WHERE BookingStatus = 'Pending') AS pendingBookings,
            (SELECT COUNT(*) FROM Baggage WHERE BaggageStatus = 'Lost') AS lostBags,
            (SELECT COUNT(*) FROM Review WHERE ReviewStatus = 'Flagged') AS flaggedReviews`))[0][0];
  const byStatus = await q('SELECT BookingStatus AS label, COUNT(*) AS value FROM Booking GROUP BY BookingStatus ORDER BY value DESC');
  const byAirline = await q(
    `SELECT f.AirlineName AS label, ROUND(SUM(b.TotalFare)) AS value FROM Booking b JOIN Flight f ON f.FlightID = b.FlightID
      WHERE b.BookingStatus <> 'Cancelled' GROUP BY f.AirlineName ORDER BY value DESC LIMIT 7`);
  const byMonth = (await q(
    `SELECT DATE_FORMAT(BookingDate, '%Y-%m') AS label, COUNT(*) AS value FROM Booking
      GROUP BY DATE_FORMAT(BookingDate, '%Y-%m') ORDER BY label DESC LIMIT 8`)).reverse();
  const byClass = await q(
    `SELECT s.SeatClass AS label, COUNT(*) AS value FROM Booking b JOIN Seat s ON s.SeatID = b.SeatID
      WHERE b.BookingStatus <> 'Cancelled' GROUP BY s.SeatClass ORDER BY MIN(s.SeatPriceMultiplier) DESC`);
  const fcfg = ENTITIES.flights;
  let upcoming = await q(
    `SELECT ${fcfg.select} FROM ${fcfg.from} WHERE f.FlightStatus IN ('Scheduled','Delayed') AND f.DepartureDate >= CURDATE()
      ORDER BY f.DepartureDate, f.DepartureTime LIMIT 6`);
  let upcomingLabel = 'Next departures';
  if (!upcoming.length) {
    upcoming = await q(`SELECT ${fcfg.select} FROM ${fcfg.from} ORDER BY f.DepartureDate DESC, f.DepartureTime DESC LIMIT 6`);
    upcomingLabel = 'Latest flights';
  }
  const bcfg = ENTITIES.bookings;
  const recent = await q(`SELECT ${bcfg.select} FROM ${bcfg.from} ORDER BY b.BookingDate DESC, b.BookingTime DESC, b.BookingID DESC LIMIT 6`);
  const topRated = await q('SELECT * FROM vw_TopRatedFlights ORDER BY AvgRating DESC, ReviewCount DESC LIMIT 5');
  res.json({ kpi, attention, byStatus, byAirline, byMonth, byClass, upcoming, upcomingLabel, recent, topRated });
}));

router.get('/insights', ah(async (req, res) => {
  const occupancy = await q('SELECT * FROM vw_FlightOccupancy ORDER BY OccupancyPercent DESC, EstimatedRevenue DESC LIMIT 12');
  const spenders = await q('SELECT * FROM vw_PassengerSpending ORDER BY TotalSpend DESC, TotalBookings DESC LIMIT 10');
  const rated = await q('SELECT * FROM vw_TopRatedFlights ORDER BY AvgRating DESC, ReviewCount DESC LIMIT 10');
  const routes = await q(
    `SELECT f.SourceAirport, f.DestinationAirport, COUNT(*) AS bookings, ROUND(SUM(b.TotalFare)) AS revenue
       FROM Booking b JOIN Flight f ON f.FlightID = b.FlightID WHERE b.BookingStatus <> 'Cancelled'
      GROUP BY f.SourceAirport, f.DestinationAirport ORDER BY revenue DESC LIMIT 8`);
  const payments = await q(
    `SELECT PaymentMethod AS label, COUNT(*) AS value, ROUND(SUM(TotalAmount)) AS amount FROM Payment WHERE PaymentStatus = 'Success' GROUP BY PaymentMethod ORDER BY amount DESC`);
  res.json({ occupancy, spenders, rated, routes, payments });
}));

module.exports = router;
