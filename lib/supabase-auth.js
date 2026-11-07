'use strict';
const { url, anonKey } = require('./supabase-public.js');

// A bearer token is useful only after the Auth service validates it. Never
// infer an administrator role from a client-supplied token or metadata.
async function authenticate(req) {
  const header = String((req.headers && req.headers.authorization) || '');
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header);
  if (!match) return { user: null, missing: true };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url.replace(/\/$/, '') + '/auth/v1/user', {
      headers: { apikey: anonKey, authorization: 'Bearer ' + match[1] },
      signal: controller.signal
    });
    if (response.status >= 500 || response.status === 429) return { user: null, unavailable: true };
    if (!response.ok) return { user: null, invalid: true };
    const user = await response.json();
    if (!user || typeof user.id !== 'string' || !user.id) return { user: null, invalid: true };
    return { user: { id: user.id, email: String(user.email || '') } };
  } catch (_) {
    return { user: null, unavailable: true };
  } finally {
    clearTimeout(timer);
  }
}

function isAllowedForPaidAI(userId) {
  // Public self-signup currently permits unverified email accounts. A valid
  // session alone must not grant strangers unlimited provider spending.
  const allowed = String(process.env.UPAY_AI_ALLOWED_USERS || '')
    .split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
  return !!userId && allowed.includes(String(userId));
}
async function requireStudent(req, res) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('access-control-allow-origin', '*');
  const auth = await authenticate(req);
  if (auth.unavailable) {
    res.status(503).json({ error: 'Sign-in verification is temporarily unavailable. Please try again.' });
    return null;
  }
  if (!auth.user) {
    res.status(401).json({ error: 'Sign in to use the AI service.' });
    return null;
  }
  if (!isAllowedForPaidAI(auth.user.id)) {
    res.status(403).json({ error: 'AI access is not enabled for this account. Contact the site administrator.' });
    return null;
  }
  return auth.user;
}
module.exports = { authenticate, requireStudent, isAllowedForPaidAI };
