# DSFA / DPIA Screening

This checklist helps decide whether a Data Protection Impact Assessment (German DSFA, GDPR DPIA) may be required.

It is not legal advice. High-risk answers must be reviewed by a German privacy lawyer or external DSB.

## Feature

- Feature name:
- Description:
- Data categories:
- Users affected:
- Third parties:
- Launch state:

## High-Risk Triggers

Mark yes/no:

- Does the feature process sensitive or highly personal documents?
- Could users upload identity, health, insurance, payment, employment, tax, family, legal, or contract documents?
- Does the feature process large volumes of personal data?
- Does the feature import data from connected accounts such as email, cloud drives, retailers, or smart-home providers?
- Does the feature use AI to analyze documents or infer facts?
- Does the feature profile users, rank users, score reliability, or make eligibility decisions?
- Does the feature monitor behavior over time?
- Does the feature expose data to other users, helpers, support agents, or community members?
- Does the feature involve children, family members, tenants, employees, or third parties who may not be direct users?
- Does the feature process location, household, device, network, or smart-home information?
- Does the feature transfer personal data outside the EU/EEA?
- Does the feature use a new provider without DPA/AVV review?
- Would a data breach create significant harm to the user?

## AI-Specific Screening

- Is AI analysis optional and transparent?
- Can the user confirm/correct important facts?
- Is the AI provider documented?
- Is provider retention/training behavior documented?
- Is sensitive Vault content excluded by default?
- Are prompts minimized?
- Is AI prevented from making final legal, medical, financial, insurance, or warranty decisions?

## Connector-Specific Screening

- Is the connector read-only by default?
- Are scopes clear?
- Are raw payloads minimized?
- Is preview before import available?
- Can users disconnect and delete synced data?
- Are tokens encrypted at rest?
- Is SSRF protection implemented for custom URLs?
- Are rate limits and timeouts implemented?

## Screening Outcome

Use the most conservative outcome that applies.

- Low risk: proceed with privacy checklist and documentation.
- Medium risk: proceed only after product/security review.
- High risk: STOP. DSFA/DPIA likely needed before production.
- Unknown risk: STOP and ask for legal/privacy review.

## Screening: Supabase Phone/SMS OTP Auth

- Feature name: Supabase Phone/SMS OTP Auth
- Description: optional passwordless phone login/signup through Supabase Phone Auth and Twilio/SMS provider
- Data categories: phone number, OTP, auth/session metadata, optional display name, optional Turnstile token
- Users affected: signup and registered users who choose phone auth
- Third parties: Supabase, Twilio/SMS provider, optional Cloudflare Turnstile
- Launch state: gated by `VITE_AUTH_PHONE_ENABLED`

High-risk trigger notes:

- Sensitive/highly personal documents: no
- Large-volume processing: no by feature design, but production scale and SMS abuse monitoring need review
- Connected accounts/imports: no
- AI analysis/profiling: no
- Exposure to other users: no
- Third-country transfer/new provider: unknown; Supabase/Twilio/Cloudflare region and DPA/AVV status must be verified
- Breach harm: medium; phone numbers and account access are sensitive enough to require careful auth abuse controls

Screening outcome: medium risk before production enablement because phone numbers and SMS provider transfer/retention details need legal/security review. Gated implementation may proceed for internal testing.

## Screening: Supabase Email Magic Link Auth

- Feature name: Supabase Email Magic Link Auth
- Description: passwordless email login/signup through Supabase Auth Magic Links
- Data categories: email address, auth/session metadata, optional display name, optional Turnstile token
- Users affected: signup and registered users who choose Magic Link auth
- Third parties: Supabase, configured auth email provider, optional Cloudflare Turnstile
- Launch state: enabled in auth UI; production sender/provider review still required

High-risk trigger notes:

- Sensitive/highly personal documents: no
- Large-volume processing: no by feature design, but email abuse/rate limiting needs review
- Connected accounts/imports: no
- AI analysis/profiling: no
- Exposure to other users: no
- Third-country transfer/new provider: unknown; Supabase/email-provider/Cloudflare region and DPA/AVV status must be verified
- Breach harm: medium; mailbox compromise or forwarded Magic Links can grant account access

Screening outcome: low-to-medium risk for implementation, medium before public production launch until provider, sender-domain, redirect, and retention details are verified.

## Screening: Billing And Subscriptions

- Feature name: Billing and subscription foundation
- Description: Free/Personal/Family plan model, Paddle checkout foundation, Paddle webhook foundation, local subscription state
- Data categories: Avareno user id, provider customer id, provider subscription id, plan key, subscription status, billing period dates, safe webhook event id/type/status; provider-side email, invoice, VAT/tax and payment data
- Users affected: registered users choosing paid plans
- Third parties: Paddle preferred first provider direction; Lemon Squeezy/Stripe future alternatives only
- Launch state: foundation; checkout only works after server-side Paddle env configuration; Family disabled by default

High-risk trigger notes:

- Sensitive/highly personal documents: no direct document processing, but the account may belong to a user storing sensitive Avareno data.
- Large-volume processing: no by feature design.
- Connected accounts/imports: no.
- AI analysis/profiling: no.
- Exposure to other users: no.
- Third-country transfer/new provider: unknown until Paddle contract/dashboard/DPA/AVV and subprocessors are verified.
- Breach harm: medium/high because billing identifiers and subscription status can reveal account relationship and purchase state.
- Legal/tax impact: high review need; Merchant-of-Record, VAT/tax, invoices, cancellation/refund and privacy policy wording must be reviewed.

Screening outcome: medium risk for foundation; high review requirement before paid launch. Proceed only with no card data stored, no raw webhook payload logging, signature-verified webhooks and no public claims of legal/tax certainty.

## Screening: Internal Admin Access And Role Management

- Feature name: Internal Admin Access And Role Management
- Description: platform admin dashboard, role distribution, minimized user/account status overview, and admin audit log
- Data categories: admin role records, admin audit events, user account metadata, aggregate object/document/open-loop/subscription counts
- Users affected: internal admins/support and registered users whose metadata may appear in minimized admin views
- Third parties: Supabase Auth/Database in production
- Launch state: internal MVP foundation

High-risk trigger notes:

- Sensitive/highly personal documents: the system may contain them, but the admin dashboard must not expose contents, file paths, OCR text, or Vault files by default.
- Large-volume processing: potential as the user base grows; dashboard must use minimization and pagination.
- Connected accounts/imports: no direct connector data shown.
- AI analysis/profiling: no AI in admin role management.
- Exposure to other users/support agents: yes, internal admins/support can see minimized account metadata; this requires role-based access and audit.
- Third-country transfer/new provider: no new provider beyond planned Supabase, but Supabase region/DPA/AVV must be verified.
- Breach harm: high if admin controls are misconfigured, because admin access could become a path to private Avareno data.

Screening outcome: medium/high. MVP foundation may proceed with minimized data, backend gates, no private document contents, and audit logging. Production launch needs RLS/advisor verification, retention policy, re-auth/break-glass design, and legal/DSB review.

## Required Follow-Ups

- Update processing activities draft.
- Update subprocessor/provider documentation.
- Define retention/deletion.
- Review user-facing consent/transparency.
- Review RLS/storage/access controls.
- Review incident response and breach impact.
