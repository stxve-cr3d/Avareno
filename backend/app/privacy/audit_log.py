from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

SENSITIVE_AUDIT_KEYS = {
    "access_token",
    "api_key",
    "authorization",
    "content",
    "document_text",
    "email_body",
    "file",
    "password",
    "payload",
    "prompt",
    "raw",
    "raw_json",
    "refresh_token",
    "secret",
    "token",
}


@dataclass(frozen=True)
class SafeAuditEvent:
    action: str
    actor_user_id: str | None = None
    subject_user_id: str | None = None
    status: str = "planned"
    provider: str | None = None
    safe_context: dict[str, str | int | bool | None] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def as_dict(self) -> dict[str, Any]:
        return {
            "action": self.action,
            "actorUserId": self.actor_user_id,
            "subjectUserId": self.subject_user_id,
            "status": self.status,
            "provider": self.provider,
            "safeContext": dict(self.safe_context),
            "createdAt": self.created_at,
        }


def build_safe_audit_event(
    *,
    action: str,
    actor_user_id: str | None = None,
    subject_user_id: str | None = None,
    status: str = "planned",
    provider: str | None = None,
    context: dict[str, Any] | None = None,
) -> SafeAuditEvent:
    return SafeAuditEvent(
        action=action,
        actor_user_id=actor_user_id,
        subject_user_id=subject_user_id,
        status=status,
        provider=provider,
        safe_context=_safe_context(context or {}),
    )


def _safe_context(context: dict[str, Any]) -> dict[str, str | int | bool | None]:
    safe: dict[str, str | int | bool | None] = {}
    for key, value in context.items():
        normalized_key = key.lower().replace("-", "_")
        if normalized_key in SENSITIVE_AUDIT_KEYS or any(part in normalized_key for part in SENSITIVE_AUDIT_KEYS):
            safe[key] = "[redacted]"
            continue
        if isinstance(value, (str, int, bool)) or value is None:
            safe[key] = value
        else:
            safe[key] = f"[{type(value).__name__}]"
    return safe

