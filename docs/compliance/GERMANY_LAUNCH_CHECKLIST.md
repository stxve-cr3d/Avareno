# Germany Launch Readiness Checklist

Status: readiness checklist, 2026-06-28. Not legal advice. Must be reviewed by a German privacy lawyer or external DSB before public launch.

Detailed privacy release blockers live in `docs/compliance/PRIVACY_RELEASE_BLOCKERS.md`.

## 1. Public Website

- [x] Impressum route exists and is reachable (`/impressum`).
- [ ] Impressum contains final real provider/controller details.
- [x] Datenschutzerklaerung route exists and is reachable (`/datenschutz`).
- [ ] Datenschutzerklaerung finalized with actual providers, regions, legal bases, retention, contact and rights process.
- [x] Cookie route exists (`/cookies`).
- [ ] Cookie/consent logic reviewed against actual production scripts/providers.
- [ ] No nonessential tracking without consent.
- [ ] Cloudflare Turnstile documented before enabling.
- [ ] Newsletter opt-in/unsubscribe documented before enabling newsletter.
- [ ] Affiliate links clearly marked wherever visible.
- [ ] Marketing claims reviewed; no "100% secure", "fully GDPR compliant", "legally safe", or "guaranteed warranty detection".
- [ ] Public support/community wording warns users not to post sensitive documents publicly.

## 2. App Privacy Controls

- [x] Privacy Center foundation exists.
- [x] MVP local data export includes database JSON and local uploaded document ZIP bundle with manifest.
- [ ] Production data export flow implemented and tested end to end. Authenticated export jobs, provider-side exports, backup behavior and cross-user tests remain open.
- [ ] Account deletion flow implemented and tested end to end. Account deletion request logging is active; full execution remains blocked by Auth, Storage, provider and backup orchestration.
- [x] Document/file deletion deletes local metadata, extracted text/json, and local upload object where present.
- [x] Connected sources can be disconnected locally from the Privacy Center/API.
- [ ] Connector token revocation/deletion implemented. Local connector metadata disconnect exists; provider-side revocation and encrypted token stores remain open.
- [ ] AI analysis can be understood, triggered explicitly, corrected, and deleted. Explicit mock extraction guardrails, correction/review UI and deletion control exist; production provider disclosures remain open.
- [ ] AI usage flags/provider disclosures exist before real AI provider.
- [ ] Private Vault rules implemented beyond constants/docs.
- [x] Private Vault does not auto-analyze documents.
- [x] User can delete uploaded documents.
- [x] User can correct AI-extracted data through the document review panel.
- [x] Consent/permission history exists where consent is used.

## 3. Security

- [ ] Supabase RLS/access control applied and verified in dashboard.
- [ ] Supabase Data API exposure settings reviewed.
- [ ] Storage buckets private by default except explicitly reviewed avatars.
- [x] MVP signed URLs or authenticated file endpoints used for private files. Document UI now uses short-lived signed API download tickets.
- [ ] Production private object storage/bucket state and signed URL policy verified with multiple users.
- [x] Local/static `/uploads` is not used by default for real production private documents. Static serving now requires explicit `AVARENO_ENABLE_STATIC_UPLOADS`.
- [ ] Secrets are not exposed to frontend.
- [ ] Supabase service-role key is server-only and never in frontend/env examples.
- [ ] Connector tokens encrypted at rest or not stored.
- [ ] Logs do not contain sensitive data, tokens, raw document content, prompts, or connector payloads.
- [x] Connector SSRF validation helper exists.
- [ ] Connector SSRF validation tests exist and are used in all outbound connector flows.
- [ ] Rate limits, timeouts and response-size limits exist for uploads, auth, connectors and AI calls.
- [x] Security headers visible on `https://avareno.app` in current Cloudflare response.
- [ ] Security headers reviewed for final backend/API host.
- [x] Dependency risk reviewed with `npm audit --omit=dev` and `pip check`.
- [ ] File upload MIME/extension allowlist, max size, malware strategy and private download model implemented. MVP max-size/type policy and signed private download endpoint exist; malware scanning/private object storage verification remain open.

## 4. Legal / DSGVO Docs

- [x] Processing activities draft exists.
- [x] Provider/subprocessor draft exists.
- [x] DPIA/DSFA screening draft exists.
- [x] New provider inventory exists.
- [x] New data processing map exists.
- [ ] Stripe Tax/VAT handling, invoice handling, DPA/AVV, region/transfers, subprocessors and retention reviewed before paid launch.
- [ ] Billing/customer portal, cancellation path, refund/support process and privacy policy disclosure finalized before accepting payments.
- [ ] DPAs/AVVs checked and stored outside repo.
- [ ] Retention plan finalized.
- [ ] Backup retention and deletion-restoration procedure finalized.
- [ ] Production export/deletion plan implemented.
- [ ] AI provider disclosures drafted and legally reviewed.
- [ ] Cookie/consent model reviewed.
- [ ] Support/community privacy wording reviewed.
- [ ] Affiliate disclosure wording reviewed.

## 5. Before Public Launch

- [ ] German privacy lawyer or external DSB review completed.
- [ ] Datenschutzerklaerung finalized.
- [ ] Impressum finalized.
- [ ] Terms/AGB finalized if needed.
- [ ] Consent UX reviewed.
- [ ] Provider/subprocessor list verified against actual production providers.
- [ ] Payment provider setup verified; no legal/tax certainty claimed before review.
- [ ] Data deletion/export tested with a realistic user account.
- [ ] Supabase RLS/storage policies tested with multiple users.
- [ ] Security review completed.
- [ ] Incident/contact process documented.
- [ ] Production backend/storage architecture documented.
