# Avareno — 0.1.0-beta.1

Avareno is a private memory for real life: products, receipts, warranties, documents, repairs, reminders and open tasks in one calm, private place.

Beta docs: [docs/BETA_READINESS.md](docs/BETA_READINESS.md) · [docs/BETA_TESTING.md](docs/BETA_TESTING.md) · [CHANGELOG.md](CHANGELOG.md) · Deployment: [docs/deploy-fly.md](docs/deploy-fly.md)

## Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: Python, FastAPI
- Database: SQLite
- Uploads: local `/uploads`
- Auth: Supabase Auth with local SQLite user mirroring
- AI/OCR: mocked extraction services with clear replacement points

## Run locally

```bash
npm install
python3 -m pip install -r backend/requirements.txt
npm run db:init
npm run dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:4000
API docs: http://localhost:4000/docs

The Vite dev server proxies `/api` and `/uploads` to `VITE_API_ORIGIN` (default `http://localhost:4000`). If you run the backend elsewhere — e.g. the Docker image, which defaults to port 4001 — set `VITE_API_ORIGIN` in `frontend/.env.local`.

Local auth expects `frontend/.env.local` and `backend/.env.local`. The frontend uses the Supabase publishable key; the backend verifies Supabase access tokens through Supabase Auth before serving `/api/*` routes.

## Cloudflare Pages

Recommended project settings:

- Project name: `avareno`
- Production domain: `avareno.app`
- Build command: `npm run build`
- Build output directory: `frontend/dist`
- Root directory: repository root

Useful commands:

```bash
npm run cf:whoami
npm run pages:preview
npm run pages:deploy
```

The current Cloudflare setup deploys the React frontend to Pages. The Python/FastAPI backend still uses local SQLite and local uploads, so production API hosting needs a second step: either host the backend separately and set `VITE_API_ORIGIN`, or migrate the API/storage to Cloudflare Workers, D1, and R2.

Cloudflare Pages can proxy `/api/*` to a separately hosted backend when the Pages environment variable `AVARENO_API_ORIGIN` is set to an HTTPS backend origin, for example `https://api.avareno.app`. Without that variable, `/api/*` intentionally returns `501` so Stripe webhooks and app requests do not appear successful while no real backend is available. See `docs/backend-deployment.md`.

## MVP Flows

- Add a receipt upload, run mock extraction, edit fields, then create a smart item.
- Paste a message like `du kimmst am freida oda?`, optionally add a contact, then create a safe in-app reminder.
- See `Today Open` with loops, warranty warnings, incomplete item profiles, XP, and level.
- Complete loops and earn XP.
- Add serial numbers to improve item completeness and earn XP.

## Privacy Direction

- Local-first storage is preferred as the product matures.
- Encrypted local and cloud storage should be added before real private data sync.
- Users should control every uploaded document and be able to delete it.
- The MVP does not scrape WhatsApp or any private messenger.
- The MVP does not send messages automatically.
- AI extraction must remain an explicit user action. No background analysis of private data.
- Current OCR/AI is mocked. Real OCR/OpenAI Vision integration should be added behind `backend/app/services/extraction_service.py`.

## Scripts

```bash
npm run dev            # frontend :5173 + backend :4000
npm run build          # production frontend bundle
npm run typecheck      # backend compileall + frontend tsc
npm run test:backend   # pytest API/security suite (pip install -r backend/requirements-dev.txt once)
npm run verify         # typecheck + tests + build
npm run db:init
npm run db:seed
```
