"""Document upload validation and the signed-download path."""

from __future__ import annotations


def _create_item(client) -> str:
    return client.post("/api/items", json={"name": "Dokument Testobjekt"}).json()["id"]


def test_upload_and_signed_download_roundtrip(client):
    item_id = _create_item(client)
    upload = client.post(
        "/api/documents/upload",
        data={"type": "RECEIPT", "itemId": item_id},
        files={"file": ("beleg.pdf", b"%PDF-1.4 test receipt", "application/pdf")},
    )
    assert upload.status_code == 201, upload.text
    document_id = upload.json()["id"]

    ticket = client.post(f"/api/documents/{document_id}/signed-download")
    assert ticket.status_code == 200, ticket.text
    token_url = ticket.json().get("url") or ""
    assert "signed-download/" in token_url

    token = token_url.rsplit("signed-download/", 1)[1]
    download = client.get(f"/api/documents/signed-download/{token}")
    assert download.status_code == 200
    assert download.content.startswith(b"%PDF")


def test_upload_rejects_unsupported_extension(client):
    response = client.post(
        "/api/documents/upload",
        data={"type": "RECEIPT"},
        files={"file": ("malware.exe", b"MZ fake binary", "application/octet-stream")},
    )
    assert response.status_code in (400, 415, 422)


def test_upload_rejects_oversized_file(client):
    # Conftest caps AVARENO_MAX_UPLOAD_BYTES at 64 KB.
    big = b"a" * (80 * 1024)
    response = client.post(
        "/api/documents/upload",
        data={"type": "RECEIPT"},
        files={"file": ("big.pdf", big, "application/pdf")},
    )
    assert response.status_code in (400, 413, 422)


def test_upload_rejects_empty_file(client):
    response = client.post(
        "/api/documents/upload",
        data={"type": "RECEIPT"},
        files={"file": ("empty.pdf", b"", "application/pdf")},
    )
    assert response.status_code in (400, 422)


def test_forged_signed_token_rejected(client):
    response = client.get("/api/documents/signed-download/forged.token.value")
    assert response.status_code in (400, 401, 403, 404)


def test_document_delete_removes_metadata(client):
    item_id = _create_item(client)
    upload = client.post(
        "/api/documents/upload",
        data={"type": "MANUAL", "itemId": item_id},
        files={"file": ("anleitung.pdf", b"%PDF-1.4 manual", "application/pdf")},
    )
    document_id = upload.json()["id"]
    deleted = client.delete(f"/api/documents/{document_id}")
    assert deleted.status_code in (200, 204)
    ticket = client.post(f"/api/documents/{document_id}/signed-download")
    assert ticket.status_code == 404
