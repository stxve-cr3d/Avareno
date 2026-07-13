"""Connector security: HA URL validation, setup error paths, secret encryption."""

from __future__ import annotations

import pytest

from app.services.connectors.home_assistant import HomeAssistantError, validate_home_assistant_url
from app.services.connectors.security import decrypt_secret, encrypt_secret, redact_connector_payload


@pytest.mark.parametrize(
    "url",
    [
        "ftp://homeassistant.local:8123",
        "http://user:pass@ha.local:8123",
        "http://169.254.169.254",
        "http://metadata.google.internal",
        "",
        "not a url",
    ],
)
def test_home_assistant_url_rejected(url):
    with pytest.raises(HomeAssistantError):
        validate_home_assistant_url(url)


@pytest.mark.parametrize(
    "url",
    [
        "http://homeassistant.local:8123",
        "http://192.168.1.20:8123",
        "https://ha.example.com",
    ],
)
def test_home_assistant_lan_urls_allowed(url):
    # Self-hosted mode: LAN hosts are deliberately allowed (documented tradeoff).
    assert validate_home_assistant_url(url + "/").rstrip("/") == url


def test_setup_rejects_bad_scheme_via_api(client):
    response = client.post(
        "/api/smart-home/home-assistant/setup",
        json={"baseUrl": "ftp://ha.local", "token": "testtoken123"},
    )
    assert response.status_code == 400
    assert "http" in response.json()["detail"].lower()


def test_setup_never_stores_on_unreachable_instance(client):
    response = client.post(
        "/api/smart-home/home-assistant/setup",
        json={"baseUrl": "http://192.0.2.1:8123", "token": "testtoken123"},
    )
    assert response.status_code == 400
    payload = client.get("/api/smart-home").json()
    provider = next(p for p in payload["providers"] if p["id"] == "HOME_ASSISTANT")
    assert provider["mode"] != "LIVE"
    # The submitted token must never appear anywhere in the payload.
    assert "testtoken123" not in str(payload)


def test_secret_encryption_roundtrip_and_redaction():
    ciphertext = encrypt_secret("very-secret-token")
    assert ciphertext is not None
    assert "very-secret-token" not in ciphertext
    assert decrypt_secret(ciphertext) == "very-secret-token"

    redacted = redact_connector_payload({"name": "ok", "access_token": "leakme", "nested": {"password": "x"}})
    assert "leakme" not in str(redacted)
    assert "x" != redacted["nested"].get("password")


def test_provider_registry_exposes_no_credentials(client):
    response = client.get("/api/smart-home/providers/registry")
    assert response.status_code == 200
    body = response.json()
    assert body["providers"], "registry must not be empty"
    text = str(body).lower()
    for needle in ("bearer ", "sk_", "whsec_", "supabase_jwt"):
        assert needle not in text
    for provider in body["providers"]:
        assert set(provider["capabilities"]).issubset(
            {
                "import_devices",
                "read_status",
                "control_power",
                "control_brightness",
                "control_color",
                "sync_metadata",
                "local_only",
            }
        )
