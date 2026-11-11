'use strict';
const access = require('./ai-access');
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
    res.status(503).json({ code: 'sign_in_unavailable', error: 'Sign-in verification is temporarily unavailable. Please try again.' });
    return null;
  }
  if (!auth.user) {
    res.status(401).json({ code: 'sign_in_required', error: 'Sign in to use the AI service.' });
    return null;
  }
  if (process.env.UPAY_AI_ENABLED === 'false') {
    res.status(503).json({code:'ai_disabled', error:'AI is temporarily switched off by the administrator. Study material is still available.'});
    return null;
  }
  let allowed = isAllowedForPaidAI(auth.user.id);
  if (access.enabled()) {
    if (process.env.UPAY_AI_LIMITS_ENABLED !== 'true') {
      res.status(503).json({code:'usage_setup_pending',error:'AI access is awaiting activation of daily usage controls.'});
      return null;
    }
    try {
      // Database status replaces (not supplements) the old student allowlist,
      // so revoking an approved student cannot be bypassed by a legacy entry.
      allowed = access.isAccessAdmin(auth.user.id) || await access.hasApprovedAccess(auth.user.id);
    } catch (_) {
      res.status(503).json({code:'access_verification_unavailable',error:'AI permission checks are temporarily unavailable.'});
      return null;
    }
  }
  if (!allowed) {
    res.status(403).json({ code: 'access_not_enabled', error: 'AI access is not enabled for this account. Contact the site administrator.' });
    return null;
  }
  return auth.user;
}
module.exports = { authenticate, requireStudent, isAllowedForPaidAI };
