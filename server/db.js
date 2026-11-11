'use strict';
require('dotenv').config();
const mysql = require('mysql2/promise');

const DB_NAME = process.env.DB_NAME || 'AirlineReservationSystem';

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,      // DATE / TIME / TIMESTAMP come back as plain strings (no timezone shifts)
  decimalNumbers: true,   // DECIMAL columns come back as JS numbers
  charset: 'utf8mb4',
});

/** Run fn(conn) inside a transaction. Rolls back automatically on error. */
async function tx(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const out = await fn(conn);
    await conn.commit();
    return out;
  } catch (e) {
    try { await conn.rollback(); } catch (_) { /* ignore */ }
    throw e;
  } finally {
    conn.release();
  }
}

/* ------------------------------------------------------------------ */
/*  Schema introspection - the UI forms are built from the real tables  */
/*  so every column in the database is always covered.                  */
/* ------------------------------------------------------------------ */
const TABLES = ['Passenger', 'Flight', 'Seat', 'Booking', 'Payment', 'Cancellation', 'Review', 'Baggage'];
let schemaPromise = null;

function parseEnum(columnType) {
  const out = [];
  const re = /'((?:[^']|'')*)'/g;
  let m;
  while ((m = re.exec(columnType))) out.push(m[1].replace(/''/g, "'"));
  return out;
}

function cleanDefault(v) {
  if (v === null || v === undefined) return null;
  let s = String(v);
  if (s.toUpperCase() === 'NULL') return null;
  if (/^'.*'$/.test(s)) s = s.slice(1, -1);          // MariaDB wraps string defaults in quotes
  return s;
}

function kindOf(c) {
  const t = c.columnType.toLowerCase();
  if (c.dataType === 'enum') return 'enum';
  if (t === 'tinyint(1)') return 'bool';
  if (['int', 'bigint', 'smallint', 'mediumint', 'tinyint'].includes(c.dataType)) return 'int';
  if (['decimal', 'numeric', 'float', 'double'].includes(c.dataType)) return 'decimal';
  if (c.dataType === 'date') return 'date';
  if (c.dataType === 'time') return 'time';
  if (['timestamp', 'datetime'].includes(c.dataType)) return 'timestamp';
  return 'text';
}

async function loadSchema() {
  const [cols] = await pool.query(
    `SELECT TABLE_NAME AS tbl, COLUMN_NAME AS name, ORDINAL_POSITION AS ord, DATA_TYPE AS dataType,
            COLUMN_TYPE AS columnType, IS_NULLABLE AS nullable, COLUMN_DEFAULT AS dflt,
            CHARACTER_MAXIMUM_LENGTH AS maxLength, NUMERIC_SCALE AS scale, EXTRA AS extra, COLUMN_KEY AS ckey
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (?)
      ORDER BY TABLE_NAME, ORDINAL_POSITION`, [DB_NAME, TABLES]);
  const [idx] = await pool.query(
    `SELECT TABLE_NAME AS tbl, INDEX_NAME AS idx, COLUMN_NAME AS col, NON_UNIQUE AS nonUnique
       FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (?) ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`, [DB_NAME, TABLES]);

  const schema = { tables: {}, uniques: {} };
  for (const c of cols) {
    const col = {
      name: c.name,
      dataType: c.dataType,
      columnType: c.columnType,
      nullable: c.nullable === 'YES',
      default: cleanDefault(c.dflt),
      hasDefault: c.dflt !== null && c.dflt !== undefined,
      maxLength: c.maxLength ? Number(c.maxLength) : null,
      scale: c.scale === null || c.scale === undefined ? null : Number(c.scale),
      auto: /auto_increment/i.test(c.extra || ''),
      pk: c.ckey === 'PRI',
    };
    col.kind = kindOf({ ...col });
    if (col.kind === 'enum') col.options = parseEnum(col.columnType);
    const tbl = TABLES.find((t) => t.toLowerCase() === String(c.tbl).toLowerCase()) || c.tbl;
    schema.tables[tbl] = schema.tables[tbl] || { columns: [], byName: {} };
    schema.tables[tbl].columns.push(col);
    schema.tables[tbl].byName[col.name] = col;
    if (tbl !== c.tbl) schema.tables[c.tbl] = schema.tables[tbl];
  }
  for (const r of idx) {
    if (r.nonUnique === 0 && r.idx !== 'PRIMARY') {
      const tbl = TABLES.find((t) => t.toLowerCase() === String(r.tbl).toLowerCase()) || r.tbl;
      (schema.uniques[r.idx] = schema.uniques[r.idx] || { table: tbl, columns: [] }).columns.push(r.col);
    }
  }
  const missing = TABLES.filter((t) => !schema.tables[t]);
  if (missing.length) {
    throw new Error(`Database "${DB_NAME}" is missing table(s): ${missing.join(', ')}. Run database/AirlineReservationSystem.sql first.`);
  }
  return schema;
}

function getSchema(force = false) {
  if (!schemaPromise || force) {
    schemaPromise = loadSchema().catch((e) => { schemaPromise = null; throw e; });
  }
  return schemaPromise;
}

module.exports = { pool, tx, getSchema, DB_NAME, TABLES };
