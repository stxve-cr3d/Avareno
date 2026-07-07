from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.db import db, row_to_dict
from app.dependencies import get_default_user
from app.schemas import (
    BambuHostDiagnosticRequest,
    BambuLabSetupRequest,
    BambuPrintEventRequest,
    HomeGraphConnectConfirmRequest,
    HomeGraphConnectPreviewRequest,
    LocalDiscoveryImportRequest,
    LocalDiscoveryProbeRequest,
    SmartHomeCommandRequest,
    SmartHomeConnectRequest,
    SmartHomeLinkItemRequest,
    SmartHomeRemoteKeyRequest,
)
from app.services.smart_home import (
    activate_smart_home_insight,
    connect_provider,
    confirm_home_graph_connect,
    delete_device,
    discover_local_candidates,
    diagnose_bambu_host,
    execute_command,
    get_device_detail,
    home_graph_connect_preview,
    import_local_candidate,
    link_device_to_item,
    pair_local_device,
    probe_local_host,
    record_bambu_print_event,
    send_remote_key,
    setup_bambu_lab_printer,
    smart_home_payload,
    sync_provider,
)

router = APIRouter()


def _default_household(conn, user_id: str) -> dict:
    household = row_to_dict(
        conn.execute('SELECT * FROM "Household" WHERE userId = ? ORDER BY createdAt ASC LIMIT 1', (user_id,)).fetchone()
    )
    if not household:
        raise HTTPException(status_code=404, detail="Household not found")
    return household


@router.get("")
def get_smart_home() -> dict:
    with db() as conn:
        user = get_default_user(conn)
        return smart_home_payload(conn, user["id"])


@router.post("/providers/connect", status_code=201)
def connect(payload: SmartHomeConnectRequest) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        household = _default_household(conn, user["id"])
        connection = connect_provider(conn, user["id"], household["id"], payload.provider)
        return connection


@router.post("/providers/{provider}/sync")
def sync(provider: str) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        household = _default_household(conn, user["id"])
        try:
            return sync_provider(conn, user["id"], household["id"], provider)
        except RuntimeError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/home-graph/connect/preview")
def home_graph_preview(payload: HomeGraphConnectPreviewRequest) -> dict:
    return home_graph_connect_preview(payload.providerId)


@router.post("/home-graph/connect/confirm", status_code=201)
def home_graph_confirm(payload: HomeGraphConnectConfirmRequest) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        household = _default_household(conn, user["id"])
        try:
            return confirm_home_graph_connect(conn, user["id"], household["id"], payload.providerId, payload.acceptedCapabilities)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/devices/{device_id}/commands", status_code=201)
def command(device_id: str, payload: SmartHomeCommandRequest) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        try:
            return execute_command(conn, user["id"], device_id, payload.command, payload.value)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except RuntimeError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.patch("/devices/{device_id}/link")
def link_item(device_id: str, payload: SmartHomeLinkItemRequest) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        try:
            return link_device_to_item(conn, user["id"], device_id, payload.itemId)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/devices/{device_id}")
def delete_smart_home_device(device_id: str) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        try:
            return delete_device(conn, user["id"], device_id)
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/devices/{device_id}")
def get_device(device_id: str) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        try:
            return get_device_detail(conn, user["id"], device_id)
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/devices/{device_id}/remote-key", status_code=201)
def remote_key(device_id: str, payload: SmartHomeRemoteKeyRequest) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        try:
            return send_remote_key(conn, user["id"], device_id, payload.key)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except RuntimeError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/devices/{device_id}/pair", status_code=201)
def pair_device(device_id: str) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        try:
            return pair_local_device(conn, user["id"], device_id)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except RuntimeError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/local/discover")
def local_discover() -> dict:
    with db() as conn:
        user = get_default_user(conn)
        return discover_local_candidates(conn, user["id"])


@router.post("/local/probe")
def local_probe(payload: LocalDiscoveryProbeRequest) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        try:
            return probe_local_host(conn, user["id"], payload.host)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/local/import", status_code=201)
def local_import(payload: LocalDiscoveryImportRequest) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        household = _default_household(conn, user["id"])
        try:
            return import_local_candidate(conn, user["id"], household["id"], payload.candidateId, payload.host)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/bambu/setup", status_code=201)
def setup_bambu(payload: BambuLabSetupRequest) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        household = _default_household(conn, user["id"])
        try:
            return setup_bambu_lab_printer(conn, user["id"], household["id"], payload)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/bambu/diagnose")
def diagnose_bambu(payload: BambuHostDiagnosticRequest) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        try:
            return diagnose_bambu_host(conn, user["id"], payload.host)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/bambu/events", status_code=201)
def bambu_print_event(payload: BambuPrintEventRequest) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        try:
            return record_bambu_print_event(conn, user["id"], payload)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/insights/{insight_id}/activate", status_code=201)
def activate_insight(insight_id: str) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        try:
            return activate_smart_home_insight(conn, user["id"], insight_id)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
