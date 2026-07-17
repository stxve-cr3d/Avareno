# Avareno Auth Foundation

## Invite-only beta profile (current release target)

The 10–20-person beta uses Supabase email/password only. Public signup,
Magic Link UI, phone/SMS, passkeys, OAuth, Household sharing, Billing, Receipt
Extraction, OCR/document processing, public document links and inline document
preview are disabled. `backend/app/config.py` is the server authority;
`frontend/src/lib/betaFeatures.ts` only mirrors the presentation state.

The backend must run with `AVARENO_REQUIRE_AUTH=1` and refuses to boot in
invite-only mode without it. Users are provisioned through a trusted Supabase
admin/invite workflow. Exact dashboard and deployment settings are tracked in
`docs/beta-release-supabase-checklist.md`.

## Provider

Avareno uses Supabase Auth as the production auth provider. The frontend uses the official `@supabase/supabase-js` client for:

- email/password signup and login
- phone/SMS OTP signup and login when explicitly enabled
- password reset links
- email verification callback handling
- Google OAuth redirect
- Apple OAuth redirect
- persisted/refreshing Supabase sessions

The local mock mode exists only when `VITE_AUTH_PROVIDER=mock` is set explicitly. Do not enable mock auth in production.

## Frontend Environment

Use `frontend/.env.example` as the local template.

- `VITE_AUTH_PROVIDER=supabase`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_AUTH_REDIRECT_URL`
- `VITE_AUTH_EMAIL_REDIRECT_URL`
- `VITE_AUTH_PASSWORD_RESET_URL`
- `VITE_AUTH_GOOGLE_ENABLED=true` only after Google is enabled in Supabase
- `VITE_AUTH_APPLE_ENABLED=true` only after Apple is enabled in Supabase
- `VITE_AUTH_PHONE_ENABLED=true` only after Phone Auth is enabled in Supabase with Twilio
- `VITE_AUTH_PASSKEY_ENABLED=true` only after Passkeys are enabled in Supabase

Legacy Supabase projects can still use `VITE_SUPABASE_ANON_KEY`; the frontend prefers `VITE_SUPABASE_PUBLISHABLE_KEY` when both are present.

Never expose Supabase service-role keys in the frontend.

## Backend Environment

Use `backend/.env.example` as the production template.

- `AVARENO_REQUIRE_AUTH=1`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- optional `SUPABASE_JWT_SECRET` for legacy/shared-secret JWT verification
- `SUPABASE_JWT_AUDIENCE=authenticated`
- `SUPABASE_SERVICE_ROLE_KEY` only for the server-side full account-deletion
  orchestrator; never expose or log it

When auth is required, `/api/*` requests need a Supabase bearer token. The frontend adds the current Supabase access token automatically. The backend validates the token with Supabase Auth using `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY`, or with `SUPABASE_JWT_SECRET` when explicitly provided. The backend mirrors the Supabase `sub` claim into the local `User.id` so existing user-owned queries continue to isolate by user id.

## Email Sender

Automated auth/system emails should use:

- From: `Avareno <noreply@avareno.de>`
- Reply-To: `info@avareno.de`
- Human support contact in templates: `info@avareno.de`

Use `noreply@avareno.de` for email verification, password reset, magic/login links, security notifications, and system account messages. Do not invite users to reply to `noreply@avareno.de`.

## Domain And DNS Setup

In Supabase Auth/email settings, verify:

- `avareno.de`
- `noreply@avareno.de`
- `info@avareno.de` if the provider requires Reply-To verification

DNS records to configure through the email provider:

- SPF for the sending service
- DKIM for `avareno.de`
- DMARC for `avareno.de`

Recommended DMARC rollout:

1. Start with `p=none` while testing delivery.
2. Move to `p=quarantine` after alignment is confirmed.
3. Move to `p=reject` once all Avareno senders are aligned.

## Supabase Redirect URLs

Add these URLs in Supabase Auth URL Configuration:

- `http://localhost:5173/auth/callback`
- `http://localhost:5173/reset-password`
- production app URL `/auth/callback`
- production app URL `/reset-password`

## Google OAuth Setup

1. Configure the Google OAuth consent screen.
2. Add the Supabase callback URL from the Supabase Google provider settings in Google Cloud.
3. Store Google client id/secret only in Supabase provider settings.
4. Verify the OAuth client is enabled in Google Cloud and that a real test login reaches `/auth/callback`.
5. Set `VITE_AUTH_GOOGLE_ENABLED=true` only after the provider is active and the test login succeeds. If Google returns `disabled_client`, keep this flag `false` until the Google OAuth client is re-enabled or replaced.

## Apple OAuth Setup

1. Configure Sign in with Apple in Apple Developer.
2. Add the Supabase callback URL from the Supabase Apple provider settings.
3. Store Apple client id/team id/key id/private key only in Supabase provider settings.
4. Set `VITE_AUTH_APPLE_ENABLED=true` after the provider is active.

## Magic Link Setup

Supabase Magic Links use the same email OTP endpoint as passwordless email login. Email provider credentials stay in Supabase; do not add SMTP secrets to frontend or backend env files.

1. Keep Email enabled in Supabase Auth.
2. Configure Site URL and redirect allowlist with `/auth/callback` for local and production origins.
3. Configure the Supabase Magic Link email template and sender/domain before production use.
4. Keep Turnstile enabled for the local signup/login forms when Supabase Captcha Protection is active.
5. Test opening the Magic Link in the same browser and on the same origin used to request it.

The frontend Magic Link flow:

- calls Supabase `signInWithOtp({ email, options: { emailRedirectTo, shouldCreateUser } })`
- sends only email address, optional signup display name, and optional Turnstile token to Supabase
- uses `shouldCreateUser=false` on login to avoid accidentally creating accounts
- uses `shouldCreateUser=true` on signup so a Magic Link can create the account
- does not send SMTP credentials or service-role keys to frontend or backend code

Before production launch, verify sender domain, SPF/DKIM/DMARC, provider DPA/AVV, email retention/deletion behavior, rate limits, abuse controls, and user-facing Datenschutzerklaerung disclosure.

## Twilio / Phone Auth Setup

Twilio is used as the SMS provider for Supabase Phone Auth. Keep Twilio credentials in Supabase only; do not add Twilio account tokens to frontend or backend env files.

1. Create or use an existing Twilio account.
2. Create a Twilio Messaging Service or choose a verified Twilio sender/phone number.
3. In Supabase, open Authentication -> Sign In / Providers -> Phone.
4. Enable Phone provider and configure Twilio with the Account SID, Auth Token, and Messaging Service SID or sender number required by the Supabase form.
5. Keep SMS templates short and clearly branded as Avareno.
6. Set `VITE_AUTH_PHONE_ENABLED=true` only after Supabase Phone Auth is active and a real SMS test succeeds.

The frontend exposes Phone Auth only when `VITE_AUTH_PHONE_ENABLED=true`. The phone flow:

- formats a selected country prefix plus the entered local number into E.164 format before calling Supabase
- calls Supabase `signInWithOtp({ phone, options: { channel: "sms" } })`
- verifies the user-entered code with `verifyOtp({ phone, token, type: "sms" })`
- sends only phone number, OTP, optional signup display name, and optional Turnstile token to Supabase
- does not send Twilio credentials to frontend or backend code

Before production launch, verify Supabase project region, Twilio region/data handling, DPA/AVV status, SMS retention/deletion behavior, rate limits, abuse controls, and user-facing Datenschutzerklaerung disclosure.

## Passkey Setup

Passkeys use Supabase's experimental WebAuthn support. Keep the feature gated until the Supabase project is configured and tested on the exact app origin.

1. Enable Passkeys / WebAuthn in the Supabase Auth settings for the project.
2. Configure the allowed relying party/origin values for the local app and production app.
3. Test locally on one exact origin. Use `localhost` for local passkeys; `127.0.0.1` is not a valid WebAuthn relying party id.
4. Register a passkey from Account -> Account & Sicherheit while signed in.
5. Test `Mit Passkey fortfahren` on the login screen.
6. Set `VITE_AUTH_PASSKEY_ENABLED=true` only after registration and sign-in both work.

The frontend opts into Supabase passkeys through `auth.experimental.passkey` only when `VITE_AUTH_PASSKEY_ENABLED=true`.

Local passkey settings:

- Relying Party Display Name: `Avareno`
- Relying Party ID: `localhost`
- Relying Party Origins: `http://localhost:5173`

## Profile And RLS Notes

Display preferences and basic profile presentation are currently derived from Supabase Auth user metadata for the MVP:

- `display_name`
- `avatar_url`
- `private_profile`
- `motivation_enabled`
- `leaderboard_enabled`
- `avareno_interests`

Phone-auth users may not have an email address. Do not require email for authorization checks; use the Supabase Auth user id (`sub`) and a future RLS-backed profile table.

First-product onboarding status is not sourced from `user_metadata` or `localStorage`. Supabase `user_metadata` is user-editable and must not be trusted for routing, authorization or security decisions. The authenticated app backend owns `onboardingStartedAt`, `onboardingCompletedAt`, `onboardingDismissedAt` and `firstProductDetailOpenedAt`; product/document existence is checked within the same user scope. Legacy `onboarding_completed` metadata may remain during migration but is not the source of truth.

When backend token verification uses the Supabase Auth user endpoint, the trusted Supabase `created_at` value is mirrored into the local user record so time-to-first-product starts at account creation. Legacy shared-secret JWT verification may not expose that field; its fallback starts when the local user row is first created and should not be used for exact registration-funnel reporting without an authoritative auth-created timestamp.

For production Supabase tables, add a `profiles` table keyed by `auth.users.id`, enable RLS, and require `auth.uid() = auth_user_id` for select/update. Keep service-role access server-side only.

The executable Postgres/RLS source of truth is under `supabase/migrations/`.
The similarly named files under `docs/` are pointers only and must not be
applied as policy drafts. Run the controlled two-user QA after every migration
or policy change.

## Security Notes

- Redirects after login are limited to internal app routes.
- OAuth buttons are disabled until the matching provider is explicitly enabled.
- Phone OTP is disabled until `VITE_AUTH_PHONE_ENABLED=true` and Supabase Phone Auth has been tested.
- Passwords are handled only by Supabase Auth.
- Tokens are managed by the Supabase client and sent to the backend as bearer tokens for API calls.
- The FastAPI auth guard is enabled with `AVARENO_REQUIRE_AUTH=1`.

## Object Authorization Boundary

Authentication does not authorize access to a client-supplied object id by itself. Backend queries must bind the resource id and the verified Supabase `sub` (or an explicitly supported tenant relationship) in the same server-side authorization boundary. Missing and inaccessible resources use the same not-found response.

For `/api/extract/receipt` specifically:

- the invite-beta kill-switch rejects the request before database, resource,
  Storage, quota, job or provider access;
- the route requires a verified session/JWT;
- the document and its server-stored upload path are resolved only after authorization;
- the document owner may process it;
- a Household OWNER or active EDITOR may process a linked non-Vault document only when document, item and household ownership form a consistent chain;
- VIEWER, inactive membership and all household access to Vault documents are denied;
- provider calls and quota consumption occur after authorization;
- the final document update repeats the same authorization predicate and verifies that exactly one row changed.

The same rule applies to relationship inputs such as `documentId`, `itemId`, `householdId`, `spaceId` and `parentId`: validate the target and its parent/tenant relationship before insert or update, and tenant-scope the final write.

## Account deletion and old sessions

`POST /api/privacy/deletion/request` is an authenticated execution endpoint,
not a request queue. It fails closed unless the server-only Supabase admin
configuration is available. It deletes the user's private Storage prefixes,
Supabase public rows, local files and user-owned database rows, verifies
absence, and deletes the Supabase Auth user last. The process is idempotent for
server retries.

Supabase access JWTs can remain cryptographically valid until expiry after an
Auth user is deleted. A restrictive `beta_auth_user_active()` RLS/Storage
policy and a short-lived hashed backend revocation tombstone therefore reject
the old subject immediately without retaining the raw Auth id in the
tombstone.
