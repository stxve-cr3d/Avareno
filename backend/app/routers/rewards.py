from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter

from app.db import db, rows_to_dicts
from app.dependencies import get_default_user

router = APIRouter()


@router.get("")
def rewards() -> dict:
    with db() as conn:
        user = get_default_user(conn)
        week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        transactions = rows_to_dicts(
            conn.execute(
                'SELECT * FROM "XpTransaction" WHERE userId = ? ORDER BY createdAt DESC',
                (user["id"],),
            ).fetchall()
        )
        completed_this_week = conn.execute(
            'SELECT COUNT(*) AS count FROM "Loop" WHERE userId = ? AND status = ? AND updatedAt >= ?',
            (user["id"], "DONE", week_ago),
        ).fetchone()["count"]
        total_loops = conn.execute('SELECT COUNT(*) AS count FROM "Loop" WHERE userId = ?', (user["id"],)).fetchone()["count"]
        done_loops = conn.execute(
            'SELECT COUNT(*) AS count FROM "Loop" WHERE userId = ? AND status = ?',
            (user["id"], "DONE"),
        ).fetchone()["count"]
        actions = {transaction["action"] for transaction in transactions}

        return {
            "user": user,
            "transactions": transactions,
            "completedLoopsThisWeek": completed_this_week,
            "completionRate": round((done_loops / total_loops) * 100) if total_loops else 0,
            "badges": [
                {"name": "First Receipt", "earned": "upload_receipt" in actions or "first_receipt" in actions},
                {"name": "First Closed Loop", "earned": any(action.startswith("complete_loop") for action in actions)},
                {"name": "Warranty Saver", "earned": "create_item_from_receipt" in actions},
                {"name": "Serial Hunter", "earned": "add_serial_number" in actions},
                {"name": "Boss Fight Done", "earned": "complete_loop_boss" in actions},
            ],
        }
