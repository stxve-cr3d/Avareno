from __future__ import annotations

import re
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.db import PROJECT_ROOT, db, row_to_dict
from app.dependencies import get_default_user
from app.utils import make_id, now_iso

router = APIRouter()
UPLOAD_ROOT = PROJECT_ROOT / "uploads"


@router.post("/upload", status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    type: str = Form("OTHER"),
    itemId: str | None = Form(None),
) -> dict:
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")

    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    safe_name = re.sub(r"[^a-zA-Z0-9._-]", "-", file.filename)
    stored_name = f"{make_id()}-{safe_name}"
    target = UPLOAD_ROOT / stored_name
    target.write_bytes(await file.read())

    with db() as conn:
        user = get_default_user(conn)
        now = now_iso()
        doc_id = make_id()
        conn.execute(
            """INSERT INTO "Document"
               (id, userId, itemId, type, fileName, filePath, mimeType, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                doc_id,
                user["id"],
                itemId,
                type,
                file.filename,
                f"/uploads/{stored_name}",
                file.content_type or "application/octet-stream",
                now,
                now,
            ),
        )
        return row_to_dict(conn.execute('SELECT * FROM "Document" WHERE id = ?', (doc_id,)).fetchone()) or {}
