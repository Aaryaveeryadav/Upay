'use strict';
/* Server-only Supabase administration.
 *
 * Creating an account and writing a person's profile must not be something a
 * browser can do for itself: a self-written profile could claim another
 * school's tenant. So account creation and profile writes use the service-role
 * key, which is read from the environment and never sent to a client.
 */
const publicConfig = require('./supabase-public.js');

function serviceKey() {
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '').trim();
  return /^sb_secret_|^ey[A-Za-z0-9_-]+\./.test(key) ? key : '';
}
function configured() { return !!serviceKey(); }

function base() { return String(publicConfig.url).replace(/\/$/, ''); }

async function call(pathname, options) {
  const key = serviceKey();
  if (!key) { const e = new Error('Account creation is not configured on this server.'); e.status = 503; e.code = 'account_setup_missing'; throw e; }
  const response = await fetch(base() + pathname, Object.assign({
    headers: {
      apikey: key,
      authorization: 'Bearer ' + key,
      'content-type': 'application/json'
    }
  }, options));
  let body = null;
  try { body = await response.json(); } catch (_) { body = null; }
  if (!response.ok) {
    const e = new Error('The account service rejected the request.');
    e.status = response.status === 422 || response.status === 400 ? 400 : 503;
    e.code = 'account_service_error';
    // Only pass through a short, non-sensitive reason.
    const message = body && (body.msg || body.message || body.error_description || body.error);
    if (typeof message === 'string' && message.length < 200) e.detail = message;
    throw e;
  }
  return body;
}

/* Create a confirmed auth user. Returns { id, email }. */
async function createUser({ email, password }) {
  const body = await call('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, password, email_confirm: true })
  });
  if (!body || typeof body.id !== 'string') {
    const e = new Error('The account service returned no user id.'); e.status = 503; e.code = 'account_service_error'; throw e;
  }
  return { id: body.id, email: body.email || email };
}

async function deleteUser(id) {
  try { await call('/auth/v1/admin/users/' + encodeURIComponent(id), { method: 'DELETE' }); } catch (_) {}
}

/* Sign in with email + password using the public key (no service role needed). */
async function signIn({ email, password }) {
  const key = String(publicConfig.anonKey || '');
  if (!key) { const e = new Error('Sign-in is not configured on this server.'); e.status = 503; e.code = 'account_setup_missing'; throw e; }
  let response;
  try {
    response = await fetch(base() + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { apikey: key, 'content-type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
  } catch (_) {
    const e = new Error('The sign-in service is not reachable.'); e.status = 503; e.code = 'sign_in_unavailable'; throw e;
  }
  let body = null;
  try { body = await response.json(); } catch (_) {}
  if (!response.ok || !body || !body.access_token) {
    const e = new Error('Email or password is not correct.');
    e.status = 401; e.code = 'bad_credentials';
    throw e;
  }
  return {
    token: body.access_token,
    refresh: body.refresh_token || '',
    expires: Number(body.expires_in) || 0,
    user: body.user || null
  };
}

module.exports = { configured, createUser, deleteUser, signIn, serviceKey, base };
