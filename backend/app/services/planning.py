from __future__ import annotations

from datetime import datetime, timedelta, timezone

import sqlite3

from app.db import row_to_dict, rows_to_dicts
from app.utils import parse_iso


def notification_state(remind_at: str | None, now: datetime | None = None) -> str:
    now = now or datetime.now(timezone.utc)
    parsed = parse_iso(remind_at)
    if not parsed:
        return "unscheduled"
    if parsed <= now:
        return "due_now"
    if parsed <= now + timedelta(days=1):
        return "today"
    if parsed <= now + timedelta(days=7):
        return "this_week"
    return "later"


def enrich_reminder(conn: sqlite3.Connection, reminder: dict, now: datetime | None = None) -> dict:
    item = (
        row_to_dict(conn.execute('SELECT * FROM "Item" WHERE id = ?', (reminder["itemId"],)).fetchone())
        if reminder.get("itemId")
        else None
    )
    loop = (
        row_to_dict(conn.execute('SELECT * FROM "Loop" WHERE id = ?', (reminder["loopId"],)).fetchone())
        if reminder.get("loopId")
        else None
    )
    title = reminder.get("title", "").lower()
    message = reminder.get("message", "").lower()
    warranty_until = item.get("warrantyUntil") if item else None
    is_warranty = "warranty" in title or "garantie" in title or "warranty" in message or reminder.get("remindAt") == warranty_until
    kind = "warranty" if is_warranty else "reminder"
    return {
        **reminder,
        "kind": kind,
        "state": notification_state(reminder.get("remindAt"), now),
        "deepLink": f"/items/{item['id']}" if item else f"/loops/{loop['id']}" if loop else "/",
        "item": item,
        "loop": loop,
    }


def list_notifications(conn: sqlite3.Connection, user_id: str, include_inactive: bool = False, days: int = 30) -> list[dict]:
    now = datetime.now(timezone.utc)
    until = now + timedelta(days=days)
    if include_inactive:
        rows = rows_to_dicts(
            conn.execute(
                'SELECT * FROM "Reminder" WHERE userId = ? ORDER BY remindAt ASC',
                (user_id,),
            ).fetchall()
        )
    else:
        rows = rows_to_dicts(
            conn.execute(
                'SELECT * FROM "Reminder" WHERE userId = ? AND status = ? ORDER BY remindAt ASC',
                (user_id, "ACTIVE"),
            ).fetchall()
        )
    return [
        enrich_reminder(conn, row, now)
        for row in rows
        if include_inactive or (parse_iso(row.get("remindAt")) or now) <= until
    ]


def list_planner_loops(conn: sqlite3.Connection, user_id: str, days: int = 14) -> dict:
    now = datetime.now(timezone.utc)
    until = now + timedelta(days=days)
    loops = rows_to_dicts(
        conn.execute(
            """SELECT * FROM "Loop"
               WHERE userId = ? AND status IN ('OPEN', 'SNOOZED')
               ORDER BY dueDate ASC, reminderAt ASC, createdAt DESC""",
            (user_id,),
        ).fetchall()
    )
    for loop in loops:
        loop["item"] = (
            row_to_dict(conn.execute('SELECT * FROM "Item" WHERE id = ?', (loop["itemId"],)).fetchone())
            if loop.get("itemId")
            else None
        )

    def due_at(loop: dict) -> datetime | None:
        return parse_iso(loop.get("dueDate")) or parse_iso(loop.get("reminderAt"))

    overdue = [loop for loop in loops if (due_at(loop) is not None and due_at(loop) < now)]
    today = [loop for loop in loops if (due_at(loop) is not None and now <= due_at(loop) <= now + timedelta(days=1))]
    upcoming = [loop for loop in loops if (due_at(loop) is not None and now + timedelta(days=1) < due_at(loop) <= until)]
    unscheduled = [loop for loop in loops if not due_at(loop)]
    next_best = overdue[0] if overdue else today[0] if today else upcoming[0] if upcoming else unscheduled[0] if unscheduled else None

    return {
        "generatedAt": now.isoformat(),
        "windowDays": days,
        "nextBest": next_best,
        "overdue": overdue,
        "today": today,
        "upcoming": upcoming,
        "unscheduled": unscheduled,
        "counts": {
            "overdue": len(overdue),
            "today": len(today),
            "upcoming": len(upcoming),
            "unscheduled": len(unscheduled),
            "totalOpen": len(loops),
        },
    }
