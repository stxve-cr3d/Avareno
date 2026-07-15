# Avareno Mobile

Native iOS/Android app for Avareno, built with [Expo](https://expo.dev) SDK 57 + expo-router. Standalone npm project (not part of the root workspace).

## Setup

```bash
cd mobile
npm install
cp .env.example .env   # fill in Supabase URL + publishable key (same as frontend/.env.local)
```

## Run

```bash
npm start          # Expo dev server (scan QR with Expo Go)
npm run android    # Android emulator/device
npm run ios        # iOS (needs macOS; use Expo Go otherwise)
npm run web        # browser preview on :8081
npm run typecheck  # tsc --noEmit (also part of root `npm run typecheck`)
```

Testing against a local backend from a phone: set `EXPO_PUBLIC_API_ORIGIN` to your machine's LAN IP (e.g. `http://192.168.1.20:4000`), not `localhost`.

## Architecture

- `src/app/` — expo-router routes. Root `_layout.tsx` holds the auth gate (`Stack.Protected`): session → `(app)/`, none → `login`.
- `src/lib/supabase.ts` — Supabase client (AsyncStorage on native, default storage on web; `web.output: "single"` in app.json because SSR breaks Supabase imports).
- `src/lib/api.ts` — backend client, mirrors `frontend/src/lib/api.ts` (bearer token, `PlanLimitError` on 402, `AuthRequiredError` on 401 → sign-out).
- `src/lib/captureApi.ts` — capture drop/universal/message + receipt extraction (`/api/capture/*`, `/api/extract/receipt`).
- `src/lib/itemsApi.ts` — items CRUD + barcode lookup (`/api/items`, `/api/items/lookup/barcode`).
- `src/lib/documentsApi.ts` — multipart document upload (RN `{uri,name,type}` FormData) + listing.
- `src/lib/mobileApi.ts` — bootstrap payload + push-token registration (`/api/mobile/*`).
- `src/lib/productQr.ts` — parses Avareno product QR codes (scanner → item id).
- `src/lib/auth.tsx` — `SessionProvider` / `useSession()`.
- `src/constants/theme.ts` — Avareno `--av-*` design tokens ported from `frontend/src/styles.css`.
- Backend endpoints for mobile: `GET /api/mobile/bootstrap`, `POST /api/mobile/devices` (push token registration).

## Roadmap

1. Push notifications (`expo-notifications` + `/api/mobile/devices`)
2. Capture flow with camera/barcode (`expo-camera`) — API layer ready, screens missing
3. Offline cache for bootstrap payload
4. Tabs (Start / Objekte / Mitteilungen), item detail
5. Store builds via EAS (`eas build`), bundle id `de.avareno.app`
