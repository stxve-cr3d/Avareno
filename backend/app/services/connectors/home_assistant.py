"""Home Assistant connector — first real provider on the shared interface.

Direct mode: the user provides their instance base URL plus a long-lived
access token. Both stay server-side; the token is stored Fernet-encrypted
via app.services.connectors.security and is never returned to the client.

Local/self-hosted tradeoff (explicit, documented): Home Assistant almost
always runs on a private LAN address. Unlike generic custom connectors,
this connector therefore ACCEPTS private/LAN hosts — the same posture the
app already takes for local discovery and the Avareno Bridge. Cloud
metadata endpoints and credential-bearing URLs remain rejected.
"""

from __future__ import annotations

import ipaddress
import json
import ssl
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

MAX_RESPONSE_BYTES = 2 * 1024 * 1024
REQUEST_TIMEOUT_SECONDS = 8

# Domains worth importing as devices. Sensors/automations/helpers are
# metadata noise for an object-memory product and stay out for now.
IMPORT_DOMAINS = {
    "light",
    "switch",
    "media_player",
    "climate",
    "cover",
    "fan",
    "vacuum",
    "lock",
    "camera",
}

# Only these domains may receive power commands, via explicit service paths.
POWER_DOMAINS = {"light", "switch", "media_player"}

_COMMAND_SERVICES = {
    "power_on": "turn_on",
    "power_off": "turn_off",
}

_METADATA_HOSTS = {"169.254.169.254", "metadata.google.internal", "metadata.goog"}


class HomeAssistantError(RuntimeError):
    """Safe, user-facing connector error. Never contains the token."""


def validate_home_assistant_url(raw_url: str) -> str:
    """Normalize and validate a user-provided instance URL.

    Allows private/LAN hosts on purpose (see module docstring); rejects
    non-http(s) schemes, credential URLs and cloud metadata endpoints.
    """
    value = (raw_url or "").strip().rstrip("/")
    if not value:
        raise HomeAssistantError("Bitte gib die URL deiner Home-Assistant-Instanz an.")
    parsed = urllib.parse.urlparse(value)
    if parsed.scheme.lower() not in {"http", "https"}:
        raise HomeAssistantError("Nur http- und https-URLs sind erlaubt.")
    if not parsed.hostname:
        raise HomeAssistantError("Die URL enthält keinen Host.")
    if parsed.username or parsed.password:
        raise HomeAssistantError("Die URL darf keine Zugangsdaten enthalten.")
    hostname = parsed.hostname.rstrip(".").lower()
    if hostname in _METADATA_HOSTS:
        raise HomeAssistantError("Diese Adresse ist nicht erlaubt.")
    try:
        address = ipaddress.ip_address(hostname)
        if address.is_unspecified or (address.is_link_local and str(address).startswith("169.254.169.")):
            raise HomeAssistantError("Diese Adresse ist nicht erlaubt.")
    except ValueError:
        pass  # hostnames are fine; LAN names like homeassistant.local are the common case
    return value


def _request(base_url: str, token: str, path: str, payload: dict | None = None) -> Any:
    url = f"{base_url}{path}"
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = urllib.request.Request(
        url,
        data=body,
        method="POST" if payload is not None else "GET",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    context = ssl.create_default_context()
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS, context=context) as response:
            raw = response.read(MAX_RESPONSE_BYTES)
    except urllib.error.HTTPError as error:
        if error.code in (401, 403):
            raise HomeAssistantError("Der Zugangstoken wurde von Home Assistant abgelehnt.") from None
        raise HomeAssistantError(f"Home Assistant hat mit Status {error.code} geantwortet.") from None
    except (urllib.error.URLError, TimeoutError, ssl.SSLError, OSError):
        # Covers unreachable hosts, DNS failures, TLS/certificate problems.
        raise HomeAssistantError("Home Assistant ist unter dieser Adresse nicht erreichbar.") from None
    try:
        return json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise HomeAssistantError("Home Assistant hat eine unerwartete Antwort geliefert.") from None


def validate_credentials(base_url: str, token: str) -> dict:
    """GET /api/config; returns only safe instance facts."""
    config = _request(base_url, token, "/api/config")
    if not isinstance(config, dict):
        raise HomeAssistantError("Home Assistant hat eine unerwartete Antwort geliefert.")
    return {
        "instanceName": str(config.get("location_name") or "Home Assistant"),
        "version": str(config.get("version") or ""),
    }


def fetch_states(base_url: str, token: str) -> list[dict]:
    states = _request(base_url, token, "/api/states")
    if not isinstance(states, list):
        raise HomeAssistantError("Home Assistant hat keine Entitätenliste geliefert.")
    return [state for state in states if isinstance(state, dict)]


def normalize_entities(states: list[dict]) -> list[dict]:
    """Map HA states into the source-device dicts _upsert_device expects.

    Unavailable entities are skipped instead of imported as fake-online rows
    (the device table currently has no per-sync offline state).
    """
    devices: list[dict] = []
    for state in states:
        entity_id = str(state.get("entity_id") or "")
        domain = entity_id.split(".", 1)[0] if "." in entity_id else ""
        if domain not in IMPORT_DOMAINS:
            continue
        raw_state = str(state.get("state") or "unknown")
        if raw_state == "unavailable":
            continue
        attributes = state.get("attributes") if isinstance(state.get("attributes"), dict) else {}
        capabilities = ["power"] if domain in POWER_DOMAINS else []
        devices.append(
            {
                "deviceId": entity_id,
                "name": str(attributes.get("friendly_name") or entity_id),
                "type": domain,
                "capabilities": capabilities,
                "powerState": raw_state if raw_state in ("on", "off") else "unknown",
                # Safe raw subset only — no attribute dump into rawJson.
                "entityDomain": domain,
                "deviceClass": str(attributes.get("device_class") or "") or None,
            }
        )
    return devices


def execute_power_command(base_url: str, token: str, entity_id: str, command: str) -> dict:
    """Whitelisted power control. The frontend never sends service names."""
    service = _COMMAND_SERVICES.get(command)
    domain = entity_id.split(".", 1)[0] if "." in entity_id else ""
    if not service or domain not in POWER_DOMAINS:
        raise HomeAssistantError("Dieser Befehl ist für dieses Gerät nicht freigegeben.")
    _request(base_url, token, f"/api/services/{domain}/{service}", {"entity_id": entity_id})
    return {"ok": True, "powerState": "on" if command == "power_on" else "off"}
