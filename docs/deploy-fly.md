# Deploy: Fly.io Runbook

Status: closed-beta deployment path, 2026-07-10. Pairs with `fly.toml` and
`docs/backend-deployment.md` (env contract). SQLite on one volume — exactly
one machine, never scale horizontally while the database is file-based.

## 0. One-time prerequisites

- Docker Desktop running (build verification only; Fly builds remotely too)
- `brew install flyctl && fly auth login`
- Supabase production project (URL + publishable key)
- Stripe **test mode** keys + six price IDs (live mode only after the
  billing/legal review in `docs/compliance/GERMANY_LAUNCH_CHECKLIST.md`)

## 1. Create app + volume (once)

```bash
fly apps create avareno-api
fly volumes create avareno_data --region fra --size 3 --app avareno-api
```

## 2. Secrets (never in fly.toml, never in git)

```bash
fly secrets set --app avareno-api \
  AVARENO_SIGNED_URL_SECRET="$(openssl rand -hex 32)" \
  AVARENO_CONNECTOR_SECRET_KEY="$(openssl rand -hex 32)" \
  SUPABASE_URL="https://<project>.supabase.co" \
  SUPABASE_PUBLISHABLE_KEY="<publishable-key>" \
  STRIPE_SECRET_KEY="sk_test_..." \
  STRIPE_WEBHOOK_SECRET="whsec_..." \
  STRIPE_PRICE_PERSONAL_MONTHLY="price_..." \
  STRIPE_PRICE_PERSONAL_YEARLY="price_..." \
  STRIPE_PRICE_PRO_MONTHLY="price_..." \
  STRIPE_PRICE_PRO_YEARLY="price_..." \
  STRIPE_PRICE_FAMILY_MONTHLY="price_..." \
  STRIPE_PRICE_FAMILY_YEARLY="price_..."
```

Rotating `AVARENO_CONNECTOR_SECRET_KEY` invalidates stored provider tokens
(users reconnect Home Assistant); rotating `AVARENO_SIGNED_URL_SECRET`
invalidates in-flight document download tickets only.

## 3. Deploy

```bash
fly deploy   # from repo root; build context must be the root, not backend/
fly logs --app avareno-api
```

## 4. Domain

```bash
fly certs add api.avareno.app --app avareno-api
```

DNS (Cloudflare): CNAME `api` → `avareno-api.fly.dev`, **DNS-only (grey
cloud)** so Fly can issue the certificate.

## 5. Wire the frontend

Cloudflare Pages → project `avareno` → environment variable:

```text
AVARENO_API_ORIGIN=https://api.avareno.app
```

Redeploy Pages. `/api/*` now proxies to Fly (see `functions/_middleware.js`).

## 6. Stripe webhook

Stripe dashboard (test mode) → add endpoint
`https://avareno.app/api/webhooks/stripe` → copy the endpoint's
`whsec_...` into the `STRIPE_WEBHOOK_SECRET` secret (step 2) → `fly deploy`
is not needed for secret changes; machines restart automatically.

## 7. Smoke checklist (each deploy)

```bash
curl -s https://api.avareno.app/api/health
curl -s -o /dev/null -w "%{http_code}\n" https://api.avareno.app/api/items   # 401 expected: auth required
```

Then in the browser against https://avareno.app: signup → onboarding →
create object → object profile shows the first-value notice → document
upload + download via signed ticket → Memory Health on the dashboard →
export ZIP from the privacy page.

## 8. Backups (before inviting anyone)

```bash
fly ssh console --app avareno-api -C "sqlite3 /data/avareno.db '.backup /data/backup.db'"
fly sftp get /data/backup.db ./backups/avareno-$(date +%F).db --app avareno-api
```

Manual for the closed beta; automate before open beta. Uploads live in
`/data/uploads` — include them when copying.

## Known limits (accepted for closed beta)

- Single machine, SQLite: no zero-downtime deploys, brief restart blips
- Local volume uploads: object storage migration tracked in
  `docs/compliance/PRIVACY_RELEASE_BLOCKERS.md`
- `min_machines_running = 0`: first request after idle has cold-start latency;
  set to 1 once real users are active
