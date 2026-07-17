from __future__ import annotations

import logging

from fastapi import APIRouter, Body, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from starlette.background import BackgroundTask

from app.db import db
from app.dependencies import get_default_user, require_authenticated_user
from app.services.account_deletion import AccountDeletionConflict, delete_account
from app.services.privacy import (
    build_user_export,
    build_user_export_bundle,
    delete_ai_extracted_data,
    disconnect_connected_source,
    privacy_summary,
)
from app.services.supabase_admin import SupabaseAdminConfigurationError, SupabaseAdminOperationError

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/summary")
def get_privacy_summary() -> dict:
    with db() as conn:
        user = get_default_user(conn)
        return privacy_summary(conn, user["id"])


@router.post("/export/request")
def request_export() -> JSONResponse:
    with db() as conn:
        user = get_default_user(conn)
        payload = build_user_export(conn, user["id"])
        return JSONResponse(status_code=200, content=payload)


@router.post("/export/bundle")
def request_export_bundle() -> FileResponse:
    with db() as conn:
        user = get_default_user(conn)
        payload = build_user_export_bundle(conn, user["id"])

    return FileResponse(
        payload["path"],
        media_type=payload["mediaType"],
        filename=payload["fileName"],
        background=BackgroundTask(payload["path"].unlink, missing_ok=True),
    )


@router.post("/deletion/request")
def request_account_deletion() -> JSONResponse:
    try:
        with db() as conn:
            user = require_authenticated_user(conn)
            payload = delete_account(conn, user["id"]).as_dict()
            return JSONResponse(status_code=200, content=payload)
    except SupabaseAdminConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except AccountDeletionConflict as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except SupabaseAdminOperationError as exc:
        logger.error(
            "account_deletion_failed phase=%s provider_status=%s",
            getattr(exc, "deletion_phase", "unknown"),
            getattr(exc, "status_code", "unavailable"),
        )
        raise HTTPException(status_code=502, detail="Account deletion could not complete safely; no success was recorded.") from exc


@router.post("/connected-sources/{source_id}/disconnect")
def disconnect_source(source_id: str) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        result = disconnect_connected_source(conn, user["id"], source_id)
        if not result:
            raise HTTPException(status_code=404, detail="Connected source not found")
        return result


@router.post("/ai-data/delete")
def delete_ai_data(payload: dict | None = Body(default=None)) -> dict:
    document_id = (payload or {}).get("documentId")
    with db() as conn:
        user = get_default_user(conn)
        result = delete_ai_extracted_data(conn, user["id"], document_id=document_id)
        if result is None:
            raise HTTPException(status_code=404, detail="Document not found")
        return result
