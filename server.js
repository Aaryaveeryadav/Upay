/* =====================================================================
   Upay · server.js  —  tiny dependency-free Node server
   ---------------------------------------------------------------------
   Serves the static app from /public and a JSON API under /api.

   Roles
     admin    full access: content, API key, users
     teacher  read everything, generate questions with the AI agent
     student  read everything, practise

   Storage (all under ./data, never inside /public)
     data/db.json     users, content, settings, audit log
     data/secret.key  the AES key for the encrypted admin password
   ===================================================================== */
'use strict';
const taskRouting = require('./assets/js/task-routing.js');
const solvePolicy = require('./lib/solve-policy.js');
const solveRuntime = require('./lib/gemini.js');
const { aiFailure: solveFailure } = require('./lib/ai-status.js');

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const url = require('url');
/* The rule that keeps a torn question from being answered as if it were whole.
   See tools/corrupt_gate.js for why each signature is in the list. */
const corrupt = require(path.join(__dirname, 'corrupt_gate.js'));
const grader = require(path.join(__dirname, 'tools', 'checker.js'));

const ROOT = __dirname;
const PUBLIC = ROOT;
const DATA = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA, 'db.json');
const KEY_FILE = path.join(DATA, 'secret.key');
const PORT = process.env.PORT || 8004;
/* Authentication is ON by default. An explicit opt-in testing mode can allow
   unauthenticated AI/public reads, but must never grant remote admin access. */
const OPEN_MODE = process.env.UPAY_NO_AUTH === '1' || process.env.UPAY_OPEN === '1';
const OPEN_STUDENT_SESSION = { id: 'guest', user: 'guest', role: 'student', name: 'Guest', exp: 0 };
const HOST = '0.0.0.0';

/* ---------------- storage ---------------- */
if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true, mode: 0o700 });

function secretKey() {
  if (!fs.existsSync(KEY_FILE)) fs.writeFileSync(KEY_FILE, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
  return Buffer.from(fs.readFileSync(KEY_FILE, 'utf8').trim(), 'hex');
}

/* AES-256-GCM: the admin password is never stored in readable form */
function seal(plain) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', secretKey(), iv);
  const enc = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]);
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), enc.toString('base64')].join('.');
}
function open_(blob) {
  const [v, iv, tag, enc] = String(blob).split('.');
  if (v !== 'v1') return null;
  try {
    const d = crypto.createDecipheriv('aes-256-gcm', secretKey(), Buffer.from(iv, 'base64'));
    d.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([d.update(Buffer.from(enc, 'base64')), d.final()]).toString('utf8');
  } catch (e) { return null; }
}

function hash(pw, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const h = crypto.pbkdf2Sync(String(pw), salt, 120000, 32, 'sha256').toString('hex');
  return { salt: salt, hash: h };
}
function verifyPw(pw, rec) {
  if (!rec || !rec.salt) return false;
  const h = crypto.pbkdf2Sync(String(pw), rec.salt, 120000, 32, 'sha256').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(h, 'hex'), Buffer.from(rec.hash, 'hex'));
}

function freshDB() {
  // Never ship a predictable admin password. For a new installation, the
  // operator can set UPAY_ADMIN_PASSWORD or use the one printed once here.
  const initialPassword = process.env.UPAY_ADMIN_PASSWORD || crypto.randomBytes(18).toString('base64url');
  if (initialPassword.length < 8) throw new Error('UPAY_ADMIN_PASSWORD must have at least 8 characters.');
  if (!process.env.UPAY_ADMIN_PASSWORD) console.log('Initial admin password (change it and keep it private): ' + initialPassword);
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    settings: {
      geminiKeySealed: null,          // AES blob, only ever leaves the server masked
      /* self-signup: closed unless the admin opens it, and gated by a code the
         admin can change at any time. A student who is told the code in class
         can make their own account; a stranger who finds the URL cannot. */
      signupOpen: false,
      signupCode: '',
      signupNote: 'Class 10 Mathematics',
      geminiModel: 'gemini-3.5-flash-lite',
      siteTitle: 'Upay · उपाय'
    },
    users: [{
      id: 'u_admin',
      user: 'admin',
      role: 'admin',
      name: 'Administrator',
      ...hash(initialPassword),
      mustChange: true,               // operator should replace the initial password
      createdAt: new Date().toISOString()
    }],
    content: { books: [], papers: [], notes: [] },
    aiLog: [],
    aiCache: {},   /* question-hash -> solved answer.  Filled once, reused forever:
                     the free tier allows ~20 calls per model per day, and the
                     bank has 833 questions, so nothing may be solved twice. */
    audit: []
  };
}

let db;
function loadDB() {
  if (!fs.existsSync(DB_FILE)) { db = freshDB(); saveDB(); return; }
  db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  db.content = db.content || { books: [], papers: [], notes: [] };
  db.users = db.users || [];
  db.aiLog = db.aiLog || [];
  db.aiCache = db.aiCache || {};
  db.audit = db.audit || [];
}
/* Saves used to serialise the WHOLE database (4.8 MB and growing) on every
   call -- and there are 23 call sites, including one per solved question. At
   ~40 ms per write that capped the app at a few writes a second no matter how
   fast the model was, and the cost grew with the bank.

   Three changes, none of which weakens durability:
     1. Coalesce: a burst of edits becomes ONE write, 250 ms later. Anything
        that needs it on disk immediately calls saveDB(true).
     2. Compact: the pretty-printer was doubling the file for no reader's
        benefit; the file is machine-owned, so it is written without padding.
     3. Atomic as before: temp file, fsync, rename. A crash mid-write can
        never leave a half-written database.
   flushDB() runs on SIGINT/SIGTERM/exit, so a normal stop loses nothing. */
let saveTimer = null;
let dirty = false;

function writeDBSync() {
  dirty = false;
  const tmp = DB_FILE + '.tmp';
  const body = JSON.stringify(db);
  const fd = fs.openSync(tmp, 'w', 0o600);
  try {
    fs.fchmodSync(fd, 0o600);
    fs.writeFileSync(fd, body);
    fs.fsyncSync(fd);              /* the rename is only durable if the bytes are */
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, DB_FILE);
}

function saveDB(now) {
  dirty = true;
  if (now === true) {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    writeDBSync();
    return;
  }
  if (saveTimer) return;           /* a write is already queued */
  saveTimer = setTimeout(function () {
    saveTimer = null;
    try { writeDBSync(); } catch (e) { console.error('db write failed:', e.message); }
  }, 250);
  if (saveTimer.unref) saveTimer.unref();
}

/* anything that dies without flushing would lose at most the last 250 ms */
function flushDB() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (dirty) { try { writeDBSync(); } catch (e) { console.error('final db write failed:', e.message); } }
}
process.on('exit', flushDB);
['SIGINT', 'SIGTERM'].forEach(function (sig) {
  process.on(sig, function () { flushDB(); process.exit(0); });
});
function audit(who, action, detail) {
  db.audit.unshift({ at: new Date().toISOString(), who: who || 'system', action: action, detail: detail || '' });
  db.audit = db.audit.slice(0, 500);
}

/* ---------------- sessions ---------------- */
const sessions = new Map();          // token -> {user, role, name, exp}
/* 30 days, not 8 hours. A student opens this app at breakfast and again after
   school; an 8-hour token meant the second visit silently failed in the middle
   of revealing a solution. The token is HMAC-signed and the client renews it on
   every load (see /api/auth/renew), so an active student never sees a sign-in
   wall, and a stolen token still dies after a month. */
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

/* Sessions used to live only in this process's memory, so every restart signed
   everybody out -- and the portal then showed the raw text "no session".
   A token is now a signed value (HMAC over the payload with the server's own
   secret) AND is still cached in memory. That means:
     * a restart does not sign anyone out (the signature still verifies),
     * a tampered token is rejected (the signature fails),
     * sign-out is immediate (the memory entry is dropped). */
function signSession(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', secretKey()).update(body).digest('base64url');
  return body + '.' + mac;
}
function readSession(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, mac] = parts;
  if (!body || !mac) return null;
  const want = crypto.createHmac('sha256', secretKey()).update(body).digest('base64url');
  /* constant-time compare; a wrong length would throw in timingSafeEqual */
  if (mac.length !== want.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(want))) return null;
  let payload;
  try { payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch (e) { return null; }
  if (!payload || !payload.exp || payload.exp < Date.now()) return null;
  return payload;
}
function newSession(u) {
  const payload = { id: u.id, user: u.user, role: u.role, name: u.name,
    authVersion: Number(u.authVersion || 0), jti: crypto.randomBytes(16).toString('base64url'), exp: Date.now() + SESSION_MS };
  const token = signSession(payload);
  sessions.set(token, payload);
  return token;
}
/* Signing out used to delete the token from this process's memory only. Because
   a token is also valid by signature, the same token kept working afterwards --
   signing out did nothing. Revocations are now kept (as hashes, never tokens)
   in db.revoked, pruned as they expire. */
function tokenHash(t) {
  return crypto.createHash('sha256').update(String(t)).digest('hex').slice(0, 32);
}
function isRevoked(t) {
  const list = Array.isArray(db.revoked) ? db.revoked : [];
  const h = tokenHash(t);
  for (let i = 0; i < list.length; i++) if (list[i].h === h) return true;
  return false;
}
function revoke(t) {
  if (!Array.isArray(db.revoked)) db.revoked = [];
  const rec = readSession(t) || {};
  const h = tokenHash(t);
  const nowMs = Date.now();
  db.revoked = db.revoked.filter(function (x) { return x.exp > nowMs; });
  if (!db.revoked.some(function (x) { return x.h === h; })) {
    db.revoked.push({ h: h, exp: rec.exp || (Date.now() + SESSION_MS) });
  }
  sessions.delete(t);
  sessions.delete('sb:' + h);
  saveDB(true);
}
/* Supabase JWT verification — accept Supabase access tokens as signed-in students */
const { url: SB_URL, anonKey: SB_ANON_KEY } = require(path.join(__dirname, 'lib', 'supabase-public.js'));
const { isAllowedForPaidAI } = require(path.join(__dirname, 'lib', 'supabase-auth.js'));
const sbJwks = null; /* leave null to verify by introspection (safe + no crypto on server) */
function verifySupabaseToken(token) {
  return new Promise(function (resolve) {
    if (!token) return resolve(null);
    /* JWTs from Supabase always start with ey and contain 3 dot segments */
    if (token.slice(0, 2) !== 'ey' || token.split('.').length !== 3) return resolve(null);
    // JWTs from the same project have identical prefixes. Keying by the
    // prefix let a forged token inherit another user's cached session.
    const key = 'sb:' + tokenHash(token);
    let jwtExpiry = 0;
    try { jwtExpiry = Number(JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')).exp) * 1000; } catch (_) {}
    if (!Number.isFinite(jwtExpiry) || jwtExpiry <= Date.now()) return resolve(null);
    const cached = sessions.get(key);
    if (cached && cached.exp > Date.now()) return resolve(cached);
    const u = require('url').parse(SB_URL + '/auth/v1/user');
    const opts = {
      hostname: u.hostname, port: 443, path: u.path, method: 'GET',
      headers: { 'apikey': SB_ANON_KEY, 'authorization': 'Bearer ' + token }
    };
    const req = require('https').request(opts, function (res) {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', function () {
        try {
          if (res.statusCode !== 200) return resolve(null);
          const j = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          if (!j || !j.id) return resolve(null);
          const name = (j.user_metadata && (j.user_metadata.name || j.user_metadata.full_name))
            || (j.email ? j.email.split('@')[0] : 'student');
          const payload = {
            id: j.id, user: j.email || ('u_' + j.id.slice(0, 8)),
            role: 'student', name: name, exp: Math.min(jwtExpiry, Date.now() + 60 * 1000), sb: true
          };
          sessions.set(key, payload);
          resolve(payload);
        } catch (e) { resolve(null); }
      });
    });
    req.on('error', function () { resolve(null); });
    req.setTimeout(6000, function () { req.destroy(); resolve(null); });
    req.end();
  });
}

// User-supplied questions can contain private information. Cache entries are
// isolated by verified owner and scope; old unowned entries remain on disk but
// are never served to another user.
function aiCacheOwner(sess) { return (sess && sess.sb ? 'supabase:' : 'local:') + String(sess && sess.id || 'guest'); }
function aiCacheKey(sess, kind, subject, cls, lang, text) {
  const parts = [aiCacheOwner(sess), kind, String(subject || ''), Number(cls) || 0,
    String(lang || ''), String(text || '').trim().toLowerCase()];
  return 'v2:' + crypto.createHmac('sha256', secretKey()).update(JSON.stringify(parts)).digest('hex').slice(0, 32);
}

function currentLocalSession(payload) {
  if (!payload) return null;
  const user = db.users.find(function (x) { return x.id === payload.id; });
  if (!user || Number(user.authVersion || 0) !== Number(payload.authVersion || 0)) return null;
  // A deleted or downgraded user must not retain the old token's privileges.
  return Object.assign({}, payload, { user: user.user, role: user.role, name: user.name });
}
async function sessionOfAsync(req) {
  const h = req.headers['authorization'] || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!t || isRevoked(t)) return null;
  const cached = sessions.get(t);
  if (cached) {
    if (cached.exp < Date.now()) { sessions.delete(t); return null; }
    return currentLocalSession(cached);
  }
  const payload = currentLocalSession(readSession(t));
  if (payload) { sessions.set(t, payload); return payload; }
  // Supabase access tokens are verified by the Auth service, never decoded as
  // proof of a role. They can only create student sessions here.
  return await verifySupabaseToken(t);
}

/* ---------------- rate limiting ----------------
   A login form with no ceiling is an invitation: a script can try thousands of
   passwords a minute, and each try costs the server a pbkdf2 hash at 120k
   rounds, so the same script doubles as a denial of service. Two independent
   limits, because either one alone is easy to dodge:
     * per IP      -- stops one machine hammering many accounts
     * per account -- stops a botnet spreading attempts across many IPs
   Counted in memory: a restart clears them, which is acceptable because an
   attacker cannot restart the server. */
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_IP = 10;        /* failed attempts per 15 min from one address */
const LOGIN_MAX_USER = 6;       /* failed attempts per 15 min against one account */
const loginFails = new Map();   /* key -> {n, until} */

function limitKey(kind, v) { return kind + ':' + String(v); }
function limitCheck(key, max) {
  const rec = loginFails.get(key);
  if (!rec) return { ok: true };
  if (rec.until < Date.now()) { loginFails.delete(key); return { ok: true }; }
  if (rec.n >= max) return { ok: false, retryAfter: Math.ceil((rec.until - Date.now()) / 1000) };
  return { ok: true };
}
function limitHit(key) {
  const nowMs = Date.now();
  const rec = loginFails.get(key);
  if (!rec || rec.until < nowMs) loginFails.set(key, { n: 1, until: nowMs + LOGIN_WINDOW_MS });
  else rec.n++;
  /* keep the map from growing without bound */
  if (loginFails.size > 5000) {
    for (const [k, r] of loginFails) if (r.until < nowMs) loginFails.delete(k);
  }
}
function clientIp(req) {
  /* behind a proxy the socket address is the proxy; trust the header only if
     the operator says so, otherwise honour x-forwarded-for blindly would let
     anyone dodge the limit by inventing an address */
  if (process.env.UPAY_TRUST_PROXY === '1') {
    const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (xf) return xf;
  }
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

/* ---------------- helpers ---------------- */
function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body)
  });
  res.end(body);
}
function readBody(req, limit) {
  return new Promise(function (resolve, reject) {
    let n = 0; const chunks = [];
    req.on('data', function (c) {
      n += c.length;
      if (n > (limit || 1 << 20)) { reject(new Error('too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', function () {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); }
      catch (e) { reject(new Error('bad json')); }
    });
    req.on('error', reject);
  });
}
const uid = function (p) { return (p || 'id') + '_' + crypto.randomBytes(6).toString('hex'); };
const now = function () { return new Date().toISOString(); };

function requireRole(sess, roles) {
  if (!sess) return 'Sign in first.';
  if (roles && roles.indexOf(sess.role) === -1) return 'Not allowed for the ' + sess.role + ' role.';
  return null;
}

/* ---------------- static files ---------------- */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.pdf': 'application/pdf'
};

/* If someone opens a stale address (an old :8080 bookmark, a dead preview tab)
   they no longer land on a blank frame -- the server tells them where the app
   actually is. Cheap, and it was the thing people got stuck on. */
function notFoundPage(res, why, hint) {
  const escapeHTML = s => String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  why = escapeHTML(why); hint = escapeHTML(hint);
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  /* "/" is relative to whatever host the browser actually used. A literal
     http://localhost:PORT link is dead when the app is opened on 192.168.x.x
     or through a preview host. */
  res.end('<!doctype html><meta charset="utf-8"><title>Upay</title>'
    + '<div style="font:16px/1.6 system-ui,sans-serif;max-width:560px;margin:12vh auto;padding:0 24px;color:#2b3a42">'
    + '<h1 style="font-size:20px;margin:0 0 10px">This is not the Upay address</h1>'
    + '<p style="color:#5b6b74">' + why + '</p>'
    + (hint ? '<p style="color:#5b6b74">' + hint + '</p>' : '')
    + '<p style="margin-top:18px"><a href="/" '
    + 'style="display:inline-block;padding:9px 20px;border-radius:10px;background:#46a0c9;'
    + 'color:#fff;text-decoration:none;font-weight:600">Open Upay</a></p>'
    + '</div>');
}

function serveStatic(req, res, pathname) {
  let p;
  try { p = decodeURIComponent(pathname); }
  catch (_) { res.writeHead(400); return res.end('bad path'); }
  if (p.includes('\0')) { res.writeHead(400); return res.end('bad path'); }
  if (p === '/' ) p = '/index.html';
  /* The pages were once reachable as /public/login.html (the folder was the
     web root). Those links still exist in old bookmarks and in login.html's
     own redirect, so the legacy prefix is mapped onto the real file rather
     than answered with a 404. */
  /* Strip the prefix REPEATEDLY: the pages load their own assets with paths
     like "public/assets/js/api-base.js", so from /public/login.html the
     browser asks for /public/public/assets/... . Collapsing only one level
     left that 404ing, which silently broke the whole login page. */
  while (/^\/public\//.test(p)) p = p.replace(/^\/public/, '');
  p = path.posix.normalize('/' + p.replace(/\\/g, '/'));
  // Preserve old, case-sensitive Sanskrit PDF URLs while their portable asset
  // names avoid collisions on Windows/macOS. The original bytes are unchanged.
  const legacySanskritPDFs = {
    '/assets/sanskrit/papers/Sanskrit.pdf': '/assets/sanskrit/papers/Sanskrit-variant-A.pdf',
    '/assets/sanskrit/papers/52_SANSKRIT.pdf': '/assets/sanskrit/papers/52-SANSKRIT-set-4.pdf'
  };
  if (Object.prototype.hasOwnProperty.call(legacySanskritPDFs, p)) p = legacySanskritPDFs[p];
  // Only the app shell and public assets are web-accessible. In particular,
  // never serve data/, server code, tools, uploads, archives or private keys.
  const publicFiles = new Set(['/index.html', '/login.html', '/portal.html', '/sw.js', '/favicon.ico', '/robots.txt', '/manifest.json', '/manifest.webmanifest']);
  if (!(publicFiles.has(p) || p.startsWith('/assets/'))) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    return res.end('not found');
  }
  const file = path.resolve(PUBLIC, '.' + p);
  if (!file.startsWith(PUBLIC + path.sep)) { res.writeHead(404); return res.end('not found'); }
  fs.stat(file, function (err, st) {
    if (err || !st.isFile()) {
      /* A missing ASSET must 404, never fall back to index.html: handing back
         an HTML page where a script was expected produces
         "SyntaxError: Unexpected token '<'" and a page that silently does
         nothing. Only real page routes get the SPA fallback. */
      /* The study app is hash-routed (#/pyq), so a real page NEVER needs a
         server-side fallback. Serving index.html for a missing .html used to
         turn "/public/login.html" on this server into the study app -- the
         wrong page, with no error to explain it. */
      if (/\.[a-z0-9]{2,5}$/i.test(p)) {
        /* a real file that is missing: still 404 (never HTML where a script
           is expected), but as a readable page for a human who typed it */
        if (/\.(?:html?|php|aspx?)$/i.test(p)) return notFoundPage(res, 'The page ' + p + ' does not exist.');
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        return res.end('not found: ' + p);
      }
      /* SPA fallback — serve compressed index.html */
      const idx = path.join(PUBLIC, 'index.html');
      return fs.readFile(idx, function (e2, buf) {
        if (e2) return notFoundPage(res, 'The page ' + p + ' does not exist on this server.');
        const ae = (req.headers['accept-encoding']||'').toString();
        const hdrs = { 'content-type': MIME['.html'], 'cache-control':'no-cache', 'vary':'Accept-Encoding' };
        if (ae.indexOf('br') >= 0 && zlib.createBrotliCompress) {
          hdrs['content-encoding']='br'; res.writeHead(200,hdrs);
          return res.end(zlib.brotliCompressSync(buf,{params:{[zlib.constants.BROTLI_PARAM_QUALITY]:4}}));
        }
        if (ae.indexOf('gzip') >= 0) {
          hdrs['content-encoding']='gzip'; res.writeHead(200,hdrs);
          return res.end(zlib.gzipSync(buf,{level:6}));
        }
        res.writeHead(200,hdrs); res.end(buf);
      });
    }
    // A symlink under an allowed path must not escape into private files.
    let real;
    try { real = fs.realpathSync(file); } catch (_) { res.writeHead(404); return res.end('not found'); }
    const assetRoot = fs.realpathSync(path.join(PUBLIC, 'assets')) + path.sep;
    if ((p.startsWith('/assets/') && !real.startsWith(assetRoot)) || (!p.startsWith('/assets/') && real !== file)) {
      res.writeHead(404); return res.end('not found');
    }
    const ext = path.extname(file).toLowerCase();
    const ctype = MIME[ext] || 'application/octet-stream';
    // Versioned assets (?v=XX) are immutable for 1 year; unversioned (html/sw) revalidates.
    const hasVer = /[?&]v=\d+/.test((req.url||''));
    const cc = hasVer ? 'public,max-age=31536000,immutable' : 'no-cache';
    const headers = { 'content-type': ctype, 'cache-control': cc,
      'vary': 'Accept-Encoding' };

    /* Compress compressible text assets ~70% for slow mobile. The client lists
       gzip/brotli in Accept-Encoding; we prefer brotli if available, else gzip,
       and fall through to raw for images/fonts/already-compressed formats. */
    const COMPRESSIBLE = /\.(html|js|mjs|css|json|svg|xml|txt|map)$/i;
    const ae = (req.headers['accept-encoding'] || '').toString();
    if (COMPRESSIBLE.test(ext) && !/\.min\.(js|css)/.test(file)) {
      if (ae.indexOf('br') >= 0 && typeof zlib.createBrotliCompress === 'function') {
        headers['content-encoding'] = 'br';
        res.writeHead(200, headers);
        fs.createReadStream(file).pipe(zlib.createBrotliCompress({
          params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 }
        })).pipe(res);
        return;
      }
      if (ae.indexOf('gzip') >= 0) {
        headers['content-encoding'] = 'gzip';
        res.writeHead(200, headers);
        fs.createReadStream(file).pipe(zlib.createGzip({ level: 6 })).pipe(res);
        return;
      }
    }
    res.writeHead(200, headers);
    fs.createReadStream(file).pipe(res);
  });
}

/* ---------------- AI (Gemini) ---------------- */

/* Several keys, not one.
   A key from a fresh Google Cloud project answers instantly; a key from a
   project that has already been used refuses for ~17 hours. Anybody who
   generates keys will, sooner or later, hand over a spent one -- and with a
   single slot the whole app goes down for the day when that happens.
   So keys live in a small ring: each one is tried in turn, a 429 is recorded
   against that key only, and the app keeps answering on the next key.
   db.settings.geminiKeys is a newest-last array of sealed blobs. The old
   single geminiKeySealed is still read, so an existing install keeps working. */
function keyRing() {
  const list = Array.isArray(db.settings.geminiKeys) ? db.settings.geminiKeys.slice() : [];
  if (db.settings.geminiKeySealed && list.indexOf(db.settings.geminiKeySealed) === -1) {
    list.unshift(db.settings.geminiKeySealed);       /* migrate the old slot */
  }
  return list;
}
/* keyDead: plaintext-key -> timestamp. Kept as a hash so the ring can be
   ordered without ever holding the keys in a readable list on disk. */
const keyDeadAt = {};
function keyHash(k) { return crypto.createHash('sha256').update(String(k)).digest('hex').slice(0, 16); }
function keyReady(k) { return !(keyDeadAt[keyHash(k)] && keyDeadAt[keyHash(k)] > Date.now()); }
/* plaintext keys, in the order they should be tried: ones we have not just
   exhausted first, oldest-proven first among those */
function liveKeys() {
  const out = [];
  keyRing().forEach(function (blob) {
    const k = open_(blob);
    if (k && out.indexOf(k) === -1) out.push(k);
  });
  return out.filter(keyReady).concat(out.filter(function (k) { return !keyReady(k); }));
}
function allKeys() {
  const out = [];
  keyRing().forEach(function (blob) {
    const k = open_(blob);
    if (k && out.indexOf(k) === -1) out.push(k);
  });
  return out;
}
function noteKeyDead(k, seconds) {
  keyDeadAt[keyHash(k)] = Date.now() + Math.min(Number(seconds) || 3600, 30 * 3600) * 1000;
}
/* 503 "high demand" is Google-side and usually clears within seconds, so a
   single retry after a short pause saves the student from a failed attempt. */
const sleep = (ms) => new Promise(function (r) { setTimeout(r, ms); });

async function callGemini(prompt, key, model, image) {
  const m = model || 'gemini-2.5-flash';
  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' +
    encodeURIComponent(m) + ':generateContent?key=' + encodeURIComponent(key);
  const msgParts = [{ text: prompt }];
  /* vision: an inline image part, base64, no data: prefix */
  if (image && image.data && image.mime) {
    msgParts.push({ inline_data: { mime_type: image.mime, data: image.data } });
  }
  const body = {
    contents: [{ role: 'user', parts: msgParts }],
    generationConfig: { temperature: image ? 0.2 : 0.9, maxOutputTokens: 8192 }
  };
  let r, txt;
  for (let attempt = 0; attempt < 2; attempt++) {
    /* A model call with no deadline can hang forever: the browser spinner never
       stops, the batch script waits with no output, and nothing ever reports an
       error. 90 s is longer than a normal answer (measured 2-40 s) and short
       enough that the student gets a real message instead of silence. */
    const ac = new AbortController();
    const timer = setTimeout(function () { ac.abort(); }, 90000);
    try {
      r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: ac.signal
      });
      txt = await r.text();
    } catch (e) {
      r = { ok: false, status: 0, statusText: 'timeout' };
      txt = 'the model did not answer within 90 seconds';
    } finally {
      clearTimeout(timer);
    }
    if (r.ok) break;
    /* only a transient 503/500 is worth retrying — 400/403 will never heal */
    if (r.status !== 503 && r.status !== 500 && r.status !== 0) break;
    if (attempt === 0) await sleep(900);
  }
  if (!r.ok) {
    /* Keep Google's retry metadata.  The error body was trimmed to 300 chars
       for the message text, which chopped off the RetryInfo block that sits
       after a ~200-character explanation -- so the caller could never learn how
       long to wait and treated a 20-second rate limit as a dead quota. */
    const err = new Error('Gemini ' + r.status + ': ' + txt.slice(0, 300));
    err.status = r.status;
    err.raw = txt;
    throw err;
  }
  const j = JSON.parse(txt);
  const parts = (j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [];
  return parts.map(function (p) { return p.text || ''; }).join('');
}

/* Model names move: Google retires them and, at peak, overloads them.
   Walk a preference list and report which one actually answered. */
/* Measured on 2026-11-01 with a live key:
     gemini-2.5-flash        -> 404 "no longer available to new users"   (drop)
     gemini-3.5/3.7/3.8-flash-> 429 after ~20 calls (free tier is PER MODEL)
     gemini-*.x-flash-lite   -> still answering when the big ones are capped
   So the lite models are kept as real fallbacks, not afterthoughts: when the
   main model's daily 20 is gone, the app keeps working instead of dying. */
const MODEL_CHAIN = [
  'gemini-3.5-flash-lite',      /* minimal live provider check succeeded */
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.8-flash',
  'gemini-flash-lite-latest'
];

/* A model that has told us its daily quotal is gone will keep saying so until
   the window resets. Remembering that (in memory, per model) stops every later
   request from burning 3 wasted calls before reaching a model that works. */
const quotaDead = {};                       /* model -> timestamp of the 429 */
/* The DAILY cap is not per model and not per minute: once Google says the key
   is done for the day, every model refuses at once. Remembering that stops each
   later request from walking the whole chain (33 s of waiting) just to be told
   the same thing five times. Only a long retryDelay sets this, so ordinary
   per-minute burst throttling still retries normally. */
let keyDeadUntil = 0;
const QUOTA_COOLDOWN = 50 * 60 * 1000;      /* free tier resets ~hourly */

async function callGeminiResilient(prompt, key, preferred, image) {
  /* `key` may be one key or the whole ring. When it is the ring, a key that is
     capped mid-run is retired and the next one takes over without the student
     seeing anything. */
  const keys = Array.isArray(key) ? key.filter(Boolean) : [key].filter(Boolean);
  if (!keys.length) throw new Error('Gemini 400: no API key is configured');
  let lastKeyErr = null;
  for (let ki = 0; ki < keys.length; ki++) {
    const thisKey = keys[ki];
    if (!keyReady(thisKey)) continue;
    try {
      return await callGeminiChain(prompt, thisKey, preferred, image);
    } catch (e) {
      const msg = String(e.message || e);
      lastKeyErr = e;
      const rm = String(e.raw || msg).match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
      const secs = rm ? Number(rm[1]) : 0;
      /* a long wait means this KEY is done for the day: move to the next one */
      if (/\b429\b|RESOURCE_EXHAUSTED/.test(msg) && secs > 600) {
        noteKeyDead(thisKey, secs);
        continue;
      }
      if (/API key not valid|PERMISSION_DENIED|\b403\b/.test(msg)) {
        noteKeyDead(thisKey, 30 * 3600);           /* bad key: do not retry it today */
        continue;
      }
      throw e;                                     /* not a key problem */
    }
  }
  throw lastKeyErr || new Error('Gemini 429: every configured key is out of quota');
}

async function callGeminiChain(prompt, key, preferred, image) {
  /* known-capped key: fail at once with the same shape the caller expects,
     instead of walking five models and making the student wait a minute */
  if (Date.now() < keyDeadUntil) {
    keyDeadUntil = 0;   /* the ring decides now; this is only a hint */
    const err = new Error('Gemini 429: the free AI quota for today is used up');
    err.status = 429;
    err.raw = '{"error":{"code":429,"status":"RESOURCE_EXHAUSTED","details":[]},"retryDelay":"' +
      Math.ceil((keyDeadUntil - Date.now()) / 1000) + 's"}';
    throw err;
  }
  const chain = [];
  [preferred].concat(MODEL_CHAIN).forEach(function (m) {
    if (m && chain.indexOf(m) === -1) chain.push(m);
  });
  const now = Date.now();
  /* put models we have not just exhausted first; keep the rest as last resort */
  chain.sort(function (a, b) {
    const da = quotaDead[a] && now - quotaDead[a] < QUOTA_COOLDOWN ? 1 : 0;
    const db2 = quotaDead[b] && now - quotaDead[b] < QUOTA_COOLDOWN ? 1 : 0;
    return da - db2;
  });
  const tried = [];
  let lastErr = null;
  for (let i = 0; i < chain.length; i++) {
    const m = chain[i];
    try {
      const out = await callGemini(prompt, key, m, image);
      return { text: out, model: m, tried: tried };
    } catch (e) {
      const msg = String(e.message || e);
      tried.push({ model: m, error: msg.slice(0, 120) });
      if (/\b429\b|RESOURCE_EXHAUSTED/.test(msg)) {
        quotaDead[m] = Date.now();
        /* A long retryDelay on a 429 is the DAILY cap, and it applies to the
           whole key rather than this one model. Note it here, at the source,
           so a caller that swallows the error (the approach top-up) still
           cannot leave the next request to walk all five models again. */
        const rm = String(e.raw || msg).match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
        if (rm && Number(rm[1]) > 600) {
          keyDeadUntil = Date.now() + Math.min(Number(rm[1]), 6 * 3600) * 1000;
        }
      }
      else if (/\b404\b|no longer available/.test(msg)) quotaDead[m] = Date.now();
      lastErr = e;
      /* Move on to the next model whenever this one could not answer for a
         reason another model might not share: quota, overload, retirement.
         Only a genuinely malformed request (400) is worth giving up on. */
      const hopeless = /\b400\b|INVALID_ARGUMENT|API key not valid|PERMISSION_DENIED|\b403\b/.test(msg);
      if (hopeless) break;
    }
  }
  const err = new Error(String((lastErr && lastErr.message) || 'no model answered'));
  err.tried = tried;
  /* carry the provider's raw body up to the caller so the retry delay survives */
  if (lastErr && lastErr.raw) err.raw = lastErr.raw;
  if (lastErr && lastErr.status) err.status = lastErr.status;
  throw err;
}


/* ---- pull every number out of an answer string, in a comparable form ---- */
function answerNumbers(str) {
  const out = [];
  const t = String(str || '')
    .replace(/−/g, '-').replace(/[–—]/g, '-').replace(/·/g, '.')
    .replace(/₹|Rs\.?|INR/gi, '').replace(/,/g, '');
  const re = /-?\d+(?:\.\d+)?(?:\s*\/\s*\d+)?/g;
  let m;
  while ((m = re.exec(t))) {
    const raw = m[0].replace(/\s+/g, '');
    let v;
    if (raw.indexOf('/') !== -1) {
      const [a, b] = raw.split('/').map(Number);
      if (!b) continue;
      v = a / b;
    } else v = Number(raw);
    if (isFinite(v)) out.push(v);
  }
  return out;
}

/* do two answers agree? tolerant of 5/33 vs 0·15, 25√3 vs 43·3, units and rounding */
function answersAgree(a, b) {
  const A = answerNumbers(a), B = answerNumbers(b);
  if (!A.length || !B.length) return null;             /* cannot tell */
  const close = (x, y) => {
    if (Math.abs(x - y) <= Math.max(0.02, Math.abs(y) * 0.01)) return true;
    if (y && Math.abs(x - y) / Math.abs(y) <= 0.02) return true;   /* rounding */
    return false;
  };
  for (const x of A) for (const y of B) if (close(x, y)) return true;
  return false;
}

/* ---- ask the model to check its own work, independently ---- */
async function verifyWithAI(question, claimedAnswer, key, model) {
  const prompt = [
    'You are a strict CBSE examiner checking another teacher’s answer.',
    'Work the question out YOURSELF from scratch. Do not assume the given answer is right.',
    'If the question is a PROOF (prove / show that / verify), there is no single number:',
    'judge whether the argument is logically valid and sets correct:true when it is.',
    'Do not mark a proof wrong merely because it does not end in a number.',
    'Reply with ONLY JSON: {"correct":true|false,"your_answer":"<your answer, short>","reason":"<one line>","confidence":"high|medium|low"}',
    '',
    'QUESTION: ' + question,
    'THEIR CLAIMED ANSWER: ' + claimedAnswer
  ].join('\n');
  const out = await callGeminiResilient(prompt, key, model);
  const j = firstJSON(out.text);
  return {
    correct: j.correct === true,
    yourAnswer: String(j.your_answer || ''),
    reason: String(j.reason || ''),
    confidence: String(j.confidence || 'medium')
  };
}

/* which text models will this key actually accept? */
async function listModels(key) {
  const ac = new AbortController();
  const timer = setTimeout(function () { ac.abort(); }, 30000);
  let r, txt;
  try {
    r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=' +
      encodeURIComponent(key), { signal: ac.signal });
    txt = await r.text();
  } catch (e) {
    throw new Error('could not reach Google within 30 seconds — check the connection');
  } finally {
    clearTimeout(timer);
  }
  if (!r.ok) {
    /* Keep Google's retry metadata.  The error body was trimmed to 300 chars
       for the message text, which chopped off the RetryInfo block that sits
       after a ~200-character explanation -- so the caller could never learn how
       long to wait and treated a 20-second rate limit as a dead quota. */
    const err = new Error('Gemini ' + r.status + ': ' + txt.slice(0, 300));
    err.status = r.status;
    err.raw = txt;
    throw err;
  }
  const j = JSON.parse(txt);
  return (j.models || [])
    .filter(function (m) { return (m.supportedGenerationMethods || []).indexOf('generateContent') !== -1; })
    .map(function (m) { return String(m.name || '').replace(/^models\//, ''); });
}

/* pulls the first {...} or [...] JSON block out of a model reply */
/* The model is told to write decimals as "3·5". That is fine in prose, but it
   also writes `"x":0·5` -- a middle dot INSIDE a JSON number -- and then the
   whole reply is unparseable, so a perfectly good solution was thrown away as
   "bad JSON". Repair exactly that, and only inside values whose key expects a
   number. A blanket replace would corrupt prose like "1·5 m" in a label. */
function repairNumericDots(s) {
  /* Two things the model does that are fine to read but illegal in JSON.

     1. It writes decimals as "3·5", and then uses that inside a NUMBER:
        "x":0·5 or [0·5,0,1,-2]. Between two digits a middle dot is
        always a decimal point. */
  let t = String(s).replace(/(\d)·(\d)/g, "$1.$2");

  /*  2. It writes LaTeX as backslash + "pi", backslash + "text", and so on.
        JSON allows only  "  BS  /  b  f  n  r  t  uXXXX  after a backslash,
        so a lone backslash before "p" makes the WHOLE reply unparseable and
        a good solution was thrown away as "bad JSON". Any backslash that
        does not begin a legal escape is doubled, which keeps the text exact.
        A single backslash + "n" IS a newline and is left alone. */
  const BS = String.fromCharCode(92);
  const LEGAL = String.fromCharCode(34) + BS + '/bfnrt';
  let out = "";
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c !== BS) { out += c; continue; }
    const n = t[i + 1];
    if (n === undefined) { out += BS + BS; continue; }
    if (n === "u") {
      if (/^[0-9a-fA-F]{4}$/.test(t.slice(i + 2, i + 6))) { out += BS + "u"; i += 1; }
      else { out += BS + BS + "u"; i += 1; }
      continue;
    }
    if (LEGAL.indexOf(n) !== -1) { out += BS + n; i += 1; continue; }
    out += BS + BS;   // not a legal escape: keep the backslash literally
  }

  out = out.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ");
  return out;
}

/* The model sometimes forgets to close an array before it closes an object:
     "approaches":[{...},{...},  "check":"..." }}
   The maths in that reply is fine and complete -- it was thrown away as "the
   model did not return usable JSON", which blames the model for a bracket and
   costs a whole solution. Closing the brackets where the nesting proves they
   belong recovers the reply exactly. This is a NO-OP on well-formed JSON. */
function repairStructure(s) {
  const t = String(s);
  const stack = [];            /* expected closers, innermost last */
  let out = '';
  const closeArrays = function () { while (stack.length && stack[stack.length - 1] === ']') { out += ']'; stack.pop(); } };
  const endOfString = function (from) {
    /* returns the index of the closing quote, or -1 */
    for (let i = from; i < t.length; i++) {
      const c = t[i];
      if (c === '\\') { i++; continue; }
      if (c === '"') return i;
    }
    return -1;
  };
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === '"') {
      const close = endOfString(i + 1);
      if (close === -1) return null;           /* truncated: not recoverable */
      const str = t.slice(i, close + 1);
      /* Is this string a KEY? A key is followed by a colon. If we are inside an
         array, that can only mean the array was never closed -- e.g.
           "approaches":[ {..}, {..},  "check":"..." }
         Close it here, exactly where the nesting proves it belongs. */
      let k = close + 1;
      while (k < t.length && /\s/.test(t[k])) k++;
      if (t[k] === ':' && stack.length && stack[stack.length - 1] === ']') {
        /* the array sat exactly here; the comma that separated its last item
           is now trailing and illegal, so drop it before closing */
        out = out.replace(/,+\s*$/, '');
        closeArrays();
      }
      /* Re-test the stack AFTER closing: the closer may just have returned us
         into an object that still needs a separator before this key. Testing
         it before closeArrays() was the bug -- the array is gone by now. */
      if (stack.length && stack[stack.length - 1] === '}' && out.trim() && !/[\[{,:]\s*$/.test(out)) {
        /* a whole key was swallowed by the missing closer; the property before
           it now needs its comma back */
        out += ',';
      }
      out += str;
      i = close;
      continue;
    }
    if (c === '{') { stack.push('}'); out += c; continue; }
    if (c === '[') { stack.push(']'); out += c; continue; }
    if (c === '}' || c === ']') {
      let guard = 0;
      while (stack.length && stack[stack.length - 1] !== c && guard++ < 20) out += stack.pop();
      if (stack.length) stack.pop();
      out += c;
      continue;
    }
    out += c;
  }
  while (stack.length) out += stack.pop();
  return out;
}


function firstJSON(s) {
  const m = String(s).match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = m ? m[1] : s;
  const i1 = body.indexOf('{'), i2 = body.indexOf('[');
  let start = (i1 === -1) ? i2 : (i2 === -1 ? i1 : Math.min(i1, i2));
  if (start === -1) throw new Error('no JSON in the model reply');
  const open = body[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < body.length; i++) {
    const c = body[i];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close) { depth--; if (!depth) return JSON.parse(body.slice(start, i + 1)); }
  }
  throw new Error('unbalanced JSON in the model reply');
}


/* ---------------- security headers ----------------
   Sent on every response: pages, assets and API alike.

   The Content-Security-Policy is deliberately built from the real surface of
   this app, not from a template:
     - script-src allows inline script because index.html carries a small inline
       bootstrap (the Supabase loader). The strict nonce would require templating
       index.html on every request; the app has no third-party script injection
       and escapes all question text through esc().
     - style-src allows 'unsafe-inline' because the renderer emits 261 inline
       style attributes. Removing that would need a full CSS refactor.
     - img-src allows data: because 33 figure diagrams are inlined as data URIs.
     - connect-src covers this origin plus the Supabase project the browser SDK
       talks to directly.
     - frame-ancestors 'none' plus X-Frame-Options stops the app being framed,
       which would otherwise let another site overlay the sign-in form.
   The inline `onload` attribute on the Devanagari font <link> is permitted by
   'unsafe-inline' in script-src; without it the font never swaps in. */
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  "media-src 'self' data: blob:",
  "connect-src 'self' https://fynlvbtefmawisauzitu.supabase.co wss://fynlvbtefmawisauzitu.supabase.co",
  "worker-src 'self' blob:",
  "manifest-src 'self'"
  /* No upgrade-insecure-requests here on purpose: this server is routinely
     reached over plain HTTP on a school LAN, where that directive would rewrite
     every subresource to https and break the page. Vercel is HTTPS-only and
     sends it in vercel.json instead. */
].join('; ');

function applySecurityHeaders(req, res) {
  res.setHeader('content-security-policy', CSP);
  res.setHeader('x-frame-options', 'DENY');
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('referrer-policy', 'same-origin');
  res.setHeader('permissions-policy', 'camera=(self), microphone=(), geolocation=(), payment=(), usb=()');
  res.setHeader('cross-origin-opener-policy', 'same-origin');
  res.setHeader('cross-origin-resource-policy', 'same-origin');
  /* HSTS only over TLS: sending it on plain http to localhost would pin the
     developer's browser to https://localhost and break the dev server. */
  if (req.headers['x-forwarded-proto'] === 'https' || req.socket.encrypted) {
    res.setHeader('strict-transport-security', 'max-age=31536000; includeSubDomains');
  }
}

/* ---------------- routes ---------------- */
const handleRequest = async function (req, res) {
  const u = url.parse(req.url, true);
  const p = u.pathname;

  /* security headers */
  applySecurityHeaders(req, res);

  /* The portal pages are opened two ways: served by this server, or opened as
     plain files from the app root on another port.  In the second case every
     call here is cross-origin, so the browser needs explicit permission or the
     sign-in button fails with a bare "network problem".
     Only our own pages are allowed -- the origin must be this host. */
  const origin = req.headers.origin;
  if (origin) {
    /* The page and the API can be on DIFFERENT hosts: behind a preview proxy
       the page is "<id>-8080.example" and the API "<id>-8090.example". A same-host
       test would reject the browser, which is how sign-in hung.  What matters is
       that the origin belongs to this deployment: same sandbox id, or a local
       address. Anything else is still refused. */
    let allowed = false;
    try {
      const oh = url.parse(origin);
      const ohHost = oh.hostname || '';
      const reqHost = (req.headers.host || '').split(':')[0];
      const idOf = (h) => {
        const m = h.match(/^(.+?)-(\d+)\.[^.]+/);      // <id>-<port>.<domain>
        return m ? m[1] : null;
      };
      allowed =
        ohHost === reqHost ||
        /^(localhost|127\.0\.0\.1)$/.test(ohHost) ||
        (idOf(ohHost) && idOf(reqHost) && idOf(ohHost) === idOf(reqHost));
    } catch (e) { allowed = false; }
    if (allowed) {
      res.setHeader('access-control-allow-origin', origin);
      res.setHeader('vary', 'origin');
      res.setHeader('access-control-allow-headers', 'authorization, content-type');
      res.setHeader('access-control-allow-methods', 'GET, POST, DELETE, OPTIONS');
      res.setHeader('access-control-max-age', '600');
    }
  }
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if (!p.startsWith('/api/')) return serveStatic(req, res, p);

  /* Explicit demo mode grants only a student session on selected read/AI
     paths. Loopback and Host/forwarding headers can never grant admin. */
  let sess = await sessionOfAsync(req);
  let openSession = false;
  if (!sess && OPEN_MODE && req.method !== 'OPTIONS') {
    const publicRead = ['/api/content', '/api/ai/cache', '/api/auth/me'];
    const isRead = req.method === 'GET' && publicRead.indexOf(p) !== -1;
    const isAi = req.method === 'POST' && /^\/api\/ai\/(solve|read-image)$/.test(p);
    if (isRead || isAi) { sess = OPEN_STUDENT_SESSION; openSession = true; }
  }

  try {
    if (process.env.UPAY_AI_ENABLED === 'false' && req.method === 'POST' && /^\/api\/ai\/(solve|read-image|translate)$/.test(p)) {
      return json(res, 503, {code:'ai_disabled', error:'AI is temporarily switched off by the administrator. Study material is still available.'});
    }
    // The linked Supabase project currently permits unverified self-signup.
    // Restrict provider-spending calls from Supabase accounts to an explicit
    // server-side allowlist. Admin-created local accounts retain their roles.
    if (sess && sess.sb && req.method === 'POST' && /^\/api\/ai\/(solve|read-image|translate)$/.test(p) && !isAllowedForPaidAI(sess.id)) {
      return json(res, 403, { error: 'AI access is not enabled for this account. Contact the site administrator.' });
    }
    /* ---------- auth ---------- */
    if (p === '/api/auth/login' && req.method === 'POST') {
      const b = await readBody(req);
      const ip = clientIp(req);
      const uname = String(b.user || '').trim().toLowerCase();
      const ipKey = limitKey('ip', ip), userKey = limitKey('user', uname);

      /* check BEFORE hashing: a blocked request must not cost 120k rounds */
      const ipOk = limitCheck(ipKey, LOGIN_MAX_IP);
      const userOk = limitCheck(userKey, LOGIN_MAX_USER);
      if (!ipOk.ok || !userOk.ok) {
        const wait = Math.max(ipOk.retryAfter || 0, userOk.retryAfter || 0);
        audit(uname, 'login-blocked', 'rate limit');
        return json(res, 429, {
          error: 'Too many sign-in attempts. Try again in ' + Math.ceil(wait / 60) + ' minute(s).',
          retryAfter: wait
        });
      }

      const usr = db.users.find(function (x) { return x.user === uname; });
      if (!usr || !verifyPw(b.password, usr)) {
        limitHit(ipKey); limitHit(userKey);
        audit(uname, 'login-failed');
        return json(res, 401, { error: 'Wrong username or password.' });
      }
      /* a good password clears the account's counter but not the IP's: an
         attacker with one valid account must not reset the address budget */
      loginFails.delete(userKey);
      const token = newSession(usr);
      audit(usr.user, 'login', usr.role);
      return json(res, 200, {
        token: token,
        user: { user: usr.user, role: usr.role, name: usr.name, mustChange: !!usr.mustChange }
      });
    }

    /* ---------- public: student self-signup ----------
       Deliberately narrow: a student can only ever create a STUDENT account,
       the code must match, and the rate limits that protect login protect this
       too -- otherwise the signup form becomes the way to brute-force the code
       and to create thousands of accounts. */
    if (p === '/api/auth/signup' && req.method === 'POST') {
      const ip = clientIp(req);
      const ipKey = limitKey('signup', ip);
      const ipOk = limitCheck(ipKey, 8);
      if (!ipOk.ok) {
        return json(res, 429, { error: 'Too many sign-up attempts from this device. Try again in '
          + Math.ceil((ipOk.retryAfter || 60) / 60) + ' minute(s).', retryAfter: ipOk.retryAfter });
      }
      if (!db.settings.signupOpen) {
        return json(res, 403, { error: 'Sign-up is closed. Ask your teacher for an account.' });
      }
      const b = await readBody(req);
      const code = String(b.code || '').trim();
      const wanted = String(db.settings.signupCode || '').trim();
      /* constant-time compare so the code cannot be discovered by timing */
      let same = wanted.length > 0 && code.length === wanted.length;
      if (same) same = crypto.timingSafeEqual(Buffer.from(code), Buffer.from(wanted));
      if (!same) {
        limitHit(ipKey);
        audit(b.user, 'signup-bad-code');
        return json(res, 401, { error: 'That class code is not right. Check with your teacher.' });
      }
      const user = String(b.user || '').trim().toLowerCase();
      const name = String(b.name || '').trim();
      const pw = String(b.password || '');
      if (!/^[a-z0-9._-]{3,24}$/.test(user)) {
        return json(res, 400, { error: 'Username: 3-24 characters, letters, numbers, dot, dash or underscore.' });
      }
      if (pw.length < 8) return json(res, 400, { error: 'Password must be at least 8 characters.' });
      if (/^(admin|root|teacher|system)$/.test(user)) {
        return json(res, 400, { error: 'That username is reserved. Pick another.' });
      }
      if (db.users.some(function (x) { return x.user === user; })) {
        return json(res, 400, { error: 'That username is taken. Try another.' });
      }
      const rec = {
        id: uid('u'), user: user, role: 'student',
        name: name || user, ...hash(pw), mustChange: false, createdAt: now()
      };
      db.users.push(rec);
      audit(user, 'signup', 'self-registered with class code');
      saveDB();
      const token = newSession(rec);
      return json(res, 200, {
        token: token,
        user: { user: rec.user, role: rec.role, name: rec.name, mustChange: false }
      });
    }

    /* ---------- public: is sign-up open? (no secrets in this reply) ---------- */
    if (p === '/api/auth/signup-info' && req.method === 'GET') {
      return json(res, 200, {
        open: !!db.settings.signupOpen,
        note: String(db.settings.signupNote || '')
      });
    }

    /* Anonymous telemetry (no PII, no token required). Clients only send this
       if the user hasn't opted out. We keep a rolling 500-event ring in memory
       so the admin dashboard can show feature usage without tracking kids. */
    if (p === '/api/tel' && req.method === 'POST') {
      try {
        const b = await readBody(req);
        const ev = { t: now(), e: String(b.e || '?').slice(0,40), v: Number(b.v)||0, p: b.p && typeof b.p === 'object' ? b.p : {} };
        db.tel = db.tel || [];
        db.tel.push(ev);
        if (db.tel.length > 500) db.tel.splice(0, db.tel.length - 500);
        saveDB(); // use the same atomic, coalesced writer as every other update
      } catch (e) { /* never break the page for telemetry */ }
      return json(res, 200, { ok: true });
    }

    if (p === '/api/auth/me') {
      if (!sess) return json(res, 401, { error: 'no session' });
      const usr = db.users.find(function (x) { return x.id === sess.id; }) || {};
      return json(res, 200, { user: { user: sess.user, role: sess.role, name: sess.name, mustChange: !!usr.mustChange } });
    }

    if (p === '/api/auth/logout' && req.method === 'POST') {
      const h = req.headers['authorization'] || '';
      if (sess && !openSession && h.startsWith('Bearer ')) revoke(h.slice(7));
      return json(res, 200, { ok: true });
    }

    /* Silent renewal: called once per page load. A valid session gets a fresh
       30-day token, so an active student is never signed out; an expired or
       revoked one gets 401 and the page asks them to sign in. */
    if (p === '/api/auth/renew' && req.method === 'POST') {
      if (!sess) return json(res, 401, { error: 'no session' });
      const usr = db.users.find(function (x) { return x.id === sess.id; });
      if (!usr) return json(res, 401, { error: 'no session' });
      const previous = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      const token = newSession(usr);
      // A rotated token must not leave the old credential valid indefinitely.
      if (previous && previous !== token) revoke(previous);
      return json(res, 200, { token: token, user: { user: usr.user, role: usr.role, name: usr.name } });
    }

    if (p === '/api/auth/password' && req.method === 'POST') {
      if (openSession) return json(res, 403, { error: 'Sign in to change a password.' });
      const err = requireRole(sess); if (err) return json(res, 403, { error: err });
      const b = await readBody(req);
      const usr = db.users.find(function (x) { return x.id === sess.id; });
      if (!verifyPw(b.current, usr)) return json(res, 400, { error: 'Current password is wrong.' });
      if (!b.next || String(b.next).length < 8) return json(res, 400, { error: 'New password must be at least 8 characters.' });
      Object.assign(usr, hash(b.next)); usr.mustChange = false;
      usr.authVersion = Number(usr.authVersion || 0) + 1;
      audit(sess.user, 'password-changed'); saveDB(true);
      // Invalidate all previously issued tokens for this account, including
      // the current one; the user must sign in with the new password.
      return json(res, 200, { ok: true, signInAgain: true });
    }

    /* ---------- public content (any signed-in role) ---------- */
    /* ---------- the solved-answer cache, readable by the app ----------
       The browser hashes a bank question the same way and asks here first, so a
       question the teacher already paid for comes back instantly and offline. */
    if (p === '/api/ai/cache' && req.method === 'GET') {
      const err = requireRole(sess); if (err) return json(res, 401, { error: err });
      const owner = aiCacheOwner(sess), qq = u.query.q;
      if (qq) {
        const subject = String(u.query.subject || 'maths');
        const cls = Number(u.query.cls) || 10;
        // Never reuse explanations as answer keys for source-only subjects.
        if (subject === 'accountancy' || subject === 'computerized-accounting' || subject === 'economics' || (subject === 'english' && cls === 12)) return json(res, 200, { found: false });
        const lang = String(u.query.lang || 'en').slice(0, 2).toLowerCase();
        const k = aiCacheKey(sess, 'solve', subject, cls, lang, qq);
        const hit = db.aiCache[k];
        return json(res, 200, hit && hit.policyVersion === solvePolicy.VERSION && hit.owner === owner ? { found: true, answer: Object.assign({ cached: true }, hit) } : { found: false });
      }
      const keys = Object.keys(db.aiCache).filter(k => db.aiCache[k] && db.aiCache[k].owner === owner && db.aiCache[k].policyVersion === solvePolicy.VERSION && db.aiCache[k].kind !== 'translation');
      return json(res, 200, { count: keys.length, keys: keys });
    }

    if (p === '/api/content' && req.method === 'GET') {
      const err = requireRole(sess); if (err) return json(res, 401, { error: err });
      const kind = u.query.kind;
      var all = db.content;
      if (sess.role !== 'admin') {
        /* students and teachers see published items only — an unpublished
           generated question never reaches their browser */
        all = {
          books: db.content.books || [],
          papers: db.content.papers || [],
          notes: db.content.notes || [],
          ai: (db.content.ai || []).filter(function (q) { return q.published; })
        };
      }
      var out = kind ? (all[kind] || []) : all;
      return json(res, 200, { content: out, updatedAt: db.contentUpdatedAt || db.createdAt });
    }

    /* ---------- admin: content ---------- */
    if (p.startsWith('/api/admin/content') ) {
      const err = requireRole(sess, ['admin']); if (err) return json(res, 403, { error: err });

      if (p === '/api/admin/content' && req.method === 'GET') {
        return json(res, 200, { content: db.content });
      }
      if (p === '/api/admin/content' && req.method === 'POST') {
        const b = await readBody(req);
        const kind = String(b.kind || '');
        if (['books', 'papers', 'notes', 'ai'].indexOf(kind) === -1) return json(res, 400, { error: 'unknown kind' });
        const item = {
          id: uid(kind.slice(0, 2)),
          title: String(b.title || '').trim(),
          titleHi: String(b.titleHi || '').trim(),
          detail: String(b.detail || '').trim(),
          url: String(b.url || '').trim(),
          year: b.year ? Number(b.year) : null,
          level: String(b.level || '').trim(),     // Standard | Basic | ''
          set: String(b.set || '').trim(),
          addedAt: now(), addedBy: sess.user
        };
        if (!item.title) return json(res, 400, { error: 'A title is required.' });
        db.content[kind].unshift(item);
        db.contentUpdatedAt = now();
        audit(sess.user, 'content-add', kind + ': ' + item.title);
        saveDB();
        return json(res, 200, { item: item, content: db.content });
      }
      if (p === '/api/admin/content' && req.method === 'DELETE') {
        const b = await readBody(req);
        const kind = String(b.kind || '');
        if (!db.content[kind]) return json(res, 400, { error: 'unknown kind' });
        if (kind === 'ai') return json(res, 400, { error: 'Remove generated questions with /api/admin/ai/delete.' });
        const before = db.content[kind].length;
        db.content[kind] = db.content[kind].filter(function (x) { return x.id !== b.id; });
        db.contentUpdatedAt = now();
        audit(sess.user, 'content-remove', kind + ' ' + b.id);
        saveDB();
        return json(res, 200, { removed: before - db.content[kind].length, content: db.content });
      }
      if (p === '/api/admin/content/bulk' && req.method === 'POST') {
        const b = await readBody(req);
        const kind = String(b.kind || '');
        if (['books', 'papers', 'notes'].indexOf(kind) === -1) return json(res, 400, { error: 'unknown kind' });
        const rows = Array.isArray(b.items) ? b.items : [];
        const made = rows.map(function (r) {
          return {
            id: uid(kind.slice(0, 2)),
            title: String(r.title || '').trim(), titleHi: String(r.titleHi || '').trim(),
            detail: String(r.detail || '').trim(), url: String(r.url || '').trim(),
            year: r.year ? Number(r.year) : null, level: String(r.level || '').trim(),
            set: String(r.set || '').trim(), addedAt: now(), addedBy: sess.user
          };
        }).filter(function (x) { return x.title; });
        db.content[kind] = made.concat(db.content[kind]);
        db.contentUpdatedAt = now();
        audit(sess.user, 'content-bulk', kind + ' x' + made.length);
        saveDB();
        return json(res, 200, { added: made.length, content: db.content });
      }
    }

    /* ---------- admin: users ---------- */
    if (p === '/api/admin/users' && req.method === 'GET') {
      const err = requireRole(sess, ['admin']); if (err) return json(res, 403, { error: err });
      return json(res, 200, {
        users: db.users.map(function (x) {
          return { id: x.id, user: x.user, role: x.role, name: x.name, createdAt: x.createdAt, mustChange: !!x.mustChange };
        })
      });
    }
    /* ---------- admin: sign-up settings ---------- */
    if (p === '/api/admin/signup' && req.method === 'GET') {
      const err = requireRole(sess, ['admin']); if (err) return json(res, 403, { error: err });
      return json(res, 200, {
        open: !!db.settings.signupOpen,
        code: String(db.settings.signupCode || ''),
        note: String(db.settings.signupNote || '')
      });
    }
    if (p === '/api/admin/signup' && req.method === 'POST') {
      const err = requireRole(sess, ['admin']); if (err) return json(res, 403, { error: err });
      const b = await readBody(req);
      if (b.open !== undefined) db.settings.signupOpen = !!b.open;
      if (b.code !== undefined) {
        const c = String(b.code || '').trim();
        if (db.settings.signupOpen && c.length < 4) {
          return json(res, 400, { error: 'Set a class code of at least 4 characters before opening sign-up.' });
        }
        db.settings.signupCode = c;
      }
      if (b.note !== undefined) db.settings.signupNote = String(b.note).slice(0, 120);
      if (b.open === true && !String(db.settings.signupCode || '').trim()) {
        db.settings.signupOpen = false;
        saveDB();
        return json(res, 400, { error: 'Set a class code first — otherwise anyone who finds the page can join.' });
      }
      audit(sess.user, 'signup-settings', (db.settings.signupOpen ? 'open' : 'closed'));
      saveDB();
      return json(res, 200, { open: !!db.settings.signupOpen, note: String(db.settings.signupNote || '') });
    }

    /* ---------- admin: create many students at once ----------
       One-at-a-time was the complaint. Each line is
         username, name, password(optional)
       and anything unparseable is reported back by line number rather than
       silently dropped -- a half-imported class list is worse than none. */
    if (p === '/api/admin/users/bulk' && req.method === 'POST') {
      const err = requireRole(sess, ['admin']); if (err) return json(res, 403, { error: err });
      const b = await readBody(req);
      const lines = String(b.text || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
      if (!lines.length) return json(res, 400, { error: 'Nothing to import.' });
      if (lines.length > 300) return json(res, 400, { error: 'That is more than 300 students in one go. Split the list.' });
      const made = [], problems = [];
      lines.forEach(function (line, i) {
        const parts = line.split(/[,\t]/).map(function (x) { return x.trim(); });
        const user = String(parts[0] || '').toLowerCase();
        const name = String(parts[1] || parts[0] || '').trim();
        const pw = String(parts[2] || '');
        if (!/^[a-z0-9._-]{3,24}$/.test(user)) { problems.push({ line: i + 1, why: 'bad username "' + parts[0] + '"' }); return; }
        if (pw && pw.length < 8) { problems.push({ line: i + 1, why: 'password under 8 characters' }); return; }
        if (db.users.some(function (x) { return x.user === user; })) { problems.push({ line: i + 1, why: '"' + user + '" already exists' }); return; }
        /* no password given: hand out a readable temporary one and force a
           change at first sign-in */
        const temp = pw || (user.slice(0, 3) + Math.random().toString(36).slice(2, 8));
        const rec = { id: uid('u'), user: user, role: 'student', name: name, ...hash(temp), mustChange: true, createdAt: now() };
        db.users.push(rec);
        made.push({ user: user, name: name, password: temp });
      });
      audit(sess.user, 'users-bulk', made.length + ' created');
      saveDB();
      return json(res, 200, { made: made, problems: problems });
    }

    if (p === '/api/admin/users' && req.method === 'POST') {
      const err = requireRole(sess, ['admin']); if (err) return json(res, 403, { error: err });
      const b = await readBody(req);
      const user = String(b.user || '').trim().toLowerCase();
      const role = String(b.role || 'student');
      if (!user || !b.password) return json(res, 400, { error: 'Username and password are required.' });
      if (['student', 'teacher', 'admin'].indexOf(role) === -1) return json(res, 400, { error: 'bad role' });
      if (db.users.some(function (x) { return x.user === user; })) return json(res, 400, { error: 'That username is taken.' });
      const rec = {
        id: uid('u'), user: user, role: role, name: String(b.name || user).trim(),
        ...hash(b.password), mustChange: true, createdAt: now()
      };
      db.users.push(rec);
      audit(sess.user, 'user-add', user + ' (' + role + ')');
      saveDB();
      return json(res, 200, { user: { id: rec.id, user: rec.user, role: rec.role, name: rec.name } });
    }
    if (p === '/api/admin/users' && req.method === 'DELETE') {
      const err = requireRole(sess, ['admin']); if (err) return json(res, 403, { error: err });
      const b = await readBody(req);
      /* accept either the internal id or the username — the UI has both */
      const rec = db.users.find(function (x) {
        return (b.id && x.id === b.id) || (b.user && x.user === String(b.user).toLowerCase());
      });
      if (!rec) return json(res, 404, { error: 'no such user' });
      if (rec.role === 'admin' && db.users.filter(function (x) { return x.role === 'admin'; }).length === 1)
        return json(res, 400, { error: 'The last admin cannot be removed.' });
      db.users = db.users.filter(function (x) { return x.id !== rec.id; });
      audit(sess.user, 'user-remove', rec.user);
      saveDB();
      return json(res, 200, { ok: true });
    }

    /* ---------- admin: API key ---------- */
    if (p === '/api/admin/key' && req.method === 'GET') {
      const err = requireRole(sess, ['admin']); if (err) return json(res, 403, { error: err });
      const ring = allKeys();
      return json(res, 200, {
        set: ring.length > 0,
        count: ring.length,
        keys: ring.map(function (k) {
          return { masked: k.slice(0, 6) + '…' + k.slice(-4), dead: !keyReady(k) };
        }),
        masked: ring.length ? ring[0].slice(0, 6) + '…' + ring[0].slice(-4) : '',
        length: ring.length ? ring[0].length : 0,
        model: db.settings.geminiModel
      });
    }
    if (p === '/api/admin/key' && req.method === 'POST') {
      const err = requireRole(sess, ['admin']); if (err) return json(res, 403, { error: err });
      const b = await readBody(req);

      /* changing only the model must not require re-pasting the key */
      if (b.model !== undefined && b.key === undefined) {
        db.settings.geminiModel = String(b.model);
        audit(sess.user, 'model-set', String(b.model)); saveDB();
        return json(res, 200, { set: allKeys().length > 0, count: allKeys().length, model: db.settings.geminiModel });
      }
      /* Removing ONE key from the ring. A revoked key (Google answers 401
         forever) otherwise costs every solve one wasted round-trip, and the
         only way to get rid of it was to clear the whole ring and re-paste the
         good ones -- which loses the order and is easy to get wrong. */
      if (b.remove !== undefined) {
        const want = String(b.remove || '').trim();
        const ring = keyRing();
        const keep = ring.filter(function (blob) {
          const k = open_(blob);
          if (!k) return false;
          if (k === want) return false;
          if (want.length >= 4 && k.slice(-4) === want) return false;   /* masked tail */
          const masked = k.slice(0, 6) + '\u2026' + k.slice(-4);
          if (masked === want) return false;
          return true;
        });
        if (keep.length === ring.length) return json(res, 404, { error: 'No key in the ring matches that.' });
        db.settings.geminiKeys = keep;
        db.settings.geminiKeySealed = null;
        audit(sess.user, 'key-remove', (ring.length - keep.length) + ' key(s), ring length ' + keep.length);
        saveDB();
        const nowRing2 = allKeys();
        return json(res, 200, { set: nowRing2.length > 0, removed: ring.length - keep.length, count: nowRing2.length,
          keys: nowRing2.map(function (k) { return { masked: k.slice(0, 6) + '\u2026' + k.slice(-4), dead: !keyReady(k) }; }),
          model: db.settings.geminiModel });
      }
      if (b.key === null || b.key === '') {
        db.settings.geminiKeys = [];
        db.settings.geminiKeySealed = null;
        if (b.model) db.settings.geminiModel = String(b.model);
        audit(sess.user, 'key-cleared'); saveDB();
        return json(res, 200, { set: false, count: 0, model: db.settings.geminiModel });
      }
      /* several keys may be pasted at once: one per line, or comma separated */
      const pasted = String(b.key || '').split(/[\s,]+/).map(function (x) { return x.trim(); }).filter(Boolean);
      if (!pasted.length) return json(res, 400, { error: 'No key given.' });
      if (pasted.some(function (k) { return k.length < 20; })) return json(res, 400, { error: 'That does not look like a Google API key.' });
      const ring = keyRing();
      let added = 0;
      pasted.forEach(function (k) {
        if (allKeys().indexOf(k) !== -1) return;          /* already have it */
        ring.push(seal(k)); added++;
      });
      db.settings.geminiKeys = ring;
      db.settings.geminiKeySealed = null;                 /* migrated into the ring */
      if (b.model) db.settings.geminiModel = String(b.model);
      audit(sess.user, 'key-set', added + ' key(s), ring length ' + ring.length); saveDB();
      const nowRing = allKeys();
      return json(res, 200, { set: nowRing.length > 0, added: added, count: nowRing.length,
        keys: nowRing.map(function (k) { return { masked: k.slice(0, 6) + '…' + k.slice(-4), dead: !keyReady(k) }; }),
        model: db.settings.geminiModel });
    }
    if (p === '/api/admin/key/test' && req.method === 'POST') {
      const err = requireRole(sess, ['admin']); if (err) return json(res, 403, { error: err });
      const plain = liveKeys();                 /* the whole ring; a capped key falls through */
      if (!plain.length) return json(res, 400, { error: 'No key stored yet.' });
      const body = await readBody(req);
      const model = (body && body.model) ? String(body.model) : db.settings.geminiModel;
      try {
        const out = await callGeminiResilient('Reply with exactly: OK', plain, model);
        return json(res, 200, { ok: true, model: out.model, reply: out.text.trim().slice(0, 60), tried: out.tried });
      } catch (e) {
        const msg = String(e.message || e);
        /* a retired model is a configuration problem, so name the way out */
        if (/404/.test(msg) && /no longer available|not found|not supported/i.test(msg)) {
          let alts = [];
          try { alts = await listModels(plain); } catch (_) { alts = []; }
          return json(res, 409, {
            error: 'The model "' + model + '" is not available to this key.',
            model: model,
            available: alts.slice(0, 40)
          });
        }
        return json(res, 502, { error: msg });
      }
    }

    /* which models this key can use, and which one we are pointed at */
    if (p === '/api/admin/key/models' && req.method === 'GET') {
      const err = requireRole(sess, ['admin']); if (err) return json(res, 403, { error: err });
      const plain = liveKeys();                 /* the whole ring; a capped key falls through */
      if (!plain.length) return json(res, 400, { error: 'No key stored yet.' });
      try {
        const all = await listModels(plain);
        return json(res, 200, { current: db.settings.geminiModel, models: all });
      } catch (e) { return json(res, 502, { error: String(e.message || e) }); }
    }

    /* ---------- admin: seed the agent's grounding index ---------- */
    if (p === '/api/ai/index' && req.method === 'POST') {
      const err = requireRole(sess, ['admin']); if (err) return json(res, 403, { error: err });
      const b = await readBody(req);
      const rows = Array.isArray(b.index) ? b.index : [];
      db.content.pyqIndex = rows.slice(0, 500).map(function (q) {
        return { id: String(q.id || ''), ch: Number(q.ch) || 0, en: String(q.en || '').slice(0, 240) };
      });
      db.contentUpdatedAt = now();
      audit(sess.user, 'bank-index', db.content.pyqIndex.length + ' questions');
      saveDB();
      return json(res, 200, { stored: db.content.pyqIndex.length });
    }

    /* ---------- admin: generated questions ---------- */
    if (p === '/api/admin/ai/publish' && req.method === 'POST') {
      const err = requireRole(sess, ['admin']); if (err) return json(res, 403, { error: err });
      const b = await readBody(req);
      const list = db.content.ai || [];
      const hit = list.find(function (q) { return q.id === b.id; });
      if (!hit) return json(res, 404, { error: 'no such generated question' });
      hit.published = b.published !== false;
      hit.publishedAt = hit.published ? now() : null;
      db.contentUpdatedAt = now();
      audit(sess.user, hit.published ? 'ai-publish' : 'ai-unpublish', b.id);
      saveDB();
      return json(res, 200, { item: hit, content: db.content });
    }
    if (p === '/api/admin/ai/delete' && req.method === 'POST') {
      const err = requireRole(sess, ['admin']); if (err) return json(res, 403, { error: err });
      const b = await readBody(req);
      const before = (db.content.ai || []).length;
      db.content.ai = (db.content.ai || []).filter(function (q) { return q.id !== b.id; });
      db.contentUpdatedAt = now();
      audit(sess.user, 'ai-delete', String(b.id));
      saveDB();
      return json(res, 200, { removed: before - db.content.ai.length, content: db.content });
    }

    /* ---------- admin: audit ---------- */
    if (p === '/api/admin/audit' && req.method === 'GET') {
      const err = requireRole(sess, ['admin']); if (err) return json(res, 403, { error: err });
      return json(res, 200, { audit: db.audit.slice(0, 200) });
    }


    /* ---------- AI: read a question out of a photo ---------- */
    /* Takes a base64 image, returns ONLY the question text (transcribed) plus
       any diagram description. The solve step is kept separate so the student
       can correct a mis-read digit before anything is worked out. */
    if (p === '/api/ai/read-image' && req.method === 'POST') {
      const err = requireRole(sess, ['student', 'teacher', 'admin']); if (err) return json(res, 403, { error: err });
      const plain = liveKeys();                 /* the whole ring; a capped key falls through */
      if (!plain.length) return json(res, 400, { error: 'The admin has not added a Google API key yet.', fallback: true });
      /* a base64 photo is far bigger than the 1 MB default: the client shrinks
         it to ~1600 px, which still lands around 300 KB – 2 MB. Without this
         the body reader destroyed the socket and the UI said "no connection". */
      let b;
      try { b = await readBody(req, 9 * 1024 * 1024); }
      catch (e) {
        return json(res, 413, { error: 'That photo is too large — try one under about 6 MB, or take it again closer to the print.' });
      }
      const data = String(b.data || '');
      const mime = String(b.mime || 'image/jpeg');
      if (!data || data.length < 200) return json(res, 400, { error: 'No readable image was sent.' });
      if (!/^image\/(jpeg|jpg|png|webp|heic)$/i.test(mime)) return json(res, 400, { error: 'Send a JPG, PNG or WEBP photo.' });
      /* ~6 MB of base64 is a generous phone photo; refuse anything wilder */
      if (data.length > 8 * 1024 * 1024) return json(res, 413, { error: 'That photo is too large — try one under 5 MB.' });
      const prompt = [
        'You are reading a photograph of an Indian school question. Identify its actual subject rather than assuming mathematics.',
        'Transcribe the question EXACTLY as printed, including table headings, dates, amounts and debit/credit labels. Rules:',
        '- Output only the question text, no preamble, no answer, no commentary.',
        '- Keep every number, sign, unit and symbol exactly as printed.',
        '- Write exponents as x^2 and roots as sqrt(...). Use / for fractions.',
        '- If the photo contains several questions, transcribe only the one that is fully visible and most prominent; if none is clear, output exactly: UNREADABLE',
        '- If a diagram is part of the question, add a final line starting "DIAGRAM:" describing it in one sentence.'
      ].join('\n');
      try {
        const out = await callGeminiResilient(prompt, plain, db.settings.geminiModel,
          { mime: mime === 'image/jpg' ? 'image/jpeg' : mime, data: data });
        const text = String(out.text || '').trim();
        if (!text || /^UNREADABLE/i.test(text)) {
          return json(res, 200, { ok: false, error: 'I could not read that photo clearly. Try again with more light, or type the question.', model: out.model });
        }
        const diagIdx = text.search(/^DIAGRAM:/im);
        const question = (diagIdx === -1 ? text : text.slice(0, diagIdx)).trim();
        const diagram = diagIdx === -1 ? '' : text.slice(diagIdx).replace(/^DIAGRAM:/im, '').trim();
        db.aiLog.push({ at: now(), user: sess.user, kind: 'read-image', chars: question.length, model: out.model });
        saveDB();
        return json(res, 200, { ok: true, question: question, diagram: diagram, model: out.model });
      } catch (e) {
        const msg = String(e.message || e);
        const busy = /503|overload|high demand/i.test(msg);
        const limited = /429|quota|rate/i.test(msg);
        return json(res, 200, {
          ok: false, fallback: true, rateLimited: !!limited,
          error: limited ? 'The free AI quota for today is used up. The built-in solver below still works offline — or add a fresh API key in Admin → AI.'
               : busy ? 'The AI model is busy at the moment. Try again shortly.'
               : 'Could not reach the AI. Check your connection and try again.'
        });
      }
    }

    /* ---------- AI: translate one question line ----------
       Used to fill the Hindi that the imported papers never carried. Only the
       QUESTION is translated: the maths stays in symbols, and a translated
       number is exactly the kind of error that teaches the wrong thing. */
    if (p === '/api/ai/translate' && req.method === 'POST') {
      const err = requireRole(sess, ['student', 'teacher', 'admin']); if (err) return json(res, 403, { error: err });
      const plain = liveKeys();
      if (!plain.length) return json(res, 400, { error: 'No API key set.', fallback: true });
      const b = await readBody(req);
      const text = String(b.text || '').trim();
      if (text.length < 3) return json(res, 400, { error: 'Nothing to translate.' });
      if (text.length > 900) return json(res, 400, { error: 'Too long to translate in one go.' });
      const k = aiCacheKey(sess, 'translation', '', 0, 'hi', text);
      if (db.aiCache[k] && db.aiCache[k].owner === aiCacheOwner(sess) && db.aiCache[k].hi) return json(res, 200, { hi: db.aiCache[k].hi, cached: true });
      const prompt = [
        'Translate this CBSE Class 10 Mathematics question into natural Hindi, as an Indian',
        'textbook writes it. Keep every number, symbol, unit and formula EXACTLY as given —',
        'do not translate or round numerals, and keep √ π θ ° ∠ ⇒ and algebraic expressions',
        'unchanged. Do not add explanation, do not solve it. Reply with ONLY this JSON:',
        '{"hi":"<the question in Hindi>"}',
        '',
        'QUESTION: ' + text
      ].join('\n');
      try {
        const out = await callGeminiResilient(prompt, plain, db.settings.geminiModel);
        let parsed;
        try { parsed = firstJSON(out.text); } catch (e1) { parsed = firstJSON(repairNumericDots(out.text)); }
        const hi = String((parsed && parsed.hi) || '').trim();
        if (!hi) return json(res, 200, { error: 'no translation returned' });
        db.aiCache[k] = { owner: aiCacheOwner(sess), at: now(), model: out.model, hi: hi, kind: 'translation' };
        saveDB();
        return json(res, 200, { hi: hi, model: out.model });
      } catch (e) {
        const msg = String(e.message || e);
        let retryAfter = 0;
        const m = msg.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
        if (m) retryAfter = Math.ceil(Number(m[1]));
        return json(res, 502, { error: 'translation failed', rateLimited: /\b429\b/.test(msg), retryAfter: retryAfter });
      }
    }

    /* ---------- AI: solve a typed question, several ways, with a diagram ---------- */
    if (p === '/api/ai/solve' && req.method === 'POST') {
      const err = requireRole(sess, ['student', 'teacher', 'admin']); if (err) return json(res, 403, { error: err });
      const plain = liveKeys();                 /* the whole ring; a capped key falls through */
      const b = await readBody(req);
      const question = String(b.question || '').trim();
      if (question.length < 3) return json(res, 400, { error: 'Type a question first.' });

      /* A question that lost its maths in extraction is a DIFFERENT question.
         Answering it and showing the result as verified would be the exact
         failure this app is built to avoid, so say so and draw nothing. */
      const torn = b.imported ? corrupt.why(question, Number(b.options) || 0) : null;
      if (torn) {
        return json(res, 200, {
          ok: false, torn: true, reason: torn,
          error: 'This question did not come through the PDF intact (' + torn + '). '
               + 'A fraction or symbol was lost, so it is not the question that was printed. '
               + 'Nothing was solved, because a wrong answer shown as verified is worse than none.'
        });
      }

      /* Already solved?  Return it.  The cache key is scoped by subject because
         the SAME text ("draw a diagram") means completely different things in
         maths vs chemistry, and we never want the old cached maths diagram
         (the bug: a cylinder r=2 h=4 under a balancing question) to leak into
         a chemistry answer. */
      const subjectRouting = taskRouting.resolve(question, String(b.selectedSubject || b.subject || 'maths'));
      const subject = subjectRouting.subject;
      if (subjectRouting.language) b.lang = subjectRouting.language;
      if (subjectRouting.changed) b.chapter = 0;
      const cls = Number(b.cls) || 10;
      const exact = ['maths','applied-maths'].includes(subject) && require('./assets/js/square-integers.js').solve(question, b.lang);
      if (exact) return json(res, 200, Object.assign({subjectRouting},exact));
      const isAccountancy = subject === 'accountancy' || subject === 'computerized-accounting';
      const isEconomics = subject === 'economics';
      const isEnglish12 = subject === 'english' && cls === 12;
      const noOfficialKey = isAccountancy || isEconomics || isEnglish12 || subjectRouting.task === 'writing' || ['social','hindi','english','sanskrit'].includes(subject);
      const qLang = String(b.lang || 'en').slice(0, 2).toLowerCase();
      const cacheKey = aiCacheKey(sess, 'solve', subject, cls, qLang, question);
      // Do not reuse cached replies for subjects without an official key.
      if (!noOfficialKey && db.aiCache[cacheKey] && db.aiCache[cacheKey].policyVersion === solvePolicy.VERSION && db.aiCache[cacheKey].owner === aiCacheOwner(sess) && !b.refresh) {
        const hit = db.aiCache[cacheKey];
        hit.cached = true;
        return json(res, 200, hit);
      }

      if (!plain.length) return json(res, 400, { error: 'The admin has not added a Google API key yet, so the AI solver is off.', fallback: true });

      /* a little grounding from the real bank, so the style matches CBSE */
      const ch = Number(b.chapter) || 0;
      // This index contains Class 10 maths only; never ground another subject
      // or class with unrelated examples.
      const idx = subject === 'maths' && cls === 10 ? (db.content.pyqIndex || []) : [];
      const near = (ch ? idx.filter(function (q) { return q.ch === ch; }) : idx).slice(0, 6)
        .map(function (q) { return '- ' + q.en; }).join('\n');

      /* Per-subject prompts.  The shape of the answer is always the same JSON,
         but:
          - For Maths we draw honest geometric/mensuration figures.
          - For Science we branch on chemistry/physics/biology context and
            draw apparatus/optics/circuits/cells/leaves instead of solids.
          - Conceptual flow diagrams are available for every subject; physical
            figure types remain subject-specific.                                                       */
      const isSci = ['science', 'physics', 'chemistry', 'biology'].includes(subject);
      const isMaths = ['maths', 'applied-maths'].includes(subject);
      const isLang = subject === 'hindi' || subject === 'english' || subject === 'sanskrit';
      const isSocial = subject === 'social';

      const mathsPrompt = [
        'You are an experienced CBSE Class ' + cls + ' Mathematics teacher. A student has typed the question below.',
        'Solve THAT question — the one actually asked. Never substitute a similar question you have seen before.',
        'Reply with ONLY this JSON shape:',
        '{"question_understood":"<restate the question in one line>",',
        ' "answer":"<final answer, short, with units>",',
        ' "summary":"<2 sentences: what the problem is about, and the idea that unlocks it>",',
        ' "approaches":[{"name":"<method>","tag":"<when to use it>",',
        '   "steps":[{"t":"<what to do>","m":"<the actual working, one maths line>","note":"<why / common slip, optional>"}],',
        '   "why":"<why it works>","watch":"<common mistake>"}],',
        ' "check":"<how to verify the answer>",',
        ' "diagram":{"type":"plane|triangle|circle|bars|solid","points":[...],"circles":[...],"segments":[...],"bars":[...],"parts":[...],"labels":[...],"caption":"..."}}',
        'Rules:',
        '- Give at least 4 genuinely different approaches. Same working under two labels is forbidden.',
        '- Every step shows real working with the question\'s own numbers.',
        '- Verify arithmetic before writing. No unique answer? Say so in "answer".',
        '- Use · for decimals, √ π θ ° ∠ △ ⇒ as needed.',
        '- Include an honest diagram when it helps explain the question.',
        '- diagram.type="solid" ONLY for mensuration questions that actually mention a solid (cylinder/cone/hemisphere/sphere/frustum/cuboid) AND give r/h/side.',
        '  List stacked parts bottom-first in "parts", e.g. a cone on a cylinder = [{"shape":"cylinder","r":3,"h":10},{"shape":"cone","r":3,"h":4}].',
        '  When the solid isn\'t named or numbers aren\'t given, DO NOT invent a cylinder — return diagram:null instead.',
        '- Plane geometry: use "points" + "segments" with real coordinates.',
        '- Circles/tangents/chords: use "circles" with real radius + "segments".',
        '- Trig/heights: put the right-triangle vertices in "points" and label the angle.',
        '- Statistics: use "bars" with the real frequencies.'
      ];

      const sciencePrompt = [
        'You are an experienced CBSE Class ' + cls + ' Science teacher (Physics / Chemistry / Biology). Answer the question the student asked.',
        'Reply with ONLY this JSON shape:',
        '{"question_understood":"<restate in one line>",',
        ' "answer":"<short final answer with units where needed>",',
        ' "summary":"<2 sentences on what this is testing and the key idea>",',
        ' "approaches":[{"name":"<method>","tag":"<when to use it>",',
        '   "steps":[{"t":"<what to do/explain>","m":"<any formula/equation/chemical-equation","note":"<common slip, optional>"}],',
        '   "why":"<why this reasoning is valid>","watch":"<typical student mistake>"}],',
        ' "check":"<how to verify>",',
        ' "diagram":<either null (no figure needed) OR a figure object below>}',
        'Rules:',
        '- Give at least 4 genuinely different approaches. Many theory questions have one honest route; give just that.',
        '- Numericals: show every substitution with units. Balance every equation atom-by-atom.',
        '- Chemical equations: use → for yields, ↑/↓ for gas/precipitate when appropriate. Balance atoms on BOTH sides.',
        '- Hindi NOT needed — English only.',
        '- Return a "diagram" ONLY when the question is about something that has a diagram, namely:',
        '  • Ray optics (lenses/mirrors): {"type":"lens","lens":"convex|concave","caption":"..."} or {"type":"mirror","mirror":"concave|convex|plane","caption":"..."}.',
        '  • Electric circuits: {"type":"circuit","caption":"..."} (we draw a battery + resistor series; add switches/labels if asked).',
        '  • Mechanics (force/pendulum/inclined plane/pulleys): {"type":"pulley","mechanism":"incline|pendulum|pulley","caption":"..."}.',
        '  • Chemistry apparatus (test tubes / flasks / beakers / burners, e.g. electrolysis, reactions that are heated, gas collection): {"type":"apparatus","parts":[{"kind":"beaker|flask|test-tube|burner","label":"...","fillLevel":0.0-1.0,"color":"#hex"}],"caption":"..."}.',
        '- For theory without a meaningful supported graphical setup, use diagram:null, not empty apparatus or a generic balance. For copper electrolytic refining use the copper-refining schema from the shared policy.',
        '  • Biology diagrams (leaf / cell / flower / heart): {"type":"bio","kind":"leaf|cell|flower|organ","caption":"..."}.',
        '- For theory without apparatus, use a conceptual flow diagram when helpful.',
        '- NEVER set diagram.type to "solid", "composite", "plane", "triangle", "circle", or "bars" for Chemistry or Biology — those are Maths/graph shapes and WILL BE REJECTED by the client.',
        '  * "plane/triangle/circle/bars" is ONLY allowed for Physics questions where the question is explicitly about a ray diagram, a force triangle, a lens, a circuit, or a mechanics setup — in which case prefer the specialized types ("lens","mirror","circuit","pulley","pendulum") over raw points/segments.',
        '- NEVER set diagram.type to "solid" or "composite" for science — cylinders/cones/spheres are Maths mensuration shapes and have no place in a chemistry or biology answer.'
      ];

      const socialPrompt = [
        'You are an experienced CBSE Class ' + cls + ' Social Science teacher (History / Geography / Civics / Economics). Answer the question asked.',
        'Reply with ONLY this JSON shape:',
        '{"question_understood":"...","answer":"<short answer>","summary":"<2 sentences>","approaches":[{"name":"<angle>","tag":"<when to use>","steps":[{"t":"<point>"}],"why":"...","watch":"..."}],"check":"...","diagram":null}',
        'Rules: At least 4 approaches (causes / effects / constitutional article / map-location angle). Use dates and article numbers accurately. Use a conceptual flow diagram when helpful. Hindi not needed.'
      ];

      const langPrompt = [
        'You are an experienced CBSE Class ' + cls + ' ' + subject + ' teacher. Answer the literature/grammar question asked.',
        'Reply with ONLY this JSON shape:',
        '{"question_understood":"...","answer":"<short answer / भावार्थ / व्याकरण स्पष्टीकरण>","summary":"<2 sentences>","approaches":[{"name":"<विधि / angle>","tag":"<when to use>","steps":[{"t":"<point / स्पष्टीकरण>"}],"why":"...","watch":"..."}],"check":"...","diagram":null}',
        'Rules: At least 4 approaches (सप्रसंग व्याख्या / भावार्थ / व्याकरण-विश्लेषण / सन्दर्भ-सहित-उत्तर). Hindi/Sanskrit may appear in "answer" if the question is in that language; explanations match the language the student used. Use a conceptual flow diagram when helpful.'
      ];

      const accountancyPrompt = [
        'You are a CBSE Class ' + cls + ' ' + (subject === 'computerized-accounting' ? 'Computerised Accounting' : 'Accountancy') + ' teacher.',
        'Answer only the question as printed; do not assume missing values, fabricate an official key, or silently change a date or amount.',
        'If an OR is present, handle each alternative separately and label it. If the text is incomplete, state what is missing.',
        'Show relevant accounting calculations and journal entries with clear debit and credit amounts; for spreadsheet/computer questions use the given syntax precisely.',
        'Do not invent facts or numerical data. State assumptions and uncertainty explicitly.',
        'Reply with ONLY JSON: {"question_understood":"...","answer":"...","summary":"...","approaches":[{"name":"...","tag":"...","steps":[{"t":"...","m":"..."}],"why":"...","watch":"..."}],"check":"...","diagram":null}'
      ];
      const economicsPrompt = [
        'You are an Economics teacher answering a Class ' + cls + ' question.',
        'Answer only what is asked, in the language the student used. State assumptions, units, definitions and limitations where relevant; do not invent figures or an official marking scheme.',
        'Do not claim to have read or quoted a textbook unless its text is supplied in the question. Do not invent facts or numerical data.',
        'Reply with ONLY JSON: {"question_understood":"...","answer":"...","summary":"...","approaches":[{"name":"...","tag":"...","steps":[{"t":"...","m":"..."}],"why":"...","watch":"..."}],"check":"...","diagram":null}'
      ];
      const english12Prompt = [
        'You are an English literature and language teacher answering a Class 12 question.',
        'Answer the question asked in the language the student used. Support interpretations with the supplied text where possible; acknowledge ambiguity.',
        'The textbook PDFs are not automatically supplied to you. Do not claim to have read, quoted or checked them unless the passage is actually in the question. If a precise extract is needed, ask the student to provide it.',
        'Do not invent quotations, missing details, official marking schemes or numerical data. State uncertainty where needed.',
        'Reply with ONLY JSON: {"question_understood":"...","answer":"...","summary":"...","approaches":[{"name":"...","tag":"...","steps":[{"t":"..."}],"why":"...","watch":"..."}],"check":"...","diagram":null}'
      ];
      let topicPrompt;
      if (isAccountancy) topicPrompt = accountancyPrompt;
      else if (isEconomics) topicPrompt = economicsPrompt;
      else if (isEnglish12) topicPrompt = english12Prompt;
      else if (isMaths) topicPrompt = mathsPrompt;
      else if (isSci) topicPrompt = sciencePrompt;
      else if (isSocial) topicPrompt = socialPrompt;
      else if (isLang) topicPrompt = langPrompt;
      else topicPrompt = ['Answer the supplied Class ' + cls + ' ' + subject + ' question without inventing missing information.',
        'Reply with JSON: {"question_understood":"...","answer":"...","summary":"...","approaches":[{"name":"...","steps":[{"t":"..."}]}],"check":"...","diagram":null}'];

      const prompt = topicPrompt.concat([solvePolicy.instructions,
        '',
        'QUESTION: ' + question,
        near ? ('\nFor calibration — real CBSE questions of the same chapter (do not answer these):\n' + near) : ''
      ]).filter(Boolean).join('\n');

      let out;
      const solveController = new AbortController();
      const callOptions = {deadline:Date.now()+50000, signal:solveController.signal};
      const solveTimer = setTimeout(()=>solveController.abort(), 50000);
      try {
        out = await solveRuntime.callGeminiResilient(prompt, plain, db.settings.geminiModel, null, callOptions);
        let draft;
        try { draft = firstJSON(out.text); } catch (_) { draft = null; }
        if (draft && solvePolicy.completeApproaches(draft, question).length < 4) {
          out = await solveRuntime.callGeminiResilient(solvePolicy.repairPrompt(prompt, draft), plain, out.model, null, callOptions);
        }
      } catch (e) {
        audit(sess.user, 'solve-error', String(e.message).slice(0, 140));
        saveDB();
        const failure = solveFailure(e);
        if (failure.body.retryAfter) res.setHeader('retry-after', String(failure.body.retryAfter));
        return json(res, failure.http, failure.body);
      } finally {
        clearTimeout(solveTimer);
        solveController.abort();
      }
      let parsed;
      try {
        try { parsed = firstJSON(out.text); }
        catch (eStrict) {
          /* second chance: the model wrote a middle dot inside a number */
          try { parsed = firstJSON(repairNumericDots(out.text)); }
          catch (e2) {
            /* third chance: it forgot a closing bracket. Recover the reply
               rather than bin a complete solution over punctuation. */
            parsed = firstJSON(repairStructure(repairNumericDots(out.text)));
            if (parsed && parsed.approaches) parsed._repaired = 'brackets';
          }
        }
      }
      catch (e) {
        audit(sess.user, 'solve-badjson', question.slice(0, 100));
        saveDB();
        /* keep the offending reply, so this failure can be diagnosed from what
           the model said instead of guessed at */
        try {
          fs.writeFileSync(path.join(DATA, 'last-bad-json.txt'),
            'question: ' + question + '\nreason: ' + e.message +
            '\nlength: ' + String(out.text || '').length +
            '\n--- raw ---\n' + out.text);
        } catch (e2) {}
        return json(res, 502, { error: 'The model did not return usable JSON. Try rephrasing.', fallback: true });
      }

      const steps = (arr) => (Array.isArray(arr) ? arr : []).map(function (st) {
        return { t: String((st && st.t) || ''), m: String((st && st.m) || ''), note: String((st && st.note) || '') };
      }).filter(function (st) { return st.t; });

      const answer = {
        source: 'ai', subjectRouting, policyVersion: solvePolicy.VERSION,
        model: out.model,
        questionUnderstood: String(parsed.question_understood || ''),
        result: String(parsed.answer || ''),
        summary: String(parsed.summary || ''),
        verify: String(parsed.check || ''),
        approaches: solvePolicy.completeApproaches(parsed, question).map(function (a) {
          return {
            format: solvePolicy.proseTask(question) ? 'prose' : '', name: String(a.name || 'Method'),
            tag: String(a.tag || ''),
            steps: steps(a.steps),
            why: String(a.why || ''),
            watch: String(a.watch || '')
          };
        }).filter(function (a) { return a.steps.length; }),
        diagram: solvePolicy.diagramForSubject(parsed.diagram, subject),
        conceptDiagram: solvePolicy.conceptDiagram(parsed.conceptDiagram)
      };

      if (!answer.approaches.length) return json(res, 502, { error: 'The model returned no solvable steps. Try rephrasing.', fallback: true });

      if (answer.approaches.length < 4) return json(res, 502, {
        error: 'The AI could not provide four distinct usable approaches. Please try again.', fallback: true
      });
      answer.methodCount = answer.approaches.length;

      /* Did the model quietly REWRITE the question before answering it?
         On broken imports it says things like "assuming the printed sequence
         15 1, ... should be 15, 12, 9" or "assuming standard typo x² for x" and
         then answers the question it wishes had been printed. That is not a
         solution to the question in front of the student -- it is an invention
         presented with a full worked solution. Refuse it instead. */
      /* "given that √3 is irrational" / "assuming √3 is irrational" is ordinary
         CBSE wording -- the giveaway is the model repairing the QUESTION, so the
         pattern requires a repair verb: typo, notation, sequence, intended. */
      const DOCTOR = /\bassuming[^.]{0,40}\b(typo|notation|printed|intended|missing|should be|error|based on context|context)\b|\binterpreting[^.]{0,30}\b(typo|notation|as)\b|\bthe intended (question|value|sequence|equation)\b|\bappears to be a typo\b|\b(standard|likely|probably) (typo|meant)\b|\blikely meant\b|\bprobably meant\b/i;
      /* The model declining to answer, dressed up as an answer.  "No specific
         numerical question was asked", "Cannot be determined (incomplete
         question)", "None; the user provided no options" -- these are the model
         saying the question is broken, and must be refused rather than cached. */
      const NON_ANSWER = /\bno (specific )?(numerical )?question (was )?asked\b|\bno options (were )?provided\b|\bthe user provided no\b|\bincomplete question\b|\bcannot be determined since\b|\bnot enough information (is )?(given|provided)\b|\bthe question (is )?(incomplete|unclear|ambiguous)\b/i;
      const doctored = DOCTOR.test(String(answer.questionUnderstood || '')) || DOCTOR.test(String(answer.result || ''))
                    || NON_ANSWER.test(String(answer.result || '')) || NON_ANSWER.test(String(answer.questionUnderstood || ''));
      if (doctored) {
        audit(sess.user, 'ai-solve-refused', question.slice(0, 60) + ' [rewrote the question]');
        return json(res, 200, {
          ok: false, torn: true, reason: 'the model had to rewrite the question to answer it',
          error: 'This question did not come through the PDF intact — the solver could only answer '
               + 'a version of it that it made up. Nothing was solved, because a fabricated answer '
               + 'shown as a solution is worse than none.'
        });
      }

      /* ---- second pass: another call checks the first one, so a wrong
             answer is caught before the student ever sees it ---- */
      let check = noOfficialKey
        ? { state: 'unchecked', note: 'AI-generated; not checked against an official answer key.' }
        : { state: 'unchecked' };

      /* ---- first: settle the answer by arithmetic, not by opinion ----
         The model-checking pass proved unreliable in both directions on this
         bank: it blessed k = 6 (correct k = 3) and rejected five correct
         answers. Where the numbers in the question can be read, the answer is
         computed here and this verdict is final. The model is only asked when
         arithmetic cannot settle it -- and even then a disagreement can never
         turn a correct answer into a FAIL, it only downgrades "verified" to
         "unchecked", which is what you asked for. */
      const decided = noOfficialKey ? null : grader.check(question, answer.result);
      if (decided && decided.state === 'wrong') {
        check = { state: 'disputed', source: 'arithmetic',
                  note: 'worked out independently: ' + (Array.isArray(decided.answer) ? decided.answer.join(', ') : decided.answer) + ' (' + decided.how + ')',
                  yourAnswer: Array.isArray(decided.answer) ? decided.answer.join(', ') : String(decided.answer),
                  confidence: 'high', blocking: true };
      } else if (decided && decided.state === 'verified') {
        check = { state: 'verified', source: 'arithmetic',
                  note: 'recomputed independently: ' + (Array.isArray(decided.answer) ? decided.answer.join(', ') : decided.answer) + ' (' + decided.how + ')',
                  yourAnswer: Array.isArray(decided.answer) ? decided.answer.join(', ') : String(decided.answer),
                  confidence: 'high' };
      }

      if (!noOfficialKey && check.state === 'unchecked' && b.verify !== false) {
        /* only reached when NO arithmetic check could settle the question;
           that is the sole case where a model opinion is allowed to count. */
        try {
          const v = await verifyWithAI(question, answer.result, plain, out.model);
          const agree = answersAgree(answer.result, v.yourAnswer);
          if (v.correct && agree !== false) {
            check = { state: 'verified', note: v.reason || '', yourAnswer: v.yourAnswer };
          } else if (v.correct && agree === null) {
            /* proof-style answer: the second pass agrees the reasoning holds,
               but there is no number to compare. Say exactly that. */
            check = { state: 'passed', note: v.reason || 'reasoning agreed; no numeric answer to compare', yourAnswer: v.yourAnswer };
          } else if (!v.correct || agree === false) {
            /* A second MODEL disagreeing is not a calculation.  Measured on this
               bank it was wrong more often than right (five correct answers
               rejected, one wrong answer blessed), so this may never turn into
               a FAIL: a student who is right must never be told they are wrong.
               The honest state is "could not verify", keeping the disagreement
               visible without asserting either answer. */
            check = {
              state: 'unchecked',
              note: 'a second AI pass reached a different answer ('
                    + String(v.yourAnswer || '—').slice(0, 60)
                    + '), so neither is shown as confirmed',
              otherOpinion: v.yourAnswer,
              confidence: v.confidence
            };
          } else {
            check = { state: 'passed', note: v.reason || '', yourAnswer: v.yourAnswer };
          }
        } catch (e) {
          check = { state: 'unchecked', note: 'the second check could not run (' + String(e.message || e).slice(0, 80) + ')' };
        }
      }
      answer.check = check;

      db.aiLog.unshift({ at: now(), by: sess.user, kind: 'solve', question: question.slice(0, 140),
        model: out.model, check: check.state });
      db.aiLog = db.aiLog.slice(0, 100);
      audit(sess.user, 'ai-solve', question.slice(0, 60) + ' [' + check.state + ']');
      saveDB();

      /* An answer that contradicts itself.  Measured on this bank: one question
         came back "-79/12" from one worker and "-7/12" from another; the same
         question also produced "No real roots" and "±√(1+cot²θ)/cot θ".  A
         worked solution whose own verification disagrees with its conclusion,
         or which offers two different values for the same thing, is not an
         answer -- refuse it rather than show a student a coin flip. */
      const ansTxt = String(answer.result || '');
      const verTxt = String(answer.verify || '');
      const nums = ansTxt.match(/-?\d+(?:\.\d+)?(?:\s*\/\s*\d+)?/g) || [];
      const distinct = [...new Set(nums.map(function (x) { return x.replace(/\s+/g, ''); }))];
      const contradictory = distinct.length >= 2 && /\b(and|or|either)\b/i.test(ansTxt) === false
                            && /\b(actually|correction|instead|not\b[^.]{0,20}\bbut)\b/i.test(verTxt);

      if (contradictory && (check.state !== 'verified' || check.source !== 'arithmetic')) {
        audit(sess.user, 'ai-solve-refused', question.slice(0, 60) + ' [answer contradicts its own working]');
        return json(res, 200, {
          ok: false, torn: true, reason: 'the answer contradicts its own working',
          error: 'The solver produced working that does not agree with its own answer, so nothing '
               + 'is shown. A worked solution that argues against itself teaches the wrong thing.'
        });
      }
      /* store the answer so it is never paid for twice.
         What may be stored:
           verified / passed  -- checked, so it is a solution worth keeping
           disputed + source=arithmetic -- the computed value REPLACES the draft
           unchecked          -- kept, but the page must say it was not checked;
                                 this is the only way a proof-type question ever
                                 gets cached, and without it every visit re-solved
                                 it and paid for it again.
         What may NOT be stored: an AI-vs-AI dispute.  Two models disagreeing is
         not a verdict, and caching the draft would hand a wrong answer to the
         next student. */
      const settledByMath = check.state === 'disputed' && check.source === 'arithmetic';
      const storable = check.state === 'verified' || check.state === 'passed'
                       || check.state === 'unchecked' || settledByMath;
      if (storable && !noOfficialKey) {
        db.aiCache[cacheKey] = {
          owner: aiCacheOwner(sess), at: now(), model: out.model, questionUnderstood: answer.questionUnderstood,
          result: settledByMath ? String(check.yourAnswer) : answer.result,
          summary: answer.summary, verify: answer.verify,
          policyVersion: solvePolicy.VERSION, approaches: answer.approaches, diagram: answer.diagram, conceptDiagram: answer.conceptDiagram, check: check,
          methodCount: answer.approaches.length,
          methodsShort: answer.methodsShort ? true : undefined,
          methodsNote: answer.methodsNote || undefined,
          corrected: settledByMath ? true : undefined,
          draftResult: settledByMath ? answer.result : undefined
        };
        saveDB();
      }

      /* A disputed answer is never handed over as if it were certain.
         Two things are better than refusing outright:
           1. try once more, because a fresh attempt often gets it right
           2. if it still fails AND arithmetic has the true value, keep the
              working but state the correct answer plainly -- a student is
              better served by "the answer is 3, the draft said 7" than by
              an error box and nothing else. */
      if (check.state === 'disputed') {
        return json(res, 200, Object.assign({}, answer, {
          disputed: true,
          result: check.source === 'arithmetic' ? String(check.yourAnswer) : answer.result,
          correction: check.source === 'arithmetic'
            ? 'The model draft got this wrong; the value above was computed from the question independently.'
            : '',
          error: check.source === 'arithmetic'
            ? ''
            : 'This answer did not survive an independent re-check, so it is not shown as a solution.'
        }));
      }
      return json(res, 200, answer);
    }

    /* ---------- AI agent: generate questions ---------- */
    if (p === '/api/ai/generate' && req.method === 'POST') {
      const err = requireRole(sess, ['teacher', 'admin']); if (err) return json(res, 403, { error: err });
      const plain = liveKeys();                 /* the whole ring; a capped key falls through */
      if (!plain.length) return json(res, 400, { error: 'The admin has not added a Google API key yet.' });

      const b = await readBody(req);
      const chapter = Number(b.chapter) || 0;
      const count = Math.max(1, Math.min(8, Number(b.count) || 4));
      const level = String(b.level || 'medium');
      const marks = Number(b.marks) || 3;
      const seedId = String(b.seedId || '');

      /* give the model the real bank context it must not copy */
      let seed = null;
      if (seedId && db.content.pyqIndex) {
        seed = db.content.pyqIndex.find(function (q) { return q.id === seedId; }) || null;
      }

      const prompt = [
        'You are a CBSE Class 10 Mathematics examiner writing NEW practice questions.',
        'Return ONLY JSON of the shape:',
        '{"questions":[{"en":"...","hi":"...","opts":["..."] or null,"ans":"...","steps":[{"en":"...","hi":"..."}],"ch":<int 1..14>,"marks":<int>,"kind":<1 MCQ|2 assertion|3 two-mark|4 three-mark|5 five-mark|6 case-study>,"twist":"..."}]}',
        'Rules:',
        '- Bilingual: English and Hindi must both be complete and natural. Hindi in Devanagari.',
        '- Do NOT reproduce any existing CBSE question verbatim; change the numbers and the situation.',
        '- Every answer must be exact and checkable by arithmetic. Verify before writing.',
        '- Give at least two distinct solution steps for every question.',
        '- Numbers must be written with a raised dot for decimals, e.g. 3·5, and use √, π, θ, ×, − as needed.',
        chapter ? ('- Chapter ' + chapter + ' only.') : '- Any chapter from 1 to 14.',
        '- Difficulty: ' + level + ' (easy|medium|hard).',
        '- Marks per question: ' + marks + '.',
        seed ? ('- Use this real past question only as a MODEL of the reasoning, not to copy: ' + seed.en) : '',
        '- Produce exactly ' + count + ' questions.'
      ].filter(Boolean).join('\n');

      let reply, parsed, usedModel = db.settings.geminiModel;
      try {
        const out = await callGeminiResilient(prompt, plain, db.settings.geminiModel);
        reply = out.text;
        usedModel = out.model;
        parsed = firstJSON(reply);
      } catch (e) {
        audit(sess.user, 'ai-error', String(e.message).slice(0, 160));
        saveDB();
        return json(res, 502, {
          error: 'The AI call failed: ' + String(e.message || e).slice(0, 300),
          tried: e.tried || []
        });
      }

      const items = (parsed.questions || []).map(function (r) {
        return {
          id: uid('ai'),
          published: false,               /* the admin reviews before students see it */
          en: String(r.en || ''), hi: String(r.hi || ''),
          opts: Array.isArray(r.opts) ? r.opts.map(String) : null,
          ans: String(r.ans || ''),
          steps: (Array.isArray(r.steps) ? r.steps : []).map(function (s) {
            return { en: String((s && s.en) || s || ''), hi: String((s && s.hi) || '') };
          }),
          ch: Number(r.ch) || chapter || 1, marks: Number(r.marks) || marks,
          kind: Number(r.kind) || 3, twist: String(r.twist || ''),
          source: 'ai', createdBy: sess.user, createdAt: now()
        };
      }).filter(function (r) { return r.en && r.ans; });

      db.aiLog.unshift({ at: now(), by: sess.user, chapter: chapter, count: items.length, level: level });
      db.aiLog = db.aiLog.slice(0, 100);
      db.content.ai = db.content.ai || [];
      db.content.ai = items.concat(db.content.ai).slice(0, 300);
      db.contentUpdatedAt = now();

      /* keep a lightweight index of the real bank for future prompts */
      if (Array.isArray(b.bankIndex) && b.bankIndex.length) {
        db.content.pyqIndex = b.bankIndex.slice(0, 400).map(function (q) {
          return { id: String(q.id), ch: Number(q.ch) || 0, en: String(q.en || '').slice(0, 240) };
        });
      }

      audit(sess.user, 'ai-generate', items.length + ' questions, ch' + (chapter || 'any') + ', ' + usedModel);
      saveDB();
      return json(res, 200, { questions: items, model: usedModel });
    }

    if (p === '/api/ai/log' && req.method === 'GET') {
      const err = requireRole(sess, ['teacher', 'admin']); if (err) return json(res, 403, { error: err });
      return json(res, 200, { log: db.aiLog });
    }

    /* Camera OCR stub — the client runs Tesseract.js in-browser; this endpoint
       exists so older browsers that can't load the WASM can fall back later.
       For now it returns a soft "use client OCR" message. */
    if (p === '/api/ocr' && (req.method === 'POST' || req.method === 'OPTIONS')) {
      if (req.method === 'OPTIONS') {
        res.setHeader('access-control-allow-origin','*');
        res.setHeader('access-control-allow-headers','authorization,content-type');
        res.writeHead(204); return res.end('');
      }
      return json(res, 200, { text: null, note: 'client-side OCR is used; this is a stub' });
    }

    return json(res, 404, { error: 'no such endpoint' });
  } catch (e) {
    return json(res, 500, { error: String(e.message || e) });
  }
};

const server = http.createServer(handleRequest);

loadDB();

/* ONE port, one server -- deliberately.
   This process used to open a second listener on 8080 so an old bookmark could
   never hit a dead port. In practice that looked like two servers running and
   made it hard to tell which address was real, so it was removed. The single
   address is PORT (8090 by default, overridable with the PORT env var). */
server.listen(PORT, HOST, function () {
  console.log('Upay server on http://localhost:' + PORT);
  console.log('');
  console.log('  Public study pages are available without sign-in.');
  console.log('  Admin tools require a verified administrator session.');
  if (!OPEN_MODE) {
    console.log('  Authentication is enabled.');
  } else {
    console.warn('  WARNING: open demo mode allows unauthenticated student AI access. Do not use on a public deployment.');
  }
  console.log('');
});
