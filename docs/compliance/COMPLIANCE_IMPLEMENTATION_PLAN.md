# Compliance Implementation Plan

Status: technical/product readiness plan, 2026-06-28. Not legal advice. Must be reviewed by a German privacy lawyer or external DSB before public launch.

## Must Fix Before Private Beta

- Privacy Center
  - Keep current foundation copy explicit: export/deletion are not complete.
  - Add status model for export/deletion readiness and user-facing "not yet available" states.
- Upload safety
  - Add max upload size, MIME/extension allowlist, and reject empty files.
  - Stop using public/static `/uploads` for real private documents.
  - Create authenticated file download path or move private files to private object storage.
- QR/barcode scanning
  - Keep camera access user-initiated and stop the stream after close/detection.
  - Keep product QR labels data-minimal: internal item URL only, no serials, price or document data.
  - Review browser permission copy before public beta.
- No-sensitive-logs baseline
  - Document and enforce: no document contents, filenames where avoidable, tokens, prompts, connector payloads, search queries in logs.
  - Add lint/grep checklist to PR/release process.
- AI extraction review/correction foundation
  - Keep mock extraction labeled as assisted.
  - Add source/provenance and user-confirmation state to extracted data model before real AI.
- Connector guardrails
  - Add unit tests for connector URL validation against localhost, private ranges, metadata IPs, internal hostnames and credential URLs.
  - Keep plaintext token storage refused.
- Public legal route review
  - Keep draft notice visible until final controller/provider details are known.
- Subprocessor registry
  - Treat `PROVIDER_INVENTORY.md` as the source of truth for production provider decisions.

## Must Fix Before Public Beta

- Export data endpoint/service
  - Implement authenticated export job/request.
  - Include user profile, items, documents metadata, files, loops/reminders, repair logs, affiliate clicks, connector metadata, consent history.
  - Provide safe archive download via short-lived authenticated/signed URL.
  - Add tests that one user cannot export another user's data.
- Account deletion orchestration
  - Delete or anonymize app DB rows according to legal retention.
  - Delete storage objects and extracted text/json.
  - Revoke connector tokens and provider access where possible.
  - Delete Supabase Auth user server-side and revoke sessions.
  - Define backup retention behavior and user-facing wording.
- Delete uploaded file/storage object flow
  - Verify user ownership before deletion.
  - Delete DB metadata and storage object together.
  - Recalculate item completeness and remove extracted facts.
- AI usage flags
  - Persist whether AI was used, provider, timestamp, source doc, confidence, user confirmation/correction.
  - Add per-user AI controls and no automatic Vault analysis.
- Consent/permission history
  - Persist consent/permission events for cookies/analytics/newsletter/connectors/AI where relevant.
  - Include revocation state and timestamp.
- Connector disconnect
  - Add disconnect endpoint, token deletion, provider revocation and safe sync log.
- Safe sync logs
  - Store only status, counts, safe message and timestamps; no raw payloads.
- Cookie/consent review
  - Confirm current cookies/storage from production build.
  - Confirm camera permission and QR/barcode scan disclosure.
  - Add consent UI only if nonessential tracking/storage is added.
- Supabase RLS/storage policy test checklist
  - Apply SQL only to matching schema.
  - Verify Data API exposure.
  - Run Supabase advisors.
  - Run cross-user access tests.

## Must Fix Before Paid Launch

- Billing provider review
  - Paddle is the preferred first Merchant-of-Record direction, but this is not a legal/tax conclusion.
  - Verify Paddle account setup, MoR scope, VAT/tax handling, invoice handling, DPA/AVV, subprocessors, region/transfers, retention/deletion and customer portal/cancellation behavior.
  - Keep Lemon Squeezy and Stripe as future alternatives only; do not run multiple billing providers in parallel before a documented decision.
  - Do not store card/payment method data in Avareno. Store only user id, provider customer/subscription ids, plan/status, period dates and safe webhook event ids/status.
- Retention policy config
  - Define retention windows for uploads, extracted text, logs, AI prompts/outputs, affiliate clicks, support requests, deleted accounts and backups.
  - Make retention configurable and auditable.
- Provider/subprocessor verification
  - Verify DPA/AVV status, region, transfer mechanisms, subprocessors and retention/deletion with every active provider.
  - Update public Datenschutzerklaerung and in-app provider list.
- Token encryption abstraction
  - Implement server-side encryption for connector secrets/tokens.
  - Add rotation and key management plan.
  - Never return secrets to frontend.
- AI provider production review
  - Select provider, configure no-training/retention controls where available, document region/transfer.
  - Add prompt minimization tests and Vault exclusion tests.
- Support/privacy process
  - Implement private support channel with sensitive-file warnings.
  - Define support data retention and deletion.
- Affiliate compliance
  - Mark affiliate links clearly.
  - Do not include sensitive product/document context in partner redirects unless reviewed.
- Payment provider review
  - Paddle has been added to the provider inventory as preferred billing direction; complete provider/legal/tax review before accepting production payments.

## Nice To Have Later

- Data portability archive preview before download.
- User-facing processing activity summary in Privacy Center.
- Automated provider inventory check in CI.
- Automated cookie/storage scan in CI.
- Admin privacy dashboard for deletion/export job status.
- Stronger Vault architecture with re-auth, passkey/PIN, client-side or envelope encryption review.
- Differential retention for extracted text versus original documents.
- Privacy-preserving analytics after legal/consent review.

## Technical TODO Index

- Privacy Center: finish `/api/privacy/summary`, `/api/privacy/export/request`, `/api/privacy/deletion/request`.
- Export service: create archive builder and file bundler.
- Account deletion: orchestrate DB rows, files, Supabase Auth, connectors, AI records and backups note.
- Uploaded file deletion: add authenticated endpoint and storage abstraction.
- AI extraction review/correction: add correction model and user confirmation.
- AI usage flags: persist provider/source/confidence/user confirmation.
- Consent/permission history: add table and UI surface.
- Connector disconnect: add endpoint, revocation and safe logs.
- Connector SSRF validation utility: test existing helpers and use them for all outbound connector URLs.
- Token encryption abstraction: implement before storing any connector token.
- Safe sync logs: centralize redaction helper use.
- Subprocessor registry: maintain `PROVIDER_INVENTORY.md`.
- Retention policy config: define defaults and legal review markers.
- Cookie/consent review: keep `COOKIE_TRACKING_AUDIT.md` current.
- Public legal route review: replace placeholders only after real operator/provider facts are known.
- RLS/storage policy checklist: complete `SUPABASE_SECURITY_REVIEW.md` before production.
- No-sensitive-logs check: keep grep checklist in release validation.
