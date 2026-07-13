"""Device-object linking safety and the privacy export/deletion surface."""

from __future__ import annotations

import json

from app.db import db
from app.utils import make_id, now_iso


def _insert_device(name: str = "HA Testlicht") -> str:
    with db() as conn:
        user = conn.execute('SELECT id FROM "User" LIMIT 1').fetchone()["id"]
        device_id = "test-" + make_id()[:10]
        now = now_iso()
        conn.execute(
            'INSERT INTO "SmartHomeDevice" (id, userId, provider, providerDeviceId, name, deviceType, capabilities, status, powerState, createdAt, updatedAt)'
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (device_id, user, "HOME_ASSISTANT", f"light.{device_id}", name, "light", json.dumps(["power"]), "ONLINE", "off", now, now),
        )
        conn.commit()
    return device_id


def test_link_unlink_preserves_object_and_device(client):
    item_id = client.post("/api/items", json={"name": "Link Testobjekt"}).json()["id"]
    device_id = _insert_device()

    linked = client.patch(f"/api/smart-home/devices/{device_id}/link", json={"itemId": item_id})
    assert linked.status_code == 200
    assert linked.json()["itemId"] == item_id

    unlinked = client.patch(f"/api/smart-home/devices/{device_id}/link", json={"itemId": None})
    assert unlinked.status_code == 200
    assert unlinked.json()["itemId"] is None

    # Both sides survive the unlink.
    assert client.get(f"/api/items/{item_id}").status_code == 200
    payload = client.get("/api/smart-home").json()
    assert any(device["id"] == device_id for device in payload["devices"])


def test_link_rejects_foreign_or_missing_item(client):
    device_id = _insert_device("HA Ownership Test")
    response = client.patch(f"/api/smart-home/devices/{device_id}/link", json={"itemId": "not-your-item"})
    assert response.status_code in (400, 404)


def test_link_suggestions_are_suggestions_only(client):
    client.post("/api/items", json={"name": "Philips Lampe Flur", "itemType": "ELECTRONIC"})
    device_id = _insert_device("Philips Lampe Flur")
    suggestions = client.get(f"/api/smart-home/devices/{device_id}/link-suggestions")
    assert suggestions.status_code == 200
    body = suggestions.json()
    for suggestion in body["suggestions"]:
        assert suggestion["reasons"], "every suggestion needs a plain-fact reason"
    # Fetching suggestions must not have linked anything.
    payload = client.get("/api/smart-home").json()
    device = next(d for d in payload["devices"] if d["id"] == device_id)
    assert device["itemId"] is None


def test_suggestions_for_unknown_device_404(client):
    assert client.get("/api/smart-home/devices/nope/link-suggestions").status_code == 404


def test_privacy_export_contains_user_data_no_secrets(client):
    client.post("/api/items", json={"name": "Export Testobjekt"})
    export = client.post("/api/privacy/export/request")
    assert export.status_code == 200, export.text
    text = export.text
    assert "Export Testobjekt" in text
    assert "test-connector-key" not in text
    assert "test-signing-secret" not in text


def test_deletion_request_is_recorded_not_executed(client):
    response = client.post("/api/privacy/deletion/request")
    assert response.status_code in (200, 202)
    # Data still present afterwards - deletion is request-only in the beta.
    assert client.get("/api/items").status_code == 200
