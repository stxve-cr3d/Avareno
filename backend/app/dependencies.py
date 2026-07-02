from __future__ import annotations

import sqlite3

from fastapi import HTTPException

from app.auth import current_auth_claims
from app.db import row_to_dict
from app.utils import make_id, now_iso


def get_default_user(conn: sqlite3.Connection) -> dict:
    auth_user = _get_or_create_auth_user(conn)
    if auth_user:
        return auth_user

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


def require_authenticated_user(conn: sqlite3.Connection) -> dict:
    if not current_auth_claims():
        raise HTTPException(status_code=401, detail="Authentication required")
    user = _get_or_create_auth_user(conn)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


def _get_or_create_auth_user(conn: sqlite3.Connection) -> dict | None:
    claims = current_auth_claims()
    if not claims:
        return None

    auth_user_id = claims.get("sub")
    if not isinstance(auth_user_id, str) or not auth_user_id:
        return None

    existing = conn.execute('SELECT * FROM "User" WHERE id = ?', (auth_user_id,)).fetchone()
    if existing:
        return dict(existing)

    email = claims.get("email")
    local_email = _unique_local_email(conn, auth_user_id, email)
    metadata = claims.get("user_metadata") if isinstance(claims.get("user_metadata"), dict) else {}
    display_name = metadata.get("display_name") or metadata.get("full_name") or metadata.get("name")
    now = now_iso()
    try:
        conn.execute(
            'INSERT INTO "User" (id, name, email, xp, level, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
            (
                auth_user_id,
                display_name if isinstance(display_name, str) and display_name.strip() else _display_name_from_email(email),
                local_email,
                0,
                1,
                now,
                now,
            ),
        )
    except sqlite3.IntegrityError:
        existing = conn.execute('SELECT * FROM "User" WHERE id = ?', (auth_user_id,)).fetchone()
        if existing:
            return dict(existing)
        local_email = _unique_auth_alias(conn, auth_user_id)
        conn.execute(
            'INSERT INTO "User" (id, name, email, xp, level, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
            (
                auth_user_id,
                display_name if isinstance(display_name, str) and display_name.strip() else _display_name_from_email(email),
                local_email,
                0,
                1,
                now,
                now,
            ),
        )
    conn.commit()
    return row_to_dict(conn.execute('SELECT * FROM "User" WHERE id = ?', (auth_user_id,)).fetchone()) or None


def _unique_local_email(conn: sqlite3.Connection, auth_user_id: str, email: object) -> str:
    candidate = email.strip().lower() if isinstance(email, str) and email.strip() else ""
    if not candidate:
        return _unique_auth_alias(conn, auth_user_id)

    existing = conn.execute('SELECT id FROM "User" WHERE email = ? LIMIT 1', (candidate,)).fetchone()
    if not existing or existing["id"] == auth_user_id:
        return candidate

    # Keep auth-created users isolated from older local/mock rows with the same
    # email. Do not merge accounts by email without an explicit migration flow.
    return _unique_auth_alias(conn, auth_user_id)


def _unique_auth_alias(conn: sqlite3.Connection, auth_user_id: str) -> str:
    base = f"{auth_user_id}@auth.avareno.local"
    if not conn.execute('SELECT 1 FROM "User" WHERE email = ? LIMIT 1', (base,)).fetchone():
        return base

    suffix = 2
    while True:
        candidate = f"{auth_user_id}+{suffix}@auth.avareno.local"
        if not conn.execute('SELECT 1 FROM "User" WHERE email = ? LIMIT 1', (candidate,)).fetchone():
            return candidate
        suffix += 1


def _display_name_from_email(email: object) -> str:
    if not isinstance(email, str) or "@" not in email:
        return "Avareno Nutzer"
    local = email.split("@", 1)[0].replace(".", " ").replace("_", " ").replace("-", " ").strip()
    return local[:1].upper() + local[1:] if local else "Avareno Nutzer"
