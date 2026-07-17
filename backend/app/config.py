from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from fastapi import HTTPException

BACKEND_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_ROOT.parent


def env_bool(name: str, default: bool) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class BetaFeatureConfig:
    invite_only: bool
    receipt_extraction: bool
    document_processing: bool
    oauth: bool
    household_sharing: bool
    public_document_links: bool
    inline_document_preview: bool
    billing: bool
    document_uploads: bool


def beta_features() -> BetaFeatureConfig:
    """Return the server-authoritative invite-beta feature configuration.

    Defaults are intentionally the restricted beta posture. UI flags may hide
    controls, but backend routes must use this configuration as the real gate.
    """
    return BetaFeatureConfig(
        invite_only=env_bool("BETA_INVITE_ONLY", True),
        receipt_extraction=env_bool("ENABLE_RECEIPT_EXTRACTION", False),
        document_processing=env_bool("ENABLE_DOCUMENT_PROCESSING", False),
        oauth=env_bool("ENABLE_OAUTH", False),
        household_sharing=env_bool("ENABLE_HOUSEHOLD_SHARING", False),
        public_document_links=env_bool("ENABLE_PUBLIC_DOCUMENT_LINKS", False),
        inline_document_preview=env_bool("ENABLE_INLINE_DOCUMENT_PREVIEW", False),
        billing=env_bool("ENABLE_BILLING", False),
        document_uploads=env_bool("ENABLE_DOCUMENT_UPLOADS", True),
    )


def require_beta_feature(enabled: bool, *, detail: str = "Feature is disabled for the private beta") -> None:
    if not enabled:
        raise HTTPException(status_code=503, detail=detail)


def load_env_files() -> None:
    for path in (
        PROJECT_ROOT / ".env",
        PROJECT_ROOT / ".env.local",
        BACKEND_ROOT / ".env",
        BACKEND_ROOT / ".env.local",
    ):
        _load_env_file(path)


def _load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        if not key or key in os.environ:
            continue

        os.environ[key] = _clean_env_value(value)


def _clean_env_value(value: str) -> str:
    cleaned = value.strip()
    if len(cleaned) >= 2 and cleaned[0] == cleaned[-1] and cleaned[0] in {'"', "'"}:
        return cleaned[1:-1]
    return cleaned
