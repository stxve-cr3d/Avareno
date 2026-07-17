from __future__ import annotations

from datetime import datetime
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

from app.db import db, row_to_dict
from app.dependencies import get_default_user
from app.utils import now_iso

router = APIRouter()


@router.get("")
def me() -> dict:
    with db() as conn:
        return get_default_user(conn)


class ActivationUpdate(BaseModel):
    action: Literal["onboarding_started", "onboarding_dismissed", "product_detail_opened"]


@router.get("/activation")
def activation() -> dict:
    with db() as conn:
        user = get_default_user(conn)
        return _activation_summary(conn, user)


@router.post("/activation")
def update_activation(payload: ActivationUpdate) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        now = now_iso()

        if payload.action == "onboarding_started":
            conn.execute(
                """UPDATE "User"
                   SET onboardingStartedAt = COALESCE(onboardingStartedAt, ?),
                       onboardingDismissedAt = NULL,
                       updatedAt = ?
                   WHERE id = ?""",
                (now, now, user["id"]),
            )
        elif payload.action == "onboarding_dismissed":
            conn.execute(
                """UPDATE "User"
                   SET onboardingDismissedAt = ?,
                       updatedAt = ?
                   WHERE id = ?""",
                (now, now, user["id"]),
            )
        else:
            conn.execute(
                """UPDATE "User"
                   SET firstProductDetailOpenedAt = COALESCE(firstProductDetailOpenedAt, ?),
                       updatedAt = ?
                   WHERE id = ?""",
                (now, now, user["id"]),
            )

        updated = row_to_dict(conn.execute('SELECT * FROM "User" WHERE id = ?', (user["id"],)).fetchone()) or user
        return _activation_summary(conn, updated)


def _activation_summary(conn, user: dict) -> dict:
    first_item = row_to_dict(
        conn.execute(
            'SELECT id, createdAt FROM "Item" WHERE userId = ? ORDER BY createdAt ASC LIMIT 1',
            (user["id"],),
        ).fetchone()
    )
    first_document = row_to_dict(
        conn.execute(
            """SELECT "Document".id, "Document".createdAt
               FROM "Document"
               JOIN "Item" ON "Item".id = "Document".itemId
               WHERE "Document".userId = ?
                 AND "Item".userId = ?
                 AND "Document".vaultId IS NULL
               ORDER BY "Document".createdAt ASC
               LIMIT 1""",
            (user["id"], user["id"]),
        ).fetchone()
    )

    registered_at = user.get("createdAt")
    first_product_at = first_item.get("createdAt") if first_item else None
    first_document_at = first_document.get("createdAt") if first_document else None
    completed_at = user.get("onboardingCompletedAt") or first_product_at
    dismissed_at = user.get("onboardingDismissedAt")
    started_at = user.get("onboardingStartedAt")
    activation_a = bool(first_item)
    activation_b = bool(first_document)

    if activation_a or completed_at or dismissed_at:
        next_path = "/app"
    elif started_at:
        next_path = "/app/capture/item?onboarding=1"
    else:
        next_path = "/onboarding"

    return {
        "registrationCompletedAt": registered_at,
        "onboardingStartedAt": started_at,
        "onboardingCompletedAt": completed_at,
        "onboardingDismissedAt": dismissed_at,
        "firstProductDetailOpenedAt": user.get("firstProductDetailOpenedAt"),
        "firstProductCreatedAt": first_product_at,
        "firstDocumentUploadedAt": first_document_at,
        "activationA": activation_a,
        "activationB": activation_b,
        "itemCount": conn.execute('SELECT COUNT(*) FROM "Item" WHERE userId = ?', (user["id"],)).fetchone()[0],
        "linkedDocumentCount": conn.execute(
            """SELECT COUNT(*)
               FROM "Document"
               JOIN "Item" ON "Item".id = "Document".itemId
               WHERE "Document".userId = ?
                 AND "Item".userId = ?
                 AND "Document".vaultId IS NULL""",
            (user["id"], user["id"]),
        ).fetchone()[0],
        "timeToFirstProductSeconds": _seconds_between(registered_at, first_product_at),
        "timeToFirstDocumentSeconds": _seconds_between(registered_at, first_document_at),
        "nextPath": next_path,
    }


def _seconds_between(start: str | None, end: str | None) -> int | None:
    if not start or not end:
        return None
    try:
        start_value = datetime.fromisoformat(start.replace("Z", "+00:00"))
        end_value = datetime.fromisoformat(end.replace("Z", "+00:00"))
    except ValueError:
        return None
    return max(0, round((end_value - start_value).total_seconds()))
