# Interactive AI timeout and retry recovery

## Code-path issue

The serverless solve endpoint previously raced the provider against a 30-second timer, while each lite-model call could consume two 10-second attempts before trying another model. A subsequent fallback or the required repair call could outlive that race. The losing provider chain was not cancelled. The browser independently aborted at 35 seconds. The local solve endpoint had a separate provider implementation with much longer attempts, so its request could continue long after the browser gave up.

## Focused change

- Interactive serverless solve has one 50-second deadline, starting before authentication. This leaves nominal headroom under the configured Vercel 60-second function duration; slow authentication counts against the provider budget.
- Provider attempts get up to 24 seconds, clipped to the request's remaining time. Deadline-bound calls try each model once before moving on, rather than repeating a stalled model. Legacy non-interactive caller timeouts are unchanged.
- The same deadline and AbortSignal cover initial generation, fallback models, key rotation and the one repair. Expiry aborts the active fetch and prevents later attempts; success/error paths clear timers and abort leftover work.
- Local interactive solve now uses the same provider runtime with a 50-second generation/repair budget. Other local batch/vision/translation paths are unchanged. Local errors use the existing sanitized provider-status mapping rather than exposing raw provider error text.
- Browser waits up to 65 seconds for transport/authentication overhead, including reading the response body. Its progress notice says about 50 seconds, matching the provider budget. Timeout keeps the question and explicit Try again recovery. There is no automatic retry storm, fake successful answer, or relaxation of the four-approach requirement.
- Asset/service-worker cache version: 26d2.

## Verification and limits

`provider_budget.js` uses a virtual clock and mocked fetch to test a 20-second successful response, aborting a stalled model and using fallback, total 50-second expiry, no post-expiry attempts, expired repair budget and caller cancellation. `serverless_smoke.js` checks that repair shares the exact budget/signal and that resources are released.

Desktop/mobile `science_timeout_browser.js` proves a 40-second wait survives the old cutoff, a 504 preserves the science question, explicit retry sends the same question once and can display four explanations, and the 65-second browser safety timeout remains recoverable. `pasted_question_browser.js` now tests a 40-second response. Access-control, prose, radical (960 comparisons), quadratic square (900 comparisons) and routing regressions pass.

These tests mock provider responses. No production/provider logs were accessed, and no live provider or deployment verification was performed. A real provider outage, quota limit, invalid key or repeated slow models can still produce an honest failure. This change fixes premature/inconsistent timeouts and orphaned retry work; it does not guarantee an answer when the provider cannot respond. No subject source content or crops were edited.
