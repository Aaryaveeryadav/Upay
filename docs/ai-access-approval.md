# AI access approvals — selected policy and secure rollout

## Owner choices

- Admin approval, not automatic public access.
- 30 attempted AI requests per student per UTC day.
- 300 attempted AI requests site-wide per UTC day.
- Credential revocation remains unconfirmed. Live migration/activation is ON HOLD.

Students never receive the provider API key. After rollout, they open My account
→ Request / manage AI access, sign in and submit a request. A designated owner
opens the same page → Manage student requests to approve/revoke. Admin decisions
require confirmation and are written to an audit table. Repeating a request does
not reverse revocation. No emails need to be sent to the coding agent.

This screen grants AI permission only, not general site administrator rights.
Admin identity comes from `UPAY_AI_ADMIN_USERS` on the server after Supabase
verifies the bearer token; client metadata or posted IDs cannot grant admin.
The most recent 200 requests are displayed. This first version has no paging,
email notifications or independent permission-expiry policy.

## Required owner action — do not paste keys in chat

1. In the provider dashboards, revoke previously exposed Gemini and Supabase
   service-role credentials, and replace any affected credentials securely in
   Vercel. Replacing an environment variable alone does not revoke the old key.
   If rotating a legacy Supabase JWT secret, review session/anon-key effects
   before proceeding; do not blindly revoke unrelated working credentials.
2. Confirm completion without sharing credential values.
3. Supply the missing original Physics board papers and official marking schemes.
4. Configure provider billing alerts. For the app's optional 80%-usage webhook,
   enter an administrator-owned HTTPS receiver as `UPAY_AI_ALERT_WEBHOOK` in
   Vercel, not in chat. Without a receiver, no delivered alert is claimed.

## Rollout after credential safety confirmation

- Apply both `supabase/migrations/202611100001_ai_usage_guard.sql` and
  `supabase/migrations/202611110001_ai_access_approval.sql` with an authorized
  Supabase admin. These files have NOT been applied by this change.
- Keep all access tables RLS enabled, with no anonymous/authenticated RPC grants.
- Set `UPAY_AI_ADMIN_USERS` to the designated owner's Supabase UUID (not email).
  Match the existing owner account server-side; do not hardcode it in browser JS.
- Before enabling database-backed access, seed approval records for any existing
  students that should keep access. The owner's administrator UUID gets owner
  access; the old student allowlist is deliberately NOT a bypass after rollout.
- Set production `UPAY_AI_ACCESS_ENABLED=true`, `UPAY_AI_LIMITS_ENABLED=true`,
  `UPAY_AI_USER_DAILY_LIMIT=30`, `UPAY_AI_GLOBAL_DAILY_LIMIT=300`.
- Keep the provider and service-role credentials server-side only. Redeploy.
- Verify request, approve, solve, revoke, and simultaneous daily-limit calls
  using dedicated test accounts, then confirm logs show no secret values.

When access setup is disabled, the screen clearly says setup is pending;
existing allowlist behaviour is preserved. Once enabled, a permission lookup
failure denies AI rather than falling back to the old allowlist. Administrator
identity alone does not disable spending limits. Database-backed access also
requires the usage guard enable flag; enabling approvals alone does not enable AI. The global kill switch still
blocks all AI. The standalone local server does not implement the new RPC access
flow; this is a Vercel/Supabase feature.
