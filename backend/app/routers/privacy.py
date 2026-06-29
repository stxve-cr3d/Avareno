from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.db import db
from app.dependencies import get_default_user
from app.services.privacy import (
    account_deletion_plan,
    ai_extracted_data_deletion_plan,
    connector_token_deletion_plan,
    document_deletion_plan,
    export_plan,
    privacy_summary,
    safe_audit_event,
)

router = APIRouter()


@router.get("/summary")
def get_privacy_summary() -> dict:
    with db() as conn:
        user = get_default_user(conn)
        return privacy_summary(conn, user["id"])


@router.post("/export/request")
def request_export() -> JSONResponse:
    with db() as conn:
        user = get_default_user(conn)
        payload = {
            **export_plan(user["id"]),
            "audit": safe_audit_event(
                "DATA_EXPORT_REQUEST",
                user["id"],
                "NOT_IMPLEMENTED",
                "Export request refused because the export backend is foundation-only.",
            ),
        }
        return JSONResponse(status_code=501, content=payload)


@router.post("/deletion/request")
def request_account_deletion() -> JSONResponse:
    with db() as conn:
        user = get_default_user(conn)
        payload = {
            **account_deletion_plan(user["id"]),
            "documentDeletion": document_deletion_plan(user["id"]),
            "connectorTokenDeletion": connector_token_deletion_plan(user["id"]),
            "aiDataDeletion": ai_extracted_data_deletion_plan(user["id"]),
            "audit": safe_audit_event(
                "ACCOUNT_DELETION_REQUEST",
                user["id"],
                "NOT_IMPLEMENTED",
                "Deletion request refused because full deletion orchestration is not implemented.",
            ),
        }
        return JSONResponse(status_code=501, content=payload)
