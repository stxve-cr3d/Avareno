from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db import db, rows_to_dicts
from app.dependencies import get_default_user
from app.services.admin import (
    AdminAccess,
    admin_access_for_user,
    admin_memberships,
    assign_admin_membership,
    audit_log,
    mask_email,
    role_catalog,
)

router = APIRouter()


class AdminMembershipRequest(BaseModel):
    role: str
    reason: str
    targetUserId: str | None = None
    email: str | None = None
    status: str = "ACTIVE"


@router.get("/access")
def get_admin_access() -> dict:
    with db() as conn:
        user = get_default_user(conn)
        access = admin_access_for_user(conn, user)
        return _access_payload(access)


@router.get("/summary")
def get_admin_summary() -> dict:
    with db() as conn:
        user = get_default_user(conn)
        access = admin_access_for_user(conn, user)
        _require_admin(access)
        return {
            "access": _access_payload(access),
            "roleCatalog": role_catalog(),
            "stats": _stats(conn),
            "memberships": [_membership_payload(row) for row in admin_memberships(conn)],
            "users": _safe_users(conn, access),
            "billing": _billing_summary(conn) if access.has("admin:billing:read") else None,
            "privacy": _privacy_summary(conn) if access.has("admin:privacy:read") else None,
            "audit": [_audit_payload(row) for row in audit_log(conn)] if access.has("admin:audit:read") else [],
            "guardrails": [
                "Keine privaten Dokumentinhalte, Dateipfade, OCR-Texte oder Vault-Dateien in Admin-Responses.",
                "Rollenänderungen brauchen eine Begründung und werden im AdminAuditLog gespeichert.",
                "Service-role Keys bleiben serverseitig; der Browser erhält nur publishable/Auth Tokens.",
            ],
        }


@router.post("/memberships")
def upsert_admin_membership(payload: AdminMembershipRequest) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        access = admin_access_for_user(conn, user)
        _require_capability(access, "admin:roles:manage")
        try:
            membership = assign_admin_membership(
                conn,
                actor_user_id=user["id"],
                role=payload.role,
                reason=payload.reason,
                target_user_id=payload.targetUserId,
                email=payload.email,
                status=payload.status,
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return {"membership": _membership_payload(membership)}


def _require_admin(access: AdminAccess) -> None:
    if not access.active:
        raise HTTPException(status_code=403, detail="Admin access required")


def _require_capability(access: AdminAccess, capability: str) -> None:
    _require_admin(access)
    if not access.has(capability):
        raise HTTPException(status_code=403, detail="Missing admin capability")


def _access_payload(access: AdminAccess) -> dict:
    return {
        "active": access.active,
        "roles": access.roles,
        "capabilities": access.capabilities,
        "devBootstrap": access.dev_bootstrap,
    }


def _stats(conn) -> dict:
    def count(query: str) -> int:
        return int(conn.execute(query).fetchone()[0])

    return {
        "users": count('SELECT COUNT(*) FROM "User"'),
        "adminMembers": count('SELECT COUNT(*) FROM "AdminMembership" WHERE status = \'ACTIVE\''),
        "openLoops": count('SELECT COUNT(*) FROM "Loop" WHERE status IN (\'OPEN\', \'SNOOZED\')'),
        "documents": count('SELECT COUNT(*) FROM "Document"'),
        "auditEvents": count('SELECT COUNT(*) FROM "AdminAuditLog"'),
    }


def _safe_users(conn, access: AdminAccess) -> list[dict]:
    if not access.has("admin:users:read"):
        return []
    can_view_contact = any(role in access.roles for role in ["SUPER_ADMIN", "SUPPORT", "PRIVACY_ADMIN"])
    rows = rows_to_dicts(
        conn.execute(
            """SELECT
                 u.id,
                 u.name,
                 u.email,
                 u.createdAt,
                 u.updatedAt,
                 COUNT(DISTINCT i.id) as itemCount,
                 COUNT(DISTINCT d.id) as documentCount,
                 COUNT(DISTINCT l.id) as openLoopCount
               FROM "User" u
               LEFT JOIN "Item" i ON i.userId = u.id
               LEFT JOIN "Document" d ON d.userId = u.id
               LEFT JOIN "Loop" l ON l.userId = u.id AND l.status IN ('OPEN', 'SNOOZED')
               GROUP BY u.id
               ORDER BY u.updatedAt DESC
               LIMIT 20"""
        ).fetchall()
    )
    return [
        {
            "id": row["id"],
            "name": row["name"],
            "email": row["email"] if can_view_contact else mask_email(row["email"]),
            "contactVisible": can_view_contact,
            "createdAt": row["createdAt"],
            "updatedAt": row["updatedAt"],
            "itemCount": row["itemCount"],
            "documentCount": row["documentCount"],
            "openLoopCount": row["openLoopCount"],
        }
        for row in rows
    ]


def _billing_summary(conn) -> dict:
    plans = rows_to_dicts(
        conn.execute(
            """SELECT planKey, status, COUNT(*) as count
               FROM "PlanSubscription"
               GROUP BY planKey, status
               ORDER BY count DESC"""
        ).fetchall()
    )
    return {
        "plans": plans,
        "note": "Zahlungsdaten und Rechnungsinhalte bleiben beim Billing-Provider und werden hier nicht angezeigt.",
    }


def _privacy_summary(conn) -> dict:
    document_types = rows_to_dicts(
        conn.execute(
            """SELECT type, COUNT(*) as count
               FROM "Document"
               GROUP BY type
               ORDER BY count DESC"""
        ).fetchall()
    )
    return {
        "documentTypes": document_types,
        "exportReady": False,
        "deletionReady": False,
        "note": "Export/Löschung sind geplant; private Dokumentinhalte werden im Admin nicht offengelegt.",
    }


def _membership_payload(row: dict) -> dict:
    return {
        "id": row["id"],
        "userId": row.get("userId"),
        "userName": row.get("userName"),
        "email": row.get("email"),
        "role": row["role"],
        "status": row["status"],
        "reason": row["reason"],
        "createdAt": row["createdAt"],
        "updatedAt": row["updatedAt"],
    }


def _audit_payload(row: dict) -> dict:
    return {
        "id": row["id"],
        "actorUserId": row.get("actorUserId"),
        "actorEmail": mask_email(row.get("actorEmail")),
        "action": row["action"],
        "targetType": row["targetType"],
        "targetId": row.get("targetId"),
        "targetUserId": row.get("targetUserId"),
        "targetEmail": mask_email(row.get("targetEmail")),
        "role": row.get("role"),
        "reason": row["reason"],
        "safeStatus": row["safeStatus"],
        "createdAt": row["createdAt"],
    }
