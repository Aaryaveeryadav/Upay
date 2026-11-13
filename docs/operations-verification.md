# Deployment verification and CI repair

## Production verified

The connected Vercel project `upay` reports production deployment `dpl_74dJkeR1UFh1kY1X7Z7Sn9p3Xm71` as READY / PROMOTED, with no alias error, assigned to `upay-zeta.vercel.app`. Its Git commit is `b0f1bd6cca306bbebd9f83da6871d636646fbdfe` (merged PR #34).

Public page retrieval succeeded for the homepage and `/#/login?mode=signup`. The rendered homepage contains Kritin Upay branding, Daily task pending, and Your next study plan. The signup page renders Create your account, Continue with Google, and the email/password form. This verifies deployed page availability, not actual Google sign-in, email delivery, paid AI responses, or Chrome Safe Browsing reputation. No real accounts or emails were created for verification.

## CI failures reproduced and repaired

The previous main run `43445467262` failed. GitHub run logs could not be downloaded through the sandbox's allowed network, so failures were reproduced locally using the exact workflow checks.

- `outline_notes.py` still required a homepage Business Studies shortcut that was intentionally removed. It now checks the existing chapter-to-library links and the actual library section instead. All source/hash/ledger checks remain.
- `trust_controls.js` still expected 1,019 raw Physics imports, before damaged rows were withheld. It now asserts the exact 202 published 2025 IDs against the source quality ledger. Extracted options are checked against preserved original rows, not stems from which options were intentionally separated. Assertion/reason rows retain same-paper instruction/type guards. AI privacy, authorization and fail-closed checks remain unchanged.
- `backend_smoke.py` omitted newer server module dependencies from its isolated test copy, used an obsolete cache policy and returned three mocked approaches under a four-approach contract. Its isolated copy now includes the required modules; its cache uses the active policy and four fixture approaches. Startup failures now include diagnostics. The owner-scoped cache, spoofing, revocation, permissions and static-path checks remain.
- `red_theme_browser.js` concatenated an origin without a trailing slash into `http://127.0.0.1:8004assets/...`. It now resolves stylesheet URLs through `new URL`.
- `trust_browser_smoke.py` expected the old Study shortcuts accessible name instead of the current Study plan. Goal persistence, scoped resume, verified/unverified answer feedback and mocked AI error recovery checks remain.

- GitHub-specific Python environment mismatch: the container's bare `pip` installed Playwright for a different interpreter than `actions/setup-python` selected. Browser setup now uses the image's native Python (no host `setup-python` override) and `python3 -m pip`, matching the interpreter that runs the checks and the Noble container's libraries. Failure annotations expose the exact command/traceback when log downloads are unavailable.

Every contract command and every browser check in `trust-checks.yml` passed locally after these repairs. Browser tests used Playwright 1.58 with an available Chromium executable. Actual GitHub CI results must be checked on the new PR; local results alone do not establish runner success.

## SMTP remains an external setup requirement

The last read-only Supabase configuration inspection found no custom SMTP and a built-in sending quota of 2 emails/hour. Google OAuth was also disabled. This task does not disable confirmation, change production quotas, store SMTP secrets, or claim successful mail delivery. The available Supabase connector's configuration update tool does not expose SMTP or email-rate-limit fields. An SMTP provider account and verified sender/domain must be configured securely in the Supabase dashboard, followed by an appropriately sized provider-compatible sending quota. See `signup-email-delivery.md` for the setup and verification checklist. Credentials must not be sent in chat.
