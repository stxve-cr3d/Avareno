"""Private Vault: PIN-protected area for sensitive documents.

Security model:
- Per-user PIN, stored as PBKDF2-HMAC-SHA256 (random salt, 200k iterations).
- Unlocking with the correct PIN issues a short-lived HMAC ticket
  (same signing infrastructure as signed document downloads).
- Every vault content operation requires a valid ticket - possession of a
  normal session alone never exposes vault contents.
- Brute force: 5 failed attempts lock the PIN check for 15 minutes.
- Vault documents are excluded from normal document lists and from
  automatic AI analysis (see ai_data_handling / routers filtering).
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import sqlite3
import time
from typing import Any

from app.db import row_to_dict, rows_to_dicts
from app.services.document_storage import _sign, _b64url, _b64url_decode  # shared HMAC secret + encoding
from app.utils import make_id, now_iso

PIN_ITERATIONS = 200_000
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_SECONDS = 15 * 60
UNLOCK_TICKET_TTL_SECONDS = 10 * 60
_TICKET_PURPOSE = "vault_unlock"


class VaultError(ValueError):
    pass


class VaultLockedError(VaultError):
    pass


class VaultTicketError(VaultError):
    pass


# ---------- PIN ----------

def _hash_pin(pin: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", pin.encode("utf-8"), salt, PIN_ITERATIONS)


def _encode_pin_hash(pin: str) -> str:
    salt = secrets.token_bytes(16)
    digest = _hash_pin(pin, salt)
    return f"pbkdf2:{PIN_ITERATIONS}:{base64.b64encode(salt).decode()}:{base64.b64encode(digest).decode()}"


def _verify_pin_hash(pin: str, stored: str) -> bool:
    try:
        scheme, iterations, salt_b64, digest_b64 = stored.split(":")
        if scheme != "pbkdf2":
            return False
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(digest_b64)
        actual = hashlib.pbkdf2_hmac("sha256", pin.encode("utf-8"), salt, int(iterations))
        return hmac.compare_digest(expected, actual)
    except (ValueError, TypeError):
        return False


def _validate_pin_format(pin: str) -> str:
    cleaned = pin.strip()
    if not cleaned.isdigit() or not 4 <= len(cleaned) <= 8:
        raise VaultError("PIN muss aus 4 bis 8 Ziffern bestehen.")
    return cleaned


def pin_status(conn: sqlite3.Connection, user_id: str) -> dict[str, Any]:
    row = row_to_dict(conn.execute('SELECT * FROM "VaultSecurity" WHERE userId = ?', (user_id,)).fetchone())
    locked_until = row.get("lockedUntil") if row else None
    return {
        "pinSet": bool(row),
        "locked": bool(locked_until and locked_until > now_iso()),
        "lockedUntil": locked_until if locked_until and locked_until > now_iso() else None,
    }


def set_pin(conn: sqlite3.Connection, user_id: str, pin: str, current_pin: str | None = None) -> None:
    cleaned = _validate_pin_format(pin)
    row = row_to_dict(conn.execute('SELECT * FROM "VaultSecurity" WHERE userId = ?', (user_id,)).fetchone())
    now = now_iso()
    if row:
        # Changing an existing PIN requires the current PIN.
        if not current_pin or not _verify_pin_hash(current_pin.strip(), row["pinHash"]):
            raise VaultError("Aktuelle PIN ist erforderlich, um die PIN zu ändern.")
        conn.execute(
            'UPDATE "VaultSecurity" SET pinHash = ?, failedAttempts = 0, lockedUntil = NULL, updatedAt = ? WHERE userId = ?',
            (_encode_pin_hash(cleaned), now, user_id),
        )
    else:
        conn.execute(
            'INSERT INTO "VaultSecurity" (userId, pinHash, failedAttempts, lockedUntil, createdAt, updatedAt) VALUES (?, ?, 0, NULL, ?, ?)',
            (user_id, _encode_pin_hash(cleaned), now, now),
        )


def unlock(conn: sqlite3.Connection, user_id: str, pin: str) -> dict[str, Any]:
    row = row_to_dict(conn.execute('SELECT * FROM "VaultSecurity" WHERE userId = ?', (user_id,)).fetchone())
    if not row:
        raise VaultError("Es ist noch keine Vault-PIN gesetzt.")
    now = now_iso()
    if row.get("lockedUntil") and row["lockedUntil"] > now:
        raise VaultLockedError("Zu viele Fehlversuche. Vault ist vorübergehend gesperrt.")

    if not _verify_pin_hash(pin.strip(), row["pinHash"]):
        attempts = int(row.get("failedAttempts") or 0) + 1
        locked_until = None
        if attempts >= MAX_FAILED_ATTEMPTS:
            from datetime import datetime, timedelta, timezone

            locked_until = (datetime.now(timezone.utc) + timedelta(seconds=LOCKOUT_SECONDS)).isoformat()
            attempts = 0
        conn.execute(
            'UPDATE "VaultSecurity" SET failedAttempts = ?, lockedUntil = ?, updatedAt = ? WHERE userId = ?',
            (attempts, locked_until, now, user_id),
        )
        if locked_until:
            raise VaultLockedError("Zu viele Fehlversuche. Vault ist für 15 Minuten gesperrt.")
        raise VaultError("PIN ist falsch.")

    conn.execute(
        'UPDATE "VaultSecurity" SET failedAttempts = 0, lockedUntil = NULL, updatedAt = ? WHERE userId = ?',
        (now, user_id),
    )
    expires = int(time.time()) + UNLOCK_TICKET_TTL_SECONDS
    payload = {
        "v": 1,
        "purpose": _TICKET_PURPOSE,
        "userId": user_id,
        "iat": int(time.time()),
        "exp": expires,
        "nonce": secrets.token_urlsafe(12),
    }
    encoded = _b64url(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8"))
    return {"ticket": f"{encoded}.{_sign(encoded)}", "expiresInSeconds": UNLOCK_TICKET_TTL_SECONDS}


def require_ticket(user_id: str, ticket: str | None) -> None:
    if not ticket:
        raise VaultTicketError("Vault ist gesperrt. Bitte mit PIN entsperren.")
    try:
        encoded, supplied_sig = ticket.split(".", 1)
    except ValueError as exc:
        raise VaultTicketError("Ungültiges Vault-Ticket.") from exc
    if not hmac.compare_digest(supplied_sig, _sign(encoded)):
        raise VaultTicketError("Ungültiges Vault-Ticket.")
    try:
        payload = json.loads(_b64url_decode(encoded).decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise VaultTicketError("Ungültiges Vault-Ticket.") from exc
    if payload.get("purpose") != _TICKET_PURPOSE or payload.get("v") != 1:
        raise VaultTicketError("Ungültiges Vault-Ticket.")
    if payload.get("userId") != user_id:
        raise VaultTicketError("Ungültiges Vault-Ticket.")
    if int(payload.get("exp") or 0) < int(time.time()):
        raise VaultTicketError("Vault-Sitzung abgelaufen. Bitte erneut entsperren.")


# ---------- Vault CRUD ----------

def list_vaults(conn: sqlite3.Connection, user_id: str) -> list[dict[str, Any]]:
    vaults = rows_to_dicts(
        conn.execute('SELECT * FROM "Vault" WHERE userId = ? ORDER BY createdAt ASC', (user_id,)).fetchall()
    )
    for vault in vaults:
        count = conn.execute(
            'SELECT COUNT(*) AS n FROM "Document" WHERE vaultId = ? AND userId = ?',
            (vault["id"], user_id),
        ).fetchone()
        vault["documentCount"] = int(count["n"]) if count else 0
    return vaults


def create_vault(conn: sqlite3.Connection, user_id: str, name: str) -> dict[str, Any]:
    cleaned = name.strip()
    if not cleaned:
        raise VaultError("Vault braucht einen Namen.")
    now = now_iso()
    vault_id = make_id()
    conn.execute(
        'INSERT INTO "Vault" (id, userId, name, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
        (vault_id, user_id, cleaned, now, now),
    )
    return row_to_dict(
        conn.execute(
            'SELECT * FROM "Vault" WHERE id = ? AND userId = ?',
            (vault_id, user_id),
        ).fetchone()
    ) or {}


def rename_vault(conn: sqlite3.Connection, user_id: str, vault_id: str, name: str) -> dict[str, Any]:
    vault = _vault_for_user(conn, user_id, vault_id)
    cleaned = name.strip()
    if not cleaned:
        raise VaultError("Vault braucht einen Namen.")
    conn.execute(
        'UPDATE "Vault" SET name = ?, updatedAt = ? WHERE id = ? AND userId = ?',
        (cleaned, now_iso(), vault["id"], user_id),
    )
    return row_to_dict(
        conn.execute(
            'SELECT * FROM "Vault" WHERE id = ? AND userId = ?',
            (vault_id, user_id),
        ).fetchone()
    ) or {}


def delete_vault(conn: sqlite3.Connection, user_id: str, vault_id: str) -> None:
    vault = _vault_for_user(conn, user_id, vault_id)
    # Documents leave the vault but are never deleted with it.
    conn.execute(
        'UPDATE "Document" SET vaultId = NULL, updatedAt = ? WHERE vaultId = ? AND userId = ?',
        (now_iso(), vault["id"], user_id),
    )
    conn.execute('DELETE FROM "Vault" WHERE id = ? AND userId = ?', (vault["id"], user_id))


def vault_documents(conn: sqlite3.Connection, user_id: str, vault_id: str) -> list[dict[str, Any]]:
    vault = _vault_for_user(conn, user_id, vault_id)
    return rows_to_dicts(
        conn.execute(
            'SELECT * FROM "Document" WHERE vaultId = ? AND userId = ? ORDER BY createdAt DESC',
            (vault["id"], user_id),
        ).fetchall()
    )


def assign_document(conn: sqlite3.Connection, user_id: str, vault_id: str, document_id: str) -> dict[str, Any]:
    vault = _vault_for_user(conn, user_id, vault_id)
    document = row_to_dict(
        conn.execute('SELECT * FROM "Document" WHERE id = ? AND userId = ?', (document_id, user_id)).fetchone()
    )
    if not document:
        raise VaultError("Dokument nicht gefunden.")
    conn.execute(
        'UPDATE "Document" SET vaultId = ?, updatedAt = ? WHERE id = ? AND userId = ?',
        (vault["id"], now_iso(), document_id, user_id),
    )
    return row_to_dict(
        conn.execute(
            'SELECT * FROM "Document" WHERE id = ? AND userId = ?',
            (document_id, user_id),
        ).fetchone()
    ) or {}


def remove_document(conn: sqlite3.Connection, user_id: str, vault_id: str, document_id: str) -> dict[str, Any]:
    vault = _vault_for_user(conn, user_id, vault_id)
    document = row_to_dict(
        conn.execute(
            'SELECT * FROM "Document" WHERE id = ? AND userId = ? AND vaultId = ?',
            (document_id, user_id, vault["id"]),
        ).fetchone()
    )
    if not document:
        raise VaultError("Dokument nicht in diesem Vault.")
    conn.execute(
        'UPDATE "Document" SET vaultId = NULL, updatedAt = ? WHERE id = ? AND userId = ? AND vaultId = ?',
        (now_iso(), document_id, user_id, vault["id"]),
    )
    return row_to_dict(
        conn.execute(
            'SELECT * FROM "Document" WHERE id = ? AND userId = ?',
            (document_id, user_id),
        ).fetchone()
    ) or {}


def _vault_for_user(conn: sqlite3.Connection, user_id: str, vault_id: str) -> dict[str, Any]:
    vault = row_to_dict(
        conn.execute('SELECT * FROM "Vault" WHERE id = ? AND userId = ?', (vault_id, user_id)).fetchone()
    )
    if not vault:
        raise VaultError("Vault nicht gefunden.")
    return vault
