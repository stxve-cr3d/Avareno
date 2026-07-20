# Invite-only beta: target deployment verification

Date: 2026-07-18

Repository commit: `1ffb7910fbb79fc2b196c109bc5ccebbb854d445`
(`beta-release-2026-07-17`)

Result: **CONDITIONAL GO**

## 1. Verified target and safety boundary

- Linked project ref: `gstxywgpmegqazztrppi`.
- Dashboard name: `Avareno Beta`.
- Region: `eu-central-1`.
- Project status: `ACTIVE_HEALTHY`.
- The project was newly created on 2026-07-17 and contained zero Auth users,
  public rows and Storage objects before controlled QA.
- The normal Avareno project was identified first and was not mutated. The CLI
  was explicitly relinked before any beta command.
- No production or real user data, private invoices, credentials or secrets
  were used or printed.

## 2. Repository state

- `git diff --check` passed before deployment.
- Existing unrelated Finder/design deletions and untracked design/QA artifacts
  were preserved and never reset.
- No commit or push was performed.
- The magic-byte remediation created uncommitted migration
  `20260718001016_beta_server_only_private_storage_writes.sql` and extended the
  controlled QA. This must be committed separately before a release pipeline
  can reproduce the deployed schema.

## 3. Applied migrations

Remote and local history match for all five versions:

1. `20260717061246_beta_authorization_rls.sql`
2. `20260717061534_beta_private_storage.sql`
3. `20260717063836_beta_service_role_account_deletion.sql`
4. `20260717101259_beta_function_execute_grants.sql`
5. `20260718001016_beta_server_only_private_storage_writes.sql`

The initial dry run listed exactly the four expected release migrations. After
a controlled direct-upload test proved that Storage accepted invalid PDF magic
bytes, a fifth versioned migration removed direct client writes to private
document buckets. Its first push attempt failed on an optional policy comment;
the transaction and migration history were verified as fully rolled back. The
comment was removed, a clean one-migration dry run was repeated, and the
corrected migration applied successfully.

`supabase db lint --linked --level error --fail-on error` passed after the final
migration. CLI warnings concerned only unavailable local Docker catalog caching,
not remote migration execution.

## 4. Remote database authorization

- 30/30 public tables have RLS enabled and forced.
- All 30 tables have SELECT/INSERT/UPDATE/DELETE policy coverage.
- 150 public policies contain zero missing `USING`, missing INSERT
  `WITH CHECK`, or incomplete UPDATE/ALL shapes.
- No public-schema views are exposed.
- No `anon` public-table grants were found.
- Six reviewed public helper functions are executable by `authenticated` and
  not by `anon`.
- `beta_auth_user_active()` is the only `SECURITY DEFINER` helper, returns only
  an active-subject boolean and has `search_path=""`.
- Security Advisor reports the expected warning that authenticated users can
  execute that reviewed helper; no other security finding was reported.
- Performance Advisor reported no findings.

## 5. Remote Storage configuration

- Private: `documents`, `receipts`, `object-images`, `support-files`.
- Public: `avatars` only, capped at 2 MiB and PNG/JPEG.
- Every private bucket is capped at 10 MiB. Document buckets allow PDF, JPEG
  and PNG; `object-images` allows JPEG/PNG.
- The Free-plan global limit is fixed by Supabase at 50 MB; the stricter 10 MiB
  limit is enforced per bucket and by the backend.
- `storage.objects` has RLS enabled.
- Final policies: three avatar write policies, one owner-scoped private SELECT
  policy and one restrictive active-subject policy.
- Direct private client upload/update/delete is denied. Private document bytes
  flow through the authenticated backend, which validates extension, declared
  MIME and magic bytes before persistence.
- User B and anon cannot list/read/sign/change/delete User A resources. Denied
  operations produce no mutation.

## 6. Effective Auth configuration

Verified in the Beta dashboard and independently through `/auth/v1/settings`:

- public signup disabled (`disable_signup=true`);
- email/password enabled;
- email confirmation enabled;
- anonymous sign-in disabled;
- phone disabled;
- all social/OAuth providers disabled;
- no custom OAuth/OIDC provider configured.

Open dashboard gates:

- Site URL is still `http://localhost:3000`;
- redirect allowlist is empty;
- custom SMTP is not configured, so default templates/provider remain active;
- invitation delivery and reset-password delivery were not tested against a
  controlled mailbox.

## 7. Beta feature posture

The versioned backend/frontend configuration and the explicit Beta frontend
build have this posture:

- enabled: invite-only, email/password, document uploads;
- disabled: Receipt Extraction, document processing/OCR, OAuth, Household
  sharing, public document links, inline preview and Billing;
- backend upload limit: 10 MiB;
- static `/uploads` serving: disabled in the tested backend configuration.

The controlled backend started with remote Beta Auth and proved Receipt
Extraction, extracted-data mutation and public signed links return disabled
responses. The final deployed backend environment itself is not available in
this workspace and remains a manual deployment gate.

## 8. Two-user, anon and relationship QA

`qa-beta-security.mjs` passed 71/71 checks against the linked Beta project:

- User A and User B can create and see only their own profile, Household,
  Space, Item and Document metadata.
- Foreign `householdId`, `spaceId`, `parentId`, `itemId`, ownership reassignment
  and Household self-membership are denied.
- Foreign document metadata is hidden.
- Anonymous database and private Storage access is denied.
- Foreign direct paths, reads, signed URLs, replacement and deletion are denied.
- Disabled document/extraction requests do not mutate data.
- User B remains unchanged after all negative tests and User A deletion.

## 9. Upload verification

- Valid PDF: passed through the authenticated backend.
- Valid JPEG: passed.
- Valid PNG: passed.
- File over 10 MiB: rejected with HTTP 413.
- Wrong extension: rejected.
- Wrong MIME type: rejected.
- Wrong magic bytes: rejected.
- Direct private Storage upload initially demonstrated the bypass with one
  controlled object, which was immediately removed.
- After remediation, the identical direct invalid upload returned HTTP 400 and
  created zero objects.
- Foreign path, foreign download, foreign replacement and foreign delete were
  denied without side effects.

## 10. Account deletion and old token

The real backend deletion orchestrator ran against controlled Beta Auth,
PostgREST and Storage:

- User A product and three local documents were created;
- User A database rows, Storage prefix, local files and Auth user were removed;
- the User A Storage prefix and public profile were verified empty;
- User B data remained intact;
- User A's old JWT was rejected by Auth and the backend and could not mutate
  PostgREST or Storage.

After QA, the target contained zero Auth users, zero Storage objects and zero
estimated public rows.

## 11. Local release verification

- `npm run verify`: PASS.
- Backend tests: 47 passed.
- Backend, frontend and mobile typechecks: PASS.
- Production build: PASS, 1,739 modules.
- Explicit Beta Supabase frontend build: PASS.
- Landing QA: PASS, 50/50.
- Onboarding QA: PASS at desktop/mobile.
- Remote `qa-beta-security.mjs`: PASS, 71/71.
- Bundle scan: 74 files; service-role value absent; secret-key prefix absent.
- `git diff --check`: PASS.

## 12. Commands executed without sensitive values

- `git status --short --branch`, `git diff --check`
- `supabase projects list --output-format json`
- `supabase migration list --linked`
- `supabase db push --linked --dry-run`, `supabase db push --linked`
- `supabase db lint --linked --level error --fail-on error`
- `supabase db query --linked <metadata-only SQL>`
- `supabase db advisors --linked --type security|performance`
- controlled Auth/PostgREST/Storage requests through in-process credentials
- `node qa-beta-security.mjs` through a redacted environment wrapper
- `npm run verify`
- `node frontend/scripts/qa-landing.mjs`
- `node frontend/scripts/qa-onboarding.mjs`
- explicit Beta production build and byte-for-byte secret-presence scan

## 13. Mandatory manual gates before invitations

1. Deploy the exact Beta frontend/backend origin and set that HTTPS origin as
   Auth Site URL.
2. Add only the exact Beta `/auth/callback` and `/reset-password` redirect URLs;
   do not add wildcards, localhost or unrelated previews.
3. Configure verified custom SMTP, sender/reply-to, SPF/DKIM/DMARC and review
   Invite User and Reset Password templates.
4. With controlled mailboxes, execute invitation delivery, invite acceptance,
   password setup, login, logout, forgot password, reset link, post-reset login
   and session persistence after reload. Reconfirm OAuth remains unreachable.
5. Verify the deployed backend environment uses all restricted flags from the
   release checklist, requires Auth, keeps the service role server-only, exposes
   no static uploads and passes the upload kill-switch test.
6. Commit the fifth migration, QA update and reports in a separately authorized
   change so repository history reproduces the deployed Beta schema.
7. Record owners/acceptance for malware-scanning risk, backup retention/deletion
   propagation, Supabase/SMTP DPA/AVV and legal/privacy review.

Until these gates are closed, invitations must not be sent.

**CONDITIONAL GO – nur nach konkret benannten manuellen Gates**
