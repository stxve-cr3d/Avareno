# Cookie And Tracking Audit

Status: repository-based audit, 2026-06-28. Not legal advice. Review with a German privacy lawyer or external DSB before public launch.

Relevant official guidance checked for this audit:

- EDPB Guidelines 4/2019 on Data Protection by Design and by Default.
- EDPB SME guide summary of data subject rights.
- German DSK Orientierungshilfe für Anbieter:innen von Telemedien (cookie/terminal equipment consent guidance).

## Current Finding

No nonessential analytics, ad tracking, retargeting, tracking pixels, newsletter tracking or analytics SDK was found in the repository.

The app does use or prepare browser-side storage and third-party scripts for authentication/security:

- Supabase Auth session persistence through `@supabase/supabase-js`.
- Optional Cloudflare Turnstile script when `VITE_AUTH_TURNSTILE_ENABLED=true`.
- Local mock auth profile, language choice, and UI preferences in `localStorage`.

## Cookies / Browser Storage

| Mechanism | Code location | Purpose | Data | Active by default | Consent needed | Disclosure needed | Notes / TODO |
|---|---|---|---|---|---|---|---|
| Supabase auth browser storage | `frontend/src/lib/authClient.ts` | Keep user signed in and refresh session | Session/access token data managed by Supabase client under `avareno-supabase-auth` | Active when Supabase mode configured | Likely necessary for login, but legal review needed | Yes | Document storage name/purpose and provider. |
| Dev/mock auth localStorage | `frontend/src/lib/authProvider.tsx` | Local UI-only mock auth | Mock profile under `avareno-dev-auth-profile` / legacy key | Only when `VITE_AUTH_PROVIDER=mock` | Not for production | No production disclosure if disabled | Ensure mock mode not enabled in production. |
| Language preference localStorage | `frontend/src/lib/language.tsx` | Remember whether the user selected German or English UI | `de`/`en` under `avareno-language` | Active when app loads | Likely preference storage; legal review before public launch | Yes | No backend sync, no third-party sharing, no tracking purpose. |
| Friends privacy localStorage | `frontend/src/pages/Friends.tsx` | Local user UI preferences | Local preference JSON | Active when page used | Likely preference storage; review if production | Yes if production feature remains | Avoid storing sensitive profile data. |
| Rewards localStorage | `frontend/src/pages/Rewards.tsx` | Local UI/preference state | Preference JSON | Active when page used | Review | Yes if production feature remains | Check whether feature fits product/compliance scope. |
| Turnstile script | `frontend/src/pages/AuthPages.tsx` | Bot protection for login/signup | Challenge token and Cloudflare-handled browser/security signals | Only if env flag and site key are set | Security/essential classification needs legal review | Yes | Script from `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit`. |
| Camera permission | `frontend/src/components/BarcodeScannerDialog.tsx` | User-initiated QR/barcode scanning for product lookup or product QR labels | Live camera stream in browser; detected QR/barcode value | Only after user clicks scan | Browser permission; legal/privacy copy should be reviewed | Yes | Stream is stopped on close/detection; no camera frames are uploaded by current code. |
| `document.cookie` | grep result | Direct cookie writes | None found | No | N/A | N/A | No direct `document.cookie` usage found. |
| `sessionStorage` | grep result | Browser session storage | None found in app code | No | N/A | N/A | Supabase library may use its own mechanisms internally. |

## Analytics Usage

- No `gtag`, Google Analytics, Plausible, PostHog, Segment, Meta Pixel, analytics SDK or similar code found.
- Docs mention analytics as future/TODO only.
- Consent required: unknown/likely for nonessential analytics. Do not add without review.

## Newsletter Tracking

- No newsletter implementation found.
- If added: require opt-in model, unsubscribe, provider inventory update, retention policy, and tracking-pixel/link-click review.

## Affiliate Tracking

- Backend stores affiliate clicks in `AffiliateClick`.
- Frontend item detail can record an affiliate click and then open `affiliateUrl`/`reorderUrl`.
- Consent/legal basis: needs review.
- Disclosure needed: yes. Affiliate/reorder links must be clearly marked.
- TODO: define retention, avoid sensitive item/document context, document partner provider behavior.

## Turnstile Usage

- Config: `VITE_AUTH_TURNSTILE_ENABLED`, `VITE_TURNSTILE_SITE_KEY`.
- Runtime: only renders if auth config says enabled.
- Data recipient: Cloudflare and Supabase Auth flow when captcha token is passed.
- TODO: document Cloudflare processing, DPA/AVV, region/transfer, retention and user-facing wording before enabling.

## Public Disclosure Needed

- Auth/session storage.
- Turnstile if enabled.
- Camera permission for QR/barcode scanning.
- Any future analytics/newsletter/error monitoring provider.
- Affiliate click tracking and partner redirects.
- Local preference storage if production-relevant.

## TODOs

- Verify production build and browser storage after final env config.
- Keep no nonessential analytics until consent model is reviewed.
- Add consent/preference history if consent-based processing is introduced.
- Keep scanner camera access explicit and do not upload frames unless a future reviewed feature requires it.
- Keep `/cookies` aligned with actual deployed providers and scripts.
- Do not show a cookie banner unless it is actually needed for consent; if used, make purposes/providers consistent with Datenschutz page.
