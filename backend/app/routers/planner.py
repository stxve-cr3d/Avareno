from __future__ import annotations

from fastapi import APIRouter, Query

from app.db import db
from app.dependencies import get_default_user
from app.schemas import PlanActionCreate
from app.services.authorization import require_owned_item
from app.services.planning import list_notifications, list_planner_loops
from app.utils import make_id, normalize_iso, now_iso

router = APIRouter()


def planner_payload(conn, user_id: str, days: int = 14) -> dict:
    plan = list_planner_loops(conn, user_id, days=days)
    notifications = list_notifications(conn, user_id, days=days)
    plan["notifications"] = notifications
    plan["notificationCounts"] = {
        "dueNow": len([item for item in notifications if item["state"] == "due_now"]),
        "today": len([item for item in notifications if item["state"] == "today"]),
        "thisWeek": len([item for item in notifications if item["state"] == "this_week"]),
    }
    return plan


@router.get("")
def planner(days: int = Query(default=14, ge=1, le=90)) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        return planner_payload(conn, user["id"], days=days)


@router.post("/actions", status_code=201)
def create_plan_action(payload: PlanActionCreate) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        if payload.itemId:
            require_owned_item(conn, user["id"], payload.itemId)
        now = now_iso()
        loop_id = make_id()
        due_date = normalize_iso(payload.dueDate)
        remind_at = normalize_iso(payload.remindAt) or due_date
        conn.execute(
            """INSERT INTO "Loop"
               (id, userId, itemId, title, description, sourceType, priority, status, dueDate, reminderAt, xpReward, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                loop_id,
                user["id"],
                payload.itemId,
                payload.title,
                payload.note,
                "MANUAL",
                payload.priority,
                "OPEN",
                due_date,
                remind_at,
                25,
                now,
                now,
            ),
        )
        if remind_at:
            conn.execute(
                """INSERT INTO "Reminder"
                   (id, userId, loopId, itemId, title, message, remindAt, status, createdAt, updatedAt)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    make_id(),
                    user["id"],
                    loop_id,
                    payload.itemId,
                    payload.title,
                    payload.note or "Planned care reminder.",
                    remind_at,
                    "ACTIVE",
                    now,
                    now,
                ),
            )
        return planner_payload(conn, user["id"])
