"""Receipt extraction router: mock fallback without key, Claude path wiring
(mocked — no network), and error mapping."""

from __future__ import annotations

from app.routers import extract as extract_router
from app.services.claude_extraction import ExtractionError

CLAUDE_FIELDS = {
    "merchant": "Saturn",
    "purchaseDate": "2026-07-01",
    "itemName": "Bosch Waschmaschine WGB2560",
    "category": "Waschmaschine",
    "manufacturer": "Bosch",
    "model": "WGB2560",
    "price": 799,
    "currency": "EUR",
    "warrantyUntil": "2028-07-01",
    "extractedText": "Saturn ... Bosch WGB2560 ... 799,00 EUR",
}


def test_extract_receipt_uses_mock_without_key(client):
    response = client.post("/api/extract/receipt", json={"text": "MediaMarkt LG OLED C3 1499 EUR"})
    assert response.status_code == 200
    body = response.json()
    assert body["merchant"] == "MediaMarkt"
    assert body["aiAssisted"] is True
    assert "extractedText" in body


def test_extract_receipt_claude_path_wiring(client, monkeypatch):
    captured = {}

    def fake_extract(**kwargs):
        captured.update(kwargs)
        return {"fields": dict(CLAUDE_FIELDS), "confidence": 0.91}

    monkeypatch.setattr(extract_router, "extraction_configured", lambda: True)
    monkeypatch.setattr(extract_router, "extract_receipt_with_claude", fake_extract)

    response = client.post("/api/extract/receipt", json={"text": "Saturn Beleg", "fileName": "beleg.jpg"})
    assert response.status_code == 200
    body = response.json()
    assert body["merchant"] == "Saturn"
    assert body["confidence"] == 0.91
    assert body["aiAssisted"] is True
    assert captured["text"] == "Saturn Beleg"
    assert captured["file_name"] == "beleg.jpg"
    assert captured["file_bytes"] is None


def test_extract_receipt_claude_requires_input(client, monkeypatch):
    monkeypatch.setattr(extract_router, "extraction_configured", lambda: True)
    response = client.post("/api/extract/receipt", json={})
    assert response.status_code == 400


def test_extract_receipt_claude_error_maps_to_502(client, monkeypatch):
    def boom(**kwargs):
        raise ExtractionError("Auslese-Dienst nicht erreichbar. Bitte später erneut versuchen.")

    monkeypatch.setattr(extract_router, "extraction_configured", lambda: True)
    monkeypatch.setattr(extract_router, "extract_receipt_with_claude", boom)

    response = client.post("/api/extract/receipt", json={"text": "irgendwas"})
    assert response.status_code == 502
    assert "erreichbar" in response.json()["detail"]
