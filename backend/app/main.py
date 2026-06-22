from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.db import PROJECT_ROOT
from app.routers import assistant, capture, dashboard, documents, extract, items, loops, me, mobile, notifications, planner, reports, rewards, smart_home, structure

app = FastAPI(title="Mavora API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

uploads = PROJECT_ROOT / "uploads"
uploads.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=Path(uploads)), name="uploads")

app.include_router(me.router, prefix="/api/me", tags=["me"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(extract.router, prefix="/api/extract", tags=["extract"])
app.include_router(items.router, prefix="/api/items", tags=["items"])
app.include_router(loops.router, prefix="/api/loops", tags=["loops"])
app.include_router(capture.router, prefix="/api/capture", tags=["capture"])
app.include_router(rewards.router, prefix="/api/rewards", tags=["rewards"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
app.include_router(planner.router, prefix="/api/planner", tags=["planner"])
app.include_router(mobile.router, prefix="/api/mobile", tags=["mobile"])
app.include_router(structure.router, prefix="/api/structure", tags=["structure"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(assistant.router, prefix="/api/assistant", tags=["assistant"])
app.include_router(smart_home.router, prefix="/api/smart-home", tags=["smart-home"])


@app.get("/api/health")
def health() -> dict:
    return {"ok": True}
