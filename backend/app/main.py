from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.db import PROJECT_ROOT
from app.routers import capture, dashboard, documents, extract, items, loops, me, rewards

app = FastAPI(title="Second Memory API")

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


@app.get("/api/health")
def health() -> dict:
    return {"ok": True}
