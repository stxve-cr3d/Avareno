from __future__ import annotations

from fastapi import APIRouter

from app.db import db
from app.dependencies import get_default_user
from app.schemas import MessageCapture
from app.services.message_parser import parse_message_reminder
from app.services.xp_service import award_xp
from app.utils import make_id, now_iso

router = APIRouter()


@router.post("/message", status_code=201)
def capture_message(payload: MessageCapture) -> dict:
    parsed = parse_message_reminder(payload.text, payload.contactName)
    with db() as conn:
        user = get_default_user(conn)
        now = now_iso()
        loop_id = make_id()
        reminder_id = make_id()
        conn.execute(
            """INSERT INTO "Loop"
               (id, userId, title, description, sourceType, priority, status, dueDate, reminderAt, xpReward, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                loop_id,
                user["id"],
                parsed["title"],
                parsed["description"],
                "MESSAGE",
                parsed["priority"],
                "OPEN",
                parsed["dueDate"],
                parsed["reminderAt"],
                parsed["xpReward"],
                now,
                now,
            ),
        )
        conn.execute(
            """INSERT INTO "Reminder"
               (id, userId, loopId, title, message, remindAt, status, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                reminder_id,
                user["id"],
                loop_id,
                parsed["title"],
                "Safe in-app reminder. Later this can open the WhatsApp chat, but the MVP only creates a safe reminder.",
                parsed["reminderAt"],
                "ACTIVE",
                now,
                now,
            ),
        )
        updated_user = award_xp(conn, user_id=user["id"], loop_id=loop_id, action="create_message_reminder", points=10)
        loop = dict(conn.execute('SELECT * FROM "Loop" WHERE id = ?', (loop_id,)).fetchone())
        reminder = dict(conn.execute('SELECT * FROM "Reminder" WHERE id = ?', (reminder_id,)).fetchone())
        return {"parsed": parsed, "loop": loop, "reminder": reminder, "user": updated_user}
