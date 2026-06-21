from __future__ import annotations

import json

from fastapi import APIRouter

from app.db import db
from app.schemas import ReceiptExtractRequest
from app.services.extraction_service import mock_extract_receipt
from app.utils import now_iso

router = APIRouter()


@router.post("/receipt")
def extract_receipt(payload: ReceiptExtractRequest) -> dict:
    with db() as conn:
        document = None
        if payload.documentId:
            document = conn.execute('SELECT * FROM "Document" WHERE id = ?', (payload.documentId,)).fetchone()

        extracted = mock_extract_receipt(
            file_name=document["fileName"] if document else payload.fileName,
            text=payload.text,
        )

        if document:
            conn.execute(
                'UPDATE "Document" SET extractedText = ?, extractedJson = ?, updatedAt = ? WHERE id = ?',
                (extracted["extractedText"], json.dumps(extracted), now_iso(), document["id"]),
            )

        return extracted
