"""/api/me/activity: honest per-user aggregation of meaningful actions.

Verifies that the activity view is derived only from existing user-owned
records, that streaks are computed from real day sets, and that two verified
users never see each other's activity.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import jwt

from app.db import db
from app.utils import make_id, now_iso


def _token(secret: str, user_id: str, email: str) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {
            "sub": user_id,
            "email": email,
            "aud": "authenticated",
            "iat": now,
            "exp": now + timedelta(minutes=10),
        },
        secret,
        algorithm="HS256",
    )


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _iso_days_ago(days: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()


def _insert_item(conn, user_id: str, created_at: str) -> str:
    item_id = make_id()
    conn.execute(
        'INSERT INTO "Item" (id, userId, name, itemType, category, currency, visibility, completenessScore, status, createdAt, updatedAt) '
        "VALUES (?, ?, ?, 'THING', 'Test', 'EUR', 'PRIVATE', 0, 'ACTIVE', ?, ?)",
        (item_id, user_id, "Aktivitätsprodukt", created_at, created_at),
    )
    return item_id


def _insert_document(conn, user_id: str, item_id: str, created_at: str) -> None:
    conn.execute(
        'INSERT INTO "Document" (id, userId, itemId, type, fileName, filePath, mimeType, createdAt, updatedAt) '
        "VALUES (?, ?, ?, 'RECEIPT', 'beleg.pdf', '/uploads/beleg.pdf', 'application/pdf', ?, ?)",
        (make_id(), user_id, item_id, created_at, created_at),
    )


def _insert_done_loop(conn, user_id: str, updated_at: str) -> None:
    conn.execute(
        'INSERT INTO "Loop" (id, userId, title, sourceType, priority, status, xpReward, createdAt, updatedAt) '
        "VALUES (?, ?, 'Erinnerung', 'MANUAL', 'MEDIUM', 'DONE', 25, ?, ?)",
        (make_id(), user_id, updated_at, updated_at),
    )


def test_activity_requires_auth_and_is_user_scoped(client, monkeypatch):
    secret = "local-activity-regression-secret"
    monkeypatch.setenv("AVARENO_REQUIRE_AUTH", "1")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", secret)

    user_a = "00000000-0000-4000-8000-0000000000aa"
    user_b = "00000000-0000-4000-8000-0000000000ab"
    headers_a = _headers(_token(secret, user_a, "activity-a@test.local"))
    headers_b = _headers(_token(secret, user_b, "activity-b@test.local"))

    assert client.get("/api/me/activity").status_code == 401

    # Boot both users through an authenticated call, then seed real records.
    assert client.get("/api/me", headers=headers_a).status_code == 200
    assert client.get("/api/me", headers=headers_b).status_code == 200

    with db() as conn:
        # User.id equals the verified JWT subject (see dependencies.py).
        internal_a = user_a
        internal_b = user_b
        item_id = _insert_item(conn, internal_a, _iso_days_ago(1))
        _insert_document(conn, internal_a, item_id, _iso_days_ago(1))
        _insert_done_loop(conn, internal_a, _iso_days_ago(0))
        _insert_item(conn, internal_b, _iso_days_ago(2))

    result_a = client.get("/api/me/activity?days=30", headers=headers_a)
    assert result_a.status_code == 200
    payload_a = result_a.json()

    assert payload_a["rangeDays"] == 30
    assert payload_a["totalActions"] == 3
    assert payload_a["byType"]["productsCreated"] == 1
    assert payload_a["byType"]["documentsSaved"] == 1
    assert payload_a["byType"]["remindersCompleted"] == 1
    assert payload_a["activeDays"] == 2
    # Yesterday + today are both active: real 2-day streak, no invented numbers.
    assert payload_a["currentStreakDays"] == 2
    assert payload_a["longestStreakDays"] == 2
    assert all(entry["count"] >= 1 for entry in payload_a["days"])
    # Per-day type buckets must explain each cell and sum up to its count.
    for entry in payload_a["days"]:
        assert sum(entry["types"].values()) == entry["count"]
    yesterday = next(entry for entry in payload_a["days"] if entry["date"] == _iso_days_ago(1)[:10])
    assert yesterday["types"] == {"productsCreated": 1, "documentsSaved": 1}
    today = next(entry for entry in payload_a["days"] if entry["date"] == _iso_days_ago(0)[:10])
    assert today["types"] == {"remindersCompleted": 1}

    payload_b = client.get("/api/me/activity?days=30", headers=headers_b).json()
    assert payload_b["totalActions"] == 1
    assert payload_b["byType"]["productsCreated"] == 1
    assert payload_b["byType"]["documentsSaved"] == 0
    # Two days ago without today/yesterday means no alive streak.
    assert payload_b["currentStreakDays"] == 0
    assert payload_b["longestStreakDays"] == 1


def test_activity_window_filters_but_streak_uses_history(client, monkeypatch):
    secret = "local-activity-window-secret"
    monkeypatch.setenv("AVARENO_REQUIRE_AUTH", "1")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", secret)

    user_c = "00000000-0000-4000-8000-0000000000ac"
    headers_c = _headers(_token(secret, user_c, "activity-c@test.local"))
    assert client.get("/api/me", headers=headers_c).status_code == 200

    with db() as conn:
        internal_c = user_c
        _insert_item(conn, internal_c, _iso_days_ago(400))
        _insert_item(conn, internal_c, _iso_days_ago(0))

    payload = client.get("/api/me/activity?days=30", headers=headers_c).json()
    assert payload["totalActions"] == 1  # old item outside the window
    assert payload["activeDays"] == 1
    assert payload["currentStreakDays"] == 1
    assert payload["longestStreakDays"] == 1
