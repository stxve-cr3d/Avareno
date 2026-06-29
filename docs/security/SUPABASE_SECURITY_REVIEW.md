# Supabase Security Review

Status: repository-based review, 2026-06-28. Not legal advice. Supabase dashboard state was not available in this audit and must be verified before public launch.

Supabase skill/changelog note: reviewed Supabase changelog on 2026-06-28. Relevant current items include recent changes around Data API exposure for new tables and Supabase auth/platform changes. Do not assume dashboard defaults; verify current settings in the project.

## What Was Found In The Repo

- Frontend uses `@supabase/supabase-js` in `frontend/src/lib/authClient.ts`.
- Auth mode is configured through `VITE_AUTH_PROVIDER`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` or legacy anon key.
- Supabase client uses PKCE, persisted sessions, auto-refresh and storage key `avareno-supabase-auth`.
- Optional passkeys use `auth.experimental.passkey` when enabled.
- Optional Google/Apple OAuth flags exist.
- Optional Turnstile passes a challenge token into Supabase Auth signup/login.
- Backend validates Supabase bearer tokens via:
  - Supabase Auth `/auth/v1/user` using publishable key, or
  - optional `SUPABASE_JWT_SECRET` for legacy/shared-secret verification.
- Backend mirrors Supabase `sub` claim into local SQLite `User.id`.
- Docs include:
  - `docs/auth-foundation.md`
  - `docs/supabase-rls-foundation.sql`
  - `docs/supabase-storage-policies.sql`
- RLS draft uses `TO authenticated` plus ownership checks with `(select auth.uid())::text = "userId"` or table-specific owner predicates.
- Admin tables `AdminMembership` and `AdminAuditLog` are documented as backend-only and should not receive broad browser/Data API policies.
- Storage policy draft expects buckets: `avatars`, `object-images`, `receipts`, `documents`, `support-files`.
- Storage policy draft makes avatars public and all other listed buckets private.

## What Could Not Be Verified From Repo

- Supabase project id and region.
- Whether the project is production, staging or local.
- Whether RLS policies are applied in the dashboard.
- Whether tables exist and match the SQLite schema.
- Whether Data API exposure settings expose any tables.
- Whether storage buckets exist and are public/private as expected.
- Whether signed URLs or private download paths are used in production.
- Whether service-role key exists and where it is stored.
- Whether Supabase Auth email provider is default Supabase email or custom SMTP.
- Whether OAuth providers are enabled in the dashboard.
- Whether Twilio/Phone Auth is enabled.
- Whether passkeys are enabled and tested for exact production origin.
- Backup retention and auth deletion/session invalidation behavior.
- DPA/AVV status and subprocessor settings.

## Must-Check Items In Supabase Dashboard

- Confirm project region and document it in provider inventory and Datenschutzerklaerung.
- Confirm DPA/AVV and subprocessor documentation status.
- Confirm Auth providers enabled match frontend env flags.
- Confirm redirect URLs include only intended local/staging/production origins.
- Confirm email templates, sender domain, SPF/DKIM/DMARC and support contact.
- Confirm JWT expiry/session settings fit sensitivity of private documents.
- Confirm MFA/passkey settings if enabled.
- Confirm no service-role key is exposed in frontend build, Pages env, or public docs.
- Confirm database API exposure for each schema/table.
- Confirm RLS enabled on every exposed user-data table.
- Confirm Storage buckets and policies.
- Run Supabase advisors before launch.

## RLS Checklist

- [ ] Every exposed user-data table has RLS enabled.
- [ ] Every policy combines role with ownership, not `TO authenticated` alone.
- [ ] `UPDATE` policies include both `USING` and `WITH CHECK`.
- [ ] No authorization decisions rely on user-editable `user_metadata`.
- [ ] Admin roles are checked through backend-controlled records or Supabase `app_metadata`, never `user_metadata`.
- [ ] `AdminMembership` and `AdminAuditLog` are not exposed to `anon` or broad `authenticated` Data API access.
- [ ] Views use `security_invoker = true` or are not exposed to anon/authenticated.
- [ ] `SECURITY DEFINER` functions are avoided unless reviewed, non-public, and tightly checked.
- [ ] `anon` role has no access to private user tables.
- [ ] Household/member sharing rules are tested for owner, invited member and unrelated user.
- [ ] Cross-user tests prove documents/items/reminders/tokens cannot be accessed by another user.
- [ ] `AffiliatePartner` public/authenticated readability is intentional and contains no user data.

## Storage Checklist

- [ ] Buckets exist: `avatars`, `object-images`, `receipts`, `documents`, `support-files`.
- [ ] `avatars` public status is intentional and documented.
- [ ] `receipts`, `documents`, `support-files`, `object-images` are private.
- [ ] Object paths start with authenticated user id.
- [ ] Users can select/upload/update/delete only their own objects.
- [ ] Private files are served through authenticated/signed URLs, not public URLs.
- [ ] File deletion removes metadata and object.
- [ ] File type/size validation exists before upload.
- [ ] Backup/retention behavior for deleted objects is documented.

## Secrets Checklist

- [ ] Frontend uses only publishable/anon key.
- [ ] Service-role key only exists server-side in protected secret manager.
- [ ] `SUPABASE_JWT_SECRET` only used if explicitly needed and stored server-side.
- [ ] OAuth provider secrets live in Supabase provider settings, not repo/env examples.
- [ ] Twilio credentials live in Supabase settings if phone auth is enabled.
- [ ] Connector/provider tokens are not stored in Supabase until encryption/deletion is implemented.

## Before-Launch Checklist

- [ ] Apply and review RLS migration against actual schema.
- [ ] Apply and review storage policies against actual buckets.
- [ ] Run Supabase advisors and fix findings.
- [ ] Test with two real users plus anon.
- [ ] Verify Data API exposure for public schema.
- [ ] Verify deletion/export flows include Supabase Auth, DB and Storage.
- [ ] Verify region/DPA/AVV/subprocessors.
- [ ] Update public Datenschutzerklaerung and provider inventory.
- [ ] Document backup retention and restore process.
