"""Plan entitlement enforcement.

Single source of truth for plan limits is app.services.billing.plan_catalog().
Every limited resource (items, storage, reminders, AI actions, vaults) and
every gated feature must be checked here server-side - the frontend gates are
UX only and never a security boundary.
"""
from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from typing import Any

from app.db import row_to_dict
from app.services.billing import BillingPlan, get_or_create_subscription, plan_by_key
from app.utils import make_id, now_iso


class PlanLimitExceeded(Exception):
    """Raised when a plan limit or feature gate blocks an action.

    Routers translate this into HTTP 402 with a structured payload the
    frontend can render as an upgrade prompt.
    """

    def __init__(self, *, limit_key: str, limit: int, current: int, plan_key: str, message: str) -> None:
        super().__init__(message)
        self.limit_key = limit_key
        self.limit = limit
        self.current = current
        self.plan_key = plan_key
        self.message = message

    def payload(self) -> dict[str, Any]:
        return {
            "error": "plan_limit_exceeded",
            "limitKey": self.limit_key,
            "limit": self.limit,
            "current": self.current,
            "planKey": self.plan_key,
            "detail": self.message,
        }


def resolve_plan(conn: sqlite3.Connection, user: dict[str, Any]) -> BillingPlan:
    subscription = get_or_create_subscription(conn, user)
    plan_key = str(subscription.get("planKey") or "free").strip().lower()
    try:
        return plan_by_key(plan_key)
    except Exception:
        return plan_by_key("free")


def has_feature(conn: sqlite3.Connection, user: dict[str, Any], feature_key: str) -> bool:
    return feature_key in resolve_plan(conn, user).feature_keys


def require_feature(conn: sqlite3.Connection, user: dict[str, Any], feature_key: str) -> None:
    plan = resolve_plan(conn, user)
    if feature_key not in plan.feature_keys:
        raise PlanLimitExceeded(
            limit_key=f"feature:{feature_key}",
            limit=0,
            current=0,
            plan_key=plan.key,
            message=f"Dieses Feature ist im Plan {plan.name} nicht enthalten.",
        )


def require_item_capacity(conn: sqlite3.Connection, user: dict[str, Any], adding: int = 1) -> None:
    plan = resolve_plan(conn, user)
    current = _count(conn, 'SELECT COUNT(*) AS n FROM "Item" WHERE userId = ?', (user["id"],))
    if current + adding > plan.item_limit:
        raise PlanLimitExceeded(
            limit_key="items",
            limit=plan.item_limit,
            current=current,
            plan_key=plan.key,
            message=f"Objekt-Limit erreicht ({current}/{plan.item_limit} im Plan {plan.name}).",
        )


def require_storage_capacity(conn: sqlite3.Connection, user: dict[str, Any], adding_bytes: int) -> None:
    plan = resolve_plan(conn, user)
    used_bytes = _count(conn, 'SELECT COALESCE(SUM(fileSize), 0) AS n FROM "Document" WHERE userId = ?', (user["id"],))
    limit_bytes = plan.storage_limit_mb * 1024 * 1024
    if used_bytes + adding_bytes > limit_bytes:
        used_mb = used_bytes // (1024 * 1024)
        raise PlanLimitExceeded(
            limit_key="storageMb",
            limit=plan.storage_limit_mb,
            current=int(used_mb),
            plan_key=plan.key,
            message=f"Speicher-Limit erreicht ({used_mb} MB von {plan.storage_limit_mb} MB im Plan {plan.name}).",
        )


def require_reminder_capacity(conn: sqlite3.Connection, user: dict[str, Any], adding: int = 1) -> None:
    plan = resolve_plan(conn, user)
    current = _count(
        conn,
        'SELECT COUNT(*) AS n FROM "Loop" WHERE userId = ? AND status NOT IN (\'DONE\', \'ARCHIVED\')',
        (user["id"],),
    )
    if current + adding > plan.reminder_limit:
        raise PlanLimitExceeded(
            limit_key="reminders",
            limit=plan.reminder_limit,
            current=current,
            plan_key=plan.key,
            message=f"Erinnerungs-Limit erreicht ({current}/{plan.reminder_limit} im Plan {plan.name}).",
        )


def require_vault_capacity(conn: sqlite3.Connection, user: dict[str, Any], adding: int = 1) -> None:
    plan = resolve_plan(conn, user)
    current = _count(conn, 'SELECT COUNT(*) AS n FROM "Vault" WHERE userId = ?', (user["id"],))
    if current + adding > plan.vault_limit:
        raise PlanLimitExceeded(
            limit_key="vaults",
            limit=plan.vault_limit,
            current=current,
            plan_key=plan.key,
            message=f"Vault-Limit erreicht ({current}/{plan.vault_limit} im Plan {plan.name}).",
        )


def consume_ai_action(conn: sqlite3.Connection, user: dict[str, Any], kind: str = "ai_action") -> None:
    """Check and increment the monthly AI action counter atomically."""
    plan = resolve_plan(conn, user)
    period = datetime.now(timezone.utc).strftime("%Y-%m")
    row = row_to_dict(
        conn.execute(
            'SELECT * FROM "UsageCounter" WHERE userId = ? AND kind = ? AND period = ?',
            (user["id"], kind, period),
        ).fetchone()
    )
    current = int(row["count"]) if row else 0
    if current >= plan.ai_actions_per_month:
        raise PlanLimitExceeded(
            limit_key="aiActionsPerMonth",
            limit=plan.ai_actions_per_month,
            current=current,
            plan_key=plan.key,
            message=f"AI-Aktionen für diesen Monat aufgebraucht ({current}/{plan.ai_actions_per_month} im Plan {plan.name}).",
        )
    now = now_iso()
    if row:
        conn.execute(
            'UPDATE "UsageCounter" SET count = count + 1, updatedAt = ? WHERE id = ?',
            (now, row["id"]),
        )
    else:
        conn.execute(
            'INSERT INTO "UsageCounter" (id, userId, kind, period, count, updatedAt) VALUES (?, ?, ?, ?, 1, ?)',
            (make_id(), user["id"], kind, period, now),
        )


def usage_summary(conn: sqlite3.Connection, user: dict[str, Any]) -> dict[str, Any]:
    """Current usage vs. plan limits - for the frontend account/upgrade UI."""
    plan = resolve_plan(conn, user)
    period = datetime.now(timezone.utc).strftime("%Y-%m")
    items = _count(conn, 'SELECT COUNT(*) AS n FROM "Item" WHERE userId = ?', (user["id"],))
    storage_bytes = _count(conn, 'SELECT COALESCE(SUM(fileSize), 0) AS n FROM "Document" WHERE userId = ?', (user["id"],))
    reminders = _count(
        conn,
        'SELECT COUNT(*) AS n FROM "Loop" WHERE userId = ? AND status NOT IN (\'DONE\', \'ARCHIVED\')',
        (user["id"],),
    )
    vaults = _count(conn, 'SELECT COUNT(*) AS n FROM "Vault" WHERE userId = ?', (user["id"],))
    ai_row = row_to_dict(
        conn.execute(
            'SELECT count FROM "UsageCounter" WHERE userId = ? AND kind = ? AND period = ?',
            (user["id"], "ai_action", period),
        ).fetchone()
    )
    return {
        "planKey": plan.key,
        "planName": plan.name,
        "featureKeys": list(plan.feature_keys),
        "usage": {
            "items": {"current": items, "limit": plan.item_limit},
            "storageMb": {"current": storage_bytes // (1024 * 1024), "limit": plan.storage_limit_mb},
            "reminders": {"current": reminders, "limit": plan.reminder_limit},
            "aiActionsPerMonth": {"current": int(ai_row["count"]) if ai_row else 0, "limit": plan.ai_actions_per_month},
            "vaults": {"current": vaults, "limit": plan.vault_limit},
        },
    }


def _count(conn: sqlite3.Connection, sql: str, params: tuple) -> int:
    row = conn.execute(sql, params).fetchone()
    return int(row["n"] if row and row["n"] is not None else 0)
