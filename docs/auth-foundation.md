# Avareno Auth Foundation

## Provider

Avareno uses Supabase Auth as the production auth provider. The frontend uses the official `@supabase/supabase-js` client for:

- email/password signup and login
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

Legacy Supabase projects can still use `VITE_SUPABASE_ANON_KEY`; the frontend prefers `VITE_SUPABASE_PUBLISHABLE_KEY` when both are present.

Never expose Supabase service-role keys in the frontend.

## Backend Environment

Use `backend/.env.example` as the production template.

- `AVARENO_REQUIRE_AUTH=1`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- optional `SUPABASE_JWT_SECRET` for legacy/shared-secret JWT verification
- `SUPABASE_JWT_AUDIENCE=authenticated`

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

- `http://127.0.0.1:5173/auth/callback`
- `http://127.0.0.1:5173/reset-password`
- production app URL `/auth/callback`
- production app URL `/reset-password`

## Google OAuth Setup

1. Configure the Google OAuth consent screen.
2. Add the Supabase callback URL from the Supabase Google provider settings in Google Cloud.
3. Store Google client id/secret only in Supabase provider settings.
4. Set `VITE_AUTH_GOOGLE_ENABLED=true` after the provider is active.

## Apple OAuth Setup

1. Configure Sign in with Apple in Apple Developer.
2. Add the Supabase callback URL from the Supabase Apple provider settings.
3. Store Apple client id/team id/key id/private key only in Supabase provider settings.
4. Set `VITE_AUTH_APPLE_ENABLED=true` after the provider is active.

## Profile And RLS Notes

The frontend profile is derived from Supabase Auth user metadata for the MVP:

- `display_name`
- `avatar_url`
- `private_profile`
- `motivation_enabled`
- `leaderboard_enabled`
- `onboarding_completed`
- `avareno_interests`

For production Supabase tables, add a `profiles` table keyed by `auth.users.id`, enable RLS, and require `auth.uid() = auth_user_id` for select/update. Keep service-role access server-side only.

The current SQLite MVP schema is mirrored by `docs/supabase-rls-foundation.sql` as a first Supabase Postgres RLS baseline. Apply it only after the matching public tables exist, then run Supabase advisors before production use.

## Security Notes

- Redirects after login are limited to internal app routes.
- OAuth buttons are disabled until the matching provider is explicitly enabled.
- Passwords are handled only by Supabase Auth.
- Tokens are managed by the Supabase client and sent to the backend as bearer tokens for API calls.
- The FastAPI auth guard is enabled with `AVARENO_REQUIRE_AUTH=1`.
