from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException

from app.db import db
from app.dependencies import get_default_user
from app.schemas import VaultCreate, VaultPinSet, VaultRename, VaultUnlock
from app.services.entitlements import PlanLimitExceeded, require_vault_capacity
from app.services.privacy import record_privacy_audit_event
from app.services.vault import (
    VaultError,
    VaultLockedError,
    VaultTicketError,
    assign_document,
    create_vault,
    delete_vault,
    list_vaults,
    pin_status,
    remove_document,
    rename_vault,
    require_ticket,
    set_pin,
    unlock,
    vault_documents,
)

router = APIRouter()


def _handle(exc: Exception) -> HTTPException:
    if isinstance(exc, VaultLockedError):
        return HTTPException(status_code=423, detail=str(exc))
    if isinstance(exc, VaultTicketError):
        return HTTPException(status_code=401, detail=str(exc))
    if isinstance(exc, VaultError):
        return HTTPException(status_code=400, detail=str(exc))
    return HTTPException(status_code=500, detail="Vault-Fehler")


@router.get("")
def vault_overview() -> dict:
    with db() as conn:
        user = get_default_user(conn)
        return {"pin": pin_status(conn, user["id"]), "vaults": list_vaults(conn, user["id"])}


@router.post("/pin")
def set_vault_pin(payload: VaultPinSet) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        try:
            set_pin(conn, user["id"], payload.pin, payload.currentPin)
        except VaultError as exc:
            raise _handle(exc) from exc
        record_privacy_audit_event(
            conn,
            user_id=user["id"],
            event_type="VAULT_PIN_SET",
            status="UPDATED",
            message="Vault PIN was set or changed.",
            context={},
        )
        return {"ok": True, "pin": pin_status(conn, user["id"])}


@router.post("/unlock")
def unlock_vault(payload: VaultUnlock) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        try:
            result = unlock(conn, user["id"], payload.pin)
        except VaultError as exc:
            raise _handle(exc) from exc
        return result


@router.post("", status_code=201)
def create_new_vault(payload: VaultCreate, x_vault_ticket: str | None = Header(default=None)) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        try:
            require_ticket(user["id"], x_vault_ticket)
            require_vault_capacity(conn, user)
            return create_vault(conn, user["id"], payload.name)
        except PlanLimitExceeded as exc:
            raise HTTPException(status_code=402, detail=exc.payload()) from exc
        except VaultError as exc:
            raise _handle(exc) from exc


@router.patch("/{vault_id}")
def rename_existing_vault(vault_id: str, payload: VaultRename, x_vault_ticket: str | None = Header(default=None)) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        try:
            require_ticket(user["id"], x_vault_ticket)
            return rename_vault(conn, user["id"], vault_id, payload.name)
        except VaultError as exc:
            raise _handle(exc) from exc


@router.delete("/{vault_id}")
def delete_existing_vault(vault_id: str, x_vault_ticket: str | None = Header(default=None)) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        try:
            require_ticket(user["id"], x_vault_ticket)
            delete_vault(conn, user["id"], vault_id)
        except VaultError as exc:
            raise _handle(exc) from exc
        return {"ok": True}


@router.get("/{vault_id}/documents")
def get_vault_documents(vault_id: str, x_vault_ticket: str | None = Header(default=None)) -> list[dict]:
    with db() as conn:
        user = get_default_user(conn)
        try:
            require_ticket(user["id"], x_vault_ticket)
            return vault_documents(conn, user["id"], vault_id)
        except VaultError as exc:
            raise _handle(exc) from exc


@router.post("/{vault_id}/documents/{document_id}")
def add_document_to_vault(vault_id: str, document_id: str, x_vault_ticket: str | None = Header(default=None)) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        try:
            require_ticket(user["id"], x_vault_ticket)
            document = assign_document(conn, user["id"], vault_id, document_id)
        except VaultError as exc:
            raise _handle(exc) from exc
        record_privacy_audit_event(
            conn,
            user_id=user["id"],
            event_type="VAULT_DOCUMENT_ADDED",
            status="UPDATED",
            message="Document moved into private vault.",
            context={"document_id": document_id},
        )
        return document


@router.delete("/{vault_id}/documents/{document_id}")
def remove_document_from_vault(vault_id: str, document_id: str, x_vault_ticket: str | None = Header(default=None)) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        try:
            require_ticket(user["id"], x_vault_ticket)
            return remove_document(conn, user["id"], vault_id, document_id)
        except VaultError as exc:
            raise _handle(exc) from exc
