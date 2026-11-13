# Google sign-in and Kritin welcome

## Application behavior

Both sign-in and create-account views offer **Continue with Google**, alongside existing email/local credentials. The button discovers the enabled provider through Supabase's public `/auth/v1/settings` endpoint before requesting the SDK OAuth URL. Disabled Google configuration, network failures and SDK errors show a local retryable message; no secret or provider-supplied error description is displayed. A pending guard blocks duplicate requests. Google uses the existing Supabase session bootstrap, saved-owner separation and server-side authorization; it does not grant admin or paid-AI permissions.

The OAuth redirect is the current origin's root (no arbitrary return URL), which must be in Supabase's redirect allowlist. OAuth URL navigation is restricted to the configured Supabase origin's authorize endpoint. Existing SDK session detection consumes successful callback tokens. Cancelled/error callbacks are normalized to the login route with a generic message, without retaining credential/error payloads.

## Required dashboard setup — not yet activated

Read-only connector inspection found Google disabled and no Google OAuth client configured on the existing project `fynlvbtefmawisauzitu`. No production auth settings were changed.

1. In Google Cloud, configure an OAuth consent screen and create an OAuth **Web application** client. If the consent screen is in testing, add permitted test users.
2. Set the Google client's authorized redirect URI to `https://fynlvbtefmawisauzitu.supabase.co/auth/v1/callback`.
3. In Supabase → Authentication → Sign In / Providers → Google, enter the client ID and client secret **in the dashboard**, enable Google, and save. Never commit or send the secret in chat.
4. Supabase's Site URL and redirect URL currently include `https://upay-zeta.vercel.app/`. Add exact additional deployed origins if needed. Avoid broad wildcard allowlists; preview origins are not automatically authorized.
5. Verify on the deployed site with a real Google account: new signup, returning sign-in, cancellation, sign-out, and saved-account separation. Mock tests do not verify Google's consent flow or actual session issuance.

## Welcome animation

A standalone, tiny script creates a decorative Kritin logo reveal on fresh page loads. The original logo rises into place with a red glow and line reveal; it fades out after 1.45 seconds and is removed by 1.95 seconds independently of app/network state. It is non-interactive, inert, hidden from assistive technologies, and never moves focus or locks scrolling. Reduced-motion users receive an unanimated brief reveal removed after 160ms. Logo failure/page exit removes it, and it is not replayed on SPA route changes or a restored back-forward page. No animation library or generated artwork is used.

## Checks

`tools/check/google_welcome_browser.js` covers both login modes, disabled provider behavior, OAuth arguments and mocked handoff, SDK failure/retry, safe cancellation, layout at 1280px/390px, reduced motion, and cleanup even when app boot fails. These are integration tests with mocked authentication, not a completed real Google login.
