# Privacy Release Blockers

Status: engineering blocker list, 2026-07-02. Not legal advice. Public launch still needs German privacy lawyer or external DSB review.

## Done In MVP

- JSON export for local database data.
- ZIP export bundle for local database data, manifest and available local uploaded document files.
- Document deletion for local metadata, extracted fields and verified local `/uploads` files.
- Short-lived signed API download tickets used by the document UI for local document files.
- Ownership-checked local document download endpoint retained as backend fallback.
- Upload max-size, extension allowlist, MIME allowlist and empty-file rejection.
- Static `/uploads` serving disabled by default behind `AVARENO_ENABLE_STATIC_UPLOADS`.
- AI-extracted data deletion.
- AI-extracted data correction through the item detail document review panel.
- Local connected-source disconnect.
- Consent and privacy audit metadata tables.
- Full active-account deletion across Supabase Storage/public rows, local
  files/database rows and Supabase Auth, with old-token regression.

## Must Finish Before Public Launch

1. Account deletion operations beyond active data
   - Repeat the integrated deletion test on the exact intended beta project.
   - Revoke connector tokens/provider access before real connectors are enabled.
   - Define backup retention and restoration exclusion behavior.

2. Production export workflow
   - Replace direct MVP ZIP download with authenticated export jobs for production volume and retry/status handling.
   - Move from local `/uploads` file inclusion to private object storage exports or signed file download links.
   - Include provider-side export instructions/receipts where Avareno cannot export directly.
   - Define backup export/restoration exclusions and add cross-user export tests.

3. Production private storage
   - Keep static `/uploads` disabled outside local development.
   - Replace local `/uploads` storage with private object storage after provider/dashboard review.
   - Verify path ownership and storage policies with multiple users.
   - Add malware scanning or a documented equivalent upload safety strategy.

4. Connector secrets and revocation
   - Add encrypted server-side connector secret storage.
   - Delete local token records on disconnect/account deletion.
   - Revoke provider tokens where provider APIs support revocation.
   - Keep safe sync logs without raw payloads.

5. Private Vault protections
   - Add re-auth/PIN/passkey gate for sensitive Vault actions.
   - Review stronger encryption architecture.
   - Keep Vault documents excluded from automatic AI analysis.
   - Add extra confirmation before export, sharing, deletion or third-party processing.

6. AI production controls
   - Add provider disclosure before real AI is enabled.
   - Persist provider/source/confidence/user confirmation fields.
   - Define prompt/output retention.
   - Verify no-training/data-use and DPA/AVV status.

7. Legal/DSB review
   - Finalize legal basis, retention, export/deletion obligations and consent UX.
   - Verify provider DPAs/AVVs, regions, subprocessors and EU/EEA transfer facts.
   - Complete DSFA/DPIA decision for AI, connectors and Vault.
