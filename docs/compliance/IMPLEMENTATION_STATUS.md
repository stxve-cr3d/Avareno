# Privacy And Security Implementation Status

This status file prevents incomplete privacy, deletion, export, connector, AI, and Vault work from being presented as finished.

The remaining launch blockers are tracked in `docs/compliance/PRIVACY_RELEASE_BLOCKERS.md`.

## Implemented Foundation

- `/app/ich` route aliases now point to the existing profile area.
- `/app/ich/privacy` / `/app/profile/privacy` contains a "Datenschutz & Kontrolle" section with active MVP controls where the local data model supports them.
- JSON export is active for local database data from `/api/privacy/export/request`.
- ZIP export bundle is active from `/api/privacy/export/bundle` with database JSON, manifest and available local uploaded document files.
- Account deletion requests are recorded with a safe audit event, but full account deletion execution remains blocked.
- Uploaded documents can be deleted from item detail; local metadata, extracted fields and local upload files are removed after ownership/path checks.
- Uploaded documents are opened through short-lived signed API download tickets in the item detail UI; the ownership-checked direct API download endpoint remains as backend fallback.
- Uploads reject empty files, oversized files and files outside the allowlisted MIME/extension set.
- Static `/uploads` serving is disabled by default and only enabled by explicit `AVARENO_ENABLE_STATIC_UPLOADS`.
- Stored AI-extracted document fields can be deleted from Privacy Center and corrected through the item detail document review panel.
- Active connected-source records can be disconnected locally without exposing connector secrets to the frontend.
- Consent/permission history tables and Privacy Center rendering exist.
- Backend foundation modules now define:
  - local database JSON export
  - local uploaded document ZIP bundle with manifest
  - short-lived signed document download tickets
  - account/document deletion planning
  - safe privacy audit event persistence
  - connector URL/redirect validation against SSRF-style targets
  - connector scope summaries and secret-storage guard
  - AI payload safety checks and AI-assisted metadata
  - Private Vault sensitive category constants
- Subprocessor draft exists in `docs/compliance/SUBPROCESSORS_DRAFT.md`.

## Not Implemented Yet

- Production export jobs/status handling, provider-side exports and cross-user export tests.
- Account deletion execution.
- Supabase Auth user deletion and session revocation flow.
- Production storage object deletion with signed path ownership checks.
- Production private object storage/bucket verification and provider adapter.
- Connector token encryption, rotation, revocation, and deletion.
- Provider-side deletion/revocation.
- Private Vault re-auth/PIN/passkey unlock.
- Stronger Vault encryption architecture.
- AI provider final configuration, retention, region, and DPA/AVV review.
- Backup deletion and retention policy.

## Privacy Review For This Foundation

- Data categories touched: account/profile, email, avatar reference, object memory metadata, document/file metadata, local uploads, Supabase Storage buckets, AI-extracted facts, connector metadata, consent/audit records.
- Storage impact: no new buckets were created. The local SQLite runtime/schema now include `PrivacyAuditEvent` and `ConsentEvent`; uploaded file deletion/download is limited to verified `/uploads/` paths through signed or authenticated API endpoints, and static `/uploads` is disabled by default.
- Export impact: local database JSON export and local uploaded document ZIP bundle are active. Supabase/Auth provider exports, billing/customer portal exports, backup/export procedures, production job flow and cross-user tests remain open.
- Deletion impact: document deletion and AI-extracted field deletion are executable for local MVP data. Account deletion is request-only until Auth, Storage, providers and backups are orchestrated.
- Third parties: Supabase, Cloudflare Turnstile, future AI provider, hosting, email, analytics, monitoring, affiliate providers remain draft/review items.
- AI impact: new guardrails reject obvious secret-like keys and mark AI output as assisted/user-confirmable.
- Connector risks: custom/public connector URLs must reject localhost, loopback, private ranges, link-local, metadata endpoints, non-http protocols, malformed URLs, credential URLs, and internal hostnames.
- Unresolved legal questions: legal basis, DPA/AVV status, EU transfers, retention windows, backup deletion, DSFA/DPIA need, exact cookie/consent language, and account deletion obligations.

## Public Legal And Cookie Route Review

- Routes reviewed: `/datenschutz`, `/cookies`, `/impressum`.
- Current state: pages are draft-oriented and already state missing launch details.
- Review items before launch:
  - Turnstile disclosure and Cloudflare processing details.
  - Supabase Auth/Storage/database processing details.
  - AI provider and retention/training behavior.
  - Newsletter, analytics, affiliate, and error monitoring if enabled.
  - Concrete controller/contact/Impressum details.
  - Cookie consent behavior for any nonessential provider.

## Engineering Follow-Ups

- Add production authenticated export jobs, private object storage adapter, provider receipts and cross-user tests.
- Add account deletion orchestration only after Supabase Auth, Storage, provider revocation and backup policy are finalized.
- Add Supabase migrations/RLS/storage policy updates for `PrivacyAuditEvent` and `ConsentEvent`.
- Add tests for connector URL validation, document deletion, export ownership and privacy audit redaction.

## Current Audit Artifacts

- `docs/compliance/PROVIDER_INVENTORY.md`
- `docs/compliance/DATA_PROCESSING_MAP.md`
- `docs/compliance/GERMANY_LAUNCH_CHECKLIST.md`
- `docs/compliance/RISK_REGISTER.md`
- `docs/compliance/COMPLIANCE_IMPLEMENTATION_PLAN.md`
- `docs/compliance/COOKIE_TRACKING_AUDIT.md`
- `docs/compliance/GERMANY_SAFE_RULES.md`
- `docs/security/PRIVATE_STORAGE_SIGNED_URLS.md`
- `docs/security/SUPABASE_SECURITY_REVIEW.md`
