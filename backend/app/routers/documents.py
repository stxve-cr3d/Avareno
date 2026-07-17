from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.config import beta_features, require_beta_feature
from app.db import db, row_to_dict, rows_to_dicts
from app.dependencies import get_default_user
from app.services.document_storage import (
    UPLOAD_ROOT,
    create_signed_document_download_ticket,
    safe_local_upload_path,
    verify_signed_document_download_ticket,
)
from app.services.entitlements import PlanLimitExceeded, require_storage_capacity
from app.services.item_service import calculate_completeness_score
from app.services.privacy import record_privacy_audit_event
from app.services.xp_service import award_xp
from app.utils import make_id, now_iso

router = APIRouter()
DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_UPLOAD_BYTES = DEFAULT_MAX_UPLOAD_BYTES
ALLOWED_UPLOAD_EXTENSIONS = {
    ".jpeg",
    ".jpg",
    ".pdf",
    ".png",
}


def _configured_max_upload_bytes() -> int:
    try:
        return max(1, int(os.environ.get("AVARENO_MAX_UPLOAD_BYTES", str(DEFAULT_MAX_UPLOAD_BYTES))))
    except ValueError:
        return DEFAULT_MAX_UPLOAD_BYTES


MAX_UPLOAD_BYTES = _configured_max_upload_bytes()
ALLOWED_UPLOAD_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
}

EXPECTED_MIME_BY_EXTENSION = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
}


class ExtractedDataPatch(BaseModel):
    extractedText: str | None = None
    extractedJson: dict[str, Any] | None = None


@router.get("")
def list_documents() -> list[dict]:
    """All non-vault documents of the user (vault contents need a vault ticket)."""
    with db() as conn:
        user = get_default_user(conn)
        return rows_to_dicts(
            conn.execute(
                'SELECT * FROM "Document" WHERE userId = ? AND vaultId IS NULL ORDER BY createdAt DESC',
                (user["id"],),
            ).fetchall()
        )


@router.post("/upload", status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    type: str = Form("OTHER"),
    itemId: str | None = Form(None),
) -> dict:
    require_beta_feature(
        beta_features().document_uploads,
        detail="Document uploads are temporarily disabled.",
    )
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

        content = await file.read()
        _validate_upload_policy(file.filename, file.content_type, content)
        try:
            require_storage_capacity(conn, user, len(content))
        except PlanLimitExceeded as exc:
            raise HTTPException(status_code=402, detail=exc.payload()) from exc
        now = now_iso()
        doc_id = make_id()
        extension = Path(file.filename).suffix.lower()
        stored_name = f"{doc_id}{extension}"
        user_upload_root = UPLOAD_ROOT / user["id"]
        user_upload_root.mkdir(parents=True, exist_ok=True)
        target = user_upload_root / stored_name
        temporary_target = user_upload_root / f".{stored_name}.uploading"
        # Compliance TODO: magic-byte validation is active, but malware
        # scanning is still an explicit beta risk documented in the release
        # checklist. Files are private and are never auto-processed/previewed.
        temporary_target.write_bytes(content)
        temporary_target.replace(target)

        doc_type = type.upper()
        original_name = Path(file.filename).name[:180] or f"document{extension}"
        try:
            conn.execute(
                """INSERT INTO "Document"
                   (id, userId, itemId, type, fileName, filePath, mimeType, fileSize, createdAt, updatedAt)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    doc_id,
                    user["id"],
                    itemId,
                    doc_type,
                    original_name,
                    f"/uploads/{user['id']}/{stored_name}",
                    EXPECTED_MIME_BY_EXTENSION[extension],
                    len(content),
                    now,
                    now,
                ),
            )
        except Exception:
            target.unlink(missing_ok=True)
            raise
        if item:
            docs = rows_to_dicts(
                conn.execute(
                    'SELECT * FROM "Document" WHERE itemId = ? AND userId = ? AND vaultId IS NULL',
                    (itemId, user["id"]),
                ).fetchall()
            )
            score = calculate_completeness_score(item, docs)
            conn.execute(
                'UPDATE "Item" SET completenessScore = ?, updatedAt = ? WHERE id = ? AND userId = ?',
                (score, now, itemId, user["id"]),
            )
            conn.execute(
                """INSERT INTO "ItemActivity" (id, itemId, userId, type, message, createdAt)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (make_id(), itemId, user["id"], "DOCUMENT", f"{doc_type.title()} uploaded.", now),
            )
            points = 20 if doc_type == "RECEIPT" else 15 if doc_type in {"WARRANTY", "MANUAL", "DRIVER", "SOFTWARE"} else 10
            award_xp(conn, user_id=user["id"], item_id=itemId, action=f"upload_{doc_type.lower()}", points=points)
        return row_to_dict(
            conn.execute(
                'SELECT * FROM "Document" WHERE id = ? AND userId = ?',
                (doc_id, user["id"]),
            ).fetchone()
        ) or {}


@router.patch("/{document_id}/extracted-data")
def update_extracted_data(document_id: str, payload: ExtractedDataPatch) -> dict:
    require_beta_feature(
        beta_features().document_processing,
        detail="Document processing is disabled for the private beta.",
    )
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
        params.append(user["id"])
        conn.execute(
            f'UPDATE "Document" SET {", ".join(fields)} WHERE id = ? AND userId = ?',
            tuple(params),
        )
        record_privacy_audit_event(
            conn,
            user_id=user["id"],
            event_type="AI_EXTRACTED_DATA_CORRECTED",
            status="UPDATED",
            message="AI-extracted document fields corrected by user.",
            context={"document_id": document_id, "updated_fields": len(payload.model_fields_set)},
        )
        return row_to_dict(
            conn.execute(
                'SELECT * FROM "Document" WHERE id = ? AND userId = ?',
                (document_id, user["id"]),
            ).fetchone()
        ) or {}


@router.get("/{document_id}/download")
def download_document(document_id: str) -> FileResponse:
    with db() as conn:
        user = get_default_user(conn)
        document = _document_for_user(conn, document_id, user["id"])
        return _document_file_response(document)


@router.post("/{document_id}/signed-download")
def create_signed_document_download(document_id: str) -> dict:
    require_beta_feature(
        beta_features().public_document_links,
        detail="Public document links are disabled for the private beta.",
    )
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
    require_beta_feature(
        beta_features().public_document_links,
        detail="Public document links are disabled for the private beta.",
    )
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
                docs = rows_to_dicts(
                    conn.execute(
                        'SELECT * FROM "Document" WHERE itemId = ? AND userId = ? AND vaultId IS NULL',
                        (item_id, user["id"]),
                    ).fetchall()
                )
                score = calculate_completeness_score(item, docs)
                conn.execute(
                    'UPDATE "Item" SET completenessScore = ?, updatedAt = ? WHERE id = ? AND userId = ?',
                    (score, now_iso(), item_id, user["id"]),
                )

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
    if EXPECTED_MIME_BY_EXTENSION.get(extension) != normalized_mime:
        raise HTTPException(status_code=400, detail="File type does not match its extension")

    # Extension and Content-Type are both client-supplied and can be spoofed
    # (e.g. an .html/.js payload renamed to .pdf with a forged header). Verify
    # the actual file bytes match a known signature for the claimed type.
    if not _content_matches_extension(extension, content):
        raise HTTPException(status_code=400, detail="File content does not match its extension")


_MAGIC_BYTE_CHECKS: dict[str, Any] = {
    ".pdf": (lambda content: content.startswith(b"%PDF-")),
    ".png": (lambda content: content.startswith(b"\x89PNG\r\n\x1a\n")),
    ".jpg": (lambda content: content.startswith(b"\xff\xd8\xff")),
    ".jpeg": (lambda content: content.startswith(b"\xff\xd8\xff")),
}


def _content_matches_extension(extension: str, content: bytes) -> bool:
    check = _MAGIC_BYTE_CHECKS.get(extension)
    if check is None:
        return True
    return bool(check(content))


# Compliance note: this validates that uploaded bytes genuinely are the file
# type they claim to be (extension/MIME spoofing). It is NOT malware scanning -
# a well-formed PDF can still carry a malicious payload (exploits
# embedded in a valid container). Real malware scanning needs an external
# engine (e.g. a ClamAV daemon or a scanning API) that this environment does
# not have; wire one in before accepting uploads from untrusted users at scale.
