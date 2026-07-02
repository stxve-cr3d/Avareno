# Data Processing Map

Status: technical/product readiness draft, 2026-06-28. Not legal advice. Review with a German privacy lawyer or external DSB before public launch.

## Summary

Current architecture visible from the repository:

- Frontend: React/Vite app, Supabase Auth client, optional Turnstile script, local mock auth fallback.
- Backend: FastAPI API with local SQLite MVP database and local `/uploads` file storage behind signed/authenticated API downloads.
- Production deploy: Cloudflare Pages frontend. Production backend/storage is not complete from repo evidence.
- AI/OCR: mock extraction only, with guardrails and replacement point for future provider.
- Connectors: smart-home/provider foundations, SSRF validation helpers, no finished encrypted token store.
- Privacy Center: MVP controls exist for local JSON/ZIP export bundle, document deletion, AI correction/deletion, local connector disconnect and account deletion request logging.

## Processing Areas

| Area | Purpose | Data categories | User action trigger | Storage location | Third parties involved | Retention status | Deletion/export status | Consent/legal basis question | Risk | Missing implementation | Legal review needed |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Account/Auth | Create account, login, session, password reset, OAuth/passkey | Email, auth id, password handled by Supabase, user metadata, session/access token metadata | Signup/login/reset/OAuth/passkey actions | Supabase Auth; frontend browser session storage managed by supabase-js; backend mirrors `sub` into SQLite `User.id` | Supabase, optional Google/Apple/Twilio, optional Turnstile | Provider retention unknown | Auth deletion/session revocation not implemented | Contract necessity vs consent for optional providers/Turnstile needs review | High | Supabase dashboard verification, account deletion orchestration, session revocation, DPA/AVV | Yes |
| Billing/subscriptions | Sell and manage paid Avareno plans | Avareno user id, provider customer id, provider subscription id, plan key, status, period dates, cancel-at-period-end flag, safe webhook event id/type/status; provider may process email, invoice, tax/VAT and payment data | User chooses paid plan, provider checkout, provider webhook, customer portal | SQLite `PlanSubscription`, `BillingEvent`; future production DB; payment/card data stays with provider | Paddle preferred first; Lemon Squeezy/Stripe future alternatives only | Undefined until provider contract/dashboard review | Export/deletion must include local subscription state; provider-side cancellation/deletion/export process TODO | Contract necessity likely for paid subscription; VAT/tax/MoR/DPA/AVV and privacy policy disclosure need legal review | High | Paddle legal/tax/provider review, customer portal, cancellation flow, webhook monitoring, retention policy, production RLS | Yes |
| Profile/settings | Display profile, preferences, avatar, onboarding | Display name, email, avatar URL/file, privacy/motivation prefs, onboarding interests | Onboarding/profile update/avatar upload | Supabase Auth metadata; planned Supabase Storage avatars; mock localStorage in mock mode | Supabase Storage/Auth | Undefined | Profile export/deletion planned only | Legal basis for preferences/profile and public avatar handling | Medium | Dedicated `profiles` table, RLS, avatar deletion, consent/preference history | Yes |
| Products/items | Store object memory | Product names, model, serial number, barcode, QR label URL, merchant, price, location, notes, warranty, support links, affiliate URL | Create/edit item, capture, smart-home import, user prints/scans product QR | SQLite `Item`; QR is generated client-side from item URL; future Supabase DB | Backend/database; external product lookups if enabled | Undefined | Foundation only | Contract/user request; minimization for serial/location notes; QR labels should not include sensitive fields | High | Production DB/RLS, export, item deletion, retention config | Yes |
| Receipts/invoices | Store proof of purchase and structured purchase facts | File, filename, MIME, merchant, price, date, warranty, extracted text/json | Upload document, extract receipt | Local `/uploads`, SQLite `Document`; future storage buckets | Future AI/OCR provider if enabled | Undefined | MVP document deletion, AI correction/deletion and local ZIP export bundle exist | Legal basis and sensitive document handling | High | Private object storage/signed URLs, malware scanning, production export jobs | Yes |
| Documents/uploads | Store manuals, warranties, support files, private docs | Uploaded files, filenames, MIME, paths, extracted text/json | Document upload | Local `/uploads`, SQLite `Document`; future Supabase Storage | Storage provider, future AI/OCR | Undefined | MVP signed/authenticated download endpoint, upload allowlist, document deletion and local ZIP export bundle exist; account deletion/export provider flows incomplete | Consent/contract and special-category screening for Vault-like docs | High | Access-controlled production storage, encryption, malware scanning, retention, production export jobs | Yes |
| Warranty data | Track expiry and warranty readiness | Warranty dates, purchase date, documents, serial/model | Capture/edit item/extract receipt | SQLite `Item`, `Document`, `Loop`, `Reminder` | None unless provider lookup/AI enabled | Undefined | Not complete | Avoid guarantee claims; warranty data may affect legal/consumer actions | Medium | User correction, source provenance, no guaranteed legal outcome copy | Yes |
| Reminders | Remind users about warranties/care/open loops | Reminder title/message/time/status, linked item/loop | Create reminders from UI/capture/planner | SQLite `Reminder`, `Loop` | Future email/push provider if notifications enabled | Undefined | Not complete | Notification legal basis/consent depending channel | Medium | Notification channel consent, deletion/export | Yes |
| Care/tickets/support | Track repairs, support contexts, open loops | Repair problem/resolution/cost/status, support contact, support files | Add repair log/care action | SQLite `RepairLog`, `Loop`, `ItemActivity`, docs | Future support provider | Undefined | Not complete | Sensitive support docs/screenshots; public support warnings | High | Support privacy wording, private upload flow, deletion/export | Yes |
| Resolve | Experience-based support/ticket area | Product issue, helper qualification signals, accepted solution, device context | Create/respond to ticket | Mostly app mock/data foundations; no dedicated production tables found | Future matched users/support if implemented | Undefined | Not complete | Legal basis for showing tickets to qualified helpers; data minimization | High | Dedicated ticket model, visibility rules, consent, audit trail, abuse controls | Yes |
| AI extraction / Memory Build | Extract structured facts from user-selected captures/docs | Selected text/file context, prompts/outputs if real provider, extracted facts, confidence | Explicit extraction request | SQLite `Document.extractedText`, `extractedJson`; future AI records | Future OpenAI/OCR provider | Undefined; mock only now | MVP AI correction/deletion controls exist | Consent/transparency/provider transfer; no sensitive Vault automatic analysis | High | Provider choice, DPA/AVV, no-training settings, provider disclosure, prompt retention | Yes |
| Search | Search user-owned items, loops, docs, reminders | Query string, item/docs metadata, extracted text, reminder content | User searches `/api/search` | Query not persisted in code; reads SQLite | None currently | Query retention not applicable unless logs capture query | Search results export/deletion via source records only | Query may include sensitive info; logs must not store full query | Medium | No-sensitive-logs rule, production log review | Yes |
| Private Vault | Highest-protection sensitive docs | Identity, insurance, payment, medical, employment, contracts, legal, highly personal documents | Future explicit Vault upload/category | Current constants/foundation only; docs may be in `Document` if type used | Storage/AI only after explicit user action | Undefined | Not complete | Possible special-category data and DSFA/DPIA need | High | Re-auth/PIN/passkey, encryption, no auto AI, deletion/export, access audit | Yes |
| Avareno Connect / connectors | Import/link selected external data | Provider metadata, selected records, device IDs, tokens/secrets, sync logs | Connect provider/sandbox/smart-home actions | SQLite smart-home tables; env token for SmartThings local test | SmartThings/Samsung, Bambu/LAN, future providers | Undefined | Disconnect/token deletion plan only | Consent, scopes, provider DPA/AVV, token processing | High | Encrypted token store, revocation, SSRF tests, safe sync logs, rate limits | Yes |
| Newsletter/marketing | Future marketing messages | Email, opt-in timestamp, unsubscribe, campaign metadata | Not implemented | None found | Future email/newsletter provider | Not defined | Not defined | Double opt-in/unsubscribe/consent likely required | Medium | Provider selection, consent history, unsubscribe, disclosure | Yes |
| Affiliate clicks | Track reorder/referral clicks | User id, item id, partner slug, target URL, source, timestamp | User clicks shop/reorder action | SQLite `AffiliateClick` | Affiliate partners if opened | Undefined | Not complete | Marking/disclosure, consent/legitimate interest review | Medium | Affiliate labels, retention, opt-out, avoid sensitive context | Yes |
| Contact/support forms | Support requests | Email/contact, message, attachments/screenshots | No dedicated code found; public pages list contact emails | Email/support provider future | Email/support tool | Undefined | Undefined | Sensitive file warning and support retention | Medium | Private support form, attachment warnings, retention | Yes |
| Analytics/cookies/browser permissions | Website/app metrics, browser storage and explicit browser permissions | No analytics found; Supabase auth session; Turnstile if enabled; localStorage for dev/preferences; camera stream when user opens scanner | Page/app use, login/signup, local preferences, explicit scan action | Browser localStorage/session storage; camera stream stays in browser; provider cookies/scripts | Supabase, Cloudflare Turnstile if enabled | Provider dependent | User cookie/preference/permission model missing | Nonessential tracking requires consent review; camera permission copy should stay explicit | Medium | Cookie inventory, consent model if nonessential tracking added, camera permission documentation | Yes |
| Logs/error monitoring | Debugging/security operations | Request logs, errors, IP/user agent at hosting, safe audit events | API/host operations | Cloudflare logs, backend logs, future monitoring provider | Cloudflare, hosting, monitoring provider if selected | Undefined | Undefined | Log minimization and retention | High | No-sensitive-logs checks, monitoring scrubber, retention window | Yes |
| Backups | Restore availability | Database rows, files, auth data, logs | Provider/platform operations | Unknown production storage/backups | Supabase/hosting/storage providers | Unknown | Backup deletion behavior unknown | Right to erasure vs backup retention review | High | Backup inventory, retention, restore deletion exclusions | Yes |
| Deletion/export | User rights and account lifecycle | All user-owned categories plus auth/storage/provider data | Privacy Center export/delete requests | MVP JSON/ZIP export bundle and deletion request logging; future job/queue storage | Supabase, storage, connectors, AI provider | Undefined | Partial MVP controls only | Data subject rights timing/process review | High | Production export jobs/provider receipts, delete orchestrator, auth deletion, provider revocation, backup handling | Yes |

## Phase 1 Findings

### Technologies/providers used or prepared

- React, Vite, TypeScript, Tailwind CSS/lucide.
- FastAPI, SQLite, PyJWT, python-multipart.
- Supabase Auth client and backend token verification.
- Cloudflare Pages deploy; Turnstile optional.
- Local `/uploads` file storage.
- Mock AI/OCR extraction with future OpenAI/OCR replacement point.
- Smart-home/provider/connector foundations including SmartThings token test path and SSRF helpers.
- Affiliate click tracking foundations.

### User data categories processed

- Account/profile data: email, display name, provider metadata, preferences.
- Product/object data: product name, category, serial/model/barcode, merchant, price, location, notes.
- Documents: uploaded files, filenames, MIME type, paths, extracted text/json.
- Warranty, repair, reminder and care data.
- Smart-home/connector metadata and possible tokens.
- Search queries, support/contact content if added.
- Affiliate click events.
- Browser storage/session data.

### Data stored where

- Local MVP database: `backend/second_memory.db` with schema in `backend/schema.sql`.
- Local files: project `/uploads`, served through short-lived signed or ownership-checked API downloads by default.
- Supabase Auth: external auth/session/profile metadata when configured.
- Supabase Storage/DB: planned by docs, not verifiable from repo.
- Cloudflare Pages: frontend assets and request logs.

### High-risk areas

- Public/static local `/uploads` if `AVARENO_ENABLE_STATIC_UPLOADS` is explicitly enabled outside development.
- Document/receipt storage and extracted text retention.
- Export/deletion partially implemented for local MVP data; production export jobs and full account deletion remain open.
- Supabase production RLS/storage status cannot be verified.
- AI provider not selected; future document prompts may contain sensitive data.
- Connector tokens and custom connector URLs.
- Affiliate disclosure/retention.
- Logs/search queries/support screenshots may contain sensitive data.

### Currently missing for Germany/EU readiness

- Final Impressum and Datenschutzerklaerung with actual controller/provider details.
- Verified provider/subprocessor list and signed DPAs/AVVs.
- Production data hosting decision and region documentation.
- Production data export jobs and full account deletion execution.
- Retention and backup policy.
- Supabase dashboard/RLS/storage verification.
- Cookie/consent decision for Turnstile and any nonessential tracking.
- AI provider disclosure, DPA/AVV, no-training/retention controls.
- Connector encryption, revocation, disconnect, safe logs and SSRF tests.
