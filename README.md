# Avareno MVP

Avareno is a mobile-first web app for real-life open loops: receipts, devices, documents, message reminders, warranties, and small life tasks that should not stay in your head.

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
npm run dev
npm run build
npm run typecheck
npm run db:init
npm run db:seed
```
