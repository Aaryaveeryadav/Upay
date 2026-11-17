'use strict';
/* Security posture regression check (code side only).
 *
 * Locks in the launch-hardening that lives in this repo:
 *  1. No secret key material anywhere in shipped files.
 *  2. AI provider-spending routes are rate-limited before any provider call,
 *     in both the local server and the serverless handlers.
 *  3. Browser code only ever sees the public publishable key.
 *  4. Security headers exist in the server and the Vercel config.
 * Dashboard actions (key rotation, redirect URLs) cannot be checked here and
 * stay tracked in SECURITY-AND-QA.md. */
const fs = require('fs'), path = require('path'), assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '..', '..');

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function list(dir, out) {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) list(rel, out);
    else if (/\.(js|html|json)$/.test(e.name)) out.push(rel);
  }
  return out;
}

/* 1. No secrets in shipped files. */
const SECRET = /(sb_secret_[A-Za-z0-9]|AIza[0-9A-Za-z_-]{20,}|service[_-]?role[^"'\n]{0,20}eyJ|SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"][^'"]+['"])/;
const shipped = ['index.html', 'login.html', 'portal.html', ...list('assets', []), ...list('api', []), ...list('lib', [])];
for (const rel of shipped) {
  assert(!SECRET.test(read(rel)), 'secret-looking material in shipped file: ' + rel);
}
console.log('PASS security: no secret key material in shipped files');

/* 2. Rate limiting wired before provider calls. */
const limiter = read('lib/rate-limit.js');
assert(/createLimiter/.test(limiter) && /aiRateFloor/.test(limiter), 'lib/rate-limit.js must export the AI floor');
for (const rel of ['api/ai/solve.js', 'api/ai/check-answer.js', 'api/ai/read-image.js']) {
  const src = read(rel);
  assert(src.indexOf('aiRateFloor(req') >= 0 && src.indexOf('aiRateFloor(req') < src.indexOf('consumeAI(user'), rel + ' must rate-limit before consumeAI');
}
const server = read('server.js');
assert(/aiUserLimiter/.test(server) && /aiIpLimiter/.test(server), 'server.js must cap AI routes per account and per address');
assert(/LOGIN_MAX_IP/.test(server) && /LOGIN_MAX_USER/.test(server), 'login rate limits must stay');
console.log('PASS security: AI + login rate limiting wired');

/* 3. Browser key hygiene. */
const supa = read('lib/supabase-public.js');
assert(/SUPABASE_PUBLISHABLE_KEY/.test(supa) && /sb_publishable_/.test(supa), 'browser config must use the publishable key');
assert(!/sb_secret|service_role/i.test(read('index.html')), 'index.html must not reference secret keys');
console.log('PASS security: browser sees publishable key only');

/* 4. Security headers in both deployments. */
assert(/Content-Security-Policy/.test(server), 'server.js must send a CSP');
const vercel = read('vercel.json');
for (const h of ['Content-Security-Policy', 'X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy']) {
  assert(vercel.includes(h), 'vercel.json missing header: ' + h);
}
console.log('PASS security: headers present in server.js and vercel.json');
console.log('PASS security posture');
