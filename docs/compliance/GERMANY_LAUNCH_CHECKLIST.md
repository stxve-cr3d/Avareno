# Germany Launch Readiness Checklist

Status: readiness checklist, 2026-06-28. Not legal advice. Must be reviewed by a German privacy lawyer or external DSB before public launch.

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
- [ ] Data export flow implemented and tested end to end.
- [ ] Account deletion flow implemented and tested end to end.
- [ ] Document/file deletion deletes metadata, extracted text/json, and storage object.
- [ ] Connected sources can be disconnected.
- [ ] Connector token revocation/deletion implemented.
- [ ] AI analysis can be understood, triggered explicitly, corrected, and deleted.
- [ ] AI usage flags/provider disclosures exist before real AI provider.
- [ ] Private Vault rules implemented beyond constants/docs.
- [ ] Private Vault does not auto-analyze documents.
- [ ] User can delete uploaded documents.
- [ ] User can correct AI-extracted data.
- [ ] Consent/permission history exists where consent is used.

## 3. Security

- [ ] Supabase RLS/access control applied and verified in dashboard.
- [ ] Supabase Data API exposure settings reviewed.
- [ ] Storage buckets private by default except explicitly reviewed avatars.
- [ ] Signed URLs or authenticated file endpoints used for private files.
- [ ] Local/static `/uploads` is not used for real production private documents.
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
- [ ] File upload MIME/extension allowlist, max size, malware strategy and private download model implemented.

## 4. Legal / DSGVO Docs

- [x] Processing activities draft exists.
- [x] Provider/subprocessor draft exists.
- [x] DPIA/DSFA screening draft exists.
- [x] New provider inventory exists.
- [x] New data processing map exists.
- [ ] Paddle Merchant-of-Record scope, VAT/tax handling, invoice handling, DPA/AVV, region/transfers, subprocessors and retention reviewed before paid launch.
- [ ] Billing/customer portal, cancellation path, refund/support process and privacy policy disclosure finalized before accepting payments.
- [ ] DPAs/AVVs checked and stored outside repo.
- [ ] Retention plan finalized.
- [ ] Backup retention and deletion-restoration procedure finalized.
- [ ] Export/deletion plan implemented.
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
