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

## Completed Review: First Product Activation Flow

- Feature name: First Product Activation Flow
- Owner: Engineering/Product
- Route/module: `/onboarding`, `/app/capture/item`, `/app/capture/item/success/:id`, `/app/capture/receipt`, `GET/POST /api/me/activation`
- Backend/API changes: server-owned onboarding timestamps and aggregate activation summary; product creation completes activation A; product-linked document upload completes activation B through existing document storage
- Database/storage changes: four nullable timestamps on the user record (`onboardingStartedAt`, `onboardingCompletedAt`, `onboardingDismissedAt`, `firstProductDetailOpenedAt`); no event stream, document content, filename, product name, email or search term is added to activation telemetry
- Third-party providers: none added; optional barcode catalogue lookup remains a separate explicit user action
- Launch state: scoped invite beta; local account deletion and RLS/Storage
  isolation are implemented and tested; target-project verification,
  malware-scanning, backup policy and legal review remain release gates

Required questions:

1. Personal data: account id, registration timestamp, four onboarding/action timestamps, product/object fields entered by the user and an optional product-linked document.
2. Purpose: route a new user through the shortest useful setup, preserve resume/skip state and measure aggregate time to first real product/document.
3. Avoid collection: activation can be derived partly from product/document creation; only the minimum explicit routing timestamps are stored, with no clickstream.
4. Data minimization: two required product fields; optional details are collapsed; activation reporting excludes names, email addresses, filenames, document content, barcodes, notes and raw request payloads.
5. Storage: activation timestamps and product metadata in the app database; optional files in the existing private document storage path.
6. Retention: activation timestamps currently follow account retention. A shorter analytics retention or anonymised aggregate policy must be decided before production analytics use.
7. Export: the existing account/database export includes the user and product/document records; the activation timestamps must remain included when production export replaces the MVP bundle.
8. Deletion: product/document deletion and authenticated full account deletion
   include activation timestamps; target-project and backup propagation still
   require operational verification.
9. Third-party sharing: none for onboarding/activation. Barcode catalogue lookup can share the entered code only after the user explicitly chooses the lookup action.
10. AI: no AI or automatic document analysis is used in the activation flow.
11. Consent/legal basis: no separate analytics consent is assumed because the timestamps are used for essential product routing and aggregate service improvement; legal-basis wording still requires lawyer/DSB review before production analytics.
12. Connected accounts: no.
13. Sensitive/private documents: optional uploaded files may be sensitive; no automatic Vault import or AI analysis occurs.
14. Tokens/secrets/API credentials: none added; auth tokens remain handled by the existing authenticated API client.
15. Logs: no new product names, filenames, document contents, email addresses, barcodes or request payloads are logged.
16. Abuse/security risks: cross-user access, forged activation state, duplicate submissions and malicious uploads. Mitigations include server-owned status, ownership checks, synchronous duplicate guards, upload type/size validation and private download paths. Malware scanning and production two-user RLS/storage tests remain open.

Decision:

- Privacy review complete: yes for the scoped beta flow
- Safe to implement now: yes for scoped beta
- Needs lawyer/DSB review first: yes before public production analytics/privacy claims
- Notes: Activation reporting must remain aggregate and content-free. Do not enable a general event-tracking SDK for this flow without a new privacy review.

## Completed Review: MVP Privacy Controls Foundation

- Feature name: MVP Privacy Controls Foundation
- Owner: Engineering/Product
- Route/module: `backend/app/routers/privacy.py`, `backend/app/routers/documents.py`, `frontend/src/pages/Rewards.tsx`, `frontend/src/pages/ItemDetail.tsx`
- Backend/API changes: JSON export request, local ZIP export bundle, executed
  full account deletion, local connector disconnect, AI-extracted data
  deletion/correction, document deletion, ownership-checked local document
  download, upload size/type policy
- Database/storage changes: `PrivacyAuditEvent`, `ConsentEvent`, deletion/download of verified local `/uploads` files through signed/authenticated API endpoints; static `/uploads` disabled by default
- Third-party providers: none added
- Launch state: MVP/internal; production launch still blocked by Auth, Storage, provider revocation, backups and legal review

Required questions:

1. Personal data: profile/account metadata, product/object data, document metadata/files, extracted text/json, connector metadata, consent/audit metadata.
2. Purpose: provide user controls for access/export, correction, deletion, disconnect and transparency.
3. Avoid collection: audit records are limited to action/status/context; no raw document text, filenames, prompts, payloads, tokens or secrets are stored.
4. Data minimization: export returns user-owned local database data; safe audit context is redacted and short.
5. Storage: local SQLite for privacy audit/consent metadata; local `/uploads` for current MVP files through short-lived signed or authenticated API downloads by default.
6. Retention: audit/consent retention remains TODO; document deletion removes local file and row where requested.
7. Export: local database JSON export and local uploaded document ZIP bundle are active; provider-side exports, backup handling and production job flow remain open.
8. Deletion: document/extracted-data deletion and full authenticated account
   deletion are active. Backup expiry and future provider-side deletion remain
   operational/legal follow-ups.
9. Third-party sharing: none added.
10. AI: no real provider added; existing mock extraction fields can be corrected or deleted.
11. Consent/legal basis: consent table exists; actual consent UX/legal basis still requires review before production flows.
12. Connected accounts: local connector metadata can be disconnected; real token revocation remains open.
13. Sensitive documents: yes, because uploaded files may be sensitive; UI now uses signed API downloads and static upload serving is default-off, but production still needs verified private object storage.
14. Tokens/secrets/API credentials: no new token storage; frontend still never receives connector secrets.
15. Logs: privacy audit stores safe event metadata only.
16. Abuse/security risks: incomplete auth isolation in local MVP, malware scanning not implemented, missing provider revocation, missing backup deletion, missing production RLS/storage tests, direct ZIP export must be replaced by production job/status handling before high-volume use.

Decision:

- Privacy review complete: yes for scoped MVP controls
- Safe to implement now: yes for local MVP controls
- Needs lawyer/DSB review first: yes before public launch claims or production enablement
- Notes: Do not present this as full GDPR readiness. Keep provider revocation,
  production export jobs/provider exports, Vault protections, retention and
  backups open until production architecture is finished and reviewed.

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

## Completed Review: Product Support Link Resolver MVP

- Feature name: Product Support Link Resolver MVP
- Owner: Engineering/Product
- Route/module: `backend/app/services/product_support.py`, `backend/app/routers/items.py`, `frontend/src/pages/ItemDetail.tsx`
- Backend/API changes: `POST /api/items/{item_id}/support-links/resolve` returns official support-link suggestions for the current item
- Database/storage changes: none; suggestions are not stored until the user reviews and saves existing product-pass fields
- Third-party providers: none called by the MVP resolver; Samsung URLs are constructed locally from a model code
- Launch state: MVP/internal; real manufacturer APIs and search fallback remain blocked until provider review

Required questions:

1. Personal data: product/object data such as manufacturer, model name/model code, existing support links and whether a serial number exists.
2. Purpose: help the user attach official manual, firmware/software and support links to an object profile.
3. Avoid collection: yes; the resolver reuses existing item fields and adds no new required data.
4. Data minimization: only manufacturer/model are used for MVP suggestions; serial number is explicitly not sent or used externally.
5. Storage: no new storage; saved links remain in existing `Item` fields only after user confirmation.
6. Retention: same as Object Memory item data; until user deletion/account deletion.
7. Export: existing item export must include saved support links.
8. Deletion: deleting/editing the item removes or changes saved links; no provider-side data is created by MVP.
9. Third-party sharing: none by backend in MVP; opening suggested links in the browser takes the user to the manufacturer site.
10. AI: no.
11. Consent/legal basis: no separate consent for local suggestions; explicit user action required before any future external lookup.
12. Connected accounts: no.
13. Sensitive/private documents: no direct document processing; linked manuals/support pages may relate to owned products.
14. Tokens/secrets/API credentials: none in MVP; future Dell/HP/Lenovo/Search APIs require server-side secrets and provider documentation.
15. Logs: implementation does not log model, serial number, raw provider payloads or generated URLs.
16. Abuse/security risks: model/serial lookups can reveal product ownership; future external lookups need rate limits, safe logs, provider DPA/AVV review and clear user disclosure.

Decision:

- Privacy review complete: yes for local/static MVP suggestions
- Safe to implement now: yes for no-external-call suggestions
- Needs lawyer/DSB review first: yes before enabling real manufacturer APIs, GS1/catalog calls or search-provider fallback
- Notes: Keep serial-number lookups disabled until the user sees the provider, purpose and data sent. Do not claim warranty/support data is guaranteed.

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

## Completed Review: Public Legal Operator Details

- Feature name: Public legal operator details
- Owner: Founder/Product
- Route/module: `frontend/src/pages/MarketingPages.tsx`, `/impressum`, `/datenschutz`, `/cookies`
- Backend/API changes: none
- Database/storage changes: none
- Third-party providers: none added
- Launch state: supplied operator details added; legal/tax review still required before public paid launch

Required questions:

1. Personal data: public business/operator contact details for Stefan Weiss / SelaPrinting Studio, including address, contact emails and tax number.
2. Purpose: identify the website/app operator and support legal transparency for German launch readiness.
3. Avoid collection: no user data collected; only public operator details shown.
4. Data minimization: only the details supplied for public legal/billing context are shown.
5. Storage: static frontend source/docs.
6. Retention: until operator details change.
7. Export: not applicable to user export.
8. Deletion: update/remove if operator or legal basis changes.
9. Third-party sharing: no new sharing by this change.
10. AI: no.
11. Consent/legal basis: not user consent; legal transparency/operator identification.
12. Connected accounts: no.
13. Sensitive documents: no.
14. Tokens/secrets/API credentials: none.
15. Logs: no logging added.
16. Abuse/security risks: stale or incorrect legal/tax data could mislead users; needs legal/tax review before launch.

Decision:

- Privacy review complete: yes for publishing supplied operator details.
- Safe to implement now: yes.
- Needs lawyer/DSB/tax review first: yes before public paid launch.
- Notes: confirm contact mailboxes are active, verify whether phone/alternative direct contact is required, and align Stripe invoice templates with the same operator details.

## Completed Review: Billing And Subscription Foundation

- Feature name: Billing and subscription foundation
- Owner: Engineering/Product
- Route/module: `backend/app/services/billing.py`, `backend/app/routers/billing.py`, `backend/app/routers/webhooks.py`, `frontend/src/pages/Home.tsx`, `frontend/src/pages/MarketingPages.tsx`, `frontend/src/pages/AuthPages.tsx`
- Backend/API changes: billing status, server-side Stripe Checkout, embedded Stripe Checkout client-secret endpoint, Stripe Billing Portal session creation and Stripe webhook endpoint
- Database/storage changes: `PlanSubscription` billing columns, `BillingEvent` safe event table
- Third-party providers: Stripe as preferred subscription billing direction
- Launch state: Stripe foundation; paid checkout is implemented server-side and production launch still requires Stripe Tax, invoice, retention, cancellation and legal/tax review

Required questions:

1. Personal data: Avareno user id, plan key, billing interval, subscription status, provider customer id, provider subscription id, provider price id, period dates, cancellation flag, safe webhook event id/type/status. Stripe may process email, payment, invoice and tax/VAT metadata.
2. Purpose: create and manage paid subscription state and provider webhook synchronization.
3. Avoid collection: Free plan avoids provider checkout. Paid plans require provider-side billing data.
4. Data minimization: client sends only `planKey` and `billingInterval`; prices and provider ids are server-side. Embedded Checkout returns only a Stripe `clientSecret`. Avareno stores no card/payment method details and no raw webhook payloads.
5. Storage: local SQLite MVP now; future production database with RLS. Stripe stores provider-side billing/payment records after Checkout is implemented.
6. Retention: local/provider retention is not final and must be defined before paid launch.
7. Export: export flow must include local subscription state.
8. Deletion: account deletion must include local subscription state and provider-side cancellation/deletion process notes.
9. Third-party sharing: yes, Stripe when checkout is implemented and used.
10. AI: no.
11. Consent/legal basis: needs lawyer/DSB/tax review; paid subscription processing likely contract necessity, but public policy/terms must be reviewed.
12. Connected accounts: no.
13. Sensitive documents: no direct document processing, but billing links to an account that may store sensitive documents.
14. Tokens/secrets/API credentials: future `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` must be server-side only.
15. Logs: no raw webhook payloads, card data, payment method details, invoice records or secrets should be logged.
16. Abuse/security risks: forged webhooks, duplicate events, client-side price tampering, wrong env Price mapping and fake paid-plan activation. Checkout resolves Price IDs server-side, webhooks require signatures, events are idempotent and direct paid plan changes are rejected.

Decision:

- Privacy review complete: yes for foundation
- Safe to implement now: yes as non-production Stripe foundation with server-side secret handling
- Needs lawyer/DSB review first: yes before accepting production payments
- Notes: verify configured Stripe Products/Prices, test Checkout/webhooks/portal in Stripe test mode, verify Stripe Tax/VAT/invoice handling, DPA/AVV, subprocessors, region/transfers, retention/deletion, cancellation and public legal copy before paid launch.

## Completed Review: Avareno Home Graph Foundation

- Feature name: Avareno Home Graph Foundation
- Owner: Engineering/Product
- Route/module: `frontend/src/pages/HomeGraphConnect.tsx`, `frontend/src/features/home-graph/*`, `backend/app/routers/smart_home.py`, `backend/app/services/smart_home.py`
- Backend/API changes: safe Home Graph connect preview/confirm endpoints for mock provider import; local Samsung TV command path supports power plus basic volume/mute/source-menu commands for already paired local TVs
- Database/storage changes: confirm stores mock smart-home connections/devices in existing `SmartHomeConnection`/`SmartHomeDevice`; Device Passport remains typed/mock-only for now
- Third-party providers: provider registry entries only; no real provider calls added
- Launch state: UI/data-model foundation; real adapters blocked until connector review

Required questions:

1. Personal data: mock device names, room names, provider/app names and safe capability metadata may be stored when the user confirms the mock flow; future Device Passports may include links to receipts, warranties, manuals and support notes.
2. Purpose: help users understand and organize home/smart-home devices and prepare explicit provider connection flows.
3. Avoid collection: yes; no real provider account data is collected and mock import is user-confirmed.
4. Data minimization: registry contains provider metadata only; mock connect stores only device name, room, type and safe `power`/`brightness` capability metadata; local TV control stores reduced device metadata and remote token only in backend/local storage; no provider secrets are exposed to frontend code.
5. Storage: frontend source code for registry/types/mock examples; existing local SQLite smart-home tables for user-confirmed mock imports.
6. Retention: not applicable for this foundation; future persisted Device Passports need retention rules.
7. Export: future Device Passport records must be included in account export before launch.
8. Deletion: future Device Passport and connector records must be deletable and disconnectable.
9. Third-party sharing: none added; future adapters will share data with or receive data from selected providers only after explicit user action.
10. AI: no AI added.
11. Consent/legal basis: future provider connections need explicit user action, transparent scopes and revocation; legal basis needs review before production.
12. Connected accounts: conceptually yes, but no real accounts connected in this task.
13. Sensitive/private documents: not directly; future links to receipts/warranties/manuals may touch sensitive documents.
14. Tokens/secrets/API credentials: no token storage added; real adapters remain blocked until encrypted server-side token storage exists.
15. Logs: no new logs; future sync logs must avoid raw payloads and secrets.
16. Abuse/security risks: unsafe device control, safety-critical locks/cameras/alarms/heaters, provider token leakage, over-broad imports and misleading integration claims. This foundation limits real commands to local TV-style controls and keeps safety-critical device classes blocked until dedicated review.

Decision:

- Privacy review complete: yes for registry/UI/mock foundation
- Safe to implement now: yes
- Needs lawyer/DSB review first: yes before real provider connections, production token storage, command execution or public claims of working integrations
- Notes: keep Home Graph useful even when devices are not controllable; do not implement real control for locks, cameras, alarms, heaters, ovens or similar safety-critical devices without a dedicated safety/security review.

## Completed Review: Object Authorization Remediation

- Feature name: Defensive object authorization remediation
- Owner: Engineering/Security
- Route/module: backend resource routers/services, especially `/api/extract/receipt`
- Backend/API changes: server-side ownership and relationship checks; generic not-found responses for missing and inaccessible objects
- Database/storage changes: none
- Third-party providers: none added
- Launch state: local remediation covered by controlled anonymous/User A/User B JWT regression tests

Required questions:

1. Personal data: existing document, item, household, space, reminder, Vault and smart-home identifiers and metadata are accessed; no new data category is collected.
2. Purpose: prevent one authenticated user from reading, linking, processing or changing another user's objects through client-supplied ids.
3. Avoid collection: yes; the remediation adds checks only.
4. Data minimization: authorization queries return only rows inside the verified user or permitted household boundary; denied requests return no resource metadata.
5. Storage: unchanged existing SQLite/upload storage.
6. Retention: unchanged.
7. Export: unchanged; existing user-scoped export remains applicable.
8. Deletion: unchanged; delete operations are additionally tenant-scoped.
9. Third-party sharing: no new sharing. Receipt processing is server-disabled
   before resource or provider access in the invite beta.
10. AI: disabled for the invite beta; no document reaches an extraction
    provider.
11. Consent/legal basis: no new processing purpose. A new privacy review is
    required before enabling extraction.
12. Connected accounts: existing smart-home relationships are additionally user-scoped; no connector scope is expanded.
13. Sensitive/private documents: yes. Vault documents are never exposed through household membership; receipt access uses owner or active Household OWNER/EDITOR rights.
14. Tokens/secrets/API credentials: identity comes from a verified session/JWT; no token or secret is logged or persisted by this change.
15. Logs: no new content logging.
16. Abuse/security risks: IDOR/BOLA, cross-tenant relation injection, confused-deputy writes and metadata disclosure. Mitigations are combined id/tenant predicates, relationship validation before work, and repeated authorization on final document updates.

Decision:

- Privacy review complete: yes
- Safe to implement now: yes, as a defensive remediation
- Needs lawyer/DSB review first: no additional review introduced by this remediation
- Notes: production deployment must keep `AVARENO_REQUIRE_AUTH=1`; retain the controlled two-user regression in CI.
