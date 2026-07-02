from __future__ import annotations

from fastapi import APIRouter, Body, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from starlette.background import BackgroundTask

from app.db import db
from app.dependencies import get_default_user
from app.services.privacy import (
    build_user_export,
    build_user_export_bundle,
    delete_ai_extracted_data,
    disconnect_connected_source,
    privacy_summary,
    request_account_deletion_record,
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
    with db() as conn:
        user = get_default_user(conn)
        payload = request_account_deletion_record(conn, user["id"])
        return JSONResponse(status_code=202, content=payload)


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
