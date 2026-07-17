from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException

from app.db import db, row_to_dict, rows_to_dicts
from app.dependencies import get_default_user
from app.schemas import FriendCircleCreate, FriendCircleMemberAdd, FriendInviteAccept, MotivationPrivacyPatch
from app.utils import make_id, now_iso

router = APIRouter()

_DEFAULT_PREFS = {
    "motivationEnabled": True,
    "leaderboardEnabled": True,
    "hideXpFromFriends": False,
    "hideStreakFromFriends": True,
    "allowFriendInvites": True,
}

# Unambiguous alphabet (no O/0, I/1) so codes are easy to read out loud.
_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def _generate_code(conn) -> str:
    for _ in range(12):
        code = "AVARENO-" + "".join(secrets.choice(_CODE_ALPHABET) for _ in range(6))
        if not conn.execute('SELECT 1 FROM "FriendInviteCode" WHERE code = ?', (code,)).fetchone():
            return code
    return "AVARENO-" + make_id()[:8].upper()


def _get_or_create_invite(conn, user_id: str) -> dict:
    existing = row_to_dict(
        conn.execute(
            'SELECT * FROM "FriendInviteCode" WHERE userId = ? AND status = ? ORDER BY createdAt DESC LIMIT 1',
            (user_id, "ACTIVE"),
        ).fetchone()
    )
    if existing:
        return existing
    now = now_iso()
    invite_id = make_id()
    code = _generate_code(conn)
    conn.execute(
        'INSERT INTO "FriendInviteCode" (id, userId, code, status, createdAt, expiresAt) VALUES (?, ?, ?, ?, ?, ?)',
        (invite_id, user_id, code, "ACTIVE", now, None),
    )
    return row_to_dict(
        conn.execute(
            'SELECT * FROM "FriendInviteCode" WHERE id = ? AND userId = ?',
            (invite_id, user_id),
        ).fetchone()
    ) or {}


def _get_prefs(conn, user_id: str) -> dict:
    row = row_to_dict(conn.execute('SELECT * FROM "MotivationPrivacy" WHERE userId = ?', (user_id,)).fetchone())
    if not row:
        return dict(_DEFAULT_PREFS)
    return {key: bool(row[key]) for key in _DEFAULT_PREFS}


def _weekly_xp(conn, user_id: str) -> int:
    cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    row = conn.execute(
        'SELECT COALESCE(SUM(points), 0) AS total FROM "XpTransaction" WHERE userId = ? AND createdAt >= ?',
        (user_id, cutoff),
    ).fetchone()
    return int(row["total"] or 0)


def _current_streak(conn, user_id: str) -> int:
    # Distinct UTC days (YYYY-MM-DD) that have at least one XP transaction.
    rows = conn.execute(
        'SELECT DISTINCT substr(createdAt, 1, 10) AS day FROM "XpTransaction" WHERE userId = ? ORDER BY day DESC LIMIT 90',
        (user_id,),
    ).fetchall()
    active_days = {row["day"] for row in rows}
    if not active_days:
        return 0
    today = datetime.now(timezone.utc).date()
    # A streak is "alive" if there was activity today or yesterday.
    if today.isoformat() in active_days:
        cursor = today
    elif (today - timedelta(days=1)).isoformat() in active_days:
        cursor = today - timedelta(days=1)
    else:
        return 0
    streak = 0
    while cursor.isoformat() in active_days:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


def _self_progress(conn, user_id: str) -> dict:
    return {"weeklyXp": _weekly_xp(conn, user_id), "currentStreakDays": _current_streak(conn, user_id)}


def _friend_progress(conn, friend_user_id: str) -> dict:
    prefs = _get_prefs(conn, friend_user_id)
    sharing = prefs["motivationEnabled"] and prefs["leaderboardEnabled"]
    hides_xp = not sharing or prefs["hideXpFromFriends"]
    hides_streak = not sharing or prefs["hideStreakFromFriends"]
    return {
        "weeklyXp": None if hides_xp else _weekly_xp(conn, friend_user_id),
        "currentStreakDays": None if hides_streak else _current_streak(conn, friend_user_id),
        "hidesXp": hides_xp,
        "hidesStreak": hides_streak,
    }


def _invite_public(invite: dict) -> dict:
    return {
        "id": invite["id"],
        "inviteCode": invite["code"],
        "status": str(invite.get("status", "active")).lower(),
        "createdAt": invite["createdAt"],
        "expiresAt": invite.get("expiresAt"),
    }


def _friend_public(conn, friendship_row: dict) -> dict:
    friend_user = row_to_dict(
        conn.execute('SELECT * FROM "User" WHERE id = ?', (friendship_row["friendUserId"],)).fetchone()
    ) or {}
    status = friendship_row.get("status")
    return {
        "id": friendship_row["friendUserId"],
        "friendshipId": friendship_row["id"],
        "displayName": friend_user.get("name") or "Avareno Nutzer",
        "avatarUrl": friend_user.get("avatarUrl"),
        "status": status.lower() if isinstance(status, str) else "accepted",
        "addedAt": friendship_row["createdAt"],
        **_friend_progress(conn, friendship_row["friendUserId"]),
    }


@router.get("")
def list_friends() -> dict:
    with db() as conn:
        user = get_default_user(conn)
        rows = rows_to_dicts(
            conn.execute(
                'SELECT * FROM "Friendship" WHERE userId = ? ORDER BY createdAt DESC',
                (user["id"],),
            ).fetchall()
        )
        return {
            "friends": [_friend_public(conn, row) for row in rows],
            "invite": _invite_public(_get_or_create_invite(conn, user["id"])),
            "self": _self_progress(conn, user["id"]),
        }


@router.get("/invite")
def get_invite() -> dict:
    with db() as conn:
        user = get_default_user(conn)
        return _invite_public(_get_or_create_invite(conn, user["id"]))


@router.post("/invite/rotate")
def rotate_invite() -> dict:
    with db() as conn:
        user = get_default_user(conn)
        conn.execute(
            'UPDATE "FriendInviteCode" SET status = ? WHERE userId = ? AND status = ?',
            ("REVOKED", user["id"], "ACTIVE"),
        )
        return _invite_public(_get_or_create_invite(conn, user["id"]))


@router.post("/accept", status_code=201)
def accept_invite(payload: FriendInviteAccept) -> dict:
    code = payload.code.strip().upper()
    with db() as conn:
        user = get_default_user(conn)
        invite = row_to_dict(
            conn.execute(
                'SELECT * FROM "FriendInviteCode" WHERE code = ? AND status = ?',
                (code, "ACTIVE"),
            ).fetchone()
        )
        if not invite:
            raise HTTPException(status_code=404, detail="Dieser Einladungscode ist ungültig oder abgelaufen.")
        owner_id = invite["userId"]
        if owner_id == user["id"]:
            raise HTTPException(status_code=400, detail="Das ist dein eigener Code.")

        existing = row_to_dict(
            conn.execute(
                'SELECT * FROM "Friendship" WHERE userId = ? AND friendUserId = ?',
                (user["id"], owner_id),
            ).fetchone()
        )
        if existing:
            return {"friend": _friend_public(conn, existing), "alreadyConnected": True}

        now = now_iso()
        conn.execute(
            'INSERT INTO "Friendship" (id, userId, friendUserId, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
            (make_id(), user["id"], owner_id, "ACCEPTED", now, now),
        )
        conn.execute(
            'INSERT OR IGNORE INTO "Friendship" (id, userId, friendUserId, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
            (make_id(), owner_id, user["id"], "ACCEPTED", now, now),
        )
        new_row = row_to_dict(
            conn.execute(
                'SELECT * FROM "Friendship" WHERE userId = ? AND friendUserId = ?',
                (user["id"], owner_id),
            ).fetchone()
        )
        return {"friend": _friend_public(conn, new_row or {}), "alreadyConnected": False}


@router.get("/privacy")
def get_privacy() -> dict:
    with db() as conn:
        user = get_default_user(conn)
        return _get_prefs(conn, user["id"])


@router.patch("/privacy")
def patch_privacy(payload: MotivationPrivacyPatch) -> dict:
    updates = payload.model_dump(exclude_unset=True)
    with db() as conn:
        user = get_default_user(conn)
        current = _get_prefs(conn, user["id"])
        merged = {**current, **{k: bool(v) for k, v in updates.items() if v is not None}}
        conn.execute(
            """INSERT INTO "MotivationPrivacy"
               (userId, motivationEnabled, leaderboardEnabled, hideXpFromFriends, hideStreakFromFriends, allowFriendInvites, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(userId) DO UPDATE SET
                 motivationEnabled = excluded.motivationEnabled,
                 leaderboardEnabled = excluded.leaderboardEnabled,
                 hideXpFromFriends = excluded.hideXpFromFriends,
                 hideStreakFromFriends = excluded.hideStreakFromFriends,
                 allowFriendInvites = excluded.allowFriendInvites,
                 updatedAt = excluded.updatedAt""",
            (
                user["id"],
                int(merged["motivationEnabled"]),
                int(merged["leaderboardEnabled"]),
                int(merged["hideXpFromFriends"]),
                int(merged["hideStreakFromFriends"]),
                int(merged["allowFriendInvites"]),
                now_iso(),
            ),
        )
        return merged


def _is_friend(conn, user_id: str, other_id: str) -> bool:
    return bool(
        conn.execute(
            'SELECT 1 FROM "Friendship" WHERE userId = ? AND friendUserId = ?',
            (user_id, other_id),
        ).fetchone()
    )


def _owned_circle(conn, circle_id: str, user_id: str) -> dict:
    circle = row_to_dict(
        conn.execute('SELECT * FROM "FriendCircle" WHERE id = ? AND userId = ?', (circle_id, user_id)).fetchone()
    )
    if not circle:
        raise HTTPException(status_code=404, detail="Kreis nicht gefunden.")
    return circle


def _circle_public(conn, circle: dict) -> dict:
    members = rows_to_dicts(
        conn.execute(
            'SELECT * FROM "FriendCircleMember" WHERE circleId = ? ORDER BY createdAt ASC',
            (circle["id"],),
        ).fetchall()
    )
    member_out = []
    for member in members:
        friend_user = row_to_dict(conn.execute('SELECT * FROM "User" WHERE id = ?', (member["friendUserId"],)).fetchone()) or {}
        member_out.append(
            {
                "id": member["friendUserId"],
                "displayName": friend_user.get("name") or "Avareno Nutzer",
                "avatarUrl": friend_user.get("avatarUrl"),
            }
        )
    return {"id": circle["id"], "name": circle["name"], "createdAt": circle["createdAt"], "members": member_out}


@router.get("/circles")
def list_circles() -> dict:
    with db() as conn:
        user = get_default_user(conn)
        circles = rows_to_dicts(
            conn.execute('SELECT * FROM "FriendCircle" WHERE userId = ? ORDER BY createdAt ASC', (user["id"],)).fetchall()
        )
        return {"circles": [_circle_public(conn, circle) for circle in circles]}


@router.post("/circles", status_code=201)
def create_circle(payload: FriendCircleCreate) -> dict:
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name darf nicht leer sein.")
    with db() as conn:
        user = get_default_user(conn)
        now = now_iso()
        circle_id = make_id()
        conn.execute(
            'INSERT INTO "FriendCircle" (id, userId, name, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
            (circle_id, user["id"], name, now, now),
        )
        return _circle_public(conn, _owned_circle(conn, circle_id, user["id"]))


@router.delete("/circles/{circle_id}")
def delete_circle(circle_id: str) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        _owned_circle(conn, circle_id, user["id"])
        conn.execute('DELETE FROM "FriendCircle" WHERE id = ? AND userId = ?', (circle_id, user["id"]))
        return {"removed": True}


@router.post("/circles/{circle_id}/members", status_code=201)
def add_circle_member(circle_id: str, payload: FriendCircleMemberAdd) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        _owned_circle(conn, circle_id, user["id"])
        if not _is_friend(conn, user["id"], payload.friendUserId):
            raise HTTPException(status_code=400, detail="Nur verbundene Freunde können in einen Kreis.")
        conn.execute(
            'INSERT OR IGNORE INTO "FriendCircleMember" (id, circleId, friendUserId, createdAt) VALUES (?, ?, ?, ?)',
            (make_id(), circle_id, payload.friendUserId, now_iso()),
        )
        conn.execute(
            'UPDATE "FriendCircle" SET updatedAt = ? WHERE id = ? AND userId = ?',
            (now_iso(), circle_id, user["id"]),
        )
        return _circle_public(conn, _owned_circle(conn, circle_id, user["id"]))


@router.delete("/circles/{circle_id}/members/{friend_user_id}")
def remove_circle_member(circle_id: str, friend_user_id: str) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        _owned_circle(conn, circle_id, user["id"])
        conn.execute(
            'DELETE FROM "FriendCircleMember" WHERE circleId = ? AND friendUserId = ?',
            (circle_id, friend_user_id),
        )
        return _circle_public(conn, _owned_circle(conn, circle_id, user["id"]))


@router.delete("/{friend_user_id}")
def remove_friend(friend_user_id: str) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        conn.execute(
            'DELETE FROM "Friendship" WHERE userId = ? AND friendUserId = ?',
            (user["id"], friend_user_id),
        )
        conn.execute(
            'DELETE FROM "Friendship" WHERE userId = ? AND friendUserId = ?',
            (friend_user_id, user["id"]),
        )
        # Also drop this person from any of my circles.
        conn.execute(
            'DELETE FROM "FriendCircleMember" WHERE friendUserId = ? AND circleId IN (SELECT id FROM "FriendCircle" WHERE userId = ?)',
            (friend_user_id, user["id"]),
        )
        return {"removed": True}
