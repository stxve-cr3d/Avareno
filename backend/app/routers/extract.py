from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.auth import current_auth_user_id
from app.config import beta_features, require_beta_feature
from app.db import db
from app.dependencies import require_authenticated_user
from app.schemas import ReceiptExtractRequest
from app.services.ai_data_handling import AIExtractionSource, build_ai_extraction_result, ensure_document_can_be_analyzed
from app.services.authorization import require_document_extraction_access, update_document_extraction
from app.services.claude_extraction import ExtractionError, extract_receipt_with_claude, extraction_configured
from app.services.document_storage import safe_local_upload_path
from app.services.entitlements import PlanLimitExceeded, consume_ai_action

router = APIRouter()


@router.post("/receipt")
def extract_receipt(payload: ReceiptExtractRequest) -> dict:
    features = beta_features()
    if features.invite_only and not current_auth_user_id():
        raise HTTPException(status_code=401, detail="Authentication required")
    # This gate deliberately runs before opening a DB connection, resolving a
    # document ID, reading Storage, consuming quota, or invoking a provider.
    require_beta_feature(
        features.receipt_extraction and features.document_processing,
        detail="Receipt extraction is disabled for the private beta. Please enter receipt details manually.",
    )
    with db() as conn:
        user = require_authenticated_user(conn)
        document = None
        if payload.documentId:
            document = require_document_extraction_access(conn, user["id"], payload.documentId)
            try:
                ensure_document_can_be_analyzed(document["type"])
            except ValueError as exc:
                raise HTTPException(status_code=400, detail=str(exc)) from exc

        file_name = document["fileName"] if document else payload.fileName

        file_bytes = None
        media_type = None
        if document:
            try:
                upload_path = safe_local_upload_path(document["filePath"])
            except ValueError as exc:
                raise HTTPException(status_code=400, detail="Invalid document storage path") from exc
            if upload_path and upload_path.is_file():
                file_bytes = upload_path.read_bytes()
                media_type = document["mimeType"]
        if not file_bytes and not (payload.text and payload.text.strip()):
            raise HTTPException(status_code=400, detail="Kein Beleg übergeben. Bitte Datei hochladen oder Text einfügen.")

        # Provider availability and quota are checked only after identity,
        # resource access, and the authorized storage reference are validated.
        if not extraction_configured():
            raise HTTPException(
                status_code=503,
                detail=(
                    "Die automatische Belegauslesung ist noch nicht verfügbar. "
                    "Du kannst die Daten manuell eintragen."
                ),
            )
        try:
            consume_ai_action(conn, user)
        except PlanLimitExceeded as exc:
            raise HTTPException(status_code=402, detail=exc.payload()) from exc
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
            update_document_extraction(
                conn,
                user["id"],
                document["id"],
                extracted_text=result["extractedText"],
                extraction_result=result,
            )

        return result
