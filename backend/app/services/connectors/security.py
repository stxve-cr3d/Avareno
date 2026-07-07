from __future__ import annotations

import base64
import hashlib
import ipaddress
import os
import socket
from dataclasses import dataclass
from enum import Enum
from typing import Any
from urllib.parse import urlparse

from cryptography.fernet import Fernet, InvalidToken

from app.utils import now_iso

# Versioned prefix on every ciphertext we write, so future key-rotation or
# algorithm changes can tell old and new formats apart at read time.
_SECRET_ENVELOPE_PREFIX = "enc:v1:"


class ConnectorSecurityError(ValueError):
    pass


class ConnectorPermission(str, Enum):
    READ_PROFILE = "read:profile"
    READ_ITEMS = "read:items"
    READ_DOCUMENT_METADATA = "read:document_metadata"
    READ_DEVICE_IDENTITY = "read:device_identity"
    READ_STATUS = "read:status"


class ConnectorSyncStatus(str, Enum):
    SUCCESS = "SUCCESS"
    PARTIAL = "PARTIAL"
    FAILED = "FAILED"
    BLOCKED = "BLOCKED"


READ_ONLY_DEFAULT_SCOPES = [
    ConnectorPermission.READ_PROFILE,
    ConnectorPermission.READ_DEVICE_IDENTITY,
    ConnectorPermission.READ_STATUS,
]

METADATA_HOSTS = {
    "169.254.169.254",
    "169.254.170.2",
    "100.100.100.200",
}
METADATA_NAMES = {
    "metadata.google.internal",
    "metadata",
}
SAFE_PROTOCOLS = {"http", "https"}
SENSITIVE_KEYS = {
    "access_code",
    "apikey",
    "api_key",
    "authorization",
    "bearer",
    "client_secret",
    "password",
    "refresh_token",
    "secret",
    "token",
}


@dataclass(frozen=True)
class ConnectorDefinition:
    id: str
    connector_type: str
    scopes: list[ConnectorPermission]
    read_only: bool
    user_visible_permission_note: str


def validate_connector_url(raw_url: str, allowed_hosts: set[str] | None = None) -> str:
    value = raw_url.strip()
    if not value:
        raise ConnectorSecurityError("Connector URL is empty")

    parsed = urlparse(value)
    if parsed.scheme.lower() not in SAFE_PROTOCOLS:
        raise ConnectorSecurityError("Only http and https connector URLs are allowed")
    if not parsed.hostname:
        raise ConnectorSecurityError("Connector URL is missing a host")
    if parsed.username or parsed.password:
        raise ConnectorSecurityError("Connector URLs must not include credentials")

    hostname = parsed.hostname.rstrip(".").lower()
    if allowed_hosts is not None and hostname not in allowed_hosts:
        raise ConnectorSecurityError("Connector host is not allowlisted")
    if hostname in {"localhost", "localhost.localdomain", *METADATA_NAMES} or hostname.endswith(".localhost"):
        raise ConnectorSecurityError("Localhost and metadata hosts are not allowed")

    for address in _resolve_all_addresses(hostname):
        _reject_unsafe_address(address)

    return value


def mask_secret(value: str | None) -> str:
    if not value:
        return ""
    if len(value) <= 8:
        return "••••"
    return f"{value[:4]}••••{value[-4:]}"


def require_connector_secret_backend() -> str:
    key = os.environ.get("AVARENO_CONNECTOR_SECRET_KEY", "").strip()
    if not key:
        raise ConnectorSecurityError("AVARENO_CONNECTOR_SECRET_KEY is required before storing connector secrets")
    return key


def _fernet_from_env() -> Fernet | None:
    """Derive a Fernet key from AVARENO_CONNECTOR_SECRET_KEY (any-length string).

    Fernet requires a 32-byte urlsafe-base64 key; operators should be able to set
    any passphrase in the env var, so we stretch it with SHA-256 rather than
    forcing them to pre-generate a Fernet-formatted key. Returns None if the env
    var is unset - callers must then refuse to persist the secret in plaintext
    rather than falling back to storing it unencrypted.
    """
    raw = os.environ.get("AVARENO_CONNECTOR_SECRET_KEY", "").strip()
    if not raw:
        return None
    derived = hashlib.sha256(raw.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(derived))


def encrypt_secret(plaintext: str) -> str | None:
    """Encrypt a secret for storage. Returns None (never plaintext) if no key is configured."""
    if not plaintext.strip():
        return None
    fernet = _fernet_from_env()
    if fernet is None:
        return None
    token = fernet.encrypt(plaintext.encode("utf-8")).decode("ascii")
    return f"{_SECRET_ENVELOPE_PREFIX}{token}"


def decrypt_secret(stored: str | None) -> str | None:
    """Decrypt a secret written by encrypt_secret.

    Values without the envelope prefix are treated as legacy plaintext (written
    before this module encrypted anything) and returned as-is so existing local
    devices are not force-disconnected by this change; the next successful
    write re-encrypts them. Decryption failures (wrong/rotated key, corrupt
    value) return None rather than raising, so callers fall back to
    re-pairing instead of crashing.
    """
    if not stored:
        return None
    if not stored.startswith(_SECRET_ENVELOPE_PREFIX):
        return stored
    fernet = _fernet_from_env()
    if fernet is None:
        return None
    ciphertext = stored[len(_SECRET_ENVELOPE_PREFIX):]
    try:
        return fernet.decrypt(ciphertext.encode("ascii")).decode("utf-8")
    except (InvalidToken, ValueError):
        return None


def prepare_connector_secret_for_storage(secret: str) -> dict[str, str]:
    """Encrypt a connector secret for the (future) shared connector-secrets store.

    Raises if no encryption key is configured or the secret is empty - callers
    must never fall back to plaintext storage.
    """
    require_connector_secret_backend()
    if not secret.strip():
        raise ConnectorSecurityError("Connector secret is empty")
    encrypted = encrypt_secret(secret)
    if encrypted is None:
        raise ConnectorSecurityError("Connector secret could not be encrypted")
    return {"ciphertext": encrypted, "createdAt": now_iso()}


def redact_connector_payload(payload: Any) -> Any:
    if isinstance(payload, dict):
        redacted: dict[str, Any] = {}
        for key, value in payload.items():
            if key.lower() in SENSITIVE_KEYS or any(term in key.lower() for term in SENSITIVE_KEYS):
                redacted[key] = "[redacted]"
            else:
                redacted[key] = redact_connector_payload(value)
        return redacted
    if isinstance(payload, list):
        return [redact_connector_payload(entry) for entry in payload]
    return payload


def build_safe_sync_log(
    connector_id: str,
    status: ConnectorSyncStatus,
    safe_message: str,
    counts: dict[str, int] | None = None,
) -> dict[str, Any]:
    return {
        "connectorId": connector_id,
        "timestamp": now_iso(),
        "status": status.value,
        "message": _safe_log_message(safe_message),
        "counts": counts or {},
    }


def default_connector_definition(connector_id: str, connector_type: str) -> ConnectorDefinition:
    return ConnectorDefinition(
        id=connector_id,
        connector_type=connector_type,
        scopes=READ_ONLY_DEFAULT_SCOPES,
        read_only=True,
        user_visible_permission_note="Avareno startet mit read-only Zugriff und zeigt vor jeder Erweiterung klar, welche Daten gelesen werden.",
    )


def _resolve_all_addresses(hostname: str) -> list[ipaddress._BaseAddress]:
    try:
        direct = ipaddress.ip_address(hostname)
        return [direct]
    except ValueError:
        pass

    try:
        addrinfo = socket.getaddrinfo(hostname, None, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise ConnectorSecurityError("Connector host could not be resolved") from exc

    addresses = []
    for family, _socktype, _proto, _canonname, sockaddr in addrinfo:
        if family in {socket.AF_INET, socket.AF_INET6}:
            addresses.append(ipaddress.ip_address(sockaddr[0]))
    if not addresses:
        raise ConnectorSecurityError("Connector host has no usable IP address")
    return addresses


def _reject_unsafe_address(address: ipaddress._BaseAddress) -> None:
    text = str(address)
    if text in METADATA_HOSTS:
        raise ConnectorSecurityError("Cloud metadata endpoints are not allowed")
    if (
        address.is_loopback
        or address.is_private
        or address.is_link_local
        or address.is_multicast
        or address.is_reserved
        or address.is_unspecified
    ):
        raise ConnectorSecurityError("Connector URL resolves to an unsafe network address")


def _safe_log_message(message: str) -> str:
    safe = str(redact_connector_payload({"message": message})["message"])
    for term in SENSITIVE_KEYS:
        safe = safe.replace(term, "[redacted]")
        safe = safe.replace(term.upper(), "[redacted]")
        safe = safe.replace(term.title(), "[redacted]")
    return safe[:220]
