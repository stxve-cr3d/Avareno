from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException

from app.db import db
from app.dependencies import get_default_user
from app.schemas import ReceiptExtractRequest
from app.services.ai_data_handling import AIExtractionSource, build_ai_extraction_result, ensure_document_can_be_analyzed
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

        extracted = mock_extract_receipt(
            file_name=document["fileName"] if document else payload.fileName,
            text=payload.text,
        )
        result = build_ai_extraction_result(
            extracted,
            AIExtractionSource(
                source_type="receipt",
                source_id=document["id"] if document else None,
                file_name=document["fileName"] if document else payload.fileName,
            ),
            ai_assisted=True,
            confidence=0.62,
        )

        if document:
            conn.execute(
                'UPDATE "Document" SET extractedText = ?, extractedJson = ?, updatedAt = ? WHERE id = ?',
                (result["extractedText"], json.dumps(result), now_iso(), document["id"]),
            )

        return result
