# Avareno Closed Beta Readiness

This checklist tracks what must be true before Avareno is shared with a small closed beta group.

## Beta Standard

A closed beta build may be incomplete, but it must feel trustworthy:

- no fake production claims
- no visible demo data in normal user flows
- clear labels for planned features
- safe handling of private data
- stable login, capture, object library, care, billing foundation and smart-home basics
- obvious recovery paths when something fails

## Current Focus

1. Terminology polish
   - User-facing `Ding/Dinge` wording should be replaced by `Objekt`, `Objekte`, `Produktakte` or `Objektbibliothek`.
   - Existing routes such as `/app/dinge` can remain for compatibility, but visible navigation should use professional wording.

2. Smart Home / Home Graph
   - TV detail page exists and uses real power control plus basic local Samsung volume/mute/source-menu commands where supported.
   - Discrete HDMI selection, moments and related-device control must stay marked as planned until implemented.
   - Device-to-product linking should work from the Home Graph detail page.
   - No unsafe controls for locks, cameras, alarms, heaters, ovens or garages.

3. Object Library
   - Object list, detail and capture must use closed-beta-ready copy.
   - Missing receipt, warranty, manual and support states need clear actions.
   - Empty states must feel useful, not demo-like.

4. Privacy And Trust
   - Auth, export, deletion request, connector disconnect and document deletion must stay visible and honest.
   - No provider tokens or raw payloads in frontend code or logs.
   - Privacy/legal pages must not claim full production compliance before legal review.

5. Billing
   - Pricing can be shown.
   - Stripe Checkout/webhooks may be tested only when configured.
   - Free plan is not a Stripe subscription.
   - No fake paid-plan activation.

6. Reliability
   - Frontend typecheck and build must pass.
   - Backend Python compile/tests must pass where available.
   - Critical flows should show loading, error and empty states.
   - Local dev server and API proxy must be documented enough for beta testing.

## Open Beta Blockers

- Production-grade auth/session review.
- Stripe live-mode checkout, portal and webhook verification.
- Final privacy/legal copy for Germany.
- Connector token encryption before real provider OAuth/token storage.
- Account deletion/export completion beyond MVP/local foundations.
- Basic QA pass on desktop and mobile viewports.
