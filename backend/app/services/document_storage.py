from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.db import PROJECT_ROOT


UPLOAD_ROOT = Path(os.environ.get("AVARENO_UPLOAD_ROOT", str(PROJECT_ROOT / "uploads"))).expanduser()
DEFAULT_SIGNED_DOWNLOAD_TTL_SECONDS = 5 * 60
MAX_SIGNED_DOWNLOAD_TTL_SECONDS = 15 * 60


@dataclass(frozen=True)
class SignedDownloadTicket:
    token: str
    expires_at_epoch: int

    @property
    def expires_in_seconds(self) -> int:
        return max(0, self.expires_at_epoch - int(time.time()))

    @property
    def expires_at_iso(self) -> str:
        return datetime.fromtimestamp(self.expires_at_epoch, tz=timezone.utc).isoformat()


def signed_download_ttl_seconds() -> int:
    raw = os.environ.get("AVARENO_SIGNED_URL_TTL_SECONDS", str(DEFAULT_SIGNED_DOWNLOAD_TTL_SECONDS))
    try:
        value = int(raw)
    except ValueError:
        value = DEFAULT_SIGNED_DOWNLOAD_TTL_SECONDS
    return min(MAX_SIGNED_DOWNLOAD_TTL_SECONDS, max(60, value))


def create_signed_document_download_ticket(user_id: str, document_id: str, ttl_seconds: int | None = None) -> SignedDownloadTicket:
    ttl = ttl_seconds if ttl_seconds is not None else signed_download_ttl_seconds()
    now = int(time.time())
    payload = {
        "v": 1,
        "purpose": "document_download",
        "userId": user_id,
        "documentId": document_id,
        "iat": now,
        "exp": now + min(MAX_SIGNED_DOWNLOAD_TTL_SECONDS, max(60, int(ttl))),
        "nonce": secrets.token_urlsafe(16),
    }
    encoded_payload = _b64url(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8"))
    signature = _sign(encoded_payload)
    return SignedDownloadTicket(token=f"{encoded_payload}.{signature}", expires_at_epoch=int(payload["exp"]))


def verify_signed_document_download_ticket(token: str) -> dict[str, Any]:
    try:
        encoded_payload, supplied_signature = token.split(".", 1)
    except ValueError as exc:
        raise ValueError("Invalid signed download token") from exc

    expected_signature = _sign(encoded_payload)
    if not hmac.compare_digest(supplied_signature, expected_signature):
        raise ValueError("Invalid signed download token")

    try:
        payload = json.loads(_b64url_decode(encoded_payload).decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise ValueError("Invalid signed download token") from exc

    if payload.get("purpose") != "document_download" or payload.get("v") != 1:
        raise ValueError("Invalid signed download token")
    if int(payload.get("exp") or 0) < int(time.time()):
        raise TimeoutError("Signed download token expired")
    if not payload.get("userId") or not payload.get("documentId"):
        raise ValueError("Invalid signed download token")

    return payload


def safe_local_upload_path(file_path: str | None) -> Path | None:
    if not file_path or not file_path.startswith("/uploads/"):
        return None

    root = UPLOAD_ROOT.resolve()
    target = (root / file_path.removeprefix("/uploads/")).resolve()
    try:
        target.relative_to(root)
    except ValueError as exc:
        raise ValueError("Invalid document storage path") from exc
    return target


def _sign(encoded_payload: str) -> str:
    return _b64url(hmac.new(_signed_url_secret(), encoded_payload.encode("utf-8"), hashlib.sha256).digest())


def _signed_url_secret() -> bytes:
    configured = os.environ.get("AVARENO_SIGNED_URL_SECRET")
    if configured:
        return configured.encode("utf-8")

    if os.environ.get("AVARENO_ENV", os.environ.get("ENV", "")).lower() in {"production", "prod"}:
        raise RuntimeError("AVARENO_SIGNED_URL_SECRET is required in production")

    return hashlib.sha256(f"avareno-local-signed-download:{PROJECT_ROOT}".encode("utf-8")).digest()


def _b64url(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(f"{value}{padding}".encode("ascii"))
