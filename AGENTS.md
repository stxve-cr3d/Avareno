AGENTS.md

Avareno Development Instructions

These instructions apply to the entire Avareno project.

Avareno is a premium real-life memory system. It helps users remember, manage, and act on important real-life things such as products, invoices, warranties, manuals, repairs, open tasks, reminders, documents, and experience-based help tickets.

The product must feel calm, useful, trustworthy, and intelligent.

Do not build showcase dashboards. Build usable product screens.

⸻

1. Core Product Philosophy

Avareno is not a normal note app, not a to-do app, not a forum, and not a generic dashboard.

Avareno should feel like:

* a private AI memory system
* a calm real-life command center
* a structured product and document memory
* a useful support and reminder layer
* a premium app people would trust with important information

Avareno should not feel like:

* a crypto dashboard
* a gaming dashboard
* a Dribbble concept
* a generic admin template
* a social media feed
* Reddit
* Discord
* a cheap marketplace website
* a dashboard full of fake analytics

When choosing between impressive and usable, always choose usable.

When choosing between adding and removing, usually remove.

Minimal does not mean empty. Calm does not mean contentless.

⸻

1A. Continuity Rule

Do not solve overload by deleting everything.

When simplifying an existing screen, preserve the useful product intent and reduce the presentation.

For every cleanup pass:

* keep the screen moving forward from the current state
* do not revert the product to an earlier concept
* remove noisy panels, not useful context
* replace dashboard showcases with useful previews
* keep one clear next action
* keep enough content that the screen feels alive
* apply the same standard to all app pages, not only the page currently being edited

If the user says a page feels too empty, add practical preview content, not decorative filler.

If the user says a page feels too crowded, remove secondary panels or move them behind navigation.

⸻

2. UX Principle

One screen must have one main purpose.

Use progressive disclosure:

Home → Section overview → List → Detail → Action flow

Do not show every feature, panel, metric, detail, helper card, modal, and action at the same time.

A good Avareno screen should answer:

* What matters right now?
* What can the user do next?
* Where can the user go for more detail?

A bad Avareno screen tries to show the entire product at once.

⸻

3. Balance Rule

Avoid both extremes:

Too much

Do not create overloaded dashboard screens with:

* too many stat cards
* multiple side panels
* detail views inside overview pages
* helper profiles everywhere
* solution proposals on dashboards
* fake charts
* too many counters
* too many badges
* too many icons
* too many competing CTAs

Too little

Do not create empty landing pages that feel unfinished.

A minimal screen still needs useful content.

Every main app screen should usually contain:

* a clear title
* a short explanation or context
* the most important current item
* one obvious next action
* useful preview content
* navigation to deeper details

Minimal means focused, not empty.

⸻

4. Hard UI Limits

Unless explicitly requested, never exceed these limits on one screen:

* Maximum 1 primary CTA
* Maximum 3 statistic cards
* Maximum 1 main list or table
* Maximum 1 secondary panel
* Maximum 5 primary navigation items
* Maximum 2 accent colors
* Maximum 2 badge styles
* Maximum 1 glow effect per screen
* No floating wizard or modal by default
* No right-side detail panel on overview pages
* No analytics charts unless directly requested

If a screen feels visually busy, simplify it before finishing.

⸻

5. Home Screen Rules

The home screen is not a marketing landing page and not a full analytics dashboard.

The home screen is the calm command center for the user’s real-life memory.

The home screen should answer:

* What is important today?
* What needs attention?
* What can I quickly add?
* Where do I continue?

Recommended home structure:

1. Greeting / hero area
    Keep it useful and not too tall.
2. Important today card
    Show one most relevant item, such as:
    * warranty ending soon
    * unresolved ticket
    * open reminder
    * missing invoice
    * pending return
    * repair follow-up
3. Quick actions
    Show 3–4 compact actions:
    * Add product
    * Scan invoice
    * Create ticket
    * Add reminder
4. Main areas
    Show the core areas with small previews:
    * Dinge
    * Resolve
    * Care
5. Recent activity
    Show 3–5 recent useful events maximum.

Do not show:

* full ticket details
* helper profiles
* solution proposals
* complex analytics
* large tables
* huge empty hero-only layouts

The home screen should feel calm but alive.

⸻

6. Main Navigation

Keep primary navigation minimal.

Preferred primary navigation:

* Zuhause
* Dinge
* Resolve
* Care
* Profil

Secondary items such as settings, archive, categories, reputation, impact, preferences, data privacy, and detailed product management should be moved into profile, settings, secondary menus, or hidden until needed.

Do not create long sidebars unless explicitly requested.

⸻

7. Avareno Resolve Product Rules

Avareno Resolve is an experience-based P2P ticket system.

It is not a forum.

Users create tickets for products they own. Other users only see or answer tickets when the system detects relevant verified experience with the same or similar product.

Resolve should feel like a focused support inbox, not like Reddit, Discord, or a community feed.

Always communicate:

* why this ticket is shown
* why the user is qualified to help
* what the next best action is

Important user questions:

* What tickets need attention?
* Which tickets am I qualified to help with?
* Why am I allowed to answer this?
* How do I create a ticket?
* What is the accepted solution?

⸻

8. Resolve Dashboard Rules

The Resolve dashboard should be focused and calm.

It may show:

* short headline
* 2–3 important stats maximum
* tabs or filters for Open / Qualified / Solved
* main ticket list
* one clear Create ticket button

Do not show on the Resolve dashboard:

* ticket detail panel
* helper profile cards
* solution proposal cards
* full create-ticket wizard
* long technical descriptions
* fake analytics charts
* complex match breakdowns for multiple tickets

Move those details to dedicated pages.

⸻

9. Ticket List Rules

Ticket lists should look like structured support/ticket systems, not social feeds.

Each ticket row or card should show only essential information:

* product name
* issue title
* status
* match score
* created or updated time
* one short reason why the user is qualified

Do not show:

* views
* too many counters
* long descriptions
* multiple helper cards
* solution proposals
* full technical details
* large badges everywhere

A ticket list should be scannable in a few seconds.

⸻

10. Ticket Detail Rules

Detailed content belongs on a dedicated ticket detail page.

Ticket detail may include:

* product context
* problem description
* device details
* firmware/version if available
* accessories
* usage history
* what the user already tried
* AI-generated issue summary
* matching reasons
* helper suggestions
* solution proposals
* accepted solution state

Include a clear section:

“Warum du dieses Ticket beantworten kannst”

This section should explain the matching factors calmly and clearly.

Examples:

* Same product
* Same model
* Verified ownership
* Similar issue solved before
* Same firmware/version
* Relevant accessory
* High reliability score

⸻

11. Create Ticket Flow Rules

Create ticket should be a dedicated page or focused flow.

Do not place the full create-ticket wizard as a floating modal on dashboards unless explicitly requested.

Recommended flow:

1. Select product
2. Describe issue
3. Add technical context
4. Review AI summary/category
5. Publish to matched helpers

The flow should feel simple, guided, and premium.

⸻

12. Dinge Rules

“Dinge” is the user’s stored real-life memory.

It contains products, documents, invoices, manuals, accessories, warranties, repairs, software, and related information.

Dinge screens should focus on:

* stored products
* missing documents
* recently added items
* product details
* invoices
* manuals
* warranty info
* related actions

Do not turn Dinge into a generic file manager.

Every product should feel like a useful memory card, not just a database row.

⸻

13. Care Rules

“Care” is the area for warranties, repairs, reminders, returns, open loops, and follow-ups.

Care should focus on:

* upcoming warranty expirations
* repair reminders
* open returns
* unresolved issues
* pending actions
* missing invoices
* service follow-ups

Care should feel like a calm safety net.

Do not overload Care with analytics.

⸻

14. Visual Direction

Avareno should feel:

* premium
* dark
* calm
* spacious
* structured
* trustworthy
* modern
* useful
* slightly futuristic, but not flashy

Use inspiration from:

* Linear
* Notion
* Stripe Dashboard
* Apple Settings
* Apple Home app

Do not copy their visuals directly. Follow their simplicity, hierarchy, and restraint.

⸻

15. Color and Style Rules

Preferred visual direction:

* dark graphite background
* premium violet / blue accent
* soft borders
* subtle glow only where useful
* large clean cards
* strong typography hierarchy
* minimal visual noise

Suggested colors if no final tokens exist:

* Background: #090A12
* Surface: #12131F
* Surface Soft: #191A2A
* Primary: #6E5BFF
* Primary Soft: #9A8CFF
* Secondary: #29D3FF
* Text Main: #F5F4FF
* Text Muted: #A7A4BD
* Border: rgba(255,255,255,0.08)

Avoid:

* neon green as main identity
* too many gradients
* glowing borders on every card
* colorful childish badges
* too many accent colors
* overly saturated UI
* generic SaaS blue everywhere

⸻

16. Component Rules

Before adding any visible element, ask:

“Does the user need this right now?”

If the answer is no, remove it, hide it, or move it to a detail page.

If an element only exists to make the screenshot look impressive, remove it.

Avoid:

* unnecessary icons everywhere
* dense grids
* tiny text-heavy sections
* too many badges
* too many competing CTAs
* fake analytics
* visual decoration without purpose

Prefer:

* clean cards
* readable typography
* generous spacing
* subtle borders
* calm dark mode
* clear hierarchy
* one clear primary action
* useful previews instead of full details

⸻

17. Product Scope Discipline

Do not invent new product areas unless explicitly requested.

Do not add:

* gamification
* leaderboards
* social feeds
* complex reputation systems
* public community pages
* random analytics dashboards
* unnecessary AI panels
* unnecessary badges
* extra navigation sections

When unsure, build less, but make the remaining content useful.

⸻

18. Before Coding

Before implementing UI changes:

1. Identify the main purpose of the screen.
2. List the minimum useful elements needed for that purpose.
3. Remove anything not required for the current user action.
4. Check existing components, tokens, routes, and patterns before creating new ones.
5. Prefer refactoring existing UI over adding new UI.
6. Keep overview pages calm.
7. Move detail-heavy content to detail pages.

Do not start by creating a large impressive dashboard.

⸻

19. Implementation Rules

* Reuse existing components, tokens, routes, and patterns.
* Do not create a parallel design system.
* Keep components reusable.
* Keep pages responsive.
* Use TypeScript types/interfaces if the project uses TypeScript.
* Create realistic mock data only when no backend exists.
* Avoid hardcoded duplicated UI.
* Add empty, loading, and error states where useful.
* Keep accessibility in mind.
* Run lint/typecheck/build if available.
* Fix all errors before finishing.

⸻

20. Responsive Rules

Desktop:

* Use spacious centered layouts.
* Avoid filling the full screen just because space exists.
* Prefer max-width content areas.
* Keep sidebars minimal.
* Do not show too many columns at once.

Mobile:

* No permanent sidebar.
* Primary content first.
* One main action clearly visible.
* Details only after opening an item.
* Lists must be easy to scan.
* Cards should not become huge text blocks.

⸻

21. Self-Review Checklist

Before finishing, review the UI against these questions:

* Is this screen trying to do too many things?
* Is this screen too empty to feel useful?
* Can any panel be moved to a detail page?
* Can any stat, card, badge, icon, or section be removed?
* Is the main action clear within 3 seconds?
* Does the screen feel like a real product, not a concept screenshot?
* Would a first-time user understand what to do next?
* Did I add anything only because it looked impressive?
* Did I remove so much that the page feels unfinished?
* Is the UI calm but still useful?

If the screen is overloaded, simplify.

If the screen is empty, add useful preview content.

⸻

22. Definition of Done

A UI task is only done when:

* The page has one clear purpose.
* The primary action is obvious.
* The screen is not visually crowded.
* The screen does not feel empty or unfinished.
* Secondary details are hidden behind click/navigation.
* Useful preview content is visible where needed.
* Desktop and mobile layouts work.
* Existing design tokens/components are reused.
* Lint/typecheck/build pass if available.
* The final response includes changed files, assumptions, and validation commands run.

⸻

23. Important One-Line Rules

Do not build a dashboard showcase. Build a usable product screen.

Minimal does not mean empty.

Calm does not mean contentless.

One screen equals one main purpose.

Home shows what matters now.

Overview pages show previews.

Details belong on detail pages.

If it only makes the screenshot look impressive, remove it.

If removing it makes the screen feel useless, add back a useful preview.
