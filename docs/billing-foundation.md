# Avareno Billing Foundation

Status: server-side Stripe Checkout and webhook foundation, 2026-07-02. Not legal, tax or accounting advice. Review with a German privacy lawyer, external DSB and tax advisor before accepting production payments.

## Direction

- Preferred billing provider direction for subscriptions: Stripe.
- Free is an internal Avareno plan and is not a Stripe subscription.
- Paid plans should be Stripe subscriptions with monthly and yearly recurring Prices.
- Avareno must not store card numbers, payment method details, raw payment payloads or full invoice/payment records.
- Avareno may store minimal invoice metadata and Stripe-hosted invoice/PDF links for account history, but must not download or persist invoice PDFs in local document storage.
- Checkout, portal and webhook routes are implemented server-side. Do not enable production payments until Stripe Tax/VAT, invoice, cancellation, retention and legal/tax review are complete.

## Legal Operator And Invoice Basis

Current supplied website/billing operator details:

- Product/brand: Avareno.
- Legal operator: SelaPrinting Studio, Stefan Weiss.
- Address: Poyßlstraße 1, 93480 Hohenwarth, Germany.
- Tax number: 211/286/61007.
- VAT note: Kleinunternehmer gemäß § 19 UStG. Es wird keine Umsatzsteuer ausgewiesen.

Stripe products, Checkout, hosted invoices and customer emails should use these legal operator details where required. Review the exact invoice template, cancellation wording, customer portal copy, VAT/tax behavior and bookkeeping process with a German tax advisor before accepting production payments.

## Plans

| Plan | Monthly | Yearly | Stripe lookup keys | Purpose |
|---|---:|---:|---|---|
| Free | 0 EUR | 0 EUR | none | Try Avareno with a small private memory. |
| Personal | 4.99 EUR | 49 EUR | `avareno_personal_monthly`, `avareno_personal_yearly` | Private everyday memory for one person. |
| Pro | 8.99 EUR | 89 EUR | `avareno_pro_monthly`, `avareno_pro_yearly` | Larger object memory and advanced AI assistance. |
| Family | 12.99 EUR | 129 EUR | `avareno_family_monthly`, `avareno_family_yearly` | Household and family memory. |

## Limits

| Plan | Items | Storage | Reminders | AI actions/month | Vaults | Users/members |
|---|---:|---:|---:|---:|---:|---:|
| Free | 30 | 100 MB | 5 | 10 | 1 | 1 |
| Personal | 300 | 2 GB | 100 | 100 | 1 | 1 |
| Pro | 2,000 | 20 GB | 1,000 | 500 | 3 | 1 |
| Family | 5,000 | 50 GB | 2,500 | 1,000 | 5 | 5 |

## Server Environment

Server-side only:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PERSONAL_MONTHLY`
- `STRIPE_PRICE_PERSONAL_YEARLY`
- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_PRICE_PRO_YEARLY`
- `STRIPE_PRICE_FAMILY_MONTHLY`
- `STRIPE_PRICE_FAMILY_YEARLY`
- `STRIPE_CHECKOUT_SUCCESS_URL` optional
- `STRIPE_CHECKOUT_CANCEL_URL` optional
- `STRIPE_BILLING_PORTAL_RETURN_URL` optional
- `STRIPE_CHECKOUT_LOCALE` optional, defaults to `de`

Frontend/public:

- `VITE_STRIPE_PUBLISHABLE_KEY` enables embedded Stripe Checkout in the Vite frontend.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` remains accepted as a legacy alias.

Do not hardcode live Stripe Price IDs in UI components. The public pricing config stores lookup keys only.

## Backend Endpoints

- `GET /api/billing/status`
  - Requires an authenticated user.
  - Returns current local plan/subscription state and safe provider readiness flags.
- `GET /api/billing/invoices`
  - Requires an authenticated user.
  - Returns the user's local Stripe invoice metadata history.
  - Does not return payment method details or raw Stripe invoice payloads.
- `POST /api/billing/checkout`
  - Requires an authenticated user.
  - Accepts only `planKey` and `billingInterval`.
  - Rejects Free.
  - Loads Stripe Price IDs from server env vars.
  - Reuses or creates a Stripe customer and returns a Stripe Checkout Session URL.
- `POST /api/billing/checkout/embedded`
  - Requires an authenticated user.
  - Accepts only `planKey` and `billingInterval`.
  - Rejects Free.
  - Creates an embedded Stripe Checkout Session server-side and returns only the Checkout `clientSecret`.
  - Payment details are rendered by Stripe.js in an iframe; Avareno still does not receive card, wallet or bank details.
- `POST /api/billing/portal`
  - Requires an authenticated user with a Stripe customer id.
  - Creates a Stripe Billing Portal session server-side.
- `POST /api/webhooks/stripe`
  - Requires Stripe signature verification.
  - Stores provider event id/type/status only.
  - Processes subscription and invoice events idempotently.

## Checkout Review Flow

Public pricing and account plan actions route paid plans to `/checkout/:planId?interval=monthly|yearly` before Stripe Checkout.

- The review page reads plan names, prices, limits and features from the central frontend pricing config.
- The review page does not collect payment data and does not render card fields.
- If `VITE_STRIPE_PUBLISHABLE_KEY` is configured, the review page embeds Stripe Checkout inside the Avareno checkout surface.
- If the publishable key is missing or embedded Checkout is unavailable, the review page falls back to a server-created Stripe Hosted Checkout redirect.
- Stripe Checkout remains responsible for payment method selection, payment details, invoices and provider-side tax/payment handling.
- Payment methods are controlled in the Stripe Dashboard. The app does not hardcode `payment_method_types`.
- Current Dashboard direction: cards, Apple Pay, Amazon Pay, Link, EPS and Klarna are enabled; SEPA bank transfer is planned next. The frontend may display this as informational copy, but Stripe remains the source of truth for whether a method is actually offered in a specific Checkout session.
- A Checkout Session is created only after an authenticated user confirms the selected paid plan.
- The server session uses `locale=de` by default, `billing_address_collection=auto`, and a short custom submit note.
- Internal Avareno auth aliases such as `@auth.avareno.local` must not be sent to Stripe as customer email. If no real email is available, Checkout collects the customer email.
- Default success and billing portal return URLs point back to `/app/settings/account`.
- Default cancellation URLs return to the selected `/checkout/:planId` review page with `billing=cancelled`.
- Embedded Checkout uses `STRIPE_EMBEDDED_CHECKOUT_RETURN_URL` when set; otherwise it returns to `/app/settings/account?billing=success&session_id={CHECKOUT_SESSION_ID}`.
- The account page consumes `billing=success`, `billing=portal` and cancellation return states, refreshes billing status, then removes the URL marker.

## Stripe Hosted Checkout Appearance

Hosted Checkout can only be customized within Stripe's supported branding and Checkout settings. Use Stripe Dashboard branding for logo, icon, background color, button color, font, shapes and custom domain. Product names, descriptions and recurring price amounts come from Stripe Product and Price objects, so the Dashboard prices must match the central pricing config before launch.

The MVP now prefers embedded Stripe Checkout when the publishable key is configured. For an even more custom Avareno-styled payment page later, use Stripe Elements. That is a larger integration and must keep card/payment data inside Stripe Elements, not Avareno-controlled inputs.

## Subscription State

Local subscription state uses `PlanSubscription` as the existing equivalent of a `subscriptions` table:

- `id`
- `userId`
- `provider` (`internal` for Free, `stripe` for future paid subscriptions)
- `providerCustomerId`
- `providerSubscriptionId`
- `stripePriceId`
- `billingInterval`
- `planKey`
- `tier`
- `status`
- `currentPeriodStart`
- `currentPeriodEnd`
- `cancelAtPeriodEnd`
- `createdAt`
- `updatedAt`

Webhook event state uses `BillingEvent` as the equivalent of `billing_events`:

- `id`
- `provider`
- `eventId`
- `eventType`
- `receivedAt`
- `processedAt`
- `status`
- `safeError`

Invoice history uses `BillingInvoice` as a local account-history cache for Stripe invoice metadata:

- `id`
- `userId`
- `provider`
- `providerInvoiceId`
- `providerCustomerId`
- `providerSubscriptionId`
- `invoiceNumber`
- `status`
- `currency`
- `amountDue`
- `amountPaid`
- `amountRemaining`
- `periodStart`
- `periodEnd`
- `hostedInvoiceUrl`
- `invoicePdfUrl`
- `invoiceCreatedAt`
- `finalizedAt`
- `paidAt`
- `createdAt`
- `updatedAt`

The webhook upserts invoice metadata for `invoice.finalized`, `invoice.paid`, `invoice.payment_succeeded`, `invoice.payment_failed`, `invoice.voided` and `invoice.marked_uncollectible`. It stores Stripe URLs only after host validation and does not copy invoice PDFs into Avareno storage.

## Privacy Review

- Personal data processed: Avareno user id, plan key, billing interval, subscription status, provider customer/subscription ids, provider price id, period dates, safe billing event metadata, invoice number/status/amount/currency/period dates and Stripe-hosted invoice/PDF URLs. Stripe may process customer email, payment, invoice and tax/VAT metadata.
- Purpose: create and manage paid subscriptions, cancellations, renewal state and safe webhook processing.
- Data minimization: Free avoids provider checkout. Paid checkout must send only the minimum metadata needed, such as user id and plan key; prices stay server-side.
- Storage: local SQLite MVP now; future production database with RLS. Stripe stores provider-side billing/payment records and invoice PDFs.
- Retention: not final. Local subscription state, local invoice metadata and Stripe records need retention/deletion rules before paid launch.
- Export/deletion: export and account deletion must include local subscription state and invoice metadata; provider-side customer deletion/cancellation/invoice export process is TODO.
- Third party: Stripe for paid Checkout, portal, subscriptions, invoices and payment method handling.
- AI: not used in billing.
- Consent/legal basis: paid subscription processing likely contract necessity, but legal basis, privacy policy and terms must be reviewed.
- Connected accounts/secrets: Stripe API key and webhook secret must be server-side only.
- Logs: no raw webhook payloads, card data, invoice PDFs, full invoice payloads or payment method details in logs.
- Abuse/security risks: forged webhook events, duplicate processing, client-side price tampering, wrong env Price mapping, and fake paid-plan activation. Checkout uses server env Price IDs, webhooks require signatures, events are idempotent, and direct paid plan changes are rejected.

## Open Before Paid Launch

- Production API hosting must be active before registering a live Stripe webhook. On Cloudflare Pages, set `AVARENO_API_ORIGIN` to the HTTPS FastAPI backend origin so `/api/webhooks/stripe` is proxied instead of returning the safe `501` placeholder.
- Live Stripe webhook endpoint must use the live endpoint signing secret in production `STRIPE_WEBHOOK_SECRET`; do not reuse the local Stripe CLI or test-mode webhook secret.
- Stripe Products and recurring Prices verified against the configured env vars.
- Stripe Tax/VAT, invoice template, legal invoice fields and inclusive price behavior reviewed before production.
- Stripe invoice template includes the correct operator details, Kleinunternehmer note and required contact/address fields.
- Customer portal, cancellation, renewal, refund, invoice emails and invoice/PDF behavior verified in Stripe test mode.
- DPA/AVV, region, subprocessors and transfer mechanisms documented.
- Datenschutzerklaerung, AGB/terms and cancellation copy reviewed.
- Production DB/RLS and webhook tests run against Stripe test events.
- Export/deletion flows include subscription state, invoice metadata and provider-side process notes.
