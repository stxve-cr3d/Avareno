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

## Completed Review: Supabase Phone/SMS OTP Auth

- Feature name: Supabase Phone/SMS OTP Auth
- Owner: Engineering/Product
- Route/module: `frontend/src/lib/authProvider.tsx`, `frontend/src/pages/AuthPages.tsx`
- Backend/API changes: none
- Database/storage changes: none in app database; Supabase Auth stores phone auth identity/session metadata
- Third-party providers: Supabase Auth, Twilio through Supabase Phone provider, optional Cloudflare Turnstile
- Launch state: gated; visible only when `VITE_AUTH_PHONE_ENABLED=true`

Required questions:

1. Personal data: phone number, SMS OTP, Supabase auth id/session metadata, optional signup display name, optional Turnstile token.
2. Purpose: authenticate users with a passwordless phone method.
3. Avoid collection: yes; email/password remains available and phone is optional.
4. Data minimization: no app backend persistence; only Supabase Auth receives phone auth data.
5. Storage: Supabase Auth; Twilio/SMS provider metadata handling must be verified in provider records.
6. Retention: Supabase/Twilio retention unknown; must be reviewed before production launch.
7. Export: account export plan must include Supabase Auth phone identity metadata.
8. Deletion: account deletion orchestrator must delete/revoke Supabase Auth user/session and consider provider retention.
9. Third-party sharing: yes, Supabase and Twilio/SMS provider.
10. AI: no.
11. Consent/legal basis: needs lawyer/DSB review; likely contract/pre-contract for auth, with transparent disclosure.
12. Connected accounts: no.
13. Sensitive documents: no.
14. Tokens/secrets/API credentials: Twilio credentials stay in Supabase dashboard only; no frontend/backend secrets added.
15. Logs: implementation does not add app logs containing phone numbers or OTPs.
16. Abuse/security risks: SMS enumeration, OTP brute force, SIM swap, SMS delivery abuse/cost spikes; require Supabase/Twilio rate limits and monitoring before production.

Decision:

- Privacy review complete: yes for gated implementation
- Safe to implement now: yes as gated UI/code path
- Needs lawyer/DSB review first: yes before production enablement
- Notes: verify Supabase project region, Twilio DPA/AVV, SMS retention/deletion, and Datenschutzerklaerung disclosure before setting `VITE_AUTH_PHONE_ENABLED=true` in production.

## Completed Review: Internal Admin Access And Role Management

- Feature name: Internal Admin Access And Role Management
- Owner: Engineering/Product
- Route/module: `backend/app/routers/admin.py`, `backend/app/services/admin.py`, `frontend/src/pages/AdminDashboard.tsx`
- Backend/API changes: `/api/admin/access`, `/api/admin/summary`, `/api/admin/memberships`
- Database/storage changes: `AdminMembership`, `AdminAuditLog`
- Third-party providers: no new provider; production uses existing Supabase Auth/Database
- Launch state: internal MVP foundation

Required questions:

1. Personal data: admin role records, audit events, user id/email/name, aggregate user object/document/open-loop/subscription counts.
2. Purpose: operate the product safely, manage internal access, support/privacy/billing workflows, and create accountability.
3. Avoid collection: cannot avoid role/audit records for secure admin access; user-facing data is minimized.
4. Data minimization: no document contents, file paths, OCR text, Vault files, raw connector payloads, tokens/secrets, or payment method details are returned.
5. Storage: local SQLite MVP now; production Supabase Postgres with RLS/backend-only admin tables.
6. Retention: admin audit retention TBD before production; role records retained while needed for access control.
7. Export: export plan must include admin audit records that reference a user where legally required and safe.
8. Deletion: account deletion must consider whether audit records are retained for security/legal reasons and whether identifiers should be minimized/anonymized.
9. Third-party sharing: no new sharing; Supabase stores production records.
10. AI: no.
11. Consent/legal basis: likely legitimate interest/contract operations; lawyer/DSB review required before production.
12. Connected accounts: no connector payload access in admin dashboard.
13. Sensitive/private documents: the system may contain them, but admin dashboard explicitly excludes contents and file paths by default.
14. Tokens/secrets/API credentials: service-role keys remain server-side only; no token/secret exposure.
15. Logs: admin audit logs are content-minimized and must not contain sensitive content.
16. Abuse/security risks: privilege escalation, overbroad support access, stale JWT claims, audit tampering, insider misuse, exposed service-role key, RLS/Data API misconfiguration.

Decision:

- Privacy review complete: yes for internal MVP foundation
- Safe to implement now: yes with minimized responses and backend gates
- Needs lawyer/DSB review first: yes before production admin access
- Notes: production must verify Supabase RLS/Data API exposure, run advisors, test non-admin denial, define retention, and add re-auth/break-glass rules before sensitive admin actions.

## Completed Review: Supabase Email Magic Link Auth

- Feature name: Supabase Email Magic Link Auth
- Owner: Engineering/Product
- Route/module: `frontend/src/lib/authProvider.tsx`, `frontend/src/pages/AuthPages.tsx`
- Backend/API changes: none
- Database/storage changes: none in app database; Supabase Auth stores email identity/session metadata
- Third-party providers: Supabase Auth, configured transactional email provider through Supabase, optional Cloudflare Turnstile
- Launch state: active with Supabase Auth email provider; production sender/domain review still required

Required questions:

1. Personal data: email address, Supabase auth id/session metadata, optional signup display name, optional Turnstile token.
2. Purpose: authenticate users with a passwordless email method.
3. Avoid collection: email is required for email authentication; password login and phone login remain separate options.
4. Data minimization: no app backend persistence added; only Supabase Auth receives Magic Link auth data.
5. Storage: Supabase Auth and the configured auth email provider.
6. Retention: Supabase/email-provider retention unknown; must be verified before production launch.
7. Export: account export plan must include Supabase Auth email identity metadata.
8. Deletion: account deletion orchestrator must delete/revoke Supabase Auth user/session and consider email provider retention.
9. Third-party sharing: yes, Supabase and configured transactional email provider; Cloudflare if Turnstile is enabled.
10. AI: no.
11. Consent/legal basis: needs lawyer/DSB review; likely contract/pre-contract for auth, with transparent disclosure.
12. Connected accounts: no.
13. Sensitive documents: no.
14. Tokens/secrets/API credentials: SMTP/provider secrets stay in Supabase dashboard only; no frontend/backend secrets added.
15. Logs: implementation does not add app logs containing email bodies, magic links, or tokens.
16. Abuse/security risks: email enumeration, link forwarding, account takeover if mailbox compromised, email abuse/rate limits; require Supabase rate limits, redirect allowlist, Turnstile, and sender-domain controls.

Decision:

- Privacy review complete: yes for implementation
- Safe to implement now: yes
- Needs lawyer/DSB review first: yes before public production launch
- Notes: verify Supabase project region, auth email provider, sender domain, SPF/DKIM/DMARC, DPA/AVV, retention/deletion, and Datenschutzerklaerung disclosure.

## Completed Review: Billing And Subscription Foundation

- Feature name: Billing and subscription foundation
- Owner: Engineering/Product
- Route/module: `backend/app/services/billing.py`, `backend/app/routers/billing.py`, `backend/app/routers/webhooks.py`, `frontend/src/pages/Home.tsx`, `frontend/src/pages/MarketingPages.tsx`, `frontend/src/pages/AuthPages.tsx`
- Backend/API changes: billing status, checkout, portal placeholder and Paddle webhook endpoint
- Database/storage changes: `PlanSubscription` billing columns, `BillingEvent` safe event table
- Third-party providers: Paddle preferred first Merchant-of-Record direction; Lemon Squeezy/Stripe future alternatives only
- Launch state: foundation; paid checkout requires server-side Paddle env configuration; Family disabled by default

Required questions:

1. Personal data: Avareno user id, plan key, subscription status, provider customer id, provider subscription id, period dates, cancellation flag, safe webhook event id/type/status. Paddle may process email, payment, invoice and tax/VAT metadata.
2. Purpose: create and manage paid subscription state and provider webhook synchronization.
3. Avoid collection: Free plan avoids provider checkout. Paid plans require provider-side billing data.
4. Data minimization: client sends only `planKey`; prices and provider ids are server-side. Avareno stores no card/payment method details and no raw webhook payloads.
5. Storage: local SQLite MVP now; future production database with RLS. Paddle stores provider-side billing/payment records.
6. Retention: local/provider retention is not final and must be defined before paid launch.
7. Export: export flow must include local subscription state.
8. Deletion: account deletion must include local subscription state and provider-side cancellation/deletion process notes.
9. Third-party sharing: yes, Paddle when checkout is configured and used.
10. AI: no.
11. Consent/legal basis: needs lawyer/DSB/tax review; paid subscription processing likely contract necessity, but public policy/terms must be reviewed.
12. Connected accounts: no.
13. Sensitive documents: no direct document processing, but billing links to an account that may store sensitive documents.
14. Tokens/secrets/API credentials: `PADDLE_API_KEY` and `PADDLE_WEBHOOK_SECRET` are server-side only.
15. Logs: no raw webhook payloads, card data, payment method details, invoice records or secrets should be logged.
16. Abuse/security risks: forged webhooks, duplicate events, client-side price tampering, disabled Family purchase bypass. Foundation mitigates with signature verification, idempotent event ids, server-side price ids and disabled Family checkout.

Decision:

- Privacy review complete: yes for foundation
- Safe to implement now: yes as non-production foundation with safe failure when Paddle is not configured
- Needs lawyer/DSB review first: yes before accepting production payments
- Notes: verify Paddle MoR scope, VAT/tax handling, invoice handling, DPA/AVV, subprocessors, region/transfers, retention/deletion, customer portal/cancellation and public legal copy before paid launch.
