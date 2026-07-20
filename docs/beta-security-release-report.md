# Invite-only beta security release report

Date: 2026-07-17
Scope: defensive local authorization/remediation and release QA for a controlled
10–20-person beta. No production system or real user data was used.

## 1. Confirmed original security problems

- `/api/extract/receipt` accepted a client-provided `documentId` without a
  reliable resource-plus-user authorization boundary before loading and later
  updating the document.
- Several write paths accepted `documentId`, `itemId`, `householdId`, `spaceId`
  or `parentId` without consistently proving that both the source and target
  relationship belonged to the verified Auth subject.
- Earlier Supabase policy drafts were too broad for relationship writes and
  were not backed by a repeatable real-session two-user Storage/RLS suite.
- Account deletion was a recorded request rather than an end-to-end deletion
  and old-token rejection flow.
- The initial working tree already contained extensive unrelated modified,
  deleted and untracked UI/design work. It was documented with `git status` and
  `git diff --stat`, preserved, and never reset, committed or pushed.

## 2. Remediated endpoints and object ids

- Receipt extraction now authenticates from verified middleware claims, gates
  the beta-off feature before DB/Storage/provider work, resolves the document
  and server-owned path inside one authorization boundary, and repeats the
  predicate on the final update.
- Item, document, loop, reminder/planner, capture, dashboard, structure,
  affiliate, Vault, notification, mobile, search, reports and smart-home
  resource paths were audited and scoped by the current user.
- Relationship inputs validate source and target independently. A client cannot
  attach its document to another user's item, move an item into another
  household/space, choose a foreign parent, or reassign an ownership field.
- Missing and inaccessible resources use the same not-found behavior where the
  underlying feature is enabled. Disabled beta features return one generic
  feature-off response before resource lookup.

## 3. Central authorization model

`backend/app/services/authorization.py` provides small reviewed boundaries for
owned items, documents, households, spaces and loops plus the narrowly defined
Receipt household-editor rule. Queries bind the object id and verified user id
in the same predicate. Household ids alone do not prove membership; chained
relations must agree. Vault documents never inherit household access.

Authentication is derived only from verified Supabase JWT/session data. The
backend refuses invite-beta startup unless mandatory API authentication is on.
No request body controls the authenticated user id.

## 4. RLS and Storage changes

- `20260717061246_beta_authorization_rls.sql` creates the beta schema baseline,
  enables and forces RLS, applies separate CRUD policies, verifies `WITH CHECK`
  ownership/relationship integrity, denies disabled domains, removes implicit
  view/RPC access and adds the reviewed active-Auth-subject helper.
- `20260717061534_beta_private_storage.sql` keeps document buckets private,
  limits files to the user's first-level folder plus Storage `owner_id`, checks
  generated names and MIME types, and separates select/insert/update/delete.
- `20260717063836_beta_service_role_account_deletion.sql` restores only the
  minimal table grants needed by the server-side deletion orchestrator.
- `20260717101259_beta_function_execute_grants.sql` removes PostgreSQL's
  default `PUBLIC` execute grant from public-schema helpers and grants the six
  reviewed authorization helpers only to `authenticated`; the lone
  `SECURITY DEFINER` helper retains an empty `search_path` and exposes only an
  active-subject boolean.
- `20260718001016_beta_server_only_private_storage_writes.sql` removes direct
  authenticated insert/update/delete policies from private document buckets.
  Browser clients cannot bypass the backend's magic-byte validation; avatar
  writes remain independently owner/path scoped.
- `supabase/config.toml` disables public signup, anonymous Auth, OAuth, SMS and
  unnecessary local services; private buckets use a 10 MiB limit and the beta
  MIME allowlist.
- The real local regression proves User B and anon cannot list, read, sign,
  update or delete User A's private object. A denied Storage delete has no side
  effect.
- The target regression additionally proves private Storage writes are
  server-mediated and direct client uploads create no object.

## 5. Beta feature flags

Server-authoritative flags default to the restricted posture:

- enabled: invite-only mode and private document uploads
- disabled: Receipt Extraction, OCR/document processing, OAuth, Household
  sharing, public document links, inline previews and Billing

Billing routes/webhooks, Household invites, signed public document links,
extracted-data writes, uploads and Receipt processing have backend gates. The
frontend mirrors these values but is not the authority.

## 6. Invite and Auth status

- Email/password login, logout, forgot-password and reset-password remain.
- Direct `/signup` navigation redirects to Login in invite mode; public
  Supabase signup is rejected in the real local Auth test.
- OAuth, phone/SMS, Magic Link UI and passkeys are hidden and their provider
  methods fail closed in the beta profile.
- Browser QA caught and fixed an inverted conditional that had shown the phone
  form and Magic Link while email/password-only was active.
- Admin/invite provisioning, SMTP, exact redirects and target-project Auth
  dashboard settings remain manual deployment gates.

## 7. Upload restrictions

- Server limit: 10 MiB by default and configurable downward for tests.
- Allowed: PDF, JPEG and PNG only.
- Extension, declared MIME type and magic bytes must all match.
- The storage name is server-generated from the document id and validated
  extension; the sanitized original basename remains display metadata only.
- Partial files are staged and removed on failed metadata insertion.
- No automatic OCR, AI processing or preview generation starts after upload.
- Direct browser writes to private document buckets are disabled because bucket
  policies cannot inspect object bytes. The frontend already routes private
  documents through `/api/documents/upload`; only avatars use direct Storage.
- Malware scanning is not implemented and remains an explicitly accepted risk
  only for the small known invite cohort.

## 8. Account deletion and old-token test

The authenticated endpoint now fails closed before mutation if server admin
configuration is absent. The reviewed sequence is:

1. preflight cross-owner relationship checks;
2. delete every deterministic user Storage prefix through the Storage API and
   verify it is empty;
3. delete Supabase public membership/profile rows and rely on reviewed FK
   cascades, then verify absence;
4. remove verified local upload paths and user folder;
5. remove local user-owned rows, including products, documents, guarantees/
   repairs, reminders/loops, spaces/memberships, activation data, privacy,
   billing, device/connector, social, Vault and usage data, then verify absence;
6. delete the Supabase Auth user last;
7. record only a short-lived hash of the subject for backend JWT rejection.

The integration test deletes User A through the real backend against local
Supabase, confirms local and Supabase resources are gone, retries the
server-side deletion idempotently in unit coverage, rejects the old token in
Auth/backend/PostgREST/Storage, and confirms User B is unchanged.

## 9. Tests and results

- `npm run verify`: PASS
  - Backend/Python compile: PASS
  - Frontend TypeScript: PASS
  - Mobile TypeScript: PASS
  - Backend tests: 47 passed
  - Frontend production build: PASS (1,739 modules transformed)
- `npx supabase db reset --local`: PASS with the original release migrations;
  target evidence including the server-only Storage migration is recorded in
  `docs/beta-target-deployment-verification-report.md`.
- `node qa-beta-security.mjs`: PASS, 56 controlled checks with real local User A,
  User B and anonymous Auth/Database/Storage contexts.
- Receipt beta test: PASS; same generic 503 for controlled ids, zero DB and
  provider calls, no mutation/job.
- Upload format, size, generated-path and kill-switch tests: PASS.
- Account deletion, idempotent retry, missing-admin fail-closed and old-token
  tests: PASS.
- Landingpage QA: PASS at desktop/mobile, no horizontal overflow; content and
  design were not changed by this pass.
- Onboarding/Login QA: PASS at desktop/mobile after the email-only conditional
  fix; direct signup redirects to Login and browser console showed no errors in
  the final inspected states.
- Browser source/production bundle scan: no service-role reference and no
  secret-like value found. Values were never printed.
- Supabase changelog reviewed for current Auth/Storage/RLS breaking-change
  notices; target deployment must still run advisors and exact-version QA.
- `git diff --check`: PASS.

## 10. Changed files

Security implementation:

- `backend/app/auth.py`, `config.py`, `db.py`, `dependencies.py`, `main.py`
- object/resource routers under `backend/app/routers/`, especially
  `extract.py`, `documents.py`, `items.py`, `loops.py`, `structure.py`,
  `privacy.py`, `billing.py` and `webhooks.py`
- `backend/app/services/authorization.py`, `account_deletion.py`,
  `supabase_admin.py` and related scoped service queries
- `backend/.env.example`, runtime schema/seed and privacy service status copy
- `backend/tests/test_two_user_authorization.py`,
  `test_beta_security_controls.py`, document/privacy tests and test config
- `frontend/src/lib/betaFeatures.ts`, `authClient.ts`, `authProvider.tsx`
- `frontend/src/pages/AuthPages.tsx`, `CaptureReceipt.tsx`, `ItemDetail.tsx`,
  `Rewards.tsx`, and frontend env example
- `supabase/config.toml`, `supabase/seed.sql` and the versioned beta migrations
- `qa-beta-security.mjs`
- `docs/beta-release-supabase-checklist.md`, this report, Auth/RLS/Storage,
  AI and compliance status documents

Unrelated dirty UI/design changes already present at the start were preserved.
No Landingpage, SpatialHero or marketing-design implementation was changed by
this security pass. No commit or push was made.

## 11. Remaining risks

- Concrete target deployment evidence is maintained separately in
  `docs/beta-target-deployment-verification-report.md`.
- Malware scanning is absent. Magic-byte validation is not malware detection.
- Backup retention, deletion propagation and restore exclusions are not yet a
  finalized operational/legal policy.
- Supabase/auth-email DPA/AVV, region, subprocessors, retention and final German
  legal/privacy copy require responsible owner/legal review.
- The current export is suitable for the scoped backend but is not a durable
  high-volume production export-job/provider-receipt workflow.
- Future OAuth, phone, AI, Billing, Household sharing, connectors and public
  links require new privacy/security review and dedicated tests before enablement.

## 12. Required manual deployment steps

Before sending any tester invitation:

1. Apply all versioned migrations to the explicitly selected beta project and run
   Supabase Database/Security advisors.
2. Complete every applicable item in
   `docs/beta-release-supabase-checklist.md`: public signup/anon/OAuth/SMS off,
   email/password and SMTP recovery tested, exact Site/Redirect URLs only.
3. Set the restricted backend/frontend flags exactly as documented, keep static
   uploads off, and store the service-role key only in the backend secret manager.
4. Verify all private bucket settings, MIME/size limits and public status in the
   target dashboard.
5. Repeat `qa-beta-security.mjs` with only controlled beta-project test users and
   files; require all checks to pass and clean the test users afterward.
6. Repeat the integrated account deletion and old-token checks on that project.
7. Rebuild and repeat the browser-bundle secret-presence scan without printing
   values.
8. Record explicit acceptance of the small-cohort malware-scanning risk and
   assign owners/dates for backup policy, DPA/AVV and legal review.

CONDITIONAL GO – erst nach konkret aufgelisteten manuellen Gates
