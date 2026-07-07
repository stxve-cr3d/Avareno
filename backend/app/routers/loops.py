from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.db import db, row_to_dict, rows_to_dicts
from app.dependencies import get_default_user
from app.schemas import LoopCreate, LoopPatch, SnoozeRequest
from app.services.entitlements import PlanLimitExceeded, require_reminder_capacity
from app.services.xp_service import award_xp
from app.utils import make_id, normalize_iso, now_iso

router = APIRouter()


def _loop_with_relations(conn, loop_id: str) -> dict | None:
    loop = row_to_dict(conn.execute('SELECT * FROM "Loop" WHERE id = ?', (loop_id,)).fetchone())
    if not loop:
        return None
    loop["item"] = (
        row_to_dict(conn.execute('SELECT * FROM "Item" WHERE id = ?', (loop["itemId"],)).fetchone())
        if loop.get("itemId")
        else None
    )
    loop["reminders"] = rows_to_dicts(
        conn.execute('SELECT * FROM "Reminder" WHERE loopId = ? ORDER BY remindAt ASC', (loop_id,)).fetchall()
    )
    return loop


@router.get("")
def list_loops() -> list[dict]:
    with db() as conn:
        user = get_default_user(conn)
        loops = rows_to_dicts(
            conn.execute(
                'SELECT * FROM "Loop" WHERE userId = ? ORDER BY status ASC, dueDate ASC',
                (user["id"],),
            ).fetchall()
        )
        for loop in loops:
            loop["item"] = (
                row_to_dict(conn.execute('SELECT * FROM "Item" WHERE id = ?', (loop["itemId"],)).fetchone())
                if loop.get("itemId")
                else None
            )
        return loops


@router.get("/{loop_id}")
def get_loop(loop_id: str) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        loop = row_to_dict(
            conn.execute('SELECT * FROM "Loop" WHERE id = ? AND userId = ?', (loop_id, user["id"])).fetchone()
        )
        if not loop:
            raise HTTPException(status_code=404, detail="Loop not found")
        return _loop_with_relations(conn, loop_id) or loop


@router.post("", status_code=201)
def create_loop(payload: LoopCreate) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        try:
            require_reminder_capacity(conn, user)
        except PlanLimitExceeded as exc:
            raise HTTPException(status_code=402, detail=exc.payload()) from exc
        now = now_iso()
        loop_id = make_id()
        due_date = normalize_iso(payload.dueDate)
        reminder_at = normalize_iso(payload.reminderAt)
        conn.execute(
            """INSERT INTO "Loop"
               (id, userId, itemId, title, description, sourceType, priority, status, dueDate, reminderAt, xpReward, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                loop_id,
                user["id"],
                payload.itemId,
                payload.title,
                payload.description,
                payload.sourceType,
                payload.priority,
                "OPEN",
                due_date,
                reminder_at,
                payload.xpReward,
                now,
                now,
            ),
        )
        if reminder_at:
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
                    payload.description or "Open loop reminder.",
                    reminder_at,
                    "ACTIVE",
                    now,
                    now,
                ),
            )
        return _loop_with_relations(conn, loop_id) or {}


@router.patch("/{loop_id}")
def patch_loop(loop_id: str, payload: LoopPatch) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        loop = row_to_dict(
            conn.execute('SELECT * FROM "Loop" WHERE id = ? AND userId = ?', (loop_id, user["id"])).fetchone()
        )
        if not loop:
            raise HTTPException(status_code=404, detail="Loop not found")

        updates = payload.model_dump(exclude_unset=True)
        for key in ["dueDate", "reminderAt"]:
            if key in updates:
                updates[key] = normalize_iso(updates[key])
        updates["updatedAt"] = now_iso()

        assignments = ", ".join(f'"{key}" = ?' for key in updates)
        conn.execute(f'UPDATE "Loop" SET {assignments} WHERE id = ?', [*updates.values(), loop_id])
        return _loop_with_relations(conn, loop_id) or {}


@router.post("/{loop_id}/complete")
def complete_loop(loop_id: str) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        loop = row_to_dict(
            conn.execute('SELECT * FROM "Loop" WHERE id = ? AND userId = ?', (loop_id, user["id"])).fetchone()
        )
        if not loop:
            raise HTTPException(status_code=404, detail="Loop not found")

        conn.execute('UPDATE "Loop" SET status = ?, updatedAt = ? WHERE id = ?', ("DONE", now_iso(), loop_id))
        updated_user = award_xp(
            conn,
            user_id=user["id"],
            loop_id=loop_id,
            item_id=loop.get("itemId"),
            action=f"complete_loop_{loop['priority'].lower()}",
            points=int(loop["xpReward"]),
        )
        return {
            "loop": _loop_with_relations(conn, loop_id),
            "user": updated_user,
            "message": f"Loop closed +{loop['xpReward']} XP",
        }


@router.post("/{loop_id}/snooze")
def snooze_loop(loop_id: str, payload: SnoozeRequest) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        loop = row_to_dict(
            conn.execute('SELECT * FROM "Loop" WHERE id = ? AND userId = ?', (loop_id, user["id"])).fetchone()
        )
        if not loop:
            raise HTTPException(status_code=404, detail="Loop not found")
        conn.execute(
            'UPDATE "Loop" SET status = ?, reminderAt = ?, updatedAt = ? WHERE id = ?',
            ("SNOOZED", normalize_iso(payload.reminderAt), now_iso(), loop_id),
        )
        return _loop_with_relations(conn, loop_id) or {}
