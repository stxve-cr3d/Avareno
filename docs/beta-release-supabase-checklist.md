# Invite-only beta: Supabase release checklist

This checklist is for a controlled 10–20-person beta. Use a local or dedicated
non-production project first. Never run the QA script against production or
real user data.

## 1. Apply the reviewed configuration

- [ ] Link the intended Supabase project explicitly and confirm its project id
  before any command that changes remote state.
- [ ] Apply every migration under `supabase/migrations/` in timestamp order.
- [ ] Confirm the migration history contains:
  - `20260717061246_beta_authorization_rls.sql`
  - `20260717061534_beta_private_storage.sql`
  - `20260717063836_beta_service_role_account_deletion.sql`
  - `20260717101259_beta_function_execute_grants.sql`
- [ ] Run Supabase Database and Security advisors and resolve new critical or
  high findings before inviting testers.
- [ ] Do not apply `docs/supabase-rls-foundation.sql` or
  `docs/supabase-storage-policies.sql`; those files only point to the versioned
  migrations.

## 2. Authentication dashboard settings

- [ ] Authentication > General: disable public user signups.
- [ ] Keep email/password enabled for already invited/admin-created users.
- [ ] Disable anonymous sign-ins.
- [ ] Disable phone/SMS auth, Magic Link UI, Web3 and every social/OAuth
  provider for this beta, including Google and Apple.
- [ ] Create or invite each tester through a trusted admin workflow; never
  distribute the service-role key or an admin endpoint to testers.
- [ ] Configure a verified SMTP sender and test email verification, password
  reset and recovery end-to-end on the exact beta origin.
- [ ] Set Site URL to the exact beta app origin.
- [ ] Restrict Redirect URLs to the exact beta origin plus:
  - `/auth/callback`
  - `/reset-password`
- [ ] Remove wildcard and obsolete preview redirect URLs.
- [ ] Review access-token lifetime and refresh-token reuse protection. Keep the
  access lifetime short enough for the beta risk profile. The database and
  Storage policies also reject deleted Auth subjects while an old JWT remains
  cryptographically unexpired.
- [ ] Verify login, logout, forgot-password and reset-password with one
  controlled invited account. Verify `/signup` does not create an account.

Supabase documents that disabling signups still permits existing users to sign
in, while invite/admin creation remains an administrative operation. Session
JWTs normally remain valid until expiry, which is why Avareno applies the
additional active-subject policy and backend revocation tombstone.

## 3. Server environment

Set these on the backend only:

```text
AVARENO_REQUIRE_AUTH=1
BETA_INVITE_ONLY=true
ENABLE_RECEIPT_EXTRACTION=false
ENABLE_DOCUMENT_PROCESSING=false
ENABLE_OAUTH=false
ENABLE_HOUSEHOLD_SHARING=false
ENABLE_PUBLIC_DOCUMENT_LINKS=false
ENABLE_INLINE_DOCUMENT_PREVIEW=false
ENABLE_BILLING=false
ENABLE_DOCUMENT_UPLOADS=true
AVARENO_MAX_UPLOAD_BYTES=10485760
AVARENO_ENABLE_STATIC_UPLOADS=0
SUPABASE_URL=<server configuration>
SUPABASE_PUBLISHABLE_KEY=<public project key>
SUPABASE_SERVICE_ROLE_KEY=<server secret manager only>
```

- [ ] Store `SUPABASE_SERVICE_ROLE_KEY` only in the backend secret manager.
- [ ] Do not prefix it with `VITE_`, include it in frontend env files, log it,
  or expose it through diagnostics.
- [ ] Confirm the backend refuses to boot when invite-only mode is enabled
  without `AVARENO_REQUIRE_AUTH=1`.
- [ ] Confirm Receipt Extraction, document processing, signed public links,
  Household sharing and Billing return a server-side disabled response.
- [ ] Confirm no AI/OCR provider credential is configured for the beta.
- [ ] Confirm the deployment does not mount `/uploads` as static public files.

## 4. Frontend environment

```text
VITE_AUTH_PROVIDER=supabase
VITE_BETA_INVITE_ONLY=true
VITE_ENABLE_RECEIPT_EXTRACTION=false
VITE_ENABLE_DOCUMENT_PROCESSING=false
VITE_ENABLE_OAUTH=false
VITE_ENABLE_HOUSEHOLD_SHARING=false
VITE_ENABLE_PUBLIC_DOCUMENT_LINKS=false
VITE_ENABLE_INLINE_DOCUMENT_PREVIEW=false
VITE_ENABLE_BILLING=false
VITE_ENABLE_DOCUMENT_UPLOADS=true
```

- [ ] Configure only the Supabase URL and publishable/anon key in the browser.
- [ ] Build the production frontend and run the secret-presence scan described
  in the release report. Report only presence/absence, never values.
- [ ] Verify Signup and OAuth controls are absent and direct signup navigation
  returns to Login.

Frontend flags are presentation controls. The backend configuration and
database policies remain the authority.

## 5. Database authorization

- [ ] RLS is enabled and forced on every user-related public table.
- [ ] `SELECT`, `INSERT`, `UPDATE` and `DELETE` have separate reviewed policies.
- [ ] Every update has both `USING` and `WITH CHECK` where applicable.
- [ ] `documentId`, `itemId`, `householdId`, `spaceId` and `parentId` relations
  require the current authenticated owner and a consistent parent chain.
- [ ] Browser users cannot assign ownership to another user.
- [ ] Household membership writes are disabled for the beta.
- [ ] Views use invoker semantics and have no implicit client grants.
- [ ] Public RPC/function grants are revoked except the reviewed ownership and
  active-Auth helper functions.
- [ ] The service role has only the extra public-table rights needed for the
  server-side account deletion path.

## 6. Storage

- [ ] `documents`, `receipts`, `object-images` and `support-files` are private.
- [ ] `avatars` is the only public bucket; public listing and foreign writes are
  still denied.
- [ ] Bucket limits are 10 MiB for private files (2 MiB for avatars).
- [ ] Allowed private upload MIME types are PDF, JPEG and PNG only.
- [ ] Object names follow `<auth.uid()>/<server-generated-id>.<extension>`.
- [ ] Policies check both the first folder segment and `owner_id` for writes.
- [ ] Anonymous access to private files fails.
- [ ] User B cannot list, read, sign, update or delete User A's object.
- [ ] Account deletion removes objects through the Storage API and verifies the
  user prefix is empty; do not delete rows directly from `storage.objects`.

## 7. Controlled release QA

With local Supabase running and no real data present:

```bash
npx supabase db reset --local
node qa-beta-security.mjs
npm run verify
git diff --check
```

- [ ] `qa-beta-security.mjs` reports all controlled checks as PASS. It must test
  User A, User B and anon with real local Auth sessions.
- [ ] Backend tests cover the Receipt kill-switch before DB/provider access,
  upload validation, object authorization and account deletion.
- [ ] The integrated account deletion test removes User A's local resources,
  public Supabase rows, Storage objects and Auth user, then rejects the old
  token in Auth, backend API, PostgREST and Storage.
- [ ] User B remains unchanged after every negative and deletion test.
- [ ] Landing and onboarding smoke QA pass at desktop and mobile sizes without
  modifying landing/marketing design.

## 8. Privacy and operational review

- Purpose: private product/document memory for invited testers only.
- Data: account email/name, product metadata, reminders and user-selected
  PDF/JPEG/PNG documents; no automatic OCR/AI extraction.
- Minimization: no mailbox/drive import, no OAuth, no Household sharing, no
  billing, no public document links and no automatic previews/processing.
- Storage: Supabase Auth/Database/private Storage plus the current authenticated
  backend data store; documents remain private and owner-scoped.
- Retention: user-controlled document/product deletion and full account
  deletion are active; backup expiry remains an operational policy item.
- Export: authenticated JSON/ZIP export exists for current backend data; a
  durable production export-job workflow remains outside this small beta.
- Third parties: Supabase and the configured auth-email provider only for this
  scope. Confirm region, DPA/AVV, retention and transfer details before invites.
- AI: disabled. No uploaded document is sent to an AI/OCR provider.
- Secrets: publishable key in browser; service-role and provider credentials on
  the server only.
- Logs: deletion logs contain phase/status only, never document data, paths,
  payloads, account identifiers or credentials.
- Abuse controls: invite-only accounts, no public signup, strict object RLS,
  private Storage and a 10 MiB/type-restricted upload path.

## 9. Explicit accepted beta risks and blockers

- [ ] Malware scanning is not implemented. Accept this only for the small,
  known invite cohort; files are private, type/magic-byte checked and never
  auto-processed. Add malware scanning before untrusted/public uploads.
- [ ] Define database and Storage backup retention, deletion propagation and
  restore exclusions. Account deletion cannot erase immutable backup copies
  immediately unless the provider policy supports it.
- [ ] Confirm Supabase and SMTP DPA/AVV, region, subprocessors and retention.
- [ ] Confirm legal/privacy copy with qualified counsel; engineering tests do
  not establish GDPR compliance.
- [ ] Repeat the two-user QA against the exact intended beta project after its
  migrations/dashboard settings are applied and before sending invitations.

Release must remain blocked until every unchecked item that applies to the
target beta environment has an owner, evidence and explicit approval.
