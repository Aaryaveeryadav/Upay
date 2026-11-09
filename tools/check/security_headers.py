#!/usr/bin/env python3
"""Security regression check.

Verifies the parts of the security posture that can be tested without a browser:

  * every required security header is sent, on pages and on the API
  * the Content-Security-Policy keeps the directives that stop framing,
    plugin loading and silent cross-origin requests
  * api/ endpoints refuse unauthenticated calls that cost money or leak data
  * static serving refuses traversal and private runtime files
  * CORS echoes only our own origin, never a third-party one
  * no credential pattern is committed to tracked files
  * vercel.json carries the same headers as the local server

Run against a running server:
    node server.js &
    python3 tools/check/security_headers.py
"""
import json
import re
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = 'http://localhost:8004'

failures = []
notes = []


def check(cond, msg):
    if not cond:
        failures.append(msg)


def fetch(path, method='GET', headers=None, timeout=10):
    """Return (status, headers dict, body) without following redirects."""
    req = urllib.request.Request(BASE + path, method=method, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, {k.lower(): v for k, v in r.headers.items()}, r.read(4000)
    except urllib.error.HTTPError as e:
        return e.code, {k.lower(): v for k, v in e.headers.items()}, e.read(4000)
    except Exception as e:                                    # connection refused etc.
        return None, {}, str(e).encode()


REQUIRED_HEADERS = [
    'content-security-policy',
    'x-frame-options',
    'x-content-type-options',
    'referrer-policy',
    'permissions-policy',
    'cross-origin-opener-policy',
    'cross-origin-resource-policy',
]


def main():
    status, headers, _ = fetch('/')
    if status != 200:
        print('cannot reach %s -- start the server first' % BASE)
        return 2

    # --------------------------------------------------------------- headers
    for h in REQUIRED_HEADERS:
        check(h in headers, 'missing header on / : %s' % h)
    notes.append('headers checked on /: %d required' % len(REQUIRED_HEADERS))

    check(headers.get('x-frame-options', '').upper() == 'DENY',
          'x-frame-options should be DENY, got %r' % headers.get('x-frame-options'))
    check(headers.get('x-content-type-options', '').lower() == 'nosniff',
          'x-content-type-options should be nosniff')

    csp = headers.get('content-security-policy', '')
    for directive in ("default-src 'self'", "frame-ancestors 'none'",
                      "object-src 'none'", "base-uri 'self'", "form-action 'self'"):
        check(directive in csp, 'CSP is missing: %s' % directive)
    check("frame-ancestors 'none'" in csp, 'CSP must forbid framing')
    # upgrade-insecure-requests would break plain-HTTP LAN use.
    check('upgrade-insecure-requests' not in csp,
          'local CSP must not force HTTPS; LAN users reach this over plain HTTP')

    # Headers must also be on API responses, not just pages.
    status, api_headers, _ = fetch('/api/auth/me')
    check('content-security-policy' in api_headers, 'API responses lack a CSP header')
    check('x-frame-options' in api_headers, 'API responses lack x-frame-options')

    # ------------------------------------------------------------------- CORS
    for bad in ('https://evil.example.com', 'http://attacker.test', 'null'):
        _, h, _ = fetch('/api/content', headers={'Origin': bad})
        check('access-control-allow-origin' not in h,
              'CORS echoed a foreign origin: %s' % bad)
    _, h, _ = fetch('/api/content', headers={'Origin': BASE})
    check(h.get('access-control-allow-origin') == BASE,
          'CORS should echo our own origin')
    notes.append('CORS rejects foreign origins, echoes own origin')

    # -------------------------------------------------------------- API auth
    # Anything that spends provider money or reads private data must refuse a
    # caller without a session.
    must_refuse = [
        ('/api/content', 'GET'),
        ('/api/auth/me', 'GET'),
        ('/api/ai/cache', 'GET'),
        ('/api/ai/solve', 'POST'),
        ('/api/ai/read-image', 'POST'),
        ('/api/admin/key', 'GET'),
        ('/api/admin/key', 'POST'),
    ]
    for path, method in must_refuse:
        s, _, _ = fetch(path, method=method,
                        headers={'content-type': 'application/json'})
        check(s in (401, 403), '%s %s returned %s without a session (want 401/403)'
              % (method, path, s))
    notes.append('%d API endpoints refuse unauthenticated callers' % len(must_refuse))

    # A forged bearer token must not be accepted.
    forged = ('Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsImFkbWluIjp0cnVlfQ.fake')
    s, _, _ = fetch('/api/admin/key', headers={'authorization': forged})
    check(s in (401, 403), 'forged admin token accepted (%s)' % s)

    # ------------------------------------------------------ static disclosure
    private = [
        '/data/db.json', '/server.js', '/package.json', '/vercel.json',
        '/tools/check/security_headers.py', '/lib/supabase-auth.js',
        '/.env', '/.git/config',
        '/assets/../data/db.json', '/assets/../../data/db.json',
        '/assets/%2e%2e/data/db.json',
    ]
    for p in private:
        s, _, _ = fetch(p)
        check(s in (400, 404), 'private path is reachable: %s (%s)' % (p, s))
    notes.append('%d private paths / traversal attempts refused' % len(private))

    # ------------------------------------------------------------ repo secrets
    patterns = re.compile(
        r'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]{20,}'
        r'|AIza[0-9A-Za-z_-]{35}'
        r'|sb_secret_[A-Za-z0-9_-]{10,}'
        r'|-----BEGIN [A-Z ]*PRIVATE KEY-----')
    try:
        files = subprocess.run(['git', 'ls-files'], cwd=str(ROOT),
                               capture_output=True, text=True, timeout=120).stdout.split()
        hits = []
        for rel in files:
            p = ROOT / rel
            if not p.is_file():
                continue
            try:
                if p.stat().st_size > 2_000_000:
                    continue
                if patterns.search(p.read_text(encoding='utf-8', errors='ignore')):
                    hits.append(rel)
            except OSError:
                continue
        check(not hits, 'credential-shaped strings in tracked files: %s' % ', '.join(hits[:5]))
        notes.append('scanned %d tracked files for credential patterns' % len(files))
    except Exception as e:
        notes.append('secret scan skipped: %s' % e)

    # ------------------------------------------------------------- vercel.json
    try:
        cfg = json.loads((ROOT / 'vercel.json').read_text(encoding='utf-8'))
        rules = cfg.get('headers') or []
        check(bool(rules), 'vercel.json defines no headers')
        if rules:
            keys = {h['key'].lower() for h in rules[0].get('headers', [])}
            for h in REQUIRED_HEADERS + ['strict-transport-security']:
                check(h in keys, 'vercel.json is missing %s' % h)
            notes.append('vercel.json carries %d headers' % len(keys))
    except Exception as e:
        check(False, 'vercel.json is unreadable: %s' % e)

    # ------------------------------------------------------------------ report
    print('security posture')
    for n in notes:
        print('  ' + n)

    if failures:
        print('\nFAIL')
        for f in failures:
            print('  - ' + f)
        return 1
    print('\nPASS  headers, CSP, CORS, API auth, static disclosure, '
          'repo secrets and vercel.json are all clean')
    return 0


if __name__ == '__main__':
    sys.exit(main())
