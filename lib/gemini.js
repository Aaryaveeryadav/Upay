/* Shared Gemini caller — extracted from server.js for Vercel serverless use.
   Uses the same multi-model chain + key rotation logic as the local server,
   but reads keys from GEMINI_KEYS (comma separated) env var instead of disk. */
'use strict';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function deadlineError() {
  const error = new Error('AI request deadline exceeded');
  error.status = 504; return error;
}
function remaining(options) {
  if (options.signal && options.signal.aborted) throw deadlineError();
  const ms = options.deadline ? options.deadline - Date.now() : Infinity;
  if (ms <= 0) throw deadlineError();
  return ms;
}
async function callGemini(prompt, key, model, image, timeoutMs, options = {}) {
  const m = model || 'gemini-2.0-flash';
  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' +
    encodeURIComponent(m) + ':generateContent?key=' + encodeURIComponent(key);
  const msgParts = [{ text: prompt }];
  if (image && image.data && image.mime) {
    msgParts.push({ inline_data: { mime_type: image.mime, data: image.data } });
  }
  const body = {
    contents: [{ role: 'user', parts: msgParts }],
    generationConfig: { temperature: image ? 0.2 : 0.5, maxOutputTokens: options.maxOutputTokens || 6144 }
  };
  let r, txt;
  const perAttempt = timeoutMs || 14000;
  // Deadline-bound interactive solves fall through to another model rather
  // than spending their entire budget retrying the same stalled model.
  for (let attempt = 0; attempt < (options.deadline ? 1 : 2); attempt++) {
    const ac = new AbortController();
    const attemptMs = Math.min(perAttempt, remaining(options));
    const cancel = () => ac.abort();
    if (options.signal) options.signal.addEventListener('abort', cancel, { once:true });
    const timer = setTimeout(cancel, attemptMs);
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
      txt = 'provider timeout after ' + Math.round(attemptMs/1000) + ' seconds';
    } finally { clearTimeout(timer); if (options.signal) options.signal.removeEventListener('abort', cancel); }
    remaining(options);
    if (r.ok) break;
    // Don't retry client errors / quota errors; retry once for 5xx/timeout
    if (r.status !== 503 && r.status !== 500 && r.status !== 0) break;
    if (attempt === 0 && !options.deadline) await sleep(500);
  }
  if (!r.ok) {
    const err = new Error('Gemini ' + r.status + ': ' + txt.slice(0, 300));
    err.status = r.status; err.raw = txt; throw err;
  }
  const j = JSON.parse(txt);
  const parts = (j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [];
  return parts.map(p => p.text || '').join('');
}

/* Order matters: fastest model first, fall back to heavier ones only if needed */
const MODEL_CHAIN = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-flash-latest'
];

const quotaDead = {};
let keyDeadUntil = 0;
const QUOTA_COOLDOWN = 50 * 60 * 1000;

function loadKeys() {
  const raw = process.env.GEMINI_KEYS || process.env.GEMINI_KEY || '';
  return raw.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
}

function keyReady(k) {
  if (!k) return false;
  if (Date.now() < keyDeadUntil) return false;
  return true;
}
function noteKeyDead(k, secs) {
  keyDeadUntil = Date.now() + Math.min(Number(secs) || 3600, 6 * 3600) * 1000;
}

async function callGeminiChain(prompt, key, preferred, image, options = {}) {
  remaining(options);
  if (Date.now() < keyDeadUntil) {
    const err = new Error('Gemini 429: the free AI quota is used up for now');
    err.status = 429; throw err;
  }
  const chain = [];
  [preferred].concat(MODEL_CHAIN).forEach(m => { if (m && chain.indexOf(m) === -1) chain.push(m); });
  const now = Date.now();
  chain.sort((a, b) => {
    const da = quotaDead[a] && now - quotaDead[a] < QUOTA_COOLDOWN ? 1 : 0;
    const db = quotaDead[b] && now - quotaDead[b] < QUOTA_COOLDOWN ? 1 : 0;
    return da - db;
  });
  const tried = []; let lastErr = null;
  for (let i = 0; i < chain.length; i++) {
    remaining(options);
    const m = chain[i];
    try {
      // Lite models get a shorter per-attempt timeout; flagship gets a bit more
      const tmo = options.deadline ? (options.attemptMs || 24000) : (/flash-lite|1\.5-flash-8b/.test(m) ? 10000 : 15000);
      const out = await callGemini(prompt, key, m, image, tmo, options);
      return { text: out, model: m, tried };
    } catch (e) {
      remaining(options);
      const msg = String(e.message || e);
      tried.push({ model: m, error: msg.slice(0, 120) });
      if (/\b429\b|RESOURCE_EXHAUSTED/.test(msg)) {
        quotaDead[m] = Date.now();
        const rm = String(e.raw || msg).match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
        if (rm && Number(rm[1]) > 600) keyDeadUntil = Date.now() + Math.min(Number(rm[1]), 6*3600) * 1000;
      }
      else if (/\b404\b|no longer available/.test(msg)) quotaDead[m] = Date.now();
      lastErr = e;
      const hopeless = /\b400\b|INVALID_ARGUMENT|API key not valid|PERMISSION_DENIED|\b403\b/.test(msg);
      if (hopeless) break;
    }
  }
  const err = new Error(String((lastErr && lastErr.message) || 'no model answered'));
  err.tried = tried;
  if (lastErr && lastErr.raw) err.raw = lastErr.raw;
  if (lastErr && lastErr.status) err.status = lastErr.status;
  throw err;
}

async function callGeminiResilient(prompt, key, preferred, image, options = {}) {
  remaining(options);
  const keys = (Array.isArray(key) ? key : loadKeys()).filter(Boolean);
  if (!keys.length) throw new Error('Gemini 400: no API key is configured. Set GEMINI_KEYS.');
  let lastKeyErr = null;
  for (let ki = 0; ki < keys.length; ki++) {
    remaining(options);
    const thisKey = keys[ki];
    if (!keyReady(thisKey)) continue;
    try { return await callGeminiChain(prompt, thisKey, preferred, image, options); }
    catch (e) {
      const msg = String(e.message || e);
      lastKeyErr = e;
      const rm = String(e.raw || msg).match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
      const secs = rm ? Number(rm[1]) : 0;
      if (/\b429\b|RESOURCE_EXHAUSTED/.test(msg) && secs > 600) { noteKeyDead(thisKey, secs); continue; }
      if (/API key not valid|PERMISSION_DENIED|\b403\b/.test(msg)) { noteKeyDead(thisKey, 30*3600); continue; }
      throw e;
    }
  }
  throw lastKeyErr || new Error('Gemini 429: every configured key is out of quota');
}

function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'authorization,content-type');
  res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
  res.status(code).send(body);
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const max = limit || (1 << 20);
    // Some serverless runtimes parse JSON before invoking the handler; in that
    // case attaching stream listeners after the end event would hang forever.
    if (req.body !== undefined) {
      try {
        const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') :
          (typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}));
        if (Buffer.byteLength(raw) > max) throw new Error('too large');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) { reject(e); }
      return;
    }
    let n = 0; const chunks = [];
    req.on('data', c => {
      n += c.length;
      if (n > max) { reject(new Error('too large')); if (req.destroy) req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); }
      catch (e) { reject(new Error('bad json')); }
    });
    req.on('error', reject);
  });
}

function firstJSON(text) {
  const s = String(text || '');
  // find first { ... } with balanced braces
  let i = s.indexOf('{');
  if (i < 0) return null;
  let depth = 0, start = -1, inStr = false, esc = false;
  for (let k = i; k < s.length; k++) {
    const c = s[k];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === '"') inStr = !inStr;
    if (inStr) continue;
    if (c === '{') { if (depth === 0) start = k; depth++; }
    else if (c === '}') { depth--; if (depth === 0) { try { return JSON.parse(s.slice(start, k+1)); } catch(e){ i = k+1; depth = 0; continue; } } }
  }
  return null;
}

module.exports = { callGemini, callGeminiResilient, callGeminiChain, json, readBody, firstJSON, loadKeys, sleep };
