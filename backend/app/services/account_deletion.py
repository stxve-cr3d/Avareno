from __future__ import annotations

import shutil
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from app.auth import auth_subject_hash
from app.services.document_storage import UPLOAD_ROOT, safe_local_upload_path
from app.services.supabase_admin import (
    delete_supabase_auth_user,
    delete_user_database_rows,
    delete_user_storage_objects,
    require_supabase_admin_configuration,
)


class AccountDeletionConflict(RuntimeError):
    pass


@dataclass(frozen=True)
class AccountDeletionResult:
    deleted_local_file_count: int
    deleted_storage_object_count: int
    checked_storage_bucket_count: int

    def as_dict(self) -> dict[str, Any]:
        return {
            "deleted": True,
            "localFileCount": self.deleted_local_file_count,
            "storageObjectCount": self.deleted_storage_object_count,
            "checkedStorageBucketCount": self.checked_storage_bucket_count,
            "authUserDeleted": True,
            "message": "Account and user-owned resources were deleted.",
        }


def delete_account(conn: sqlite3.Connection, user_id: str) -> AccountDeletionResult:
    # Fail closed before touching DB rows, local files, or remote Storage.
    require_supabase_admin_configuration()
    _assert_no_foreign_owned_dependents(conn, user_id)
    document_paths = _owned_document_paths(conn, user_id)

    try:
        storage_result = delete_user_storage_objects(user_id)
    except Exception as exc:
        _tag_deletion_phase(exc, "storage")
        raise
    try:
        delete_user_database_rows(user_id)
    except Exception as exc:
        _tag_deletion_phase(exc, "database")
        raise
    local_file_count = _delete_local_files(document_paths, user_id)

    # db() commits on normal return and rolls back on error. Keep the local
    # resource deletion transaction open until Supabase Auth (the last
    # user-bearing external resource) confirms deletion.
    _delete_owned_database_rows(conn, user_id)
    _verify_owned_database_rows_absent(conn, user_id)
    try:
        delete_supabase_auth_user(user_id)
    except Exception as exc:
        _tag_deletion_phase(exc, "auth")
        raise
    _record_short_lived_token_revocation(conn, user_id)

    return AccountDeletionResult(
        deleted_local_file_count=local_file_count,
        deleted_storage_object_count=storage_result.deleted_object_count,
        checked_storage_bucket_count=storage_result.checked_bucket_count,
    )


def _tag_deletion_phase(exc: Exception, phase: str) -> None:
    # Safe diagnostic metadata only. Never attach the subject, URL, object
    # path, request body, credential, or provider response.
    try:
        setattr(exc, "deletion_phase", phase)
    except Exception:
        pass


def _owned_document_paths(conn: sqlite3.Connection, user_id: str) -> list[str]:
    return [
        str(row["filePath"])
        for row in conn.execute('SELECT filePath FROM "Document" WHERE userId = ?', (user_id,)).fetchall()
        if row["filePath"]
    ]


def _delete_local_files(file_paths: list[str], user_id: str) -> int:
    deleted = 0
    for file_path in file_paths:
        try:
            target = safe_local_upload_path(file_path)
        except ValueError as exc:
            raise AccountDeletionConflict("Account has an invalid local document path; deletion was stopped.") from exc
        if target and target.exists() and target.is_file():
            target.unlink()
            deleted += 1

    user_root = (UPLOAD_ROOT / user_id).resolve()
    upload_root = UPLOAD_ROOT.resolve()
    try:
        user_root.relative_to(upload_root)
    except ValueError as exc:
        raise AccountDeletionConflict("Account upload path is invalid; deletion was stopped.") from exc
    if user_root.exists():
        shutil.rmtree(user_root)
    return deleted


def _assert_no_foreign_owned_dependents(conn: sqlite3.Connection, user_id: str) -> None:
    checks = [
        ('SELECT 1 FROM "Document" d JOIN "Item" i ON i.id = d.itemId WHERE i.userId = ? AND d.userId <> ? LIMIT 1', (user_id, user_id)),
        ('SELECT 1 FROM "RepairLog" r JOIN "Item" i ON i.id = r.itemId WHERE i.userId = ? AND r.userId <> ? LIMIT 1', (user_id, user_id)),
        ('SELECT 1 FROM "Loop" l JOIN "Item" i ON i.id = l.itemId WHERE i.userId = ? AND l.userId <> ? LIMIT 1', (user_id, user_id)),
        ('SELECT 1 FROM "ItemActivity" a JOIN "Item" i ON i.id = a.itemId WHERE i.userId = ? AND a.userId <> ? LIMIT 1', (user_id, user_id)),
        ('SELECT 1 FROM "SmartHomeCommand" c JOIN "SmartHomeDevice" d ON d.id = c.deviceId WHERE d.userId = ? AND c.userId <> ? LIMIT 1', (user_id, user_id)),
    ]
    for query, params in checks:
        if conn.execute(query, params).fetchone():
            raise AccountDeletionConflict(
                "Account contains a cross-owner relationship; deletion was stopped before mutation."
            )


def _delete_owned_database_rows(conn: sqlite3.Connection, user_id: str) -> None:
    statements: list[tuple[str, tuple[Any, ...]]] = [
        ('DELETE FROM "FriendCircleMember" WHERE circleId IN (SELECT id FROM "FriendCircle" WHERE userId = ?) OR friendUserId = ?', (user_id, user_id)),
        ('DELETE FROM "FriendCircle" WHERE userId = ?', (user_id,)),
        ('DELETE FROM "Friendship" WHERE userId = ? OR friendUserId = ?', (user_id, user_id)),
        ('DELETE FROM "FriendInviteCode" WHERE userId = ?', (user_id,)),
        ('DELETE FROM "MotivationPrivacy" WHERE userId = ?', (user_id,)),
        ('DELETE FROM "SmartHomeCommand" WHERE userId = ? OR deviceId IN (SELECT id FROM "SmartHomeDevice" WHERE userId = ?)', (user_id, user_id)),
        ('DELETE FROM "SmartHomeDevice" WHERE userId = ?', (user_id,)),
        ('DELETE FROM "SmartHomeConnection" WHERE userId = ?', (user_id,)),
        ('DELETE FROM "Reminder" WHERE userId = ?', (user_id,)),
        ('DELETE FROM "XpTransaction" WHERE userId = ?', (user_id,)),
        ('DELETE FROM "RepairLog" WHERE userId = ?', (user_id,)),
        ('DELETE FROM "Loop" WHERE userId = ?', (user_id,)),
        ('DELETE FROM "ItemActivity" WHERE userId = ?', (user_id,)),
        ('DELETE FROM "AffiliateClick" WHERE userId = ?', (user_id,)),
        ('DELETE FROM "Document" WHERE userId = ?', (user_id,)),
        ('DELETE FROM "VaultSecurity" WHERE userId = ?', (user_id,)),
        ('DELETE FROM "Vault" WHERE userId = ?', (user_id,)),
        ('DELETE FROM "UsageCounter" WHERE userId = ?', (user_id,)),
        ('DELETE FROM "DeviceToken" WHERE userId = ?', (user_id,)),
        ('DELETE FROM "BillingInvoice" WHERE userId = ?', (user_id,)),
        ('DELETE FROM "PlanSubscription" WHERE userId = ?', (user_id,)),
        ('DELETE FROM "ConsentEvent" WHERE userId = ?', (user_id,)),
        ('DELETE FROM "PrivacyAuditEvent" WHERE userId = ?', (user_id,)),
        ('DELETE FROM "Item" WHERE userId = ?', (user_id,)),
        ('DELETE FROM "HouseholdMember" WHERE userId = ? OR householdId IN (SELECT id FROM "Household" WHERE userId = ?)', (user_id, user_id)),
        ('DELETE FROM "Space" WHERE householdId IN (SELECT id FROM "Household" WHERE userId = ?)', (user_id,)),
        ('DELETE FROM "Household" WHERE userId = ?', (user_id,)),
        ('DELETE FROM "User" WHERE id = ?', (user_id,)),
    ]
    for statement, params in statements:
        conn.execute(statement, params)


def _verify_owned_database_rows_absent(conn: sqlite3.Connection, user_id: str) -> None:
    checks = [
        ('SELECT 1 FROM "User" WHERE id = ? LIMIT 1', (user_id,)),
        ('SELECT 1 FROM "Household" WHERE userId = ? LIMIT 1', (user_id,)),
        ('SELECT 1 FROM "HouseholdMember" WHERE userId = ? LIMIT 1', (user_id,)),
        ('SELECT 1 FROM "Item" WHERE userId = ? LIMIT 1', (user_id,)),
        ('SELECT 1 FROM "Document" WHERE userId = ? LIMIT 1', (user_id,)),
        ('SELECT 1 FROM "Loop" WHERE userId = ? LIMIT 1', (user_id,)),
        ('SELECT 1 FROM "Space" WHERE householdId IN (SELECT id FROM "Household" WHERE userId = ?) LIMIT 1', (user_id,)),
        ('SELECT 1 FROM "Vault" WHERE userId = ? LIMIT 1', (user_id,)),
        ('SELECT 1 FROM "UsageCounter" WHERE userId = ? LIMIT 1', (user_id,)),
    ]
    if any(conn.execute(query, params).fetchone() for query, params in checks):
        raise RuntimeError("Account deletion could not verify that all local resources were removed.")


def _record_short_lived_token_revocation(conn: sqlite3.Connection, user_id: str) -> None:
    now = datetime.now(timezone.utc)
    expires_at = (now + timedelta(hours=48)).isoformat()
    conn.execute(
        'INSERT OR REPLACE INTO "AuthRevocation" (subjectHash, expiresAt, createdAt) VALUES (?, ?, ?)',
        (auth_subject_hash(user_id), expires_at, now.isoformat()),
    )
