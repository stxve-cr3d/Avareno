from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException

from app.db import db
from app.dependencies import get_default_user
from app.schemas import ReceiptExtractRequest
from app.services.ai_data_handling import AIExtractionSource, build_ai_extraction_result, ensure_document_can_be_analyzed
from app.services.claude_extraction import ExtractionError, extract_receipt_with_claude, extraction_configured
from app.services.document_storage import safe_local_upload_path
from app.services.entitlements import PlanLimitExceeded, consume_ai_action
from app.services.extraction_service import mock_extract_receipt
from app.utils import now_iso

router = APIRouter()


@router.post("/receipt")
def extract_receipt(payload: ReceiptExtractRequest) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        try:
            consume_ai_action(conn, user)
        except PlanLimitExceeded as exc:
            raise HTTPException(status_code=402, detail=exc.payload()) from exc
        document = None
        if payload.documentId:
            document = conn.execute('SELECT * FROM "Document" WHERE id = ?', (payload.documentId,)).fetchone()
            if document:
                try:
                    ensure_document_can_be_analyzed(document["type"])
                except ValueError as exc:
                    raise HTTPException(status_code=400, detail=str(exc)) from exc

        file_name = document["fileName"] if document else payload.fileName

        if extraction_configured():
            file_bytes = None
            media_type = None
            if document:
                upload_path = safe_local_upload_path(document["filePath"])
                if upload_path and upload_path.exists():
                    file_bytes = upload_path.read_bytes()
                    media_type = document["mimeType"]
            if not file_bytes and not (payload.text and payload.text.strip()):
                raise HTTPException(status_code=400, detail="Kein Beleg übergeben. Bitte Datei hochladen oder Text einfügen.")
            try:
                extraction = extract_receipt_with_claude(
                    file_bytes=file_bytes,
                    media_type=media_type,
                    text=payload.text,
                    file_name=file_name,
                )
            except ExtractionError as exc:
                raise HTTPException(status_code=502, detail=str(exc)) from exc
            extracted = extraction["fields"]
            confidence = extraction["confidence"]
        else:
            # No ANTHROPIC_API_KEY (local dev/tests): deterministic mock.
            extracted = mock_extract_receipt(
                file_name=file_name,
                text=payload.text,
            )
            confidence = 0.62

        result = build_ai_extraction_result(
            extracted,
            AIExtractionSource(
                source_type="receipt",
                source_id=document["id"] if document else None,
                file_name=file_name,
            ),
            ai_assisted=True,
            confidence=confidence,
        )

        if document:
            conn.execute(
                'UPDATE "Document" SET extractedText = ?, extractedJson = ?, updatedAt = ? WHERE id = ?',
                (result["extractedText"], json.dumps(result), now_iso(), document["id"]),
            )

        return result
