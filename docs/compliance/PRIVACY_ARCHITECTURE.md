# Avareno Privacy Architecture

This document describes the privacy-first foundation for Avareno. It is not legal advice. It is the engineering baseline that must be reviewed by a German privacy lawyer or external DSB before public launch.

## Product Context

Avareno is a private memory for real life. Users may store and connect:

- products and object profiles
- receipts, invoices, warranties, manuals, contracts, and support documents
- repairs, reminders, returns, open loops, and support tickets
- profile data, avatar images, account settings, and auth metadata
- connected-source data from future integrations
- AI-assisted extracted facts, summaries, and Memory Build results
- sensitive Private Vault documents

Privacy, security, and user control are product requirements, not add-ons.

## Data Categories

### Account And Profile

- name or display name
- email address
- phone number when SMS login is explicitly enabled
- avatar URL or avatar image
- auth provider metadata
- privacy and motivation preferences
- onboarding interests
- onboarding started/completed/dismissed timestamps
- first product-detail-open timestamp
- passkey/provider status

### Billing And Subscriptions

- plan key and subscription status
- provider customer id and provider subscription id
- current billing period dates and cancellation flag
- safe webhook event id/type/status
- provider-side customer, invoice, VAT/tax and payment data handled by the billing provider

Avareno must not store card numbers, payment method details, raw payment payloads, or full provider invoice/payment records.

### Object Memory

- product names, models, serial numbers, categories, locations, price, purchase date
- warranty dates and warranty notes
- manual URLs and support links
- care state, reminders, returns, repairs, and open tasks
- item activity and object history

### Documents And Files

- receipts and invoices
- warranty documents
- manuals
- support files
- object images
- uploaded screenshots
- extracted text and structured metadata

Documents can contain personal data such as names, addresses, order numbers, payment references, account numbers, customer numbers, serial numbers, and location data.

### Private Vault

Private Vault is the highest-protection area. It may include insurance, identity, payment, health, employment, contract, legal, tax, family, or highly personal documents.

Vault data must not be automatically imported, analyzed, shared, exported, or sent to third parties without explicit user action and extra confirmation.

### Connectors

Future Avareno Connect sources may include email import, smart-home providers, retailer accounts, repair portals, cloud drives, webhook sources, import addresses, or custom connector endpoints.

Connector payloads may contain broad unrelated personal data. Connector features must be read-only and minimal by default, with preview before import where practical.

### AI Analysis

AI may assist with extracting product, receipt, warranty, manual, support, and action information.

AI-derived results must be transparent and user-confirmable where important. AI prompts must contain only the minimum necessary data for the active user action.

### Logs And Telemetry

Logs should contain safe operational facts only:

- action type
- user id or request id where necessary
- timestamp
- safe status/error code
- provider name where needed

Logs must not contain raw document content, raw connector payloads, secrets, tokens, full email bodies, full receipt text, addresses, IDs, or private files.

The first-product activation flow stores only server-owned routing timestamps on the user record and derives activation A/B from owned product/document creation. Aggregate reporting must not include product names, email addresses, filenames, document content, notes, barcodes, search terms or raw payloads. No third-party analytics SDK is required for this flow.

## Storage Areas

Current or planned storage areas include:

- Supabase Auth for authentication, Magic Links, sessions, and profile metadata
- Supabase Storage buckets:
  - `avatars`: public object URLs, no public listing
  - `object-images`: private user files
  - `receipts`: private user files
  - `documents`: private user files
  - `support-files`: private user files
- local SQLite / backend MVP storage for development
- local `/uploads` directory in the MVP, accessed through short-lived signed or authenticated API downloads by default
- local MVP `PrivacyAuditEvent` records with safe event metadata only
- local MVP `ConsentEvent` records for consent/permission history where consent flows are used
- future production Postgres with RLS
- future encrypted connector token storage
- billing subscription state and safe billing event records
- future audit/sync logs

Before public launch, production storage must have:

- RLS or equivalent user isolation
- private buckets for private files
- user-owned path policies
- server-side access controls
- short-lived signed downloads or authenticated streaming for private files
- backups and deletion/retention story
- secrets kept server-side

## User Controls

Avareno must provide or plan:

- account settings
- profile update
- email verification
- phone/SMS OTP login status where enabled
- profile image removal
- plan/subscription status and cancellation/customer portal access before paid launch
- connector disconnect
- data export
- account deletion
- document deletion
- object deletion
- AI result correction
- Vault processing confirmation
- consent history where consent is used
- privacy center or equivalent settings area

## Export And Deletion

Export and deletion are mandatory product capabilities before public launch.

Current MVP implementation state:

- local database JSON export is available from the Privacy Center/API
- local ZIP export bundle includes the database JSON, manifest and available local uploaded document files
- uploaded document deletion removes the local database row, extracted text/json and verified local `/uploads` file where present
- document UI opens local files through short-lived signed API download tickets
- local static `/uploads` serving is disabled by default and upload size/type allowlists are active
- AI-extracted document fields can be deleted and corrected through backend controls
- local connected-source metadata can be disconnected
- authenticated account deletion executes the reviewed server-side sequence:
  private Supabase Storage prefixes, Supabase public rows, local files and
  user-owned database rows, absence verification, then Supabase Auth deletion
- a restrictive active-Auth policy and a short-lived hashed backend tombstone
  reject still-unexpired access tokens after deletion
- first-product onboarding state is server-owned; product creation and linked document creation provide content-free activation A/B timestamps for aggregate reporting

Open implementation requirements:

- replace direct MVP ZIP/JSON export with authenticated export jobs, status tracking and production archive downloads
- export production object-storage files or provide provider-side signed file download links
- export AI-extracted metadata and user corrections
- define deletion propagation and restore exclusions for provider backups
- disconnect connectors and delete/revoke stored provider tokens
- define deletion behavior for backups
- define deletion behavior for provider-side data
- include local billing subscription state in export/deletion plans
- define provider-side billing retention, cancellation and deletion process
- define retention windows for logs and raw imports

## Third-Party Providers

Every provider must be documented before production use:

- Supabase Auth, Database, and Storage
- Cloudflare Pages / Turnstile / Workers if used
- email provider
- SMS provider such as Twilio if enabled
- OAuth providers such as Google or Apple
- AI/OCR providers
- billing provider such as Stripe if paid subscriptions are enabled
- analytics providers if any
- newsletter provider if any
- affiliate providers if any
- support/community tools if any

For every provider, document purpose, data categories, region, EU/EEA transfer, DPA/AVV status, retention, deletion, and security controls in `PROCESSING_ACTIVITIES_DRAFT.md`.

## Public Website And Legal Pages

The public website must maintain:

- Impressum for Germany
- Datenschutzerklaerung
- cookie/consent explanation
- documented Turnstile usage
- documented newsletter, affiliate, analytics, or third-party embeds before enabling them

Public claims must be accurate. Do not claim "100% secure", "legally verified", or "guaranteed warranty detection".

## Engineering TODOs

- Keep `docs/compliance/IMPLEMENTATION_STATUS.md` current whenever privacy/security foundations move from TODO to implemented.
- Keep `docs/compliance/SUBPROCESSORS_DRAFT.md` current before enabling any new provider.
- Build production data export job flow with status, retry, provider receipts and cross-user tests.
- Re-test full account deletion against the exact beta project after every
  schema, bucket or Auth configuration change.
- Build connector token deletion/revocation flow.
- Wire real consent-based processing into consent history.
- Keep Privacy Center controls accurate as MVP controls move to production controls.
- Add audit/sync logs that avoid secrets and raw sensitive data.
- Add retention settings for raw imports, AI prompts, files, and logs.
- Maintain a subprocessor list.
- Review cookie/consent logic before launch.
- Add security headers.
- Review Supabase RLS and Storage policies with Supabase advisors.
- Add stronger Vault architecture, potentially re-auth/passkey/PIN and stronger encryption.

## Open Questions For Lawyer / DSB Review

- Which legal basis applies to each processing activity?
- Which documents are treated as special-category data if users upload them?
- What retention periods are acceptable for documents, extracted text, logs, and backups?
- Which subprocessors need AVV/DPA before launch?
- Does any data leave the EU/EEA?
- Is a DSFA/DPIA required for AI extraction, connector imports, or Vault?
- What consent UX is required for cookies, Turnstile, analytics, newsletter, affiliates, AI, and connector imports?
- What legal/tax/Merchant-of-Record review is required before accepting paid subscriptions?
- What exact account deletion and export obligations must be met before launch?
- What support/community wording is required to prevent public sharing of sensitive documents?
