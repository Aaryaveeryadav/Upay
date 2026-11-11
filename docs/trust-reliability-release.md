# Trust & reliability — implementation and rollout

This is a partial implementation, NOT a claim of a completed content review,
credential rotation, live usage protection, or production deployment.

## Implemented

- Physics import: numeric kinds, safe option arrays and explicit review status.
  60 option sets are complete and whitespace-normalised matches in the stored
  stem. Other option sets are withheld, never guessed. This is structural
  validation, not transcription verification. All 1,019 original English stems
  and answer values are preserved. No verified keys were supplied.
- Question cards identify text/key review status; suspect Physics options are
  explained; problem reports open a GitHub issue draft with record metadata.
  This does not submit a report automatically and requires a GitHub account.
  Source buttons appear only for explicit local source-PDF paths; filenames
  alone are not turned into potentially broken links.
- Outline cards disclose outline-only coverage and inventoried figures.
- Home: scoped last chapter, practice/revision/mistakes/saved shortcuts and a
  user-selected planning goal. The goal is not an enforced question count.
- AI: distinct authentication/access/disabled/provider/limit/timeout codes,
  no raw provider errors exposed, retry seconds only when supplied, copy/save/
  material recovery links. No automatic retry loops.
- Serverless solve/image and local AI endpoints support an administrator kill switch
  (`UPAY_AI_ENABLED=false`). Serverless solve/image also support optional durable attempt limits.
- PR workflow runs syntax, provenance, mocked security/AI contracts, isolated
  backend security and read-only Physics browser checks. CI is not a content
  certification or a live external-service check.

## Usage guard rollout (not yet applied)

1. Confirm all previously exposed credentials have been revoked at their
   providers. Replacing an environment variable is NOT proof of revocation.
   Do not retrieve keys merely to inspect them.
2. Apply `supabase/migrations/202611100001_ai_usage_guard.sql` using the
   authorized Supabase administrator. No anonymous/authenticated execute grants.
3. Set a valid, rotated `SUPABASE_SERVICE_ROLE_KEY` in Vercel server-side only.
4. Set `UPAY_AI_LIMITS_ENABLED=true` in Production.
5. Optional positive-integer limits: `UPAY_AI_USER_DAILY_LIMIT` (default 30),
   `UPAY_AI_GLOBAL_DAILY_LIMIT` (default 300).
6. Optional `UPAY_AI_ALERT_WEBHOOK`: administrator-owned HTTPS receiver. Receives
   the global daily 80% threshold event without user identifiers or prompts.
   Configure a real destination before claiming alerts work. Delivery is best
   effort and not retried. Configure provider billing alerts separately.
7. Redeploy; verify concurrent calls cannot exceed user/global attempt caps.
   Migration is transactional but has not been executed or concurrency-tested
   against the live database in this batch.

Limits count attempted provider calls, NOT tokens or currency. Provider failures
still count. Cached successful responses do not consume attempts. A global
transaction advisory lock serializes count checks. Limits reset at midnight UTC.
Database/config failures deny AI while enabled; no silent in-memory fallback.
The kill switch also blocks AI cache hits. The opt-in defaults off for migration
compatibility: do not claim spending controls are active until rollout completes.
Standalone local-server spending controls are NOT covered by this migration.

## Still outstanding from the requested release

- Whole-source review/reconstruction of Physics stems and missing options using
  actual board papers; the uploaded NCERT chapter PDFs are not those board papers.
- Official answer keys, source verification, and full correct-pick render proof
  with independently verified real questions (rather than invented fixtures).
- Source figures for chapters 1–7 and 9–14, visually checked one figure at a time.
  Chapter 8 remains the only fully inventoried Physics chapter.
- Full chapter-layout standardisation across all legacy subject renderers.
- Guaranteed source links across the bank: many records lack a published path.
- Live credential revocation evidence, provider billing alerts, SQL migration,
  usage-limit rollout and signed-in production AI verification.
- A new production deployment of this branch. No PR/merge is implied by these files.

The original progress ledger remains the source of truth for crop completion.
