'use strict';
/* The stateless hosted stubs, behind one function.
 *
 * Vercel's Hobby plan allows 12 Serverless Functions per deployment, and each
 * file under api/ costs one. The routes below are all deliberate no-ops on the
 * stateless deployment — the real implementations live in server.js for the
 * self-hosted install — so they are answered here, in one slot, instead of
 * spending four. The URLs are unchanged: every legacy page that calls
 * /api/tel, /api/ocr, /api/ai/cache, /api/admin/key or /api/auth/login keeps
 * getting exactly the same answer as before.
 *
 * Anything under /api/ that no other function claims lands here too, and gets
 * an honest JSON 404 rather than the HTML app shell.
 */

/* Local-server accounts are not the hosted model: Supabase email sign-in runs
   in the browser. This endpoint never authenticates anyone. */
function localLogin(req, res) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('allow', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only.' });
  return res.status(401).json({
    error: 'Invalid email or password. Local server accounts are not available on this hosted site.'
  });
}

/* The local server keeps an opt-out anonymous telemetry ring; the stateless
   deployment deliberately stores nothing. */
function telemetry(req, res) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('allow', 'POST, OPTIONS');
  if (req.method === 'POST' || req.method === 'OPTIONS') return res.status(204).send('');
  return res.status(405).send('');
}

/* Vercel keeps no cache between cold starts, so the browser falls through to
   /api/ai/solve. */
function cacheLookup(req, res) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('content-type', 'application/json; charset=utf-8');
  return res.status(200).send(JSON.stringify({ found: false }));
}

/* Key management is not exposed by the stateless deployment: configure the
   provider key in the hosting project's protected environment settings. Never
   reveal key fragments to an unauthenticated caller. */
function keyAdmin(req, res, route) {
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (route === '/api/admin/key/models' && req.method === 'GET') {
    // Do not claim a list is live when no provider call has been made.
    return res.status(200).json({
      models: [], note: 'Provider model availability has not been checked.'
    });
  }
  return res.status(403).json({
    error: 'Key management is unavailable here. Configure provider keys in the deployment environment.'
  });
}

/* No server-side OCR is configured; the client falls back to its own photo
   flow. */
function ocr(req, res) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'authorization,content-type');
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).send('POST only');
  res.setHeader('content-type', 'application/json; charset=utf-8');
  return res.status(200).send(JSON.stringify({
    text: null,
    note: 'server-side OCR not yet configured — use the photo upload or try on Chrome Android'
  }));
}

const ROUTES = {
  '/api/auth/login': localLogin,
  '/api/tel': telemetry,
  '/api/ai/cache': cacheLookup,
  '/api/admin/key': keyAdmin,
  '/api/admin/key/models': keyAdmin,
  '/api/ocr': ocr
};

/* Vercel sends every unclaimed /api/* path to this function
   (vercel.json: ^/api/(.*)$ -> /api/[...path]) and the rewrite preserves the
   original URL, so the path the visitor used is the path dispatched on.
   Local tests call the handler directly, which is the same thing. */
function routeOf(req) {
  let route = '';
  try {
    route = new URL(String(req.url || '/'), 'http://upay.local').pathname;
  } catch (_) {
    route = String(req.url || '/').replace(/\?.*$/, '');
  }
  return (route.replace(/\/+$/, '') || '/api');
}

module.exports = function handler(req, res) {
  const route = routeOf(req);
  const stub = ROUTES[route];
  if (stub) return stub(req, res, route);
  return res.status(404).json({
    ok: false, code: 'not_found', error: 'No API route at ' + route + '.'
  });
};

module.exports.routes = ROUTES;
