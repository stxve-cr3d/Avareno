from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter

from app.db import db, rows_to_dicts
from app.dependencies import get_default_user
from app.utils import parse_iso

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
        motivation = build_motivation_summary(user=user, transactions=transactions, week_ago=week_ago)

        return {
            "user": user,
            "transactions": transactions,
            "completedLoopsThisWeek": completed_this_week,
            "completionRate": round((done_loops / total_loops) * 100) if total_loops else 0,
            "motivation": motivation,
            "badges": [
                {"name": "First Receipt", "earned": "upload_receipt" in actions or "first_receipt" in actions},
                {"name": "First Closed Loop", "earned": any(action.startswith("complete_loop") for action in actions)},
                {"name": "Warranty Saver", "earned": "create_item_from_receipt" in actions},
                {"name": "Serial Hunter", "earned": "add_serial_number" in actions},
                {"name": "Boss Fight Done", "earned": "complete_loop_boss" in actions},
            ],
        }


def build_motivation_summary(*, user: dict, transactions: list[dict], week_ago: str) -> dict:
    recent_events = [format_xp_event(transaction) for transaction in transactions[:8]]
    has_real_events = bool(recent_events)
    weekly_xp = sum(
        int(transaction["points"])
        for transaction in transactions
        if str(transaction.get("createdAt", "")) >= week_ago
    )
    total_xp = int(user.get("xp") or 0)
    current_streak = current_streak_days(transactions)

    if not has_real_events:
        recent_events = [
            {"id": "mock-receipt", "label": "Rechnung für MacBook hinzugefügt", "points": 25, "createdAt": datetime.now(timezone.utc).isoformat()},
            {"id": "mock-warranty", "label": "Garantie für Sony Kopfhörer erkannt", "points": 15, "createdAt": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()},
            {"id": "mock-reminder", "label": "Offene Erinnerung abgeschlossen", "points": 20, "createdAt": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()},
            {"id": "mock-resolve", "label": "Hilfreiche Lösung in Resolve akzeptiert", "points": 50, "createdAt": (datetime.now(timezone.utc) - timedelta(days=3)).isoformat()},
        ]
        weekly_xp = 180
        total_xp = max(total_xp, 1240)
        current_streak = 6

    level_progress = total_xp % 100
    return {
        "motivationEnabled": True,
        "streakTrackingEnabled": True,
        "gentleNudgesEnabled": True,
        "currentStreakDays": current_streak,
        "longestStreakDays": max(current_streak, 14),
        "freezeDaysAvailable": 2,
        "weeklyXP": weekly_xp,
        "totalXP": total_xp,
        "levelName": level_name_for_xp(total_xp),
        "levelProgress": level_progress,
        "statusText": f"{current_streak} Tage gut gepflegt" if current_streak else "Kleiner Fortschritt zählt",
        "nudgeText": "Heute reicht schon eine kleine Aktion.",
        "pauseText": "Kein Stress — Avareno belohnt Fortschritt, nicht Perfektion.",
        "freezeState": {
            "active": current_streak > 0,
            "title": "Pausentag verfügbar",
            "body": "Pausentage schützen deine Serie, ohne daraus Druck zu machen.",
        },
        "recentXPEvents": recent_events,
        "xpRules": [
            {"action": "Produkt hinzufügen", "points": 30},
            {"action": "Rechnung scannen", "points": 25},
            {"action": "Garantie ergänzen", "points": 15},
            {"action": "Erinnerung abschließen", "points": 20},
            {"action": "Offenen Loop schließen", "points": 25},
            {"action": "Hilfreiche Resolve-Lösung", "points": 50},
            {"action": "Dokument zum Produkt hinzufügen", "points": 15},
        ],
    }


def current_streak_days(transactions: list[dict]) -> int:
    days = sorted(
        {parsed.date() for transaction in transactions if (parsed := parse_iso(transaction.get("createdAt")))},
        reverse=True,
    )
    if not days:
        return 0

    today = date.today()
    expected = today if days[0] == today else today - timedelta(days=1)
    streak = 0
    for day in days:
        if day == expected:
            streak += 1
            expected = expected - timedelta(days=1)
        elif day < expected:
            break
    return streak


def format_xp_event(transaction: dict) -> dict:
    return {
        "id": transaction["id"],
        "label": action_label(str(transaction["action"])),
        "points": int(transaction["points"]),
        "createdAt": transaction["createdAt"],
    }


def action_label(action: str) -> str:
    labels = {
        "upload_receipt": "Rechnung hinzugefügt",
        "create_item_from_receipt": "Produkt aus Rechnung erstellt",
        "add_serial_number": "Seriennummer ergänzt",
        "complete_item_profile": "Produktprofil vervollständigt",
        "add_repair_log": "Reparatur notiert",
        "create_message_reminder": "Erinnerung aus Nachricht erstellt",
    }
    if action in labels:
        return labels[action]
    if action.startswith("complete_loop"):
        return "Offenen Loop abgeschlossen"
    if action.startswith("capture_receipt"):
        return "Rechnung gescannt"
    if action.startswith("capture_item"):
        return "Produkt hinzugefügt"
    if action.startswith("capture_document"):
        return "Dokument gesichert"
    return action.replace("_", " ").capitalize()


def level_name_for_xp(xp: int) -> str:
    if xp >= 1800:
        return "Souverän"
    if xp >= 1000:
        return "Organisiert"
    if xp >= 400:
        return "Gut gepflegt"
    return "Im Aufbau"
