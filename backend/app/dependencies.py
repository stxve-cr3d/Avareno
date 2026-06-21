from __future__ import annotations

import sqlite3

from app.db import row_to_dict
from app.utils import make_id, now_iso


def get_default_user(conn: sqlite3.Connection) -> dict:
    user = conn.execute('SELECT * FROM "User" LIMIT 1').fetchone()
    if user:
        return dict(user)

    now = now_iso()
    user_id = make_id()
    conn.execute(
        'INSERT INTO "User" (id, name, email, xp, level, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        (user_id, "Steve", "steve@example.com", 0, 1, now, now),
    )
    conn.commit()
    return row_to_dict(conn.execute('SELECT * FROM "User" WHERE id = ?', (user_id,)).fetchone()) or {}
