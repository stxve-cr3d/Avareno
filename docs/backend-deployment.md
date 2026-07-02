# Avareno Backend Deployment

Status: FastAPI container foundation, 2026-07-02. This is an MVP deployment bridge, not the final production data architecture.

## Purpose

`avareno.app` is currently a Cloudflare Pages frontend. API routes under `/api/*` are handled by a Pages Function that proxies to a separately hosted backend only when `AVARENO_API_ORIGIN` is configured.

Use a separate HTTPS backend origin such as:

```text
https://api.avareno.app
```

Then set this Cloudflare Pages environment variable:

```text
AVARENO_API_ORIGIN=https://api.avareno.app
```

## Backend Container

The backend container is defined in `backend/Dockerfile`.

Default container paths:

```text
AVARENO_DB_PATH=/data/avareno.db
AVARENO_UPLOAD_ROOT=/data/uploads
```

The host must mount `/data` as persistent storage. Without a persistent volume, subscriptions, invoice metadata, user data and uploads can be lost on redeploy.

## Required Production Environment

Set these on the backend host, not in frontend code:

```text
AVARENO_ENV=production
AVARENO_REQUIRE_AUTH=1
AVARENO_APP_URL=https://avareno.app
AVARENO_DB_PATH=/data/avareno.db
AVARENO_UPLOAD_ROOT=/data/uploads
AVARENO_ENABLE_STATIC_UPLOADS=false
AVARENO_SIGNED_URL_SECRET=<long-random-secret>
AVARENO_CORS_ORIGINS=https://avareno.app,https://www.avareno.app
SUPABASE_URL=<project-url>
SUPABASE_PUBLISHABLE_KEY=<publishable-key>
STRIPE_SECRET_KEY=<live-or-test-secret-for-that-environment>
STRIPE_WEBHOOK_SECRET=<matching-endpoint-signing-secret>
STRIPE_PRICE_PERSONAL_MONTHLY=<price-id>
STRIPE_PRICE_PERSONAL_YEARLY=<price-id>
STRIPE_PRICE_PRO_MONTHLY=<price-id>
STRIPE_PRICE_PRO_YEARLY=<price-id>
STRIPE_PRICE_FAMILY_MONTHLY=<price-id>
STRIPE_PRICE_FAMILY_YEARLY=<price-id>
STRIPE_CHECKOUT_LOCALE=de
```

## Stripe Webhook

After the backend is deployed and `AVARENO_API_ORIGIN` is set, the Stripe endpoint can be:

```text
https://avareno.app/api/webhooks/stripe
```

Cloudflare Pages will forward it to:

```text
https://api.avareno.app/api/webhooks/stripe
```

Use the webhook signing secret from the same Stripe mode as the secret key:

- test endpoint secret with `sk_test_...`
- live endpoint secret with `sk_live_...`

Do not reuse the local Stripe CLI `whsec_...` in production.

## Privacy And Production Limits

This container keeps the current SQLite/local-upload MVP running with a persistent volume. Before using Avareno for real user documents at scale, move private files to access-controlled object storage and move relational data to a production database with RLS or equivalent access controls.

Static upload serving must stay disabled in production. Document downloads should go through signed/authenticated API routes.
