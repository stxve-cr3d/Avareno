from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.db import db, row_to_dict, rows_to_dicts
from app.dependencies import get_default_user
from app.services.document_storage import (
    UPLOAD_ROOT,
    create_signed_document_download_ticket,
    safe_local_upload_path,
    verify_signed_document_download_ticket,
)
from app.services.item_service import calculate_completeness_score
from app.services.privacy import record_privacy_audit_event
from app.services.xp_service import award_xp
from app.utils import make_id, now_iso

router = APIRouter()
DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_UPLOAD_BYTES = DEFAULT_MAX_UPLOAD_BYTES
ALLOWED_UPLOAD_EXTENSIONS = {
    ".doc",
    ".docx",
    ".jpeg",
    ".jpg",
    ".pdf",
    ".png",
    ".txt",
    ".webp",
}


def _configured_max_upload_bytes() -> int:
    try:
        return max(1, int(os.environ.get("AVARENO_MAX_UPLOAD_BYTES", str(DEFAULT_MAX_UPLOAD_BYTES))))
    except ValueError:
        return DEFAULT_MAX_UPLOAD_BYTES


MAX_UPLOAD_BYTES = _configured_max_upload_bytes()
ALLOWED_UPLOAD_MIME_TYPES = {
    "application/msword",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
    "image/webp",
    "text/plain",
}


class ExtractedDataPatch(BaseModel):
    extractedText: str | None = None
    extractedJson: dict[str, Any] | None = None


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
        safe_name = safe_name.strip(".-") or "document"
        stored_name = f"{make_id()}-{safe_name}"
        target = UPLOAD_ROOT / stored_name
        content = await file.read()
        _validate_upload_policy(file.filename, file.content_type, content)
        # Compliance TODO: add malware scanning, private object storage,
        # and deletion/export orchestration before accepting real user files.
        target.write_bytes(content)

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
                (make_id(), itemId, user["id"], "DOCUMENT", f"{doc_type.title()} uploaded.", now),
            )
            points = 20 if doc_type == "RECEIPT" else 15 if doc_type in {"WARRANTY", "MANUAL", "DRIVER", "SOFTWARE"} else 10
            award_xp(conn, user_id=user["id"], item_id=itemId, action=f"upload_{doc_type.lower()}", points=points)
        return row_to_dict(conn.execute('SELECT * FROM "Document" WHERE id = ?', (doc_id,)).fetchone()) or {}


@router.patch("/{document_id}/extracted-data")
def update_extracted_data(document_id: str, payload: ExtractedDataPatch) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        document = row_to_dict(
            conn.execute('SELECT * FROM "Document" WHERE id = ? AND userId = ?', (document_id, user["id"])).fetchone()
        )
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        fields: list[str] = []
        params: list[Any] = []
        if "extractedText" in payload.model_fields_set:
            fields.append("extractedText = ?")
            params.append(payload.extractedText)
        if "extractedJson" in payload.model_fields_set:
            fields.append("extractedJson = ?")
            params.append(json.dumps(payload.extractedJson, ensure_ascii=False) if payload.extractedJson is not None else None)
        if not fields:
            return document

        now = now_iso()
        fields.append("updatedAt = ?")
        params.append(now)
        params.append(document_id)
        conn.execute(f'UPDATE "Document" SET {", ".join(fields)} WHERE id = ?', tuple(params))
        record_privacy_audit_event(
            conn,
            user_id=user["id"],
            event_type="AI_EXTRACTED_DATA_CORRECTED",
            status="UPDATED",
            message="AI-extracted document fields corrected by user.",
            context={"document_id": document_id, "updated_fields": len(payload.model_fields_set)},
        )
        return row_to_dict(conn.execute('SELECT * FROM "Document" WHERE id = ?', (document_id,)).fetchone()) or {}


@router.get("/{document_id}/download")
def download_document(document_id: str) -> FileResponse:
    with db() as conn:
        user = get_default_user(conn)
        document = _document_for_user(conn, document_id, user["id"])
        return _document_file_response(document)


@router.post("/{document_id}/signed-download")
def create_signed_document_download(document_id: str) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        document = _document_for_user(conn, document_id, user["id"])
        _document_file_path(document)

        try:
            ticket = create_signed_document_download_ticket(user_id=user["id"], document_id=document_id)
        except RuntimeError as exc:
            raise HTTPException(status_code=503, detail="Signed download service is not configured") from exc
        return {
            "url": f"/api/documents/signed-download/{ticket.token}",
            "method": "GET",
            "expiresAt": ticket.expires_at_iso,
            "expiresInSeconds": ticket.expires_in_seconds,
            "fileName": document.get("fileName") or "avareno-document",
            "mimeType": document.get("mimeType") or "application/octet-stream",
        }


@router.get("/signed-download/{token}")
def signed_download_document(token: str) -> FileResponse:
    try:
        ticket = verify_signed_document_download_ticket(token)
    except TimeoutError as exc:
        raise HTTPException(status_code=410, detail="Signed download link expired") from exc
    except ValueError as exc:
        raise HTTPException(status_code=403, detail="Invalid signed download link") from exc

    with db() as conn:
        document = _document_for_user(conn, str(ticket["documentId"]), str(ticket["userId"]))
        return _document_file_response(document)


@router.delete("/{document_id}")
def delete_document(document_id: str) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        document = row_to_dict(
            conn.execute('SELECT * FROM "Document" WHERE id = ? AND userId = ?', (document_id, user["id"])).fetchone()
        )
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        upload_target = _document_file_path(document, missing_ok=True)
        local_file_deleted = False
        if upload_target and upload_target.exists():
            upload_target.unlink()
            local_file_deleted = True

        item_id = document.get("itemId")
        conn.execute('DELETE FROM "Document" WHERE id = ? AND userId = ?', (document_id, user["id"]))
        if item_id:
            file_name = document.get("fileName") or ""
            if file_name:
                conn.execute(
                    """DELETE FROM "ItemActivity"
                       WHERE userId = ? AND itemId = ? AND type = ? AND instr(message, ?) > 0""",
                    (user["id"], item_id, "DOCUMENT", file_name),
                )
            item = row_to_dict(conn.execute('SELECT * FROM "Item" WHERE id = ? AND userId = ?', (item_id, user["id"])).fetchone())
            if item:
                docs = rows_to_dicts(conn.execute('SELECT * FROM "Document" WHERE itemId = ?', (item_id,)).fetchall())
                score = calculate_completeness_score(item, docs)
                conn.execute('UPDATE "Item" SET completenessScore = ?, updatedAt = ? WHERE id = ?', (score, now_iso(), item_id))

        audit = record_privacy_audit_event(
            conn,
            user_id=user["id"],
            event_type="DOCUMENT_DELETED",
            status="DELETED",
            message="Document metadata, extracted fields and local upload file deleted where present.",
            context={
                "document_id": document_id,
                "document_type": document.get("type"),
                "had_item": bool(item_id),
                "local_file_deleted": local_file_deleted,
            },
        )
        return {
            "deleted": True,
            "documentId": document_id,
            "localFileDeleted": local_file_deleted,
            "audit": audit,
        }


def _document_for_user(conn, document_id: str, user_id: str) -> dict:
    document = row_to_dict(
        conn.execute('SELECT * FROM "Document" WHERE id = ? AND userId = ?', (document_id, user_id)).fetchone()
    )
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


def _document_file_response(document: dict) -> FileResponse:
    upload_target = _document_file_path(document)
    return FileResponse(
        upload_target,
        media_type=document.get("mimeType") or "application/octet-stream",
        filename=document.get("fileName") or "avareno-document",
    )


def _document_file_path(document: dict, *, missing_ok: bool = False) -> Path | None:
    try:
        upload_target = safe_local_upload_path(document.get("filePath"))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid document storage path") from exc
    if upload_target and upload_target.exists() and upload_target.is_file():
        return upload_target
    if missing_ok:
        return upload_target
    raise HTTPException(status_code=404, detail="Document file not found")


def _validate_upload_policy(file_name: str, content_type: str | None, content: bytes) -> None:
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"Uploaded file exceeds {MAX_UPLOAD_BYTES} bytes")

    extension = Path(file_name).suffix.lower()
    if extension not in ALLOWED_UPLOAD_EXTENSIONS:
        raise HTTPException(status_code=400, detail="File extension is not allowed")

    normalized_mime = (content_type or "").split(";", 1)[0].strip().lower()
    if normalized_mime not in ALLOWED_UPLOAD_MIME_TYPES:
        raise HTTPException(status_code=400, detail="File type is not allowed")
