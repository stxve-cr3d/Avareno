# Subprocessors Draft

This document is a working list only. It is not a final GDPR/DSGVO subprocessor notice and must be reviewed by a German privacy lawyer or external DSB before launch.

## Review Rules

- Do not enable a provider in production before purpose, data categories, region, DPA/AVV status, transfer mechanism, retention, deletion, and security controls are documented.
- Do not send Private Vault content to a provider without explicit user action and additional review.
- Do not add analytics, newsletter, affiliate, or support tooling silently.

## Draft Entries

### Supabase

- Status: planned/active for Auth and storage/database foundation.
- Purpose: authentication, sessions, user profile data, application database, storage buckets.
- Data categories: email, auth metadata, profile data, object memory, document metadata, uploaded files if stored in Supabase Storage.
- Region: TODO confirm project region.
- DPA/AVV: TODO confirm executed agreement.
- EU/EEA transfer: TODO review Supabase subprocessors and selected region.
- Retention/deletion: TODO account deletion, storage deletion, backups, auth session invalidation.
- User disclosure: must be listed in privacy policy.

### Cloudflare

- Status: active for Turnstile if configured; hosting/workers status TODO.
- Purpose: bot protection for login/signup, possible website hosting or edge delivery.
- Data categories: website/security metadata, Turnstile challenge data, IP/device/browser signals handled by Cloudflare.
- Region: TODO review Cloudflare processing locations.
- DPA/AVV: TODO confirm.
- EU/EEA transfer: TODO review.
- Retention/deletion: provider dependent; TODO document.
- User disclosure: already referenced in draft privacy/cookie pages; final wording needs review.

### OpenAI / AI Provider

- Status: TODO confirm provider and production configuration.
- Purpose: AI-assisted extraction and Memory Build from user-selected captures/documents.
- Data categories: selected document/capture content, extracted facts, structured prompts/outputs if retained.
- Region: TODO confirm.
- DPA/AVV: TODO confirm.
- Training/data-use behavior: TODO confirm no-training/retention settings.
- EU/EEA transfer: TODO review.
- Retention/deletion: TODO define raw prompt, OCR, completion, and extracted fact deletion.
- User disclosure: must state AI-assisted, user-confirmable, not legally/financially/medically guaranteed.

### Vercel / Hosting Provider

- Status: TODO confirm actual hosting.
- Purpose: public website and/or frontend hosting.
- Data categories: request logs, IP addresses, device/browser metadata.
- Region: TODO.
- DPA/AVV: TODO.
- Retention/deletion: TODO.
- User disclosure: TODO.

### Email Provider

- Status: TODO select provider.
- Purpose: transactional email, verification, password reset, notifications.
- Data categories: email address, message metadata, email body.
- Region: TODO.
- DPA/AVV: TODO.
- Retention/deletion: TODO.
- User disclosure: TODO.

### SMS / Twilio

- Status: not production-enabled unless explicitly configured.
- Purpose: possible SMS login or notification flow.
- Data categories: phone number, SMS metadata, message content.
- Region: TODO.
- DPA/AVV: TODO.
- Retention/deletion: TODO.
- User disclosure: TODO.

### Analytics

- Status: no nonessential analytics should be enabled without consent review.
- Purpose: TODO only if needed.
- Data categories: TODO.
- Region: TODO.
- DPA/AVV: TODO.
- Consent: required review before activation.

### Error Monitoring

- Status: TODO select provider if needed.
- Purpose: production reliability and debugging.
- Data categories: request ids, error traces, browser/device metadata; must exclude documents, prompts, tokens, raw connector payloads.
- Region: TODO.
- DPA/AVV: TODO.
- Retention/deletion: TODO.
- User disclosure: TODO.

### Affiliate / Marketing Partners

- Status: TODO; not silently enabled.
- Purpose: optional referral/affiliate flows.
- Data categories: affiliate clicks, referral destination, coarse product context only if reviewed.
- Region: TODO.
- DPA/AVV: TODO.
- Consent/disclosure: TODO legal review.

