# Invite-only beta: target deployment verification

Date: 2026-07-17

Repository commit: `a12753ed2da2ae64c2332b8ef82d3a06dd94dcbb` (`main`)

Result: **NO-GO**

## 1. Safe-abort decision and target project

No hosted Supabase target was changed or tested. The intended beta project is
not unambiguously configured in this workspace:

- `supabase/config.toml` contains only the local CLI id `avareno`.
- `supabase/.temp/project-ref` is absent.
- The scoped repository, attached instructions and current process environment
  contain no non-placeholder `*.supabase.co` host or project ref.
- The Supabase CLI has no access token/profile in this environment.
- `supabase projects list` cannot authenticate.
- `supabase migration list --linked` and `supabase db push --linked --dry-run`
  both stop because no project ref is linked.

This is the required fail-closed outcome. A project was not guessed from a URL,
name or previous local state. No production system was contacted.

## 2. Repository and working tree

- The pre-existing working tree is extensively dirty and contains unrelated
  modified, deleted and untracked work.
- It was inspected and preserved. No reset, commit or push was performed.
- The local release pass added only verification/security artifacts: a
  function-grant migration, a fail-closed remote mode for the beta QA script,
  invite-only expectations in the existing browser QA scripts, checklist/report
  updates and this report.

## 3. Migration state

The controlled local Supabase instance contains these migrations in order:

1. `20260717061246_beta_authorization_rls.sql`
2. `20260717061534_beta_private_storage.sql`
3. `20260717063836_beta_service_role_account_deletion.sql`
4. `20260717101259_beta_function_execute_grants.sql`

The fourth migration was added after the metadata audit proved that PostgreSQL's
default `PUBLIC` role could still execute all six helper functions. It revokes
that implicit access, preserves `authenticated` execution, and leaves the one
reviewed `SECURITY DEFINER` function with an empty `search_path`.

Remote migration history: **not available**.

Remote migrations applied in this pass: **none**.

## 4. Local database and Storage verification

These results are real executions against the controlled local Supabase stack,
not claims about the hosted beta project:

- 30/30 public tables have RLS enabled and forced.
- Policy-shape audit found zero SELECT/DELETE policies without `USING`, zero
  INSERT policies without `WITH CHECK`, and zero incomplete UPDATE/ALL
  policies.
- No public-schema views are exposed.
- All six public authorization helpers reject `anon` execution and allow
  `authenticated` execution after the new migration.
- The only `SECURITY DEFINER` helper exposes an active-Auth-subject boolean and
  has `search_path=""`.
- Supabase security advisors: no local findings.
- Supabase schema lint: no local errors.
- `documents`, `receipts`, `support-files`, and `object-images` are private.
  `avatars` is intentionally public and limited to PNG/JPEG at 2 MiB.
- Private document buckets allow PDF/JPEG/PNG and cap objects at 10 MiB.
- `storage.objects` has separate SELECT/INSERT/UPDATE/DELETE policies plus the
  restrictive active-subject policy.

Hosted RLS, grants, policies, views, RPCs, bucket settings and Storage policies
remain **unverified**.

## 5. Feature configuration

The versioned local/backend/frontend configuration has the expected release
posture:

- enabled: invite-only mode, email/password for provisioned users, document
  uploads;
- disabled: open signup, anonymous Auth, OAuth/social providers, Receipt
  Extraction, OCR/document processing, Household sharing, public document
  links, inline preview and Billing;
- upload limit: 10 MiB;
- backend startup refuses invite-only mode when API authentication is optional.

The actual hosted Auth settings and deployed backend/frontend environment
variables were not accessible and therefore are **open gates**.

## 6. Controlled regression results

`qa-beta-security.mjs` passed 56/56 checks locally after the final migration:

- User A and User B can create and use only their own profile, Household,
  Space, Item, Document and private object.
- Foreign `householdId`, `spaceId`, `parentId`, `itemId`, ownership changes and
  Household self-membership are denied.
- User B and anon cannot list/read User A files.
- User B cannot create a signed URL, overwrite or delete User A's file.
- Denied deletes have no side effect.
- Complete User A deletion removes database rows, Storage objects, local files
  and the Auth user while preserving User B.
- User A's old token is rejected by Auth and cannot mutate database or Storage.
- Public signup is rejected.

The QA script now accepts hosted credentials only through the process
environment and only when the HTTPS host exactly matches
`AVARENO_QA_EXPECTED_PROJECT_REF` and `AVARENO_QA_TARGET_ENV=beta`. A mismatched
project-ref guard was executed and passed before any network request.

Hosted two-user isolation, Storage isolation, deletion and old-token results:
**not executed**.

## 7. Upload and processing verification

The focused backend suite passed 17/17 tests and covers:

- valid PDF, JPEG and PNG;
- unsupported extension;
- file over 10 MiB;
- empty file;
- mismatched extension, MIME type and magic bytes;
- signed-download integrity and document deletion;
- Receipt Extraction and document-feature gates before database, Storage or
  provider access;
- two-user relationship authorization and complete account deletion.

The local Storage regression separately proves own upload/download/update/delete,
foreign path denial, foreign download denial and foreign delete denial.

Important open target gate: Supabase bucket MIME/size policies do not themselves
inspect file magic bytes. The application upload API does. If direct browser
upload to Supabase Storage is enabled in the hosted beta, it must either be
removed as a client path or brokered through equivalent server-side byte
validation before this upload gate can be closed.

Hosted upload cases and hosted upload kill-switch: **not executed**.

## 8. Auth-flow verification

Local Auth proves closed signup, admin provisioning and password login. The
invite-only Landing QA passes 50/50 checks, and the controlled Onboarding QA
passes its complete desktop/mobile flow including signup-to-login redirect,
reload persistence and duplicate-mutation prevention.

This does not replace the required hosted email flow. The following were not
executed against a controlled beta mailbox: invitation delivery, invite
acceptance, password setup, logout/login, forgot password, reset link,
post-reset login, session reload and OAuth unreachability.

## 9. Final local commands and results

- `npm run verify` — PASS: backend/frontend/mobile typechecks, 47 backend tests,
  production build (1,739 modules).
- Focused security/upload/backend suite — PASS: 17 tests.
- `node qa-beta-security.mjs` — PASS locally: 56 checks.
- Remote project-ref mismatch guard — PASS.
- Supabase local security advisors — PASS, no findings.
- Supabase local schema lint — PASS, no errors.
- Landing QA — PASS, 50/50.
- Onboarding QA — PASS.
- Explicit invite-only/Supabase production build — PASS; only a non-security
  chunk-size warning remains.
- Browser bundle service-role/secret scan — PASS, 74 generated files scanned.
- Frontend source service-role/secret scan — PASS.
- `git diff --check` — PASS.
- Cleanup audit — PASS: zero controlled Auth users, public test profiles and
  Storage objects remained; the local Supabase stack was stopped and temporary
  logs were removed.

No command line in this report contains a real token, key, password or private
user value.

## 10. Required hosted-project gates

Perform these steps only after a human identifies the dedicated beta project by
both dashboard name and project ref:

1. Authenticate the CLI interactively, run `npx supabase projects list`, and
   confirm the exact beta ref. Then run
   `npx supabase link --project-ref <BETA_PROJECT_REF>` and verify that
   `supabase/.temp/project-ref` contains the same ref.
2. Run `npx supabase migration list --linked`, followed by
   `npx supabase db push --linked --dry-run`. Review that only the four listed
   migrations are pending, then apply them with `npx supabase db push --linked`.
3. Run linked database advisors/lint and the same metadata queries for RLS,
   policies, grants, views, RPCs and `SECURITY DEFINER` settings.
4. In **Authentication > URL Configuration**, set the exact HTTPS beta Site
   URL and allow only the exact beta `/auth/callback` and `/reset-password`
   redirects. Remove wildcards, localhost and obsolete previews.
5. In **Authentication > Providers/Sign In**, disable public signup,
   anonymous, phone, Web3 and every OAuth/social provider; keep email/password
   for invited users. In **Authentication > Email/SMTP**, configure the verified
   sender. In **Email Templates**, verify Invite User and Reset Password.
6. In **Storage > Settings**, set the global maximum to 10 MiB. In
   **Storage > Buckets**, verify private access, per-bucket 10 MiB and the
   PDF/JPEG/PNG allowlist for all document buckets.
7. Verify the deployed backend/frontend flags listed in section 5 and exercise
   the upload kill-switch once with a controlled file.
8. Inject the three QA credentials from a local secret manager (never shell
   output), set the expected ref and `AVARENO_QA_TARGET_ENV=beta`, then run
   `node qa-beta-security.mjs`.
9. Use two controlled beta mailboxes to complete the full invite, reset,
   reload, OAuth-negative, upload, two-user, deletion and old-token flow.
10. Confirm no controlled users, rows or Storage objects remain.

The Site URL/redirect requirements follow Supabase's URL Configuration model;
private buckets require authenticated download or a policy-authorized signed
URL, and custom SMTP is required for dependable non-toy email delivery.

## 11. Open release risks

- The beta project ref and hosted environment are unknown in this workspace.
- No remote migrations were compared or applied.
- No hosted Auth, SMTP, redirect, provider, bucket or feature-flag settings were
  verified.
- No hosted two-user, upload, invite, deletion or old-token test was run.
- Direct hosted Storage upload still needs an explicit magic-byte decision.

Because the concrete-project isolation, deletion, old-token and real email Auth
gates are mandatory for `GO`, the release is not currently approvable.

**NO-GO – kritische Blocker verbleiben**
