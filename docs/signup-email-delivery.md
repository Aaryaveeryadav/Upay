# Signup email delivery — quota incident

## Confirmed cause and unresolved production dependency

Read-only inspection of the connected Supabase project `fynlvbtefmawisauzitu` found:

- `rate_limit_email_sent: 2` (confirmation-email sending quota, per hour).
- No custom SMTP host, username or sender configured.
- Email confirmation enabled (`mailer_autoconfirm: false`).
- Signup enabled (`disable_signup: false`).
- Google provider disabled, with no Google client configured.

The screenshot's **email rate limit exceeded** is a provider email-delivery error. It is not a question/AI limit or a CSS issue. The frontend cannot remove the provider's sending cap. No production settings were changed, and no emails/accounts were created during tests. The current connector does not expose SMTP credentials or email quota updates.

## Owner setup required for higher-volume signup

1. Choose a transactional email provider and verify a sender/domain you control. Configure its required SPF/DKIM records; add a suitable DMARC policy.
2. In Supabase → Project Settings → Authentication → Email / SMTP settings (menu names can vary), enable custom SMTP and enter the provider's host, port, username, password, sender email and sender name. Enter credentials in the dashboard only, never Git or chat.
3. In Authentication → Rate Limits, raise the email sending quota to an appropriate tested value for the expected signup volume and the SMTP provider's allowance. Custom SMTP still has provider/plan limits; this does not promise unlimited mail. Keep per-user resend throttling and other abuse controls.
4. Keep email confirmation enabled. Disabling it avoids confirmation delivery but allows unverified identities and is not the fix implemented here.
5. Test actual confirmation delivery to intended recipients, spam handling, expiry, sign-in after confirmation and bounce monitoring. Then monitor sending usage. Do not repeatedly submit real signups to test the exhausted built-in service.
6. Google OAuth is another option that avoids this particular confirmation-email flow once activated; it is **not yet available** on the inspected project. See `google-signin-and-welcome.md`.

## Code changes

- Signup errors preserve provider `code` and HTTP `status` for reliable classification.
- Email-quota errors show actionable inbox/spam/admin guidance, explain that retries do not clear the limit, and do not claim registration succeeded.
- Generic request throttling and unconfirmed email get distinct messages, including Hindi text.
- Duplicate in-flight form submissions are ignored, without adding a new daily/hourly app limit or automatically retrying requests.
- Supabase rate-limit/unconfirmed-email sign-in errors no longer fall through to the unrelated local-account login.
- Entered fields remain after a failed signup; confirmation instructions stay visible instead of auto-redirecting away after 1.4 seconds.
- Reset inline Google error visibility before email form feedback so errors cannot remain hidden.

Mocked browser tests cover these paths at desktop and mobile sizes, without sending email, using real credentials, or creating accounts. They cannot establish that production mail delivery is fixed.

## Separate Chrome warning in the screenshot

The browser also labels the site **Dangerous**. This is separate from Supabase's email quota. The screenshot does not establish the cause. Do not ask visitors to bypass the warning or enter credentials while it is unresolved. The owner should inspect Google Search Console's Security Issues report, investigate flagged URLs/content and unauthorized changes, remediate any reported problems, then request a review if appropriate. Changing the signup message or sending quota does not clear a browser security/reputation warning. No claim of a clean or compromised site is made by this change.
