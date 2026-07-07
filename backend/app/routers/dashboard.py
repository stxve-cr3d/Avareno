from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter

from app.db import db, row_to_dict, rows_to_dicts
from app.dependencies import get_default_user
from app.services.item_service import missing_fields
from app.utils import parse_iso

router = APIRouter()


@router.get("")
def dashboard() -> dict:
    with db() as conn:
        user = get_default_user(conn)
        loops = rows_to_dicts(
            conn.execute(
                """SELECT * FROM "Loop"
                   WHERE userId = ? AND status IN ('OPEN', 'SNOOZED')
                   ORDER BY dueDate ASC, createdAt DESC""",
                (user["id"],),
            ).fetchall()
        )
        for loop in loops:
            loop["item"] = (
                row_to_dict(conn.execute('SELECT * FROM "Item" WHERE id = ?', (loop["itemId"],)).fetchone())
                if loop.get("itemId")
                else None
            )

        reminders = rows_to_dicts(
            conn.execute(
                'SELECT * FROM "Reminder" WHERE userId = ? AND status = ? ORDER BY remindAt ASC',
                (user["id"], "ACTIVE"),
            ).fetchall()
        )
        for reminder in reminders:
            reminder["item"] = (
                row_to_dict(conn.execute('SELECT * FROM "Item" WHERE id = ?', (reminder["itemId"],)).fetchone())
                if reminder.get("itemId")
                else None
            )
            reminder["loop"] = (
                row_to_dict(conn.execute('SELECT * FROM "Loop" WHERE id = ?', (reminder["loopId"],)).fetchone())
                if reminder.get("loopId")
                else None
            )

        items = rows_to_dicts(
            conn.execute('SELECT * FROM "Item" WHERE userId = ? ORDER BY updatedAt DESC', (user["id"],)).fetchall()
        )
        incomplete_items = []
        for item in items:
            documents = rows_to_dicts(conn.execute('SELECT * FROM "Document" WHERE itemId = ? AND vaultId IS NULL', (item["id"],)).fetchall())
            item["documents"] = documents
            item["missingFields"] = missing_fields(item, documents)
            if int(item["completenessScore"]) < 100:
                incomplete_items.append(item)

        now = datetime.now(timezone.utc)
        soon = now + timedelta(days=30)
        reminders_soon = [
            reminder
            for reminder in reminders
            if (parse_iso(reminder.get("remindAt")) or soon) <= soon
        ]

        return {
            "user": user,
            "openLoops": loops,
            "warrantyReminders": [
                reminder
                for reminder in reminders
                if reminder.get("itemId") or "warranty" in reminder.get("title", "").lower()
            ],
            "incompleteItems": incomplete_items,
            "stats": {
                "openLoopCount": len(loops),
                "incompleteItemCount": len(incomplete_items),
                "remindersSoonCount": len(reminders_soon),
            },
        }
