# Architecture and migration guide

## Current state

The production application is **not yet fully migrated to React**. It is the existing browser application (`index.html`, `assets/js/app.js` and subject data under `assets/`) with a Node.js local server (`server.js`) and Vercel functions (`api/`). Supabase handles hosted authentication. The existing UI, hash routes, student data and deployment remain unchanged. `apps/web/` is an independent, working React 19 / Vite preview of **33 reviewed Class 10 English practice questions**. It is not the complete English bank or the rest of the site, is not linked from the live app and is not included in the current Vercel deployment. Nothing has been moved or deleted to make the repository look tidy at the cost of breaking references.

### Repository responsibilities

- `apps/web/`: React migration preview source and Vite configuration. Compiled preview output goes to ignored `assets/react-study/`; do not commit generated bundles.
- `api/`: authenticated Vercel API handlers. Keep provider credentials on the server.
- `lib/`: shared Node.js policy, authentication, provider, and integrity modules. `ai-provider.js` is the solve-provider boundary.
- `server.js`: current local Node API and public-file allowlist; legacy functionality remains here until extracted and tested.
- `assets/`: public legacy application, public question data and public study PDFs. Treat everything in this directory as public. No secrets or private uploads belong here.
- `docs/`: architecture, provenance and operational documentation; `tools/check/`: regression checks; `tools/extract/`: source extraction tools.
- `supabase/`: database migrations, not a browser asset. `data/`, `uploads/`, `solutions/`, `.env*`, and `node_modules/` are private or generated and ignored by Git. Do not serve the repository root with a generic web server.

The Node public-file allowlist and Vercel denial routes are defense in depth, **not** a security certification. The existing app still needs its documented credential rotation, Supabase policy review, CSP/inline-script reduction, durable abuse limits, dependency monitoring and an independent security audit before a production-security claim.

## Run the React preview

Use Node.js **22.12 or newer** for Vite and the npm toolchain. From the repository root:

```sh
npm ci
npm start                    # existing Node server on port 8004
# In a second terminal:
npm run dev:web               # React preview, typically port 5173
```

Open `/assets/react-study/` on the Vite server. Vite proxies the source-data and PDF requests to the existing Node server; browser code uses same-origin paths. The preview's “Ask AI” action opens the existing app, retaining its authentication and solve policies. Override the proxy target only as an operator with `UPAY_WEB_BACKEND` (a server-side development setting), never with browser input. For a production-style local build, run `npm run build:web` and open `/assets/react-study/index.html` on the Node server. The existing site does not need the React build to run. Build output is ignored and intentionally excluded from Vercel until the migration is reviewed and its deployment explicitly enabled.

## Future model: solve provider boundary

Gemini remains the default. Only the **text solve** path in the local Node server and Vercel `api/ai/solve` has the new adapter. Existing authentication, usage gates, prompts, four-approach checks and narrow integrity checks still apply. Image reading, answer checking, translations, admin key management and other model features still use Gemini; no custom model has been created, trained, evaluated or deployed here. The app does not yet switch question generation or those other routes to the new provider.

When your own model has an authenticated, HTTPS, OpenAI-compatible chat-completions gateway, an operator can explicitly configure the following **server-only** environment variables on the Node host or Vercel:

- `UPAY_SOLVE_PROVIDER=openai-compatible`
- `UPAY_LLM_URL`: exact HTTPS chat-completions URL, without embedded credentials, query or fragment.
- `UPAY_LLM_MODEL`: the gateway's model identifier.
- `UPAY_LLM_KEY`: gateway bearer credential, stored in the hosting provider's secret settings, never committed or placed in browser code.

The gateway must accept `model`, `messages`, `max_tokens`, `temperature` and `stream: false`, and return text in `choices[0].message.content`. The text must satisfy the existing solve JSON contract and quality checks. This is an integration contract, not a guarantee that an arbitrary model produces correct or four distinct solutions. Missing or unsupported configuration fails closed; redirects are disabled; response size and request time are bounded; provider errors are redacted. Credentials and endpoint cannot come from student requests. No automatic fallback to Gemini is made when a custom provider is configured. A secure reachable gateway, operations monitoring, data retention/consent decisions, inference capacity, abuse prevention and independent evaluation must be set up before enabling it for students. HTTPS alone does not establish that an endpoint is trustworthy.

Unset `UPAY_SOLVE_PROVIDER` or set it to `gemini` to retain existing behavior. Test changes with `node tools/check/ai_provider.js`, `node tools/check/serverless_smoke.js`, and `python3 tools/check/backend_smoke.py`; all use mocks, not live model credentials.

## Next migration steps

1. Establish React design-system components and progressively migrate question browsing, exercises, authentication, and the remaining subjects with matching routes, accessible controls, mobile layouts, stored state and source metadata.
2. Introduce typed API contracts and tests; split the large Node server into modules without changing authorization, rate limits or the local/Vercel response contract. Keep public assets and private data separate.
3. Add integration and real-browser tests for each migrated feature, offline/service-worker behavior, accessibility, existing links and deployment. Do not switch the production entrypoint until feature parity and rollback are verified.
4. Only after your model exists, add provider support for question generation, checking, image input and other features as applicable, with evaluation, safety, privacy and cost controls. A model may not support all of these capabilities.
