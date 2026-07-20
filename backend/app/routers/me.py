from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.db import db, row_to_dict
from app.dependencies import get_default_user
from app.utils import now_iso

router = APIRouter()

# Meaningful organisation events for the activity view. Derived exclusively
# from data the user already owns — no new tables, no page views, no logins.
# XP actions are limited to enrich-style events that are not already covered
# by Item/Document/Loop timestamps, so a day never double-counts one action.
_ACTIVITY_XP_ACTIONS = ("add_serial_number", "add_repair_log")


@router.get("")
def me() -> dict:
    with db() as conn:
        return get_default_user(conn)


@router.get("/activity")
def activity(days: int = Query(default=365, ge=7, le=730)) -> dict:
    """Per-day counts of meaningful organisation actions for the current user.

    Sources: products created, non-vault documents saved, reminders/loops
    completed, and enrich actions from the existing XP ledger. All queries are
    scoped to the authenticated user; nothing is persisted.
    """
    with db() as conn:
        user = get_default_user(conn)
        user_id = user["id"]
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

        event_days: list[str] = []
        by_type = {"productsCreated": 0, "documentsSaved": 0, "remindersCompleted": 0, "detailsAdded": 0}
        day_types: dict[str, dict[str, int]] = {}

        def collect(key: str, sql: str, params: tuple) -> None:
            for row in conn.execute(sql, params).fetchall():
                day = str(row["day"] or "")[:10]
                if day:
                    event_days.append(day)
                    by_type[key] += 1
                    bucket = day_types.setdefault(day, {})
                    bucket[key] = bucket.get(key, 0) + 1

        collect(
            "productsCreated",
            'SELECT createdAt AS day FROM "Item" WHERE userId = ? AND createdAt >= ?',
            (user_id, cutoff),
        )
        collect(
            "documentsSaved",
            'SELECT createdAt AS day FROM "Document" WHERE userId = ? AND vaultId IS NULL AND createdAt >= ?',
            (user_id, cutoff),
        )
        collect(
            "remindersCompleted",
            'SELECT updatedAt AS day FROM "Loop" WHERE userId = ? AND status = ? AND updatedAt >= ?',
            (user_id, "DONE", cutoff),
        )
        collect(
            "detailsAdded",
            f'SELECT createdAt AS day FROM "XpTransaction" WHERE userId = ? AND action IN ({",".join("?" for _ in _ACTIVITY_XP_ACTIONS)}) AND createdAt >= ?',
            (user_id, *(_ACTIVITY_XP_ACTIONS), cutoff),
        )

        counts: dict[str, int] = {}
        for day in event_days:
            counts[day] = counts.get(day, 0) + 1

        # Streaks run over the full history, not only the requested window,
        # so a 30-day view still reports the true current streak.
        all_days = _all_activity_days(conn, user_id)
        current_streak = _current_streak_from_days(all_days)
        longest_streak = _longest_streak_from_days(all_days)

        return {
            "rangeDays": days,
            # Per-day type buckets let the client explain each cell
            # ("1 Produkt angelegt, 1 Dokument gespeichert") without a
            # second request. Additive to the existing shape.
            "days": [
                {"date": day, "count": counts[day], "types": day_types.get(day, {})}
                for day in sorted(counts)
            ],
            "totalActions": len(event_days),
            "activeDays": len(counts),
            "currentStreakDays": current_streak,
            "longestStreakDays": longest_streak,
            "byType": by_type,
        }


def _all_activity_days(conn, user_id: str) -> set[str]:
    placeholders = ",".join("?" for _ in _ACTIVITY_XP_ACTIONS)
    rows = conn.execute(
        f'''SELECT substr(createdAt, 1, 10) AS day FROM "Item" WHERE userId = ?
            UNION
            SELECT substr(createdAt, 1, 10) AS day FROM "Document" WHERE userId = ? AND vaultId IS NULL
            UNION
            SELECT substr(updatedAt, 1, 10) AS day FROM "Loop" WHERE userId = ? AND status = 'DONE'
            UNION
            SELECT substr(createdAt, 1, 10) AS day FROM "XpTransaction" WHERE userId = ? AND action IN ({placeholders})''',
        (user_id, user_id, user_id, user_id, *(_ACTIVITY_XP_ACTIONS)),
    )
    return {str(row["day"]) for row in rows.fetchall() if row["day"]}


def _current_streak_from_days(active_days: set[str]) -> int:
    if not active_days:
        return 0
    today = datetime.now(timezone.utc).date()
    if today.isoformat() in active_days:
        cursor = today
    elif (today - timedelta(days=1)).isoformat() in active_days:
        cursor = today - timedelta(days=1)
    else:
        return 0
    streak = 0
    while cursor.isoformat() in active_days:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


def _longest_streak_from_days(active_days: set[str]) -> int:
    longest = 0
    for day in active_days:
        try:
            date = datetime.fromisoformat(day).date()
        except ValueError:
            continue
        if (date - timedelta(days=1)).isoformat() in active_days:
            continue
        length = 1
        cursor = date + timedelta(days=1)
        while cursor.isoformat() in active_days:
            length += 1
            cursor += timedelta(days=1)
        longest = max(longest, length)
    return longest


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
