# Vercel deployment — owner checklist

On 7 November 2026, the existing Vercel project `upay` was deployed and its production domain is **https://upay-zeta.vercel.app/**. The first deployment was performed through Vercel's CLI after the owner approved browser authorization. The public guest browser smoke checked the site boot, bundled Supabase SDK, Accountancy source catalog, pagination, mobile and Hindi UI, representative PDF checksums, and blocked server-only paths. The 26k update was also tested on live desktop, tablet and phone widths: the Board, Class and Subject selectors are visible together and update the study scope. A deliberately invalid sign-in returned a safe error. Successful real-user sign-in, password recovery and paid AI have not been tested.

The **26aa source** includes Class 12 Economics with 24 textbook PDFs, 90 Economics and 4 Biology test-paper PDFs, and Class 12 English with 40 supplied textbook-selection PDFs and 101 English Core/Elective test-paper PDFs. The public site only reflects a source update after it is deployed and promoted. Years and answer keys for the new test papers are not asserted; Indian Economic Development books and English Elective fiction novels were not supplied. A public source repository exposes the included PDFs but excludes private runtime state and does not back up every original upload. The previously generated 26l package in temporary cache is outdated and not a durable backup; use the current clean source if deploying later.

The project's `SUPABASE_PUBLISHABLE_KEY` is configured for production, preview and development. This is **not** a secret rotation. The older `SUPABASE_ANON_KEY` and sensitive `SUPABASE_SERVICE_ROLE_KEY` project settings remain; the exposed legacy service-role credential also remains active at Supabase. See `SECURITY-AND-QA.md` for the safe migration and revocation sequence. Treat Gemini credentials recoverable from the old archive or exposed local runtime data as compromised too.

## Important live-site limits

- The 17 Accountancy source PDFs in `assets/papers/accountancy/` are public on the hosted site. They are separate from the searchable question bank and are not answer keys.
- Vercel uses Supabase email sign-in. Local username/password accounts in the standalone server's `data/` are not available on Vercel and are not included in the source package.
- The serverless Admin key-management API is disabled. The production project needs a **replacement** Gemini credential in protected `GEMINI_KEYS`; if both exist, `GEMINI_KEYS` takes precedence over `GEMINI_KEY`. Set `UPAY_AI_ALLOWED_USERS` to the comma-separated Supabase UUIDs of users permitted to make paid AI requests. With no allowlist, paid AI is deliberately denied.
- The Vercel telemetry endpoint is a no-op and does not store events. Anonymous visitors can use the public study pages. Real-user authentication, recovery, and paid AI still need an owner-led production test. Review Supabase email/redirect configuration and add abuse/rate limits and provider budget alerts.
- Never paste credentials into chat, source files or a repository. Preserve private standalone app data and original uploads separately; the clean source package excludes them.

## Deploy a later update

Obtain the current clean source from the repository or a verified source package. On a computer with Node.js and npm, open a terminal in the `Upay` folder:

```sh
npx vercel login
npx vercel link
```

When prompted, choose the existing owner team and **upay** project, not a new project. This source package is larger than a single Hobby CLI upload; Vercel documents `--archive=split-tgz` for large archives. For a production-targeted staging deployment without changing the production domain, run:

```sh
npx vercel deploy --prod --skip-domain --archive=split-tgz
```

Review Vercel's build output and verify the staged deployment as permitted by its protection settings. Only after verifying should an authorized owner promote the new deployment to the public production domain. Do not create or reveal an automation-protection bypass merely to run a smoke test. Verify the public domain, sign-in with your own account, intended source-paper links and an allowlisted AI request after promotion. Check private-path access, provider limits and logs. Rotating or revoking signing secrets can invalidate existing sessions; plan reauthentication.
