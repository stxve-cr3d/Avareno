from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.db import db, row_to_dict
from app.dependencies import get_default_user
from app.schemas import NotificationSnoozeRequest
from app.services.planning import enrich_reminder, list_notifications
from app.utils import normalize_iso, now_iso

router = APIRouter()


@router.get("")
def notifications(
    days: int = Query(default=30, ge=1, le=365),
    includeInactive: bool = False,
) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        items = list_notifications(conn, user["id"], include_inactive=includeInactive, days=days)
        return {
            "items": items,
            "counts": {
                "dueNow": len([item for item in items if item["state"] == "due_now"]),
                "today": len([item for item in items if item["state"] == "today"]),
                "thisWeek": len([item for item in items if item["state"] == "this_week"]),
                "later": len([item for item in items if item["state"] == "later"]),
            },
        }


@router.post("/{notification_id}/read")
def mark_notification_read(notification_id: str) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        reminder = row_to_dict(
            conn.execute(
                'SELECT * FROM "Reminder" WHERE id = ? AND userId = ?',
                (notification_id, user["id"]),
            ).fetchone()
        )
        if not reminder:
            raise HTTPException(status_code=404, detail="Notification not found")
        conn.execute(
            'UPDATE "Reminder" SET status = ?, updatedAt = ? WHERE id = ? AND userId = ?',
            ("SENT", now_iso(), notification_id, user["id"]),
        )
        updated = row_to_dict(
            conn.execute(
                'SELECT * FROM "Reminder" WHERE id = ? AND userId = ?',
                (notification_id, user["id"]),
            ).fetchone()
        )
        return enrich_reminder(conn, updated or reminder, user["id"])


@router.post("/{notification_id}/dismiss")
def dismiss_notification(notification_id: str) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        reminder = row_to_dict(
            conn.execute(
                'SELECT * FROM "Reminder" WHERE id = ? AND userId = ?',
                (notification_id, user["id"]),
            ).fetchone()
        )
        if not reminder:
            raise HTTPException(status_code=404, detail="Notification not found")
        conn.execute(
            'UPDATE "Reminder" SET status = ?, updatedAt = ? WHERE id = ? AND userId = ?',
            ("CANCELLED", now_iso(), notification_id, user["id"]),
        )
        updated = row_to_dict(
            conn.execute(
                'SELECT * FROM "Reminder" WHERE id = ? AND userId = ?',
                (notification_id, user["id"]),
            ).fetchone()
        )
        return enrich_reminder(conn, updated or reminder, user["id"])


@router.post("/{notification_id}/snooze")
def snooze_notification(notification_id: str, payload: NotificationSnoozeRequest) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        reminder = row_to_dict(
            conn.execute(
                'SELECT * FROM "Reminder" WHERE id = ? AND userId = ?',
                (notification_id, user["id"]),
            ).fetchone()
        )
        if not reminder:
            raise HTTPException(status_code=404, detail="Notification not found")
        remind_at = normalize_iso(payload.remindAt)
        conn.execute(
            'UPDATE "Reminder" SET status = ?, remindAt = ?, updatedAt = ? WHERE id = ? AND userId = ?',
            ("ACTIVE", remind_at, now_iso(), notification_id, user["id"]),
        )
        if reminder.get("loopId"):
            conn.execute(
                'UPDATE "Loop" SET status = ?, reminderAt = ?, updatedAt = ? WHERE id = ? AND userId = ?',
                ("SNOOZED", remind_at, now_iso(), reminder["loopId"], user["id"]),
            )
        updated = row_to_dict(
            conn.execute(
                'SELECT * FROM "Reminder" WHERE id = ? AND userId = ?',
                (notification_id, user["id"]),
            ).fetchone()
        )
        return enrich_reminder(conn, updated or reminder, user["id"])
