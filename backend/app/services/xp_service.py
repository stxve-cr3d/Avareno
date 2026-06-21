from __future__ import annotations

import sqlite3

from app.utils import make_id, now_iso


def level_for_xp(xp: int) -> int:
    return (xp // 100) + 1


def award_xp(
    conn: sqlite3.Connection,
    *,
    user_id: str,
    points: int,
    action: str,
    loop_id: str | None = None,
    item_id: str | None = None,
) -> dict:
    user = conn.execute('SELECT * FROM "User" WHERE id = ?', (user_id,)).fetchone()
    if not user:
        raise ValueError("User not found")

    now = now_iso()
    next_xp = int(user["xp"]) + points
    conn.execute(
        'INSERT INTO "XpTransaction" (id, userId, loopId, itemId, action, points, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        (make_id(), user_id, loop_id, item_id, action, points, now),
    )
    conn.execute(
        'UPDATE "User" SET xp = ?, level = ?, updatedAt = ? WHERE id = ?',
        (next_xp, level_for_xp(next_xp), now, user_id),
    )
    return dict(conn.execute('SELECT * FROM "User" WHERE id = ?', (user_id,)).fetchone())
