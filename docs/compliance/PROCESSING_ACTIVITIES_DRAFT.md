# Processing Activities Draft

This is a working structure for Avareno's processing activities documentation. It must be reviewed by a German privacy lawyer or external DSB before public launch.

## Activity Template

### Name

Short processing activity name.

### Purpose

Why the processing exists.

### Data Categories

Examples:

- account/profile data
- product/object data
- receipts/invoices
- warranty/manual documents
- support files
- reminders/open loops
- connector metadata
- AI prompts/extracted facts
- cookies/analytics
- affiliate clicks
- support messages
- logs
- tokens/secrets

### User Categories

- registered users
- invited household/family members
- support requesters
- newsletter subscribers
- website visitors
- internal admins/support

### Recipients

- Avareno backend/database/storage
- Supabase
- Cloudflare
- email provider
- SMS provider
- OAuth providers
- AI/OCR provider
- analytics provider
- newsletter provider
- affiliate partner
- support/community tools

### Legal Basis

To be reviewed by lawyer/DSB.

### Retention

Define active retention, deletion behavior, backup behavior, and log retention.

### Security Measures

Examples:

- authentication
- RLS/access control
- private storage buckets
- encrypted secret storage
- HTTPS
- rate limiting
- SSRF protection
- audit logs without sensitive content
- least privilege
- re-auth/passkey/PIN for sensitive actions

### Subprocessors

Document provider, purpose, region, DPA/AVV status, EU/EEA transfer, retention/deletion, and user-facing disclosure.

## Draft Activities

Provider-specific draft entries live in `SUBPROCESSORS_DRAFT.md`. Implementation state lives in `IMPLEMENTATION_STATUS.md`.

### Account And Authentication

- Purpose: create account, sign in, manage session, verify email, password reset, provider login.
- Data categories: email, auth provider metadata, session/token metadata, profile metadata.
- Recipients: Supabase Auth, OAuth providers if enabled.
- Retention: until account deletion plus provider/legal retention.
- Security: Supabase Auth, redirect allowlist, no service-role key in frontend.
- Open: DPA/AVV status, passkey provider status, account deletion flow.

### Profile And Settings

- Purpose: personalize app and manage privacy preferences.
- Data categories: display name, avatar, preferences, onboarding interests.
- Recipients: app database/storage, Supabase Storage for avatars.
- Retention: until user edits/deletes or account deletion.
- Security: user-owned paths, access control.
- Open: avatar deletion behavior and public avatar URL risk review.

### Object Memory

- Purpose: store and manage real-life product/object memory.
- Data categories: product names, model, serial, location, purchase info, notes, warranty dates.
- Recipients: app database.
- Retention: until user deletion/account deletion.
- Security: user ownership/RLS.
- Open: export format and deletion behavior.

### Documents, Receipts And Files

- Purpose: store proof, invoices, manuals, warranties, support files.
- Data categories: uploaded files, filenames, MIME type, extracted text, document metadata.
- Recipients: storage provider, app database, optional AI/OCR provider.
- Retention: until user deletion/account deletion; raw extraction retention TBD.
- Security: private buckets, user-owned paths, no public listing.
- Open: encryption at rest, backup deletion, sensitive document handling.

### Private Vault

- Purpose: protect highest-sensitivity private documents.
- Data categories: insurance, identity, payment, health, employment, contract, legal, tax, family/private documents.
- Recipients: app storage/database, optional provider only after explicit action.
- Retention: user-controlled.
- Security: future stronger access controls and encryption.
- Open: re-auth/PIN/passkey, stronger encryption architecture, DSFA/DPIA review.

### Avareno Connect

- Purpose: import or link selected data from user-approved sources.
- Data categories: provider metadata, selected imported records, tokens/secrets, sync logs.
- Recipients: provider APIs, app backend/storage.
- Retention: until disconnect/deletion; token retention until disconnect.
- Security: encrypted tokens, no frontend secrets, SSRF protection, rate limits.
- Open: connector disconnect, token deletion, scope UI, provider DPA review.

### AI Analysis And Memory Build

- Purpose: extract structured facts from user-provided documents or captures.
- Data categories: selected document text/images, prompts, outputs, extracted facts.
- Recipients: AI/OCR provider if enabled.
- Retention: prompt/output retention TBD by provider and app policy.
- Security: minimization, no secrets, no unrelated user data.
- Open: provider selection, EU processing, opt-in/consent, no-training settings, DSFA/DPIA screening.

### Public Website, Cookies, Turnstile

- Purpose: website display, security challenge, legally required pages, optional analytics/newsletter.
- Data categories: website visit metadata, Turnstile challenge data, cookie preferences.
- Recipients: Cloudflare if Turnstile/Pages used, analytics/newsletter provider if enabled.
- Retention: provider dependent.
- Security: minimal cookies, no nonessential tracking without consent.
- Open: cookie consent review, Turnstile disclosure, analytics decision.

### Affiliate And Marketing

- Purpose: optional monetization/referral and product recommendations.
- Data categories: affiliate clicks, product context, referral destination.
- Recipients: affiliate partners if enabled.
- Retention: TBD.
- Security: clear marking, no sensitive document data in affiliate events.
- Open: legal disclosure wording, opt-out/consent where required.

### Support And Community

- Purpose: answer support issues and user questions.
- Data categories: support messages, optional screenshots, account/contact data.
- Recipients: support provider/community platform if enabled.
- Retention: provider dependent.
- Security: private support for sensitive issues; no public document sharing.
- Open: support tooling, retention, public channel warnings.
