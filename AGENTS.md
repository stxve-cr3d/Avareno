Avareno Development Instructions

These instructions apply to the entire Avareno project.

Avareno is a private memory for real life. Users may store and connect products, receipts, invoices, warranties, manuals, support tickets, repairs, reminders, insurance documents, emails, connected sources, files, and potentially sensitive private documents.

Privacy, security, DSGVO/GDPR compliance, trust, and user control are core product requirements. They are not legal afterthoughts.

## 0. Privacy, Security & Compliance First

Privacy/security/compliance MUST have higher priority than UI polish, speed, growth, AI features, analytics, automation, and convenience.

Avareno MUST be built with privacy by design, privacy by default, security by design, data minimization, purpose limitation, clear user control, export, deletion, retention awareness, and transparency.

Do not build features that collect, import, analyze, share, sync, expose, or retain personal data unless the feature has an explicit purpose, data category, user control, retention logic, and security consideration.

If a feature touches personal data, documents, uploads, receipts, invoices, warranties, emails, connected accounts, AI analysis, cookies, analytics, marketing, newsletter, affiliate tracking, support, Discord/community, or third-party providers, a privacy review is mandatory before implementation.

If privacy, legal basis, security, consent, retention, export, deletion, or third-party handling is unclear, STOP and ask before implementing. Do not guess.

### Privacy Review Required For Every Feature

Every feature touching user data MUST answer these questions before implementation:

- What personal data is collected or processed?
- Why is it needed?
- Can we avoid collecting it?
- Can we collect less?
- Where is it stored?
- How long is it retained?
- Can the user export it?
- Can the user delete it?
- Is it shared with a third party?
- Is AI used?
- Is consent required?
- Does it involve connected accounts?
- Does it involve sensitive/private documents?
- Are tokens, secrets, or API credentials involved?
- Are logs safe?
- What abuse/security risks exist?

If these answers are missing, do not implement the feature. Use `docs/compliance/PRIVACY_FEATURE_CHECKLIST.md`.

### Data Minimization & Purpose Limitation

- Collect the minimum data needed for the user-visible purpose.
- Do not collect data merely because it might be useful later.
- Do not import full mailboxes, drives, archives, device histories, or unrelated files by default.
- Keep data categories separated where practical: profile, objects, documents, receipts, warranties, support, connectors, AI extraction, logs, and Vault.
- Do not reuse data for analytics, marketing, affiliate optimization, AI training, or support without a documented legal basis and user-facing transparency.

### Consent, Legal Basis, Export, Deletion & Retention

- Be aware of DSGVO/GDPR legal basis for every processing activity.
- Consent must be clear, specific, documented, and revocable where consent is the legal basis.
- Users must be able to disconnect sources and delete imported data.
- Users must be able to export their important data before launch.
- Retention must be deliberate. Do not keep uploaded files, raw connector payloads, AI prompts, logs, or extracted text forever by default.
- Add retention notes when adding new tables, buckets, logs, or external provider flows.

### Encryption, Secrets & Logs

- Never expose service-role keys, provider secrets, API tokens, OAuth client secrets, app passwords, or connector credentials in frontend code.
- Secrets and connector tokens MUST be encrypted at rest before production use.
- Secrets MUST NOT be logged, included in analytics, included in AI prompts, or returned to the frontend.
- Logs must avoid personal document contents, receipts, addresses, order numbers, emails, access tokens, and full raw payloads.
- Prefer short event logs that record user, action, timestamp, and safe status, not sensitive content.

### Avareno Connect & Custom Connector Security

Avareno Connect and Custom Connector Builder are high-risk areas.

- Do not collect normal third-party usernames and passwords.
- Prefer OAuth, API tokens, app passwords, webhooks, import addresses, or file uploads.
- Connectors should be read-only by default.
- Show permission scopes clearly before connection.
- Users must be able to disconnect connectors.
- Users must see what was synced.
- Preview data before import where practical.
- Do not import complete mailboxes, drives, archives, or unrelated files by default.
- Prefer user-confirmed imports over background bulk sync.
- Do not execute arbitrary user-provided code in the MVP.
- Store tokens/secrets encrypted at rest.
- Never expose tokens/secrets in frontend code.
- Never log tokens/secrets.
- Never include secrets in AI prompts.
- Custom connector URLs MUST be protected against SSRF.
- Block localhost, private IP ranges, link-local addresses, internal hostnames, and cloud metadata endpoints.
- Add request timeouts, response size limits, and rate limits.
- Prefer HTTPS.
- Keep sync logs safe and free of raw sensitive content.

Use `docs/security/CONNECTOR_SECURITY.md` before implementing connector work.

### AI Analysis & Memory Build

Avareno may use AI to extract product, receipt, warranty, document, and action information. AI handling MUST remain privacy-aware.

- AI analysis must be transparent to the user.
- AI-extracted facts should be marked as AI-assisted where appropriate.
- Important extracted facts should be user-confirmable.
- Do not automatically analyze sensitive Vault documents by default.
- Do not send unnecessary user data to AI providers.
- Do not include secrets, tokens, unrelated user data, or unrelated documents in prompts.
- Keep prompts scoped to the active user action.
- Do not claim warranty, legal, insurance, medical, or financial results are guaranteed or legally binding.
- Do not use AI for final legal, medical, insurance, financial, or warranty decisions.
- Give users control over correction and deletion.
- Document provider, data categories, retention, and whether data leaves the EU/EEA before enabling a real AI provider.

Use `docs/security/AI_DATA_HANDLING.md` before implementing AI extraction or Memory Build changes.

### Private Vault

Private Vault is the highest-protection area.

- No automatic connector import into Vault without explicit user action.
- No automatic AI analysis of Vault documents by default.
- Extra confirmation is required before export, sharing, deletion, or third-party processing.
- Treat insurance, identity, payment, health, employment, contract, legal, tax, family, address, and highly personal documents as sensitive.
- Strong access controls are required before real private data is stored.
- Future architecture should allow stronger Vault protection such as passkey/PIN/re-auth and stronger encryption.
- Do not show Vault contents in public screenshots, community support, analytics, or nonessential logs.

### Website, Cookies, Marketing & Public Claims

- Public website must have Impressum and Datenschutzerklaerung for Germany.
- Cookie/analytics/tracking must be minimal and legally aware.
- No non-essential tracking without consent.
- Turnstile, analytics, newsletter, affiliate links, and third-party embeds must be documented.
- Affiliate links must be clearly marked.
- No marketing emails without proper opt-in and unsubscribe.
- Public marketing claims must not overpromise privacy/security.
- Do not claim "100% secure", "legally verified", "guaranteed warranty detection", or equivalent.

### Support, Social & Discord

- Do not ask users to post invoices, insurance documents, addresses, IDs, order numbers, emails, screenshots with personal data, or private files in Discord/public support channels.
- Use private support flows for sensitive issues.
- Add warnings in support/community copy where users might share sensitive files.
- Blur or anonymize screenshots before public posts.

### Third-Party Providers & Subprocessors

Before adding a provider, document:

- purpose
- data categories
- region
- whether personal data is processed
- whether DPA/AVV is needed
- whether data leaves EU/EEA
- retention/deletion behavior
- security measures
- user-facing disclosure

Keep this in `docs/compliance/PROCESSING_ACTIVITIES_DRAFT.md` or a dedicated provider note.

### Required Documentation Updates

When a feature changes privacy/security behavior, update the relevant docs:

- `docs/compliance/PRIVACY_ARCHITECTURE.md`
- `docs/compliance/PRIVACY_FEATURE_CHECKLIST.md`
- `docs/compliance/DPIA_SCREENING.md`
- `docs/compliance/PROCESSING_ACTIVITIES_DRAFT.md`
- `docs/security/CONNECTOR_SECURITY.md`
- `docs/security/AI_DATA_HANDLING.md`
- `docs/auth-foundation.md`
- `docs/supabase-rls-foundation.sql`
- `docs/supabase-storage-policies.sql`

Add TODOs or issues for missing export, account deletion, connector disconnect, consent history, privacy center, audit/sync logs, retention settings, subprocessor list, cookie/consent review, security headers, and Supabase RLS/access-control review.

## 1. Core Product Philosophy

Avareno is not a normal note app, not a to-do app, not a forum, and not a generic dashboard.

Avareno should feel like:

- a private AI memory system
- a calm real-life command center
- a structured product and document memory
- a useful support and reminder layer
- a premium app people would trust with important information

Avareno should not feel like:

- a crypto dashboard
- a gaming dashboard
- a Dribbble concept
- a generic admin template
- a social media feed
- Reddit
- Discord
- a cheap marketplace website
- a dashboard full of fake analytics

When choosing between impressive and usable, always choose usable.

When choosing between adding and removing, usually remove.

Minimal does not mean empty. Calm does not mean contentless.

## 1A. Continuity Rule

Do not solve overload by deleting everything.

When simplifying an existing screen, preserve useful product intent and reduce presentation.

For every cleanup pass:

- keep the screen moving forward from the current state
- do not revert the product to an earlier concept
- remove noisy panels, not useful context
- replace dashboard showcases with useful previews
- keep one clear next action
- keep enough content that the screen feels alive
- apply the same standard to all app pages, not only the page currently edited

If the user says a page feels too empty, add practical preview content, not decorative filler.

If the user says a page feels too crowded, remove secondary panels or move them behind navigation.

## 2. UX Principle

One screen must have one main purpose.

Use progressive disclosure:

Home -> Section overview -> List -> Detail -> Action flow

Do not show every feature, panel, metric, detail, helper card, modal, and action at the same time.

A good Avareno screen should answer:

- What matters right now?
- What can the user do next?
- Where can the user go for more detail?

A bad Avareno screen tries to show the entire product at once.

## 3. Balance Rule

Avoid both extremes.

Too much: do not create overloaded dashboard screens with too many stats, side panels, detail views, helper profiles, solution proposals, fake charts, counters, badges, icons, or competing CTAs.

Too little: do not create empty landing pages that feel unfinished.

Every main app screen should usually contain:

- a clear title
- a short explanation or context
- the most important current item
- one obvious next action
- useful preview content
- navigation to deeper details

Minimal means focused, not empty.

## 4. Hard UI Limits

Unless explicitly requested, never exceed these limits on one screen:

- Maximum 1 primary CTA
- Maximum 3 statistic cards
- Maximum 1 main list or table
- Maximum 1 secondary panel
- Maximum 5 primary navigation items
- Maximum 2 accent colors
- Maximum 2 badge styles
- Maximum 1 glow effect per screen
- No floating wizard or modal by default
- No right-side detail panel on overview pages
- No analytics charts unless directly requested

If a screen feels visually busy, simplify it before finishing.

## 5. Home Screen Rules

The home screen is the calm command center for the user's real-life memory. It should answer:

- What is important today?
- What needs attention?
- What can I quickly add?
- Where do I continue?

Recommended home structure:

1. Greeting / useful hero area
2. Important today card
3. Quick actions
4. Main areas with previews: Dinge, Resolve, Care
5. Recent useful activity

Do not show full ticket details, helper profiles, solution proposals, complex analytics, large tables, or huge empty hero-only layouts.

## 6. Main Navigation

Keep primary navigation minimal.

Preferred primary navigation:

- Zuhause
- Dinge
- Resolve
- Care
- Profil

Move settings, archive, categories, reputation, impact, preferences, data privacy, and detailed product management into profile/settings/secondary menus until needed.

Do not create long sidebars unless explicitly requested.

## 7. Avareno Resolve Product Rules

Avareno Resolve is an experience-based P2P ticket system. It is not a forum.

Users create tickets for products they own. Other users only see or answer tickets when the system detects relevant verified experience with the same or similar product.

Resolve should feel like a focused support inbox, not Reddit, Discord, or a community feed.

Always communicate:

- why this ticket is shown
- why the user is qualified to help
- what the next best action is

## 8. Resolve Dashboard Rules

Resolve may show a short headline, 2-3 important stats maximum, filters for Open/Qualified/Solved, the main ticket list, and one clear Create ticket button.

Do not show ticket detail panels, helper profile cards, solution proposals, full create-ticket wizards, long technical descriptions, fake analytics charts, or complex match breakdowns on the Resolve dashboard.

Move those details to dedicated pages.

## 9. Ticket List Rules

Ticket lists should look like structured support/ticket systems, not social feeds.

Each ticket row/card should show only essential information:

- product name
- issue title
- status
- match score
- created or updated time
- one short reason why the user is qualified

Do not show views, too many counters, long descriptions, helper cards, solution proposals, full technical details, or large badges everywhere.

## 10. Ticket Detail Rules

Detailed content belongs on a dedicated ticket detail page.

Ticket detail may include product context, problem description, device details, firmware/version, accessories, usage history, attempts, AI-generated issue summary, matching reasons, helper suggestions, solution proposals, and accepted solution state.

Include a clear section: "Warum du dieses Ticket beantworten kannst".

## 11. Create Ticket Flow Rules

Create ticket should be a dedicated page or focused flow.

Recommended flow:

1. Select product
2. Describe issue
3. Add technical context
4. Review AI summary/category
5. Publish to matched helpers

Do not place the full create-ticket wizard as a floating modal on dashboards unless explicitly requested.

## 12. Dinge Rules

"Dinge" is the user's stored real-life memory. It contains products, documents, invoices, manuals, accessories, warranties, repairs, software, and related information.

Dinge screens should focus on stored products, missing documents, recently added items, product details, invoices, manuals, warranty info, and related actions.

Do not turn Dinge into a generic file manager.

Every product should feel like a useful memory card, not just a database row.

## 13. Care Rules

"Care" is the area for warranties, repairs, reminders, returns, open loops, and follow-ups.

Care should focus on upcoming warranty expirations, repair reminders, open returns, unresolved issues, pending actions, missing invoices, and service follow-ups.

Care should feel like a calm safety net.

Do not overload Care with analytics.

## 14. Visual Direction

Avareno should feel premium, dark, calm, spacious, structured, trustworthy, modern, useful, and slightly futuristic without being flashy.

Approved current Avareno UI direction:

- Supabase-inspired clean dark UI
- compact top navigation
- subtle dotted/grid background where useful
- neutral dark panels
- thin borders
- precise spacing
- restrained accent usage
- primary accent: `#3ECF8E`
- amber only for warranty/deadline/attention
- red only for missing/incomplete/risk
- Object Memory / Memory Build language

Avoid:

- teal fog
- random glow
- excessive glow
- neon look
- hacker/matrix/terminal backgrounds
- overloaded dashboard UI
- fake analytics
- cheap SaaS templates
- crypto/gaming visuals
- childish badges
- generic blue dashboards

Use visual inspiration only as a quality bar for restraint and spacing. Do not copy Supabase, Linear, Notion, Stripe, Apple, or any other product.

## 15. Component Rules

Before adding any visible element, ask: "Does the user need this right now?"

If the answer is no, remove it, hide it, or move it to a detail page.

Avoid unnecessary icons everywhere, dense grids, tiny text-heavy sections, too many badges, competing CTAs, fake analytics, and decorative elements without purpose.

Prefer clean cards, readable typography, generous spacing, subtle borders, calm dark mode, clear hierarchy, and useful previews.

## 16. Product Scope Discipline

Do not invent new product areas unless explicitly requested.

Do not add gamification, leaderboards, social feeds, complex reputation systems, public community pages, random analytics dashboards, unnecessary AI panels, unnecessary badges, or extra navigation sections.

When unsure, build less, but make the remaining content useful.

## 17. Before Coding

Before implementing UI or data changes:

1. Identify the main purpose of the screen or feature.
2. If user data is touched, complete the privacy review checklist.
3. List the minimum useful elements needed.
4. Remove anything not required for the current user action.
5. Check existing components, tokens, routes, and patterns before creating new ones.
6. Prefer refactoring existing UI over adding new UI.
7. Keep overview pages calm.
8. Move detail-heavy content to detail pages.

Do not start by creating a large impressive dashboard.

## 18. Implementation Rules

- Reuse existing components, tokens, routes, and patterns.
- Do not create a parallel design system.
- Keep components reusable.
- Keep pages responsive.
- Use TypeScript types/interfaces if the project uses TypeScript.
- Create realistic mock data only when no backend exists.
- Avoid hardcoded duplicated UI.
- Add empty, loading, and error states where useful.
- Keep accessibility in mind.
- Run lint/typecheck/build if available.
- Fix all errors before finishing.

For Supabase/Postgres work:

- Review `docs/auth-foundation.md`.
- Review `docs/supabase-rls-foundation.sql`.
- Review `docs/supabase-storage-policies.sql`.
- Keep service-role keys server-side only.
- Use RLS and storage policies before production user data.

## 19. Responsive Rules

Desktop:

- Use spacious centered layouts.
- Avoid filling the full screen just because space exists.
- Prefer max-width content areas.
- Keep sidebars minimal.
- Do not show too many columns at once.

Mobile:

- No permanent sidebar.
- Primary content first.
- One main action clearly visible.
- Details only after opening an item.
- Lists must be easy to scan.
- Cards should not become huge text blocks.

## 20. Self-Review Checklist

Before finishing, review:

- Did the feature pass the privacy review if it touches user data?
- Is the legal basis/consent/retention/export/deletion story clear?
- Are logs safe?
- Are secrets protected?
- Are third-party providers documented?
- Is this screen trying to do too many things?
- Is this screen too empty to feel useful?
- Can any panel be moved to a detail page?
- Is the main action clear within 3 seconds?
- Does the screen feel like a real product, not a concept screenshot?
- Would a first-time user understand what to do next?
- Did I add anything only because it looked impressive?
- Is the UI calm but still useful?

If privacy/security is unclear, STOP and ask.

## 21. Definition Of Done

A UI/data task is only done when:

- Privacy/security/compliance impact has been considered.
- Required docs/checklists have been updated.
- The page has one clear purpose.
- The primary action is obvious.
- The screen is not visually crowded.
- The screen does not feel empty or unfinished.
- Secondary details are hidden behind click/navigation.
- Useful preview content is visible where needed.
- Desktop and mobile layouts work.
- Existing design tokens/components are reused.
- Lint/typecheck/build pass if available.
- The final response includes changed files, assumptions, validation commands run, and unresolved privacy/security questions.

## 22. Important One-Line Rules

Privacy/security/compliance first.

Do not build a dashboard showcase. Build a usable product screen.

Minimal does not mean empty.

Calm does not mean contentless.

One screen equals one main purpose.

Home shows what matters now.

Overview pages show previews.

Details belong on detail pages.

If it only makes the screenshot look impressive, remove it.

If removing it makes the screen feel useless, add back a useful preview.

If user data is involved and the privacy review is missing, do not implement.
