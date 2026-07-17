# First Product Activation Flow

Date: 2026-07-16
Scope: existing Avareno app only; public landing page unchanged

## Baseline Found

Before this implementation:

- onboarding asked for profile/setup choices before proving product value
- onboarding completion primarily depended on frontend/Supabase metadata
- product capture exposed a broad product-pass form and silently defaulted the category
- successful creation went directly into the dense product detail page
- receipt capture led with extraction and could create a second product instead of attaching a document to the first product
- the empty overview offered document upload before a product existed
- no dedicated server-side first-product activation summary or content-free time-to-value report existed

## Implemented Path

1. Signup/login resolves server-owned activation state.
2. New user sees one short welcome screen:
   - primary: add first product
   - secondary: go to the overview for now
3. Product creation requires exactly:
   - product name
   - category
4. Optional fields remain collapsed.
5. Successful save opens a dedicated success step with the real saved product.
6. Primary next action links a real document upload to that product.
7. Successful upload opens the real product record with a visible saved-document notice.
8. Reload, search and returning login resolve from persisted backend data.

No AI analysis, fake extraction, fake product image, fake warranty date or fake document is generated in this path.

## Server Activation Model

User-level routing timestamps:

- `onboardingStartedAt`
- `onboardingCompletedAt`
- `onboardingDismissedAt`
- `firstProductDetailOpenedAt`

Derived user-owned facts:

- activation A: first real `Item`
- activation B: first non-Vault `Document` linked to an owned `Item`
- time to first product
- time to first linked document

`GET /api/me/activation` returns the current state and next route. `POST /api/me/activation` accepts only the three explicit routing actions. Product creation completes onboarding on the server.

The aggregate query in `docs/activation-report.sql` deliberately selects no user id, email, product name, filename, document content, barcode, note, search term or raw payload.

## Manual Timed Run

Environment:

- production frontend build
- mock auth UI
- fresh isolated SQLite database
- mobile viewport 390 × 844
- interactions entered one action at a time in a live browser session

Measured path:

- start: first signup field entry
- end: visible “Dein Produkt ist gespeichert.”
- wall-clock time: **32 seconds**
- server app-user timestamp to first product: **21 seconds**
- screen transitions: signup → onboarding → product form → success
- button clicks: 3
- total entered/selected fields: 5
- product fields required after onboarding: 2

Result: comfortably below the 3:00 target.

Production note: when the backend verifies through the Supabase Auth user endpoint, trusted Supabase `created_at` is mirrored for exact registration timing. Legacy shared-secret JWT verification may fall back to local user-row creation time.

## Automated Browser QA

Run with:

```bash
VITE_AUTH_PROVIDER=mock VITE_API_ORIGIN=http://127.0.0.1:4010 npm run build -w frontend
node frontend/scripts/qa-onboarding.mjs
```

Covered:

- new signup reaches onboarding
- skip and reload persistence
- resume after skip
- exact DE and EN onboarding/product copy
- two required-field validation messages
- duplicate product-submit protection
- real success page and reload persistence
- activation A
- product-linked document context
- explicit no-automatic-analysis disclosure
- upload network failure without data loss
- duplicate document-submit protection after retry
- activation B and first detail open
- document persistence after reload
- immediate search visibility
- returning login skips onboarding
- product network failure preserves entered values
- 320 px, 375 px and 768 px horizontal-overflow checks

Screenshots: `docs/design/qa-2026-07-onboarding/`

## Privacy And Security Decision

Safe for scoped beta:

- no new provider
- no AI
- no content-bearing activation event stream
- server-owned status
- private visibility default
- product/document ownership checks
- type/size validation
- user data retained on recoverable frontend/network errors

Public production blockers remain:

- complete account deletion orchestration, including activation timestamps
- malware scanning for uploaded files
- production private object storage verification
- two-user Supabase RLS and Storage policy tests
- retention/anonymisation decision for long-term activation reporting
- real Supabase signup/OAuth provider QA on the production-like project

The existing product detail page was connected to the flow and corrected for missing price/warranty/document states, but was intentionally not redesigned wholesale.
