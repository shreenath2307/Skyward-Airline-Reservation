'use strict';
const path = require('path');
const express = require('express');
const { pool, getSchema, DB_NAME } = require('./db');
const { friendly, HttpError } = require('./errors');

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

// API (order matters: the specific routes in ops.js must come before the generic /:entity CRUD routes)
app.use('/api', require('./routes/ops'));
app.use('/api', require('./routes/crud'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Front-end
app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'], maxAge: '1h' }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

// Errors -> tidy JSON
// eslint-disable-next-line no-unused-vars
app.use(async (err, req, res, next) => {
  let schema = null;
  try { schema = await getSchema(); } catch (_) { /* db may be down */ }
  const e = friendly(err, schema);
  if (!(e instanceof HttpError)) {
    console.error('[error]', err);
    return res.status(500).json({ error: 'Something went wrong on the server.', detail: err.sqlMessage || err.message });
  }
  if (e.status >= 500) console.error('[error]', err.message);
  res.status(e.status).json({ error: e.message, fields: e.fields || undefined });
});

app.listen(PORT, async () => {
  console.log('\n  ✈  Skyward - Airline Seat Reservation System');
  console.log(`  →  http://localhost:${PORT}\n`);
  try {
    const [[v]] = await pool.query('SELECT VERSION() AS v');
    await getSchema();
    console.log(`  ✔  Connected to MySQL ${v.v}  ·  database "${DB_NAME}"\n`);
  } catch (e) {
    console.log('  ✖  Could not use the database yet:');
    console.log(`     ${e.message}`);
    console.log('     → Check the .env file (DB_USER / DB_PASSWORD) and run database/AirlineReservationSystem.sql in MySQL Workbench.\n');
  }
});
