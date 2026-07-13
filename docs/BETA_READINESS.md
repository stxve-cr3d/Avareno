# Beta Readiness — 0.1.0-beta.1

Assessed 2026-07-13 against the repository at this commit. Every claim
below was produced by actually running the listed commands or exercising
the flows in a browser during this assessment.

## Architecture summary

- Frontend: React 18 + TypeScript + Vite + Tailwind, code-split routes,
  dark app-shell design system (`av-*` tokens); deployed as Cloudflare
  Pages (`avareno.app`), `/api/*` proxied via a Pages Function when
  `AVARENO_API_ORIGIN` is set
- Backend: FastAPI + SQLite (single file, `AVARENO_DB_PATH`), local
  upload dir, signed download tickets; container in `backend/Dockerfile`,
  Fly.io config in `fly.toml` (single machine, volume-mounted `/data`)
- Auth: Supabase Auth verified server-side; dev mode runs open with a
  local default user (`AVARENO_REQUIRE_AUTH` unset); production boot
  refuses to start without `AVARENO_REQUIRE_AUTH=1`
- Billing: Stripe (checkout/webhooks), test-mode until legal review
- Connectors: provider registry + Home Assistant direct connector
  (encrypted token storage), Samsung TV local control, Bambu Lab partial

## Setup status

Fresh-clone path (verified working):

```bash
npm install
python3 -m pip install -r backend/requirements.txt
python3 -m pip install -r backend/requirements-dev.txt   # tests
npm run db:init
npm run dev        # frontend :5173, backend :4000 (Vite proxies /api)
npm run verify     # typecheck + backend tests + production build
```

## Baseline problems found in this assessment

| # | Severity | Problem | Status |
|---|----------|---------|--------|
| 1 | P1 | Fresh install/first login: first household-dependent API request returned 404 (household backfilled only by the next db connection) | Fixed (`ensure_household_for_user`), regression-tested |
| 2 | P1 | No automated tests at all | Fixed: 33 backend tests incl. security boot guards |
| 3 | P2 | `AVARENO_CONNECTOR_SECRET_KEY` missing from `.env.example` and deploy docs | Fixed (env example + deploy docs) |
| 4 | P2 | No CHANGELOG / beta docs / version | Fixed (`0.1.0-beta.1`, this file, BETA_TESTING.md) |
| 5 | P1 | Objects could not be deleted at all (documents/devices could, items not) — user-control/privacy gap | Fixed: `DELETE /api/items/{id}` with document-file cleanup, FK cascade, audit event, two-step confirm UI; regression-tested |
| 6 | P2 | No frontend unit/E2E automation | Open — journey covered manually + backend tests; Playwright present as dep, browsers not installed |
| 7 | P3 | Dead components (`ItemCard`, `XpPill`, `Capture.tsx`, `DottedGridPanel`), stray empty `backend/app/second_memory.db` in git | Open, tracked |
| 8 | P3 | `styles.css` ~28k lines, remaining legacy-utility override layer (documented) | Open, tracked |

Historic problems fixed in the sessions leading to this release are in
`CHANGELOG.md` and `docs/compliance/IMPLEMENTATION_STATUS.md`.

## Verification evidence (commands actually run, 2026-07-13)

| Command | Result |
|---------|--------|
| `npm run typecheck` (backend compileall + tsc) | pass |
| `npm run build` (production bundle) | pass (~1.7s) |
| `npm run test:backend` (pytest, 33 tests) | pass |
| `npm audit` / `npm audit --omit=dev` | 0 vulnerabilities |
| `python3 -m pip check` | clean |
| Secret scan over tracked files | no real secrets (doc placeholders only) |
| Production boot guards (subprocess tests) | refuse no-auth boot, refuse static uploads, 401 anonymous API |
| Manual browser journey (see below) | pass |

Manual journey exercised against the dev stack (fresh user, 2026-07-13):
signup → onboarding → create object with type/serial/warranty →
first-value notice on the profile → reminder created via Care →
full reload → data persists, dashboard shows real attention signals and
Memory Health → library search finds exactly the object → two-step
delete → redirected, object and its data gone. Zero console errors.
Mobile 375px spot-checked in this release line (no horizontal scroll on
core pages).

## Known limitations (honest)

- AI extraction mocked (labeled), photo capture planned (labeled)
- Account deletion = recorded request; full execution is a launch
  blocker for public release (`docs/compliance/PRIVACY_RELEASE_BLOCKERS.md`)
- Single-user-per-database assumption in dev mode; production requires
  Supabase auth (enforced)
- SQLite on one machine; manual backup procedure (docs/deploy-fly.md §8)
- Home Assistant connector untested against a real instance from this
  environment (all error paths + security paths tested; happy path needs
  a real HA install)
- No e-mail/push notifications

## Release recommendation

**CONDITIONAL GO** for a small closed beta (≤ ~20 invited households):

- All beta gates pass except: production deployment itself has not been
  executed yet (accounts required), and the HA happy path needs one real
  instance check.
- Do NOT open public signups: account-deletion execution, legal review
  and production storage remain open per the compliance docs.
