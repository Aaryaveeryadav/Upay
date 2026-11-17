'use strict';
/* Shared in-memory sliding-window rate limiter.
 *
 * Honest scope: this is a per-process floor, not a durable quota. On the
 * local server (one process) it is exact. On serverless it bounds abuse per
 * warm instance only; the durable per-user/global daily caps live in
 * lib/ai-usage.js (Supabase RPC) and provider-side spend limits remain the
 * operator's backstop. No prompts, user ids or keys are logged here. */

function createLimiter(options) {
  const windowMs = (options && options.windowMs) || 60000;
  const max = (options && options.max) || 60;
  const hits = new Map(); // key -> array of timestamps (ms)

  function prune(key, now) {
    const arr = hits.get(key);
    if (!arr) return [];
    const fresh = arr.filter(function (ts) { return now - ts < windowMs; });
    if (fresh.length) hits.set(key, fresh); else hits.delete(key);
    return fresh;
  }

  return {
    /* Returns { ok:true } or { ok:false, retryAfter } (seconds). A failed
       check does not consume quota. */
    check: function (key) {
      const now = Date.now();
      const arr = prune(String(key), now);
      if (arr.length >= max) {
        return { ok: false, retryAfter: Math.max(1, Math.ceil((arr[0] + windowMs - now) / 1000)) };
      }
      arr.push(now);
      hits.set(String(key), arr);
      /* keep the map from growing without bound */
      if (hits.size > 5000) {
        for (const k of hits.keys()) prune(k, now);
      }
      return { ok: true };
    }
  };
}

/* Ready-made limiter for AI provider-spending routes. Generous for a real
   student (a 20-question "check all my answers" run is ~20 calls), far below
   what a script needs to burn provider quota. Keyed per account; the local
   server adds a loose per-IP DoS floor separately. */
const aiLimiter = createLimiter({ windowMs: 60000, max: 60 });

function clientIpOf(req) {
  const xf = String((req.headers && req.headers['x-forwarded-for']) || '').split(',')[0].trim();
  if (xf) return xf;
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

/* Serverless helper: call after authentication, before any provider call.
   Sends the 429 itself and returns false when the caller must stop. */
function aiRateFloor(req, res, user) {
  const key = (user && user.id ? 'u:' + user.id : 'ip:' + clientIpOf(req));
  const verdict = aiLimiter.check(key);
  if (verdict.ok) return true;
  try { res.setHeader('retry-after', String(verdict.retryAfter)); } catch (e) { /* headers may already be sent */ }
  res.status(429).json({
    code: 'rate_limited',
    error: 'Too many AI requests in a short time. Wait a few seconds and try again — your study material is unaffected.',
    retryAfter: verdict.retryAfter
  });
  return false;
}

module.exports = { createLimiter, aiLimiter, aiRateFloor, clientIpOf };
