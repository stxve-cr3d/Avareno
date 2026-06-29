from __future__ import annotations

import re
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.db import PROJECT_ROOT, db, row_to_dict, rows_to_dicts
from app.dependencies import get_default_user
from app.services.item_service import calculate_completeness_score
from app.services.xp_service import award_xp
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

    with db() as conn:
        user = get_default_user(conn)
        item = None
        if itemId:
            item = row_to_dict(
                conn.execute('SELECT * FROM "Item" WHERE id = ? AND userId = ?', (itemId, user["id"])).fetchone()
            )
            if not item:
                raise HTTPException(status_code=404, detail="Item not found")

        UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
        safe_name = re.sub(r"[^a-zA-Z0-9._-]", "-", file.filename)
        stored_name = f"{make_id()}-{safe_name}"
        target = UPLOAD_ROOT / stored_name
        # Compliance TODO: add size/MIME allowlist, scanning, private storage,
        # and deletion/export orchestration before accepting real user files.
        target.write_bytes(await file.read())

        now = now_iso()
        doc_id = make_id()
        doc_type = type.upper()
        conn.execute(
            """INSERT INTO "Document"
               (id, userId, itemId, type, fileName, filePath, mimeType, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                doc_id,
                user["id"],
                itemId,
                doc_type,
                file.filename,
                f"/uploads/{stored_name}",
                file.content_type or "application/octet-stream",
                now,
                now,
            ),
        )
        if item:
            docs = rows_to_dicts(conn.execute('SELECT * FROM "Document" WHERE itemId = ?', (itemId,)).fetchall())
            score = calculate_completeness_score(item, docs)
            conn.execute(
                'UPDATE "Item" SET completenessScore = ?, updatedAt = ? WHERE id = ?',
                (score, now, itemId),
            )
            conn.execute(
                """INSERT INTO "ItemActivity" (id, itemId, userId, type, message, createdAt)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (make_id(), itemId, user["id"], "DOCUMENT", f"{doc_type.title()} uploaded: {file.filename}", now),
            )
            points = 20 if doc_type == "RECEIPT" else 15 if doc_type in {"WARRANTY", "MANUAL", "DRIVER", "SOFTWARE"} else 10
            award_xp(conn, user_id=user["id"], item_id=itemId, action=f"upload_{doc_type.lower()}", points=points)
        return row_to_dict(conn.execute('SELECT * FROM "Document" WHERE id = ?', (doc_id,)).fetchone()) or {}
