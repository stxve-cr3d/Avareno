# Private Storage And Signed Download Architecture

Status: technical foundation, 2026-07-02. Not legal advice. Supabase dashboard state and production storage provider facts still need verification before launch.

## Current MVP State

- Static `/uploads` serving is disabled by default and only available through the explicit `AVARENO_ENABLE_STATIC_UPLOADS` development flag.
- Document metadata remains in the local `Document` table.
- Local file bytes remain under the local `/uploads` directory for MVP/dev.
- The document UI requests a short-lived signed API download ticket from `POST /api/documents/{documentId}/signed-download`.
- The signed URL is redeemed through `GET /api/documents/signed-download/{token}`.
- The token is HMAC-signed server-side, expires quickly, is not persisted, and does not expose local storage paths.
- The signed download route re-loads the document by `documentId` and `userId` from the signed payload before serving the file.
- Direct authenticated `GET /api/documents/{documentId}/download` remains as a backend fallback.

## Environment

- `AVARENO_SIGNED_URL_SECRET` must be set to a long random server-side secret before production.
- `AVARENO_SIGNED_URL_TTL_SECONDS` defaults to 300 seconds and is capped at 900 seconds.
- In production (`AVARENO_ENV=production` or `ENV=production`), missing `AVARENO_SIGNED_URL_SECRET` fails closed.

## Production Target

The stable app contract should remain:

1. User asks Avareno for access to a private document.
2. Backend verifies auth, ownership, retention/deletion state and future Vault/re-auth requirements.
3. Backend returns a short-lived signed download URL or streams the file through an authenticated endpoint.
4. Frontend fetches the URL as a blob and opens a browser object URL, not a public storage URL.

For Supabase Storage or another object store:

- Buckets for receipts, documents, support files and object images must be private.
- Object paths must start with the authenticated owner id or another reviewed ownership prefix.
- Signed storage URLs must only be generated after backend ownership checks.
- Service-role keys must remain server-side only.
- Deletion must remove both metadata and storage objects.
- Export jobs must include storage objects or provider-side signed download links.
- Backup retention and restore deletion reconciliation must be documented.

## Still Open

- Supabase project region, DPA/AVV, subprocessors and bucket dashboard state.
- Supabase storage policy application and cross-user verification.
- Production object-storage adapter.
- Malware scanning or quarantine strategy.
- Vault re-auth/PIN/passkey gate before sensitive document export/download.
- Rate limiting for signed download ticket creation and redemption.
