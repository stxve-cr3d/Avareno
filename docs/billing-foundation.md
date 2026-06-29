# Avareno Billing Foundation

Status: technical foundation, 2026-06-28. Not legal, tax or accounting advice. Review with a German privacy lawyer, external DSB and tax advisor before accepting production payments.

## Direction

- Preferred first billing provider: Paddle as Merchant of Record direction.
- Future alternatives only: Lemon Squeezy and Stripe.
- Do not enable multiple payment providers at once without a documented provider decision.
- Avareno must not store card numbers, payment method details, raw payment payloads or full invoice/payment records.

## Plans

| Plan | Price | Status | Purpose |
|---|---:|---|---|
| Free | 0 EUR/month | active | Try Avareno with a small private memory. |
| Personal | 9 EUR/month | preferred paid plan | Private everyday memory for one person. |
| Family | 19 EUR/month | foundation / disabled until app support is ready | Household and family memory. |

Family must stay disabled or marked "Bald verfügbar" until the product, permissions and billing flow are actually supported.

## Server Environment

Server-side only:

- `PADDLE_API_KEY`
- `PADDLE_WEBHOOK_SECRET`
- `PADDLE_ENVIRONMENT`
- `PADDLE_PERSONAL_PRICE_ID`
- `PADDLE_FAMILY_PRICE_ID`
- `AVARENO_FAMILY_BILLING_ENABLED`
- `PADDLE_CHECKOUT_SUCCESS_URL`
- `PADDLE_BILLING_PORTAL_URL`

No Paddle API key or webhook secret may be exposed to frontend code. A public Paddle client token is not used in the current implementation.

## Backend Endpoints

- `GET /api/billing/status`
  - Returns current local plan/subscription state and safe provider readiness flags.
- `POST /api/billing/checkout`
  - Accepts only `planKey`.
  - Never accepts a client-supplied price.
  - Uses server-side Paddle price ids.
  - Returns only a checkout URL when Paddle is configured.
- `POST /api/billing/portal`
  - Returns a configured HTTPS portal URL or fails safely.
- `POST /api/webhooks/paddle`
  - Requires Paddle webhook signature.
  - Stores provider event id/type/status only.
  - Processes subscription state idempotently.
  - Does not log or store raw webhook payloads.

## Subscription State

Local subscription state uses `PlanSubscription` as the existing equivalent of a `subscriptions` table:

- `id`
- `userId`
- `provider`
- `providerCustomerId`
- `providerSubscriptionId`
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

## Privacy Review

- Personal data processed: Avareno user id, plan key, subscription status, provider customer/subscription ids, period dates, safe billing event metadata. Paddle may process customer email, payment, invoice and tax/VAT metadata.
- Purpose: create and manage paid subscriptions, cancellations, renewal state and safe webhook processing.
- Data minimization: Avareno sends only user id and plan key as checkout custom data; prices stay server-side. No card/payment method data is stored.
- Storage: local SQLite MVP now; future production database with RLS. Paddle stores provider-side billing/payment records.
- Retention: not final. Local subscription state and provider records need retention/deletion rules before paid launch.
- Export/deletion: export and account deletion must include local subscription state; provider-side customer deletion/cancellation process is TODO.
- Third party: Paddle preferred. Lemon Squeezy/Stripe are future alternatives only.
- AI: not used in billing.
- Consent/legal basis: paid subscription processing likely contract necessity, but legal basis, privacy policy and terms must be reviewed.
- Connected accounts/secrets: Paddle API key and webhook secret are server-side only.
- Logs: no raw webhook payloads, card data, invoice records or payment method details in logs.
- Abuse/security risks: forged webhook events, duplicate processing, client-side price tampering, disabled Family purchase bypass. Current foundation requires signatures, stores event ids idempotently and maps prices server-side.

## Open Before Paid Launch

- Paddle MoR scope and VAT/tax handling verified.
- Invoice/customer portal/cancellation/refund behavior verified.
- DPA/AVV, region, subprocessors and transfer mechanisms documented.
- Datenschutzerklaerung, AGB/terms and cancellation copy reviewed.
- Production DB/RLS and webhook tests run against real Paddle sandbox events.
- Export/deletion flows include subscription state and provider-side process notes.
