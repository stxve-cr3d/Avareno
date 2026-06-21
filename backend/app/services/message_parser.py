from __future__ import annotations

from datetime import datetime, timedelta, timezone


def _next_weekday(day: int) -> datetime:
    now = datetime.now(timezone.utc)
    delta = (day - now.weekday() + 7) % 7 or 7
    return (now + timedelta(days=delta)).replace(hour=18, minute=0, second=0, microsecond=0)


def _day_before_at_nine(value: datetime) -> datetime:
    return (value - timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)


def parse_message_reminder(text: str, contact_name: str | None = None) -> dict:
    raw = text.lower()
    contact = contact_name.strip() if contact_name else "Kontakt"
    mentions_friday = any(word in raw for word in ["freitag", "freida", "friday"])
    due_date = _next_weekday(4 if mentions_friday else 0)
    reminder_at = _day_before_at_nine(due_date)

    return {
        "title": f"{contact} wegen {'Freitag' if mentions_friday else 'der Nachricht'} erinnern",
        "description": "Message reminder created from pasted text.",
        "dueDate": due_date.isoformat(),
        "reminderAt": reminder_at.isoformat(),
        "priority": "MEDIUM",
        "xpReward": 25,
        "intent": "answer",
    }
