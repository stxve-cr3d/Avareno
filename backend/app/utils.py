from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4


def make_id() -> str:
    return uuid4().hex


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def normalize_iso(value: str | None) -> str | None:
    parsed = parse_iso(value)
    return parsed.isoformat() if parsed else None
