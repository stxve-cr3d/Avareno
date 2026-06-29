from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal


SensitiveDocumentCategory = Literal[
    "identity",
    "insurance",
    "payment",
    "medical",
    "employment",
    "contracts",
    "legal",
    "highly_personal",
]

PRIVATE_VAULT_CATEGORIES: set[str] = {
    "identity",
    "insurance",
    "payment",
    "medical",
    "employment",
    "contracts",
    "legal",
    "highly_personal",
}

SECRET_FIELD_NAMES = {
    "access_code",
    "api_key",
    "authorization",
    "password",
    "secret",
    "serial_access_code",
    "token",
}


@dataclass(frozen=True)
class AIExtractionSource:
    source_type: Literal["document", "receipt", "message", "manual"]
    source_id: str | None
    file_name: str | None
    sensitive_category: SensitiveDocumentCategory | None = None


@dataclass(frozen=True)
class AIExtractionResult:
    source: AIExtractionSource
    extracted: dict[str, Any]
    ai_assisted: bool
    confidence: float
    user_confirmed_at: str | None = None
    corrected_by_user_at: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            **self.extracted,
            "source": {
                "sourceType": self.source.source_type,
                "sourceId": self.source.source_id,
                "fileName": self.source.file_name,
                "sensitiveCategory": self.source.sensitive_category,
            },
            "aiAssisted": self.ai_assisted,
            "confidence": self.confidence,
            "userConfirmedAt": self.user_confirmed_at,
            "correctedByUserAt": self.corrected_by_user_at,
        }


def is_private_vault_category(value: str | None) -> bool:
    return bool(value and value.strip().lower() in PRIVATE_VAULT_CATEGORIES)


def ensure_document_can_be_analyzed(document_type: str | None) -> None:
    if is_private_vault_category(document_type):
        raise ValueError("Private Vault documents are not analyzed automatically")


def sanitize_ai_input(payload: dict[str, Any]) -> dict[str, Any]:
    """Keep AI calls narrow: no secrets and no unrelated user records."""
    sanitized: dict[str, Any] = {}
    for key, value in payload.items():
        key_normalized = key.lower()
        if key_normalized in SECRET_FIELD_NAMES or any(secret in key_normalized for secret in SECRET_FIELD_NAMES):
            continue
        if isinstance(value, str):
            sanitized[key] = value[:8000]
        elif isinstance(value, (int, float, bool)) or value is None:
            sanitized[key] = value
    return sanitized


def build_ai_extraction_result(
    extracted: dict[str, Any],
    source: AIExtractionSource,
    *,
    ai_assisted: bool = True,
    confidence: float = 0.62,
) -> dict[str, Any]:
    return AIExtractionResult(
        source=source,
        extracted=extracted,
        ai_assisted=ai_assisted,
        confidence=max(0, min(1, confidence)),
    ).to_dict()
