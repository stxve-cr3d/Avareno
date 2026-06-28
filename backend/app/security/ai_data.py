from __future__ import annotations

from dataclasses import dataclass, field

SENSITIVE_AI_KEYS = {
    "access_code",
    "access_token",
    "api_key",
    "authorization",
    "cookie",
    "password",
    "refresh_token",
    "secret",
    "token",
}


class AIDataHandlingError(ValueError):
    pass


@dataclass(frozen=True)
class AIProcessingIntent:
    purpose: str
    user_initiated: bool
    includes_vault_content: bool = False
    fields: list[str] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "purpose": self.purpose,
            "userInitiated": self.user_initiated,
            "includesVaultContent": self.includes_vault_content,
            "fields": list(self.fields),
            "aiAssisted": True,
            "requiresUserConfirmation": True,
        }


def assert_ai_payload_allowed(payload: dict, intent: AIProcessingIntent) -> None:
    if intent.includes_vault_content:
        raise AIDataHandlingError("Private Vault content must not be analyzed without a dedicated explicit opt-in flow")
    for key in _flatten_keys(payload):
        normalized = key.lower().replace("-", "_")
        if normalized in SENSITIVE_AI_KEYS or any(part in normalized for part in SENSITIVE_AI_KEYS):
            raise AIDataHandlingError("AI payload contains a key that looks like a token, secret, or credential")


def build_ai_result_metadata(*, source_document_id: str | None = None, user_confirmed: bool = False) -> dict:
    return {
        "aiAssisted": True,
        "sourceDocumentId": source_document_id,
        "userConfirmed": user_confirmed,
        "mustNotBeTreatedAsGuaranteed": True,
    }


def _flatten_keys(value: object, prefix: str = "") -> list[str]:
    if isinstance(value, dict):
        keys: list[str] = []
        for key, nested in value.items():
            current = f"{prefix}.{key}" if prefix else str(key)
            keys.append(current)
            keys.extend(_flatten_keys(nested, current))
        return keys
    if isinstance(value, list):
        keys: list[str] = []
        for index, nested in enumerate(value):
            keys.extend(_flatten_keys(nested, f"{prefix}[{index}]"))
        return keys
    return []

