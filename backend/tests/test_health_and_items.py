"""Core object workflow: health, create, read, update, missing-info signals."""

from __future__ import annotations


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200


def test_create_read_update_item(client):
    created = client.post(
        "/api/items",
        json={
            "name": "Testgerät Waschmaschine",
            "category": "Haushalt",
            "itemType": "ELECTRONIC",
            "manufacturer": "Bosch",
            "currency": "EUR",
            "visibility": "HOUSEHOLD",
        },
    )
    assert created.status_code == 201, created.text
    item = created.json()
    item_id = item["id"]
    assert item["name"] == "Testgerät Waschmaschine"
    assert item["itemType"] == "ELECTRONIC"

    # New item without receipt/serial must surface missing information.
    detail = client.get(f"/api/items/{item_id}")
    assert detail.status_code == 200
    detail_body = detail.json()
    assert "serial number" in (detail_body.get("missingFields") or [])
    assert (detail_body.get("completenessScore") or 0) < 100

    listed = client.get("/api/items")
    assert listed.status_code == 200
    assert any(entry["id"] == item_id for entry in listed.json())

    updated = client.patch(f"/api/items/{item_id}", json={"serialNumber": "SN-TEST-123"})
    assert updated.status_code == 200
    assert updated.json().get("serialNumber") == "SN-TEST-123"

    # Serial no longer missing after the edit; other data survived.
    detail_after = client.get(f"/api/items/{item_id}").json()
    assert "serial number" not in (detail_after.get("missingFields") or [])
    assert detail_after.get("manufacturer") == "Bosch"


def test_missing_item_returns_404(client):
    response = client.get("/api/items/does-not-exist")
    assert response.status_code == 404


def test_invalid_item_payload_rejected(client):
    response = client.post("/api/items", json={"category": "ohne Namen"})
    assert response.status_code in (400, 422)


def test_delete_item_cascades_and_cleans_files(client):
    item_id = client.post("/api/items", json={"name": "Löschen Testobjekt", "category": "Sonstiges"}).json()["id"]
    upload = client.post(
        "/api/documents/upload",
        data={"type": "RECEIPT", "itemId": item_id},
        files={"file": ("kassenbon.pdf", b"%PDF-1.4 delete me", "application/pdf")},
    )
    assert upload.status_code == 201
    document_id = upload.json()["id"]

    deleted = client.delete(f"/api/items/{item_id}")
    assert deleted.status_code == 200
    assert deleted.json()["documentsDeleted"] == 1

    assert client.get(f"/api/items/{item_id}").status_code == 404
    assert client.post(f"/api/documents/{document_id}/signed-download").status_code == 404
    # Repeat delete is a clean 404, not a crash.
    assert client.delete(f"/api/items/{item_id}").status_code == 404


def test_delete_unknown_item_404(client):
    assert client.delete("/api/items/never-existed").status_code == 404


def test_repair_log_entry(client):
    item_id = client.post("/api/items", json={"name": "Repair Testobjekt", "category": "Sonstiges"}).json()["id"]
    repair = client.post(
        f"/api/items/{item_id}/repairs",
        json={"date": "2026-07-01T10:00:00+00:00", "problem": "Testdefekt", "status": "OPEN"},
    )
    assert repair.status_code == 201, repair.text
    detail = client.get(f"/api/items/{item_id}").json()
    assert any(entry.get("problem") == "Testdefekt" for entry in detail.get("repairLogs") or [])


def test_product_creation_completes_activation_server_side(client):
    started = client.post("/api/me/activation", json={"action": "onboarding_started"})
    assert started.status_code == 200, started.text

    created = client.post("/api/items", json={"name": "Aktivierung Testprodukt", "category": "Elektronik"})
    assert created.status_code == 201, created.text

    activation = client.get("/api/me/activation")
    assert activation.status_code == 200
    body = activation.json()
    assert body["activationA"] is True
    assert body["onboardingCompletedAt"]
    assert body["firstProductCreatedAt"]
    assert body["nextPath"] == "/app"

    opened = client.post("/api/me/activation", json={"action": "product_detail_opened"})
    assert opened.status_code == 200
    assert opened.json()["firstProductDetailOpenedAt"]
