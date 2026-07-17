"""Controlled local authorization regression with two verified JWT identities."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi import HTTPException

from app.db import db
from app.services.authorization import update_document_extraction
from app.utils import make_id, now_iso


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


def test_user_a_cannot_reference_user_b_resources(client, monkeypatch):
    secret = "local-two-user-authorization-regression-secret"
    monkeypatch.setenv("AVARENO_REQUIRE_AUTH", "1")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", secret)

    user_a_id = "00000000-0000-4000-8000-00000000000a"
    user_b_id = "00000000-0000-4000-8000-00000000000b"
    headers_a = _headers(_token(secret, user_a_id, "user-a@authorization.test"))
    headers_b = _headers(_token(secret, user_b_id, "user-b@authorization.test"))

    # Anonymous requests never reach resource lookup or provider handling.
    anonymous = client.post("/api/extract/receipt", json={"documentId": "controlled-id"})
    assert anonymous.status_code == 401

    # The first household-dependent request provisions each local test home.
    assert client.get("/api/structure/spaces", headers=headers_a).status_code == 200
    assert client.get("/api/structure/spaces", headers=headers_b).status_code == 200
    structure_a = client.get("/api/structure", headers=headers_a)
    structure_b = client.get("/api/structure", headers=headers_b)
    assert structure_a.status_code == 200
    assert structure_b.status_code == 200
    household_a = structure_a.json()["household"]["id"]
    household_b = structure_b.json()["household"]["id"]
    space_a = structure_a.json()["spaces"][0]["id"]
    space_b = structure_b.json()["spaces"][0]["id"]

    item_b_response = client.post(
        "/api/items",
        headers=headers_b,
        json={"name": "Controlled B item", "category": "Test", "spaceId": space_b},
    )
    assert item_b_response.status_code == 201
    item_b = item_b_response.json()["id"]

    upload_b = client.post(
        "/api/documents/upload",
        headers=headers_b,
        data={"type": "RECEIPT", "itemId": item_b},
        files={"file": ("controlled-b.pdf", b"%PDF-1.4 controlled", "application/pdf")},
    )
    assert upload_b.status_code == 201
    document_b = upload_b.json()["id"]

    # A viewer cannot start extraction and receives no document metadata.
    with db() as conn:
        conn.execute(
            '''INSERT INTO "HouseholdMember"
               (id, householdId, userId, email, name, role, status, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (
                make_id(),
                household_b,
                user_a_id,
                "user-a@authorization.test",
                "User A",
                "VIEWER",
                "ACTIVE",
                now_iso(),
                now_iso(),
            ),
        )
    denied_extraction = client.post(
        "/api/extract/receipt",
        headers=headers_a,
        json={"documentId": document_b},
    )
    assert denied_extraction.status_code == 404
    assert denied_extraction.json() == {"detail": "Document not found"}

    # An active editor passes resource authorization. With no local provider
    # configured, processing stops at the expected availability guard.
    with db() as conn:
        conn.execute(
            '''UPDATE "HouseholdMember"
               SET role = ?, updatedAt = ?
               WHERE householdId = ? AND userId = ?''',
            ("EDITOR", now_iso(), household_b, user_a_id),
        )
    editor_extraction = client.post(
        "/api/extract/receipt",
        headers=headers_a,
        json={"documentId": document_b},
    )
    assert editor_extraction.status_code == 503
    owner_extraction = client.post(
        "/api/extract/receipt",
        headers=headers_b,
        json={"documentId": document_b},
    )
    assert owner_extraction.status_code == 503

    # The final document write independently re-checks the same boundary.
    with db() as conn:
        conn.execute(
            '''UPDATE "HouseholdMember"
               SET role = ?, updatedAt = ?
               WHERE householdId = ? AND userId = ?''',
            ("VIEWER", now_iso(), household_b, user_a_id),
        )
        with pytest.raises(HTTPException) as denied_update:
            update_document_extraction(
                conn,
                user_a_id,
                document_b,
                extracted_text="must not persist",
                extraction_result={"merchant": "must not persist"},
            )
        assert denied_update.value.status_code == 404

    # Every client-provided relation is checked before any write occurs.
    denied_requests = [
        client.post(
            "/api/items",
            headers=headers_a,
            json={"name": "Denied document link", "category": "Test", "documentId": document_b},
        ),
        client.post(
            "/api/items",
            headers=headers_a,
            json={"name": "Denied household link", "category": "Test", "householdId": household_b},
        ),
        client.post(
            "/api/items",
            headers=headers_a,
            json={"name": "Denied space link", "category": "Test", "spaceId": space_b},
        ),
        client.post(
            "/api/loops",
            headers=headers_a,
            json={"title": "Denied item loop", "itemId": item_b},
        ),
        client.post(
            "/api/planner/actions",
            headers=headers_a,
            json={"title": "Denied item plan", "itemId": item_b},
        ),
        client.post(
            "/api/structure/spaces",
            headers=headers_a,
            json={"name": "Denied child", "parentId": space_b},
        ),
        client.post(
            "/api/structure/affiliate/clicks",
            headers=headers_a,
            json={"itemId": item_b, "targetUrl": "https://example.test/controlled"},
        ),
        client.post(
            "/api/capture/universal",
            headers=headers_a,
            json={"text": "Controlled capture", "spaceId": space_b},
        ),
    ]
    assert [response.status_code for response in denied_requests] == [404] * len(denied_requests)

    item_a_response = client.post(
        "/api/items",
        headers=headers_a,
        json={
            "name": "Controlled A item",
            "category": "Test",
            "householdId": household_a,
            "spaceId": space_a,
        },
    )
    assert item_a_response.status_code == 201
    item_a = item_a_response.json()["id"]
    loop_a_response = client.post(
        "/api/loops",
        headers=headers_a,
        json={"title": "Allowed A loop", "itemId": item_a},
    )
    assert loop_a_response.status_code == 201
    loop_a = loop_a_response.json()["id"]

    assert client.get(f"/api/items/{item_b}", headers=headers_a).status_code == 404
    assert client.patch(
        f"/api/documents/{document_b}/extracted-data",
        headers=headers_a,
        json={"extractedText": "must not persist"},
    ).status_code == 404
    assert client.patch(
        f"/api/items/{item_a}",
        headers=headers_a,
        json={"householdId": household_b},
    ).status_code == 404
    assert client.patch(
        f"/api/items/{item_a}",
        headers=headers_a,
        json={"spaceId": space_b},
    ).status_code == 404
    assert client.patch(
        f"/api/loops/{loop_a}",
        headers=headers_a,
        json={"itemId": item_b},
    ).status_code == 404

    # No denied write was committed and extraction fields remain untouched.
    items_a = client.get("/api/items", headers=headers_a).json()
    assert {item["name"] for item in items_a} == {"Controlled A item"}
    stored_a = next(item for item in items_a if item["id"] == item_a)
    assert stored_a["householdId"] == household_a
    assert stored_a["spaceId"] == space_a
    documents_b = client.get("/api/documents", headers=headers_b).json()
    stored_b = next(document for document in documents_b if document["id"] == document_b)
    assert stored_b.get("extractedText") is None
    assert stored_b.get("extractedJson") is None
