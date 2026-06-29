from __future__ import annotations

import os
import sqlite3
from dataclasses import dataclass

from app.auth import current_auth_claims
from app.db import rows_to_dicts
from app.utils import make_id, now_iso

ADMIN_ROLES = {
    "SUPER_ADMIN": {
        "label": "Super Admin",
        "description": "Verwaltet Rollen, sieht Systemstatus und Audit. Kein Standardzugriff auf private Dokumentinhalte.",
        "capabilities": [
            "admin:roles:manage",
            "admin:users:read",
            "admin:billing:read",
            "admin:privacy:read",
            "admin:resolve:moderate",
            "admin:audit:read",
        ],
    },
    "SUPPORT": {
        "label": "Support",
        "description": "Sieht sichere Nutzer-Metadaten und Support-Kontext, aber keine privaten Dokumentinhalte.",
        "capabilities": ["admin:users:read", "admin:resolve:moderate"],
    },
    "BILLING_ADMIN": {
        "label": "Billing Admin",
        "description": "Sieht Abostatus und sichere Billing-Metadaten. Keine Zahlungsdaten oder Dokumente.",
        "capabilities": ["admin:billing:read"],
    },
    "PRIVACY_ADMIN": {
        "label": "Privacy Admin",
        "description": "Sieht Datenschutzstatus, Export-/Lösch-Queues und Audit ohne private Inhalte.",
        "capabilities": ["admin:privacy:read", "admin:audit:read"],
    },
    "MODERATOR": {
        "label": "Moderator",
        "description": "Moderiert Resolve-Kontext und Meldungen. Kein Zugriff auf Dinge, Billing oder Dokumente.",
        "capabilities": ["admin:resolve:moderate"],
    },
}


@dataclass(frozen=True)
class AdminAccess:
    user_id: str
    roles: list[str]
    capabilities: list[str]
    dev_bootstrap: bool

    @property
    def active(self) -> bool:
        return bool(self.roles)

    def has(self, capability: str) -> bool:
        return capability in self.capabilities


def role_catalog() -> list[dict]:
    return [
        {
            "id": role,
            "label": config["label"],
            "description": config["description"],
            "capabilities": config["capabilities"],
        }
        for role, config in ADMIN_ROLES.items()
    ]


def admin_access_for_user(conn: sqlite3.Connection, user: dict) -> AdminAccess:
    ensure_admin_bootstrap(conn, user)
    rows = rows_to_dicts(
        conn.execute(
            """SELECT role FROM "AdminMembership"
               WHERE status = 'ACTIVE'
                 AND (userId = ? OR lower(email) = lower(?))
               ORDER BY role ASC""",
            (user["id"], user.get("email") or ""),
        ).fetchall()
    )
    roles = sorted({row["role"] for row in rows if row["role"] in ADMIN_ROLES} | set(trusted_claim_roles()))
    capabilities = sorted(
        {
            capability
            for role in roles
            for capability in ADMIN_ROLES[role]["capabilities"]
        }
    )
    dev_bootstrap = any(row.get("reason") == "Local development admin bootstrap." for row in admin_memberships(conn))
    return AdminAccess(user_id=user["id"], roles=roles, capabilities=capabilities, dev_bootstrap=dev_bootstrap)


def ensure_admin_bootstrap(conn: sqlite3.Connection, user: dict) -> None:
    existing = conn.execute('SELECT id FROM "AdminMembership" LIMIT 1').fetchone()
    if existing:
        return

    bootstrap_ids = _env_set("AVARENO_ADMIN_BOOTSTRAP_USER_IDS")
    bootstrap_emails = _env_set("AVARENO_ADMIN_BOOTSTRAP_EMAILS")
    user_email = str(user.get("email") or "").lower()
    is_configured_admin = str(user["id"]).lower() in bootstrap_ids or user_email in bootstrap_emails
    is_local_dev = os.environ.get("AVARENO_REQUIRE_AUTH") != "1" and os.environ.get("AVARENO_ENABLE_DEV_ADMIN", "1") == "1"

    if not is_configured_admin and not is_local_dev:
        return

    reason = "Configured admin bootstrap." if is_configured_admin else "Local development admin bootstrap."
    now = now_iso()
    membership_id = make_id()
    conn.execute(
        """INSERT INTO "AdminMembership"
           (id, userId, email, role, status, createdByUserId, reason, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (membership_id, user["id"], user.get("email"), "SUPER_ADMIN", "ACTIVE", user["id"], reason, now, now),
    )
    record_admin_audit(
        conn,
        actor_user_id=user["id"],
        action="ADMIN_BOOTSTRAP",
        target_type="ADMIN_MEMBERSHIP",
        target_id=membership_id,
        target_user_id=user["id"],
        role="SUPER_ADMIN",
        reason=reason,
        safe_status="RECORDED",
    )


def admin_memberships(conn: sqlite3.Connection) -> list[dict]:
    return rows_to_dicts(
        conn.execute(
            """SELECT m.*, u.name as userName
               FROM "AdminMembership" m
               LEFT JOIN "User" u ON u.id = m.userId
               ORDER BY m.updatedAt DESC, m.createdAt DESC"""
        ).fetchall()
    )


def assign_admin_membership(
    conn: sqlite3.Connection,
    *,
    actor_user_id: str,
    role: str,
    reason: str,
    target_user_id: str | None = None,
    email: str | None = None,
    status: str = "ACTIVE",
) -> dict:
    normalized_role = role.upper().strip()
    if normalized_role not in ADMIN_ROLES:
        raise ValueError("Unknown admin role")
    normalized_status = status.upper().strip()
    if normalized_status not in {"ACTIVE", "SUSPENDED"}:
        raise ValueError("Unknown admin membership status")
    normalized_reason = reason.strip()
    if len(normalized_reason) < 12:
        raise ValueError("A clear admin reason is required")

    target_user = None
    if target_user_id:
        target_user = conn.execute('SELECT * FROM "User" WHERE id = ?', (target_user_id,)).fetchone()
        if not target_user:
            raise ValueError("Target user not found")

    normalized_email = (email or (target_user["email"] if target_user else "") or "").strip().lower()
    if not target_user_id and "@" not in normalized_email:
        raise ValueError("Target email or user id is required")

    existing = conn.execute(
        """SELECT * FROM "AdminMembership"
           WHERE role = ?
             AND (
               (? IS NOT NULL AND userId = ?)
               OR (? != '' AND lower(email) = lower(?))
             )
           LIMIT 1""",
        (normalized_role, target_user_id, target_user_id, normalized_email, normalized_email),
    ).fetchone()
    now = now_iso()
    if existing:
        conn.execute(
            """UPDATE "AdminMembership"
               SET userId = COALESCE(?, userId),
                   email = COALESCE(NULLIF(?, ''), email),
                   status = ?,
                   reason = ?,
                   updatedAt = ?
               WHERE id = ?""",
            (target_user_id, normalized_email, normalized_status, normalized_reason, now, existing["id"]),
        )
        membership_id = existing["id"]
        action = "ADMIN_ROLE_UPDATED"
    else:
        membership_id = make_id()
        conn.execute(
            """INSERT INTO "AdminMembership"
               (id, userId, email, role, status, createdByUserId, reason, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (membership_id, target_user_id, normalized_email or None, normalized_role, normalized_status, actor_user_id, normalized_reason, now, now),
        )
        action = "ADMIN_ROLE_ASSIGNED"

    record_admin_audit(
        conn,
        actor_user_id=actor_user_id,
        action=action,
        target_type="ADMIN_MEMBERSHIP",
        target_id=membership_id,
        target_user_id=target_user_id,
        role=normalized_role,
        reason=normalized_reason,
        safe_status=normalized_status,
    )
    return dict(conn.execute('SELECT * FROM "AdminMembership" WHERE id = ?', (membership_id,)).fetchone())


def record_admin_audit(
    conn: sqlite3.Connection,
    *,
    actor_user_id: str | None,
    action: str,
    target_type: str,
    target_id: str | None = None,
    target_user_id: str | None = None,
    role: str | None = None,
    reason: str,
    safe_status: str = "RECORDED",
) -> None:
    conn.execute(
        """INSERT INTO "AdminAuditLog"
           (id, actorUserId, action, targetType, targetId, targetUserId, role, reason, safeStatus, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (make_id(), actor_user_id, action, target_type, target_id, target_user_id, role, reason[:500], safe_status, now_iso()),
    )


def audit_log(conn: sqlite3.Connection, limit: int = 12) -> list[dict]:
    return rows_to_dicts(
        conn.execute(
            """SELECT a.*, actor.email as actorEmail, target.email as targetEmail
               FROM "AdminAuditLog" a
               LEFT JOIN "User" actor ON actor.id = a.actorUserId
               LEFT JOIN "User" target ON target.id = a.targetUserId
               ORDER BY a.createdAt DESC
               LIMIT ?""",
            (limit,),
        ).fetchall()
    )


def mask_email(value: str | None) -> str:
    if not value or "@" not in value:
        return "unbekannt"
    local, domain = value.split("@", 1)
    if len(local) <= 2:
        return f"{local[:1]}***@{domain}"
    return f"{local[:2]}***@{domain}"


def trusted_claim_roles() -> list[str]:
    claims = current_auth_claims()
    app_metadata = claims.get("app_metadata") if isinstance(claims, dict) and isinstance(claims.get("app_metadata"), dict) else {}
    raw_roles = app_metadata.get("avareno_admin_roles") or app_metadata.get("admin_roles") or []
    if isinstance(raw_roles, str):
        raw_roles = [raw_roles]
    return [role.upper() for role in raw_roles if isinstance(role, str) and role.upper() in ADMIN_ROLES]


def _env_set(name: str) -> set[str]:
    return {value.strip().lower() for value in os.environ.get(name, "").split(",") if value.strip()}
