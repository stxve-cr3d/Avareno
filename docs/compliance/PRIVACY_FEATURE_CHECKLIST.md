# Privacy Feature Checklist

Use this checklist before implementing any feature that touches user data.

If any answer is unknown, STOP and ask. Do not implement until the privacy/security impact is understood.

## Feature Summary

- Feature name:
- Owner:
- Route/module:
- Backend/API changes:
- Database/storage changes:
- Third-party providers:
- Launch state: mock / internal / beta / production

## Required Questions

1. What personal data is collected or processed?
2. Why is it needed?
3. Can we avoid collecting it?
4. Can we collect less?
5. Where is it stored?
6. How long is it retained?
7. Can the user export it?
8. Can the user delete it?
9. Is it shared with a third party?
10. Is AI used?
11. Is consent required?
12. Does it involve connected accounts?
13. Does it involve sensitive/private documents?
14. Are tokens, secrets, or API credentials involved?
15. Are logs safe?
16. What abuse/security risks exist?

## Data Categories

Mark every relevant category:

- Account/profile
- Email address
- Avatar/profile image
- Product/object data
- Receipts/invoices
- Warranty/manual documents
- Support files
- Repair logs
- Reminders/open loops
- Insurance/identity/payment/health/employment/legal/tax/private documents
- Connected account metadata
- Raw connector payloads
- AI prompts/completions/extracted facts
- Analytics/cookie/marketing data
- Affiliate click data
- Support/community data
- Logs/audit records
- Tokens/secrets/API credentials

## User Controls

Required controls:

- User can understand what is being processed.
- User can correct important extracted facts.
- User can delete created data.
- User can export important data before launch.
- User can disconnect connected sources.
- User can revoke consent where consent is used.
- User can see sync/import status where connectors are used.

## AI Check

If AI is used:

- Prompt contains only minimum necessary data.
- No secrets/tokens in prompt.
- No unrelated user data in prompt.
- Sensitive Vault documents are not analyzed by default.
- AI-assisted facts are marked where appropriate.
- Important facts are user-confirmable.
- No legal/medical/financial/insurance/warranty decision is presented as guaranteed.
- Provider, region, retention, and training/data-use behavior are documented.

## Connector Check

If a connector is used:

- No normal username/password collection.
- Read-only by default.
- Scopes are shown to the user.
- Disconnect is available.
- Tokens are encrypted at rest before production.
- Tokens are never exposed to frontend.
- Tokens and payloads are never logged.
- SSRF protection exists for custom URLs.
- Timeouts/rate limits/response size limits exist.
- Preview before import where practical.
- No complete mailbox/drive/archive import by default.

## Logging Check

Logs must not include:

- secrets/tokens/API keys
- full document text
- full raw connector payloads
- email bodies
- addresses, IDs, order numbers, payment details
- private files or screenshots

## Documentation Updates

Update if affected:

- `docs/compliance/PRIVACY_ARCHITECTURE.md`
- `docs/compliance/PROCESSING_ACTIVITIES_DRAFT.md`
- `docs/compliance/DPIA_SCREENING.md`
- `docs/security/CONNECTOR_SECURITY.md`
- `docs/security/AI_DATA_HANDLING.md`
- `docs/auth-foundation.md`
- RLS/storage policy docs
- public legal/cookie pages

## Decision

- Privacy review complete: yes / no
- Safe to implement now: yes / no
- Needs lawyer/DSB review first: yes / no
- Notes:
