# Security and QA handoff

Updated 7 November 2026. Changes in this workspace do not automatically fix an existing public deployment.

## Action required before public launch

1. **Rotate the exposed legacy Supabase service-role key.** The local code now uses the project's existing public publishable key, and the backend prefers `SUPABASE_PUBLISHABLE_KEY` over the legacy `SUPABASE_ANON_KEY` override. That migration does **not** revoke the exposed key. Coordinate all deployments and consumers, migrate them off both legacy keys, deactivate legacy API keys in Supabase Settings → API Keys, and migrate/rotate and revoke the legacy JWT signing secret in Settings → JWT Signing Keys. Previously issued JWTs may stop working when the old signing secret is revoked; check Supabase's current guidance and plan session reauthentication. The connected tool does not expose those dashboard actions. See https://supabase.com/docs/guides/security/rotate-leaked-api-keys. Do not put a secret/service-role key in browser JavaScript or archives.
2. Treat Gemini credentials recoverable from the old `upay.zip` or a previously exposed `data/` directory as compromised. Revoke/replace them in Google AI Studio or the relevant cloud project, set provider spending limits, and configure replacement keys securely. Do not publish the old archive.
3. The linked Supabase project's inspected configuration allows public email signup with auto-confirmation, has a wildcard redirect allowlist and a localhost site URL. Before public launch, choose the real production domain and configure the exact allowed redirect URLs, email verification/sign-up policy, sensible token lifetime and abuse controls. Do not change those settings blindly: they affect existing sign-in and recovery flows.
4. `UPAY_AI_ALLOWED_USERS` must contain the Supabase user IDs permitted to make paid AI requests. This prevents any newly auto-confirmed account from using the provider key by default. An allowlist and the current in-memory login throttle are not a durable, distributed rate limiter. Add server-side per-user/IP limits, budget alerts and appropriate usage policy.
5. Existing local admin credentials may have been exposed. Change them using **My account → Change local password**; the change invalidates local tokens. Restrict machine and backup access. The local `data/secret.key` also encrypts stored Gemini keys: do not rotate/delete it without migrating or re-entering those keys and planning for session invalidation.
6. The `upay` project was deployed at https://upay-zeta.vercel.app/ on 7 November 2026. `SUPABASE_PUBLISHABLE_KEY` is set for production, preview and development, but the legacy `SUPABASE_ANON_KEY` and sensitive `SUPABASE_SERVICE_ROLE_KEY` settings have not been removed, and the exposed legacy service-role key remains active at Supabase. The serverless Admin key-management API is disabled. Put a replacement Gemini key in protected `GEMINI_KEYS` (which takes precedence over `GEMINI_KEY`) and configure `UPAY_AI_ALLOWED_USERS` for paid AI; no allowlist was present at deployment. Local-server username accounts do not transfer to Vercel. See `VERCEL-FIRST-DEPLOY.md` for subsequent updates and verification.

## Implemented locally

- Authentication defaults to enabled. Explicit demo mode grants only limited student access and never administrative access.
- Static serving is limited to the app shell and public assets; private runtime files, source code, tools and archives are not served. Traversal and symlink escape checks are present. Launchers no longer fall back to a generic server exposing the project root.
- Local sessions are signed, checked against current users and session versions, and durably revoked at logout/renewal. A password change invalidates old local sessions. Supabase tokens are checked by the provider and never grant admin; the serverless paid AI endpoints require a verified allowlisted user.
- The service worker does not cache API responses and only manages its own versioned caches. Saved questions, recent activity and mock sessions are separated by local/Supabase owner; mastery and mistake lists are further separated by board, class and subject. Practice progress remains device-local. Old unscoped mastery is retained and included in guest exports, not silently attributed to a subject. Supabase offline/cloud reconciliation remains unverified.
- AI solve and translation caches are isolated by verified owner and scope. Old local unowned cache entries are preserved in the private database, but no longer served automatically. Raw AI-provided SVG is not embedded in sample-paper solutions.
- Local `data/` permissions were tightened for this workspace; newly generated secret/database files are private to the server account.

## What was tested and what remains

- Isolated backend tests cover admin and student authentication, logout/restart revocation, token rotation/password changes, same-prefix fake Supabase tokens, host/forwarded-header spoofing, static traversal, owner-isolated AI cache, private-file permissions and explicit demo mode.
- Mocked serverless tests cover guest/invalid/valid auth, the paid-AI allowlist, pre-parsed and streamed bodies, image handling, subject prompts and response shape. Browser tests cover local login/password change, a deliberately delayed mock Supabase SDK, token forwarding, saved/practice owner isolation and progress backup/restore. Service-worker tests cover an online warmup, offline reload, cache ownership and no cached API responses.
- The Supabase management API reported the Upay project's Auth, database and REST services healthy. The four inspected public tables had RLS enabled with self-user policies. The bundled browser SDK and publishable key were checked with a zero-row read and an intentionally invalid live sign-in attempt; successful end-user signup/sign-in and recovery were not tested. The known exposed legacy key remains active until the dashboard retirement steps are completed.
- A minimal request to `gemini-3.5-flash-lite` and one isolated local Accountancy solve succeeded against a configured provider key; the answer was marked unchecked. The live Vercel guest browser smoke covered boot, SDK initialization, Accountancy catalogue, pagination, mobile/Hindi, server-only path blocking, representative PDF hashes, guest auth and rejection of unauthenticated AI. The 26k update was checked on live desktop, tablet and phone widths: Board/Class/Subject are visible, selecting subjects updates scope, and selections persist. A deliberately invalid live sign-in returned a safe 401; successful real-user sign-in, recovery and hosted paid AI were not tested. This does not verify all keys, quotas, questions or production abuse resistance.
- Source-text and chapter classification checks are targeted, not exhaustive. Official Accountancy keys are absent; AI may be incorrect. No test suite establishes zero errors.
- The 17 additional Accountancy papers and the 90 Economics plus 4 Biology test papers are source-only PDFs, not imported questions or answer keys. The 24 Economics and 40 Class 12 English book PDFs and 101 English test-paper PDFs are also public assets when deployed or added to a public repository. The English and Economics/Biology public paths and five Accountancy asset paths are hard links to preserved uploads in this workspace; treat both paths as read-only, since editing either changes the shared file. A portable package must contain actual PDF bytes. Local `data/`, other `uploads/`, credentials and private archives remain excluded.
- Local source checks matched all 24 Economics books and all 94 test papers to the supplied originals by SHA-256 and checked first-page identifiers; the twenty-four image-only scans were also inspected visually and with OCR. For the scanned series, full-page OCR sometimes misreads digits; visual cover checks and targeted OCR crops were used rather than treating those misreadings as ground truth. Browser smokes covered the 11 Economics guides, public-PDF downloads, duplicate series, 40/80-mark distinctions, scan and page-count labels, Biology special designation, subject/board separation, English/Hindi labels, PDF cache bypass and 320–1440px layouts. Isolated mock-provider tests checked local and serverless Economics prompts and unchecked-answer behavior. These tests do not certify full syllabus coverage, answers, exam years or all source content.
- Current 26ab includes 40 supplied Class 12 English original textbook selections: 13 Flamingo, six Vistas and 21 Kaleidoscope PDFs. Integrity checks match each uploaded PDF and its hash, page count, title/author and section, including three multi-work files and section introductions. Browser checks exercise section grouping, downloads, study prompts, English/Hindi, scope persistence, search, layout and service-worker PDF bypass. Mock-provider tests exercise English-specific prompts and explicitly unchecked AI responses. The five supplied Kaleidoscope selections not listed in CBSE 2026–27 Elective are marked; Elective fiction novels and official answer keys were not supplied. These checks are targeted and do not certify every literary interpretation or full course coverage.
- The 101 supplied Class 12 English test papers are source-only: 93 Core and eight Elective. Eighteen Core PDFs are image-only; three have eight PDF pages while their covers say seven printed pages, six have 24 PDF pages while their covers say 23 printed pages, and nineteen have 16 PDF pages while their covers say 15 printed pages (their last page shows a footer and non-question marks but no question content). Repeated codes are separated by series. The scanned covers were visually inspected as well as OCR-checked because OCR can misread code and series digits. SHA-256 checks match all originals and browser tests check course/series separation, the separate code/series filter, PDF downloads, labels, board/subject scope and cache bypass. Questions have not been imported, exam years are unverified and no official keys were supplied; these tests do not certify the full papers or answers.

## Security headers (9 November 2026)

Every response from `server.js` and from the Vercel deployment now carries a
consistent header set, added by `applySecurityHeaders()` and mirrored in
`vercel.json`: `Content-Security-Policy`, `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`,
`Permissions-Policy`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`
and, over TLS only, `Strict-Transport-Security`.

The CSP was derived from this app's actual surface rather than pasted from a
template. Two allowances are deliberate and documented in the code:

- `script-src 'unsafe-inline'` — `index.html` carries a small inline Supabase
  bootstrap. A nonce would mean templating `index.html` per request.
- `style-src 'unsafe-inline'` — the renderer emits 261 inline `style` attributes;
  removing the allowance needs a CSS refactor, not a header change.

`img-src data:` is required by the 33 inlined figure diagrams, and `connect-src`
is limited to this origin plus the one Supabase project the browser SDK talks to.
`upgrade-insecure-requests` is sent by Vercel but deliberately **not** by the
local server, which is routinely reached over plain HTTP on a school LAN.

A tampered or corrupt `localStorage` entry can no longer break the app. Stored
values are read through a type-guarded `store.getTyped()`, so a stored object
where an array belongs returns the default instead of taking the Home or Saved
view down with `S.saved.filter is not a function`. Seven corruption shapes are
tested, including invalid JSON and deeply nested values.

### What was verified

`python3 tools/check/security_headers.py` (server running) checks:
7 required headers on pages and API alike; the framing, object-src, base-uri and
form-action directives; CORS echoing only our own origin and refusing
`evil.example.com`, `attacker.test` and `null`; 7 API endpoints refusing
unauthenticated callers, including a forged admin bearer token; 11 private-path
and traversal probes returning 400/404; a credential-pattern scan over 614
tracked files; and `vercel.json` carrying the same 8 headers as the server.

Browser-side checks ran against the live local server through jsdom:
6 XSS payloads in the `?q=` path and across 7 storage-backed surfaces produced
0 handlers, 0 `javascript:` URLs and 0 alerts (payloads are escaped into text);
7 `localStorage` corruption cases each rendered with 0 errors; the CSP produced
0 violations on boot; and 100 route renders across 20 class/subject/language
combinations produced 0 errors.

### Limits of this claim

This is not a third-party penetration test and does not establish that the site
is immune to attack. Git history contains no credential pattern and no private
runtime file is tracked, but **the previously exposed legacy Supabase
service-role key and any old Gemini keys remain compromised until they are
rotated in the provider dashboards** — no header or code change here revokes
them, and item 1 above is still outstanding. The paid-AI allowlist and durable
rate limiting described above are still required before public launch. Tests are
targeted, not exhaustive.


## Sanskrit legacy links on Vercel

Vercel `routes` source patterns are case-insensitive by default. The two legacy Sanskrit filename rewrites set `caseSensitive: true` so they cannot intercept the distinct lowercase or mixed-case PDFs. Test both old paths and both distinct neighbours against their original hashes on the deployed host, not only on the case-sensitive local server.
