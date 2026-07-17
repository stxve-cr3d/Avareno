"""Fail-closed invite-beta feature gates and account-deletion regression tests."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import jwt

from app.db import db
from app.routers import documents as documents_router
from app.routers import extract as extract_router
from app.services import account_deletion
from app.services.document_storage import safe_local_upload_path
from app.services.supabase_admin import StorageDeletionResult


def _token(secret: str, user_id: str, email: str) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {
            "sub": user_id,
            "email": email,
            "aud": "authenticated",
            "iat": now,
            "exp": now + timedelta(minutes=10),
        },
        secret,
        algorithm="HS256",
    )


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_receipt_beta_gate_precedes_resource_storage_and_provider_access(client, monkeypatch):
    secret = "controlled-beta-gate-secret"
    user_id = "10000000-0000-4000-8000-000000000001"
    headers = _headers(_token(secret, user_id, "beta-gate-a@example.test"))
    calls = {"db": 0, "provider": 0}

    monkeypatch.setenv("AVARENO_REQUIRE_AUTH", "1")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", secret)
    monkeypatch.setenv("BETA_INVITE_ONLY", "true")
    monkeypatch.setenv("ENABLE_RECEIPT_EXTRACTION", "false")
    monkeypatch.setenv("ENABLE_DOCUMENT_PROCESSING", "false")

    def forbidden_db():
        calls["db"] += 1
        raise AssertionError("receipt gate opened the database")

    def forbidden_provider(**_kwargs):
        calls["provider"] += 1
        raise AssertionError("receipt gate started the provider")

    monkeypatch.setattr(extract_router, "db", forbidden_db)
    monkeypatch.setattr(extract_router, "extract_receipt_with_claude", forbidden_provider)

    controlled_ids = [
        "10000000-0000-4000-8000-00000000000a",
        "10000000-0000-4000-8000-00000000000b",
    ]
    responses = [
        client.post("/api/extract/receipt", headers=headers, json={"documentId": document_id})
        for document_id in controlled_ids
    ]

    assert [response.status_code for response in responses] == [503, 503]
    assert responses[0].json() == responses[1].json()
    assert "manually" in responses[0].json()["detail"]
    assert calls == {"db": 0, "provider": 0}


def test_disabled_document_features_fail_before_database_access(client, monkeypatch):
    calls = {"db": 0}

    def forbidden_db():
        calls["db"] += 1
        raise AssertionError("disabled document feature opened the database")

    monkeypatch.setattr(documents_router, "db", forbidden_db)
    monkeypatch.setenv("ENABLE_DOCUMENT_UPLOADS", "false")
    upload = client.post(
        "/api/documents/upload",
        data={"type": "OTHER"},
        files={"file": ("controlled.pdf", b"%PDF-1.7 controlled", "application/pdf")},
    )
    assert upload.status_code == 503

    monkeypatch.setenv("ENABLE_PUBLIC_DOCUMENT_LINKS", "false")
    signed_download = client.get("/api/documents/signed-download/controlled.invalid.token")
    assert signed_download.status_code == 503
    assert calls == {"db": 0}


def test_complete_account_deletion_preserves_user_b_and_revokes_user_a(client, monkeypatch):
    secret = "controlled-account-deletion-secret"
    user_a_id = "20000000-0000-4000-8000-00000000000a"
    user_b_id = "20000000-0000-4000-8000-00000000000b"
    headers_a = _headers(_token(secret, user_a_id, "delete-a@example.test"))
    headers_b = _headers(_token(secret, user_b_id, "delete-b@example.test"))
    remote_operations: list[str] = []

    monkeypatch.setenv("AVARENO_REQUIRE_AUTH", "1")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", secret)
    monkeypatch.setenv("SUPABASE_URL", "http://127.0.0.1:1")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "controlled-test-admin-key")

    def delete_storage(user_id: str) -> StorageDeletionResult:
        assert user_id == user_a_id
        remote_operations.append("storage")
        return StorageDeletionResult(deleted_object_count=1, checked_bucket_count=5)

    def delete_database(user_id: str) -> None:
        assert user_id == user_a_id
        remote_operations.append("database")

    def delete_auth(user_id: str) -> None:
        assert user_id == user_a_id
        remote_operations.append("auth")

    monkeypatch.setattr(account_deletion, "delete_user_storage_objects", delete_storage)
    monkeypatch.setattr(account_deletion, "delete_user_database_rows", delete_database)
    monkeypatch.setattr(account_deletion, "delete_supabase_auth_user", delete_auth)

    assert client.get("/api/structure/spaces", headers=headers_a).status_code == 200
    assert client.get("/api/structure/spaces", headers=headers_b).status_code == 200
    structure_a = client.get("/api/structure", headers=headers_a).json()
    household_a = structure_a["household"]["id"]
    space_a = structure_a["spaces"][0]["id"]
    item_a = client.post(
        "/api/items", headers=headers_a, json={"name": "Delete A", "category": "Test"}
    ).json()["id"]
    item_b = client.post(
        "/api/items", headers=headers_b, json={"name": "Keep B", "category": "Test"}
    ).json()["id"]
    upload_a = client.post(
        "/api/documents/upload",
        headers=headers_a,
        data={"type": "OTHER", "itemId": item_a},
        files={"file": ("delete-a.pdf", b"%PDF-1.7 delete a", "application/pdf")},
    )
    upload_b = client.post(
        "/api/documents/upload",
        headers=headers_b,
        data={"type": "OTHER", "itemId": item_b},
        files={"file": ("keep-b.pdf", b"%PDF-1.7 keep b", "application/pdf")},
    )
    assert upload_a.status_code == 201
    assert upload_b.status_code == 201
    planned = client.post(
        "/api/planner/actions",
        headers=headers_a,
        json={
            "itemId": item_a,
            "title": "Delete A reminder",
            "remindAt": "2026-08-01T09:00:00+00:00",
        },
    )
    assert planned.status_code == 201
    path_a = safe_local_upload_path(upload_a.json()["filePath"])
    path_b = safe_local_upload_path(upload_b.json()["filePath"])
    assert path_a and path_a.exists()
    assert path_b and path_b.exists()

    deleted = client.post("/api/privacy/deletion/request", headers=headers_a)
    assert deleted.status_code == 200, deleted.text
    assert deleted.json()["deleted"] is True
    assert remote_operations == ["storage", "database", "auth"]

    with db() as conn:
        assert conn.execute('SELECT 1 FROM "User" WHERE id = ?', (user_a_id,)).fetchone() is None
        assert conn.execute('SELECT 1 FROM "Item" WHERE userId = ?', (user_a_id,)).fetchone() is None
        assert conn.execute('SELECT 1 FROM "Document" WHERE userId = ?', (user_a_id,)).fetchone() is None
        assert conn.execute('SELECT 1 FROM "Loop" WHERE userId = ?', (user_a_id,)).fetchone() is None
        assert conn.execute('SELECT 1 FROM "Reminder" WHERE userId = ?', (user_a_id,)).fetchone() is None
        assert conn.execute('SELECT 1 FROM "Household" WHERE id = ?', (household_a,)).fetchone() is None
        assert conn.execute('SELECT 1 FROM "Space" WHERE id = ?', (space_a,)).fetchone() is None
        assert conn.execute('SELECT 1 FROM "User" WHERE id = ?', (user_b_id,)).fetchone() is not None
        assert conn.execute('SELECT 1 FROM "Item" WHERE id = ? AND userId = ?', (item_b, user_b_id)).fetchone() is not None
        # The deletion orchestrator is idempotent for server-side retries even
        # after the local profile and files are already absent.
        retry = account_deletion.delete_account(conn, user_a_id)
        assert retry.as_dict()["deleted"] is True

    assert remote_operations == ["storage", "database", "auth", "storage", "database", "auth"]
    assert path_a.exists() is False
    assert path_b.exists() is True
    assert client.get("/api/items", headers=headers_a).status_code == 401
    items_b = client.get("/api/items", headers=headers_b)
    assert items_b.status_code == 200
    assert any(item["id"] == item_b for item in items_b.json())


def test_account_deletion_without_admin_configuration_fails_before_mutation(client, monkeypatch):
    secret = "controlled-account-deletion-config-secret"
    user_id = "30000000-0000-4000-8000-000000000001"
    headers = _headers(_token(secret, user_id, "delete-config@example.test"))

    monkeypatch.setenv("AVARENO_REQUIRE_AUTH", "1")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", secret)
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)

    item = client.post(
        "/api/items", headers=headers, json={"name": "Must survive failed deletion", "category": "Test"}
    )
    assert item.status_code == 201

    deletion = client.post("/api/privacy/deletion/request", headers=headers)
    assert deletion.status_code == 503

    items = client.get("/api/items", headers=headers)
    assert items.status_code == 200
    assert any(row["id"] == item.json()["id"] for row in items.json())
