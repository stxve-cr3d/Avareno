from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.auth import auth_middleware
from app.services.document_storage import UPLOAD_ROOT
from app.routers import assistant, billing, capture, dashboard, documents, extract, friends, items, loops, me, mobile, notifications, planner, privacy, reports, rewards, search, smart_home, structure, vaults, webhooks

app = FastAPI(title="Avareno API")


def _cors_origins() -> list[str]:
    configured = os.environ.get("AVARENO_CORS_ORIGINS")
    if configured:
        return [origin.strip().rstrip("/") for origin in configured.split(",") if origin.strip()]
    return [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.middleware("http")(auth_middleware)

_auth_required = os.environ.get("AVARENO_REQUIRE_AUTH") == "1"
_static_uploads_requested = os.environ.get("AVARENO_ENABLE_STATIC_UPLOADS", "").strip().lower() in {"1", "true", "yes", "on"}
_is_production = os.environ.get("AVARENO_ENV", os.environ.get("ENV", "")).strip().lower() in {"production", "prod"}

if _is_production and not _auth_required:
    # This app stores private receipts, warranties, personal documents and
    # smart-home tokens per user. Booting in production with auth optional
    # (AVARENO_REQUIRE_AUTH unset/0) would let every request fall back to
    # get_default_user()'s "first user in the DB" - i.e. no real
    # authentication at all. Refuse to start rather than silently expose it.
    raise RuntimeError(
        "AVARENO_REQUIRE_AUTH=1 is required in production (AVARENO_ENV/ENV=production). "
        "Refusing to start with authentication optional."
    )

if _static_uploads_requested and _is_production:
    # Never allow the unauthenticated static-file escape hatch in production,
    # even if AVARENO_ENABLE_STATIC_UPLOADS was left set from a dev .env file -
    # it serves every uploaded document (receipts, warranties, manuals) to
    # anyone with the URL, with no auth check and no audit log.
    raise RuntimeError(
        "AVARENO_ENABLE_STATIC_UPLOADS must not be enabled in production "
        "(AVARENO_ENV/ENV=production). Use the signed document-download API instead."
    )

if _static_uploads_requested:
    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    # Development escape hatch only. Private documents should use
    # short-lived signed API downloads or private object storage.
    print(
        "[avareno] WARNING: AVARENO_ENABLE_STATIC_UPLOADS is on - /uploads/* serves every "
        "stored document with no authentication. Development only; never set this in production.",
        flush=True,
    )
    app.mount("/uploads", StaticFiles(directory=Path(UPLOAD_ROOT)), name="uploads")

app.include_router(me.router, prefix="/api/me", tags=["me"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(extract.router, prefix="/api/extract", tags=["extract"])
app.include_router(items.router, prefix="/api/items", tags=["items"])
app.include_router(loops.router, prefix="/api/loops", tags=["loops"])
app.include_router(capture.router, prefix="/api/capture", tags=["capture"])
app.include_router(rewards.router, prefix="/api/rewards", tags=["rewards"])
app.include_router(friends.router, prefix="/api/friends", tags=["friends"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
app.include_router(planner.router, prefix="/api/planner", tags=["planner"])
app.include_router(privacy.router, prefix="/api/privacy", tags=["privacy"])
app.include_router(mobile.router, prefix="/api/mobile", tags=["mobile"])
app.include_router(structure.router, prefix="/api/structure", tags=["structure"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(assistant.router, prefix="/api/assistant", tags=["assistant"])
app.include_router(search.router, prefix="/api/search", tags=["search"])
app.include_router(smart_home.router, prefix="/api/smart-home", tags=["smart-home"])
app.include_router(billing.router, prefix="/api/billing", tags=["billing"])
app.include_router(vaults.router, prefix="/api/vaults", tags=["vaults"])
app.include_router(webhooks.router, prefix="/api/webhooks", tags=["webhooks"])


@app.get("/api/health")
def health() -> dict:
    return {"ok": True}
