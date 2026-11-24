'use strict';
/* Postgres access for the multi-tenant platform.
 *
 *   - Postgres (Supabase) is the source of truth for people, schools, content
 *     visibility and study records. It is optional at boot: with no
 *     UPAY_DATABASE_URL the site keeps working from local data files and only
 *     the account/tenant surface reports that it is not configured.
 *   - Every query goes through parameterised helpers. No SQL string is built
 *     from request data.
 *   - The pool is small and per process; a connection error never crashes the
 *     server, it surfaces as { ok:false, code:'db_unavailable' }.
 */
const crypto = require('node:crypto');

let pg = null;
try { pg = require('pg'); } catch (_) { pg = null; }
// A workspace copy without node_modules still boots the site; only the
// account surface reports that the database client is missing.
function pgMissing() {
  const e = new Error('The database client is not installed on this server.');
  e.code = 'db_unavailable'; e.status = 503;
  return e;
}

let pool = null;
let poolUrl = '';

function url() {
  const raw = String(process.env.UPAY_DATABASE_URL || process.env.DATABASE_URL || '').trim();
  return raw && /^postgres(ql)?:\/\//.test(raw) ? raw : '';
}
function configured() { return !!(url() && pg); }
function enabled() { return process.env.UPAY_TENANCY === 'off' ? false : configured(); }

function getPool() {
  if (!configured()) return null;
  const target = url();
  if (pool && poolUrl === target) return pool;
  if (pool) { pool.end().catch(() => {}); pool = null; }
  pool = new pg.Pool({
    connectionString: target,
    max: Number(process.env.UPAY_DB_POOL || 6),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 8000,
    // Hosted Postgres normally requires TLS; a local socket does not.
    ssl: /^(127\.0\.0\.1|localhost|\/)/.test(target) || /sslmode=disable/.test(target) ? false : { rejectUnauthorized: true },
    application_name: 'upay'
  });
  pool.on('error', () => {}); // idle client errors must not crash the server
  poolUrl = target;
  return pool;
}

async function query(sql, params) {
  const p = getPool();
  if (!p) throw pgMissing();
  try {
    return await p.query(sql, params || []);
  } catch (e) {
    if (/ECONNREFUSED|ENOTFOUND|timeout|terminated|57P01|28P01|3D000/.test(String(e.code) + ' ' + String(e.message))) {
      e.code = 'db_unavailable';
    }
    throw e;
  }
}

async function one(sql, params) {
  const r = await query(sql, params);
  return r.rows[0] || null;
}
async function all(sql, params) {
  const r = await query(sql, params);
  return r.rows;
}

/* Identity numbers are stored as a keyed hash plus the last four digits. */
function idHash(value) {
  const clean = String(value || '').replace(/\s+/g, '');
  if (!clean) return '';
  const key = String(process.env.UPAY_ID_SALT || process.env.UPAY_ADMIN_PASSWORD || 'upay-local-salt');
  return crypto.createHmac('sha256', key).update(clean).digest('hex');
}
function idLast4(value) {
  const clean = String(value || '').replace(/\D/g, '');
  return clean ? clean.slice(-4) : '';
}

async function healthy() {
  if (!configured()) return { ok: false, code: 'db_not_configured' };
  try { await query('select 1 as ok'); return { ok: true }; }
  catch (e) { return { ok: false, code: e.code || 'db_error' }; }
}

module.exports = { configured, enabled, getPool, query, one, all, idHash, idLast4, healthy };
