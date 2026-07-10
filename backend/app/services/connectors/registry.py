"""Central provider registry — the backend source of truth for Avareno Connect.

Statuses here must match real code in app/services/smart_home.py:
- "implemented": a working code path exists today.
- "partial": some functionality exists (often behind an env credential).
- "planned": no backend code yet; UI must present it as future only.
- "manual_only": no live connection; devices exist as memory passports.

The registry never exposes secrets. `configured` only reports whether a
server-side credential/env flag is present, as a boolean.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app.services.smart_home import (
    avareno_bridge_enabled,
    bambu_lab_configured,
    local_discovery_enabled,
    smartthings_token,
)

from .base import Capability, ConnectionMethod, ImplementedStatus


@dataclass(frozen=True)
class ProviderDescriptor:
    id: str
    name: str
    category: str
    connection_method: ConnectionMethod
    implemented: ImplementedStatus
    capabilities: list[Capability] = field(default_factory=list)
    logo_key: str | None = None
    description: str = ""
    security_notes: str = ""


PROVIDERS: list[ProviderDescriptor] = [
    ProviderDescriptor(
        id="samsung_local",
        name="Samsung TV (lokal)",
        category="tv",
        connection_method="local_network",
        implemented="implemented",
        capabilities=["import_devices", "read_status", "control_power", "local_only"],
        logo_key="samsung",
        description="Lokale Steuerung über das Heimnetz nach Freigabe am Fernseher.",
        security_notes="Pairing-Token bleibt serverseitig; keine Cloud-Zugangsdaten.",
    ),
    ProviderDescriptor(
        id="smartthings",
        name="SmartThings",
        category="bridge",
        connection_method="api_key",
        implemented="partial",
        capabilities=["import_devices", "read_status", "control_power"],
        logo_key="smartthings",
        description="Cloud-Anbindung über einen persönlichen API-Token.",
        security_notes="Token nur serverseitig (Umgebungsvariable); nie im Browser.",
    ),
    ProviderDescriptor(
        id="bambu_lab",
        name="Bambu Lab",
        category="printer",
        connection_method="local_network",
        implemented="partial",
        capabilities=["import_devices", "read_status", "sync_metadata", "local_only"],
        logo_key="bambu-lab",
        description="3D-Drucker im lokalen Netz; Druckereignisse landen am Objekt.",
        security_notes="Access-Code bleibt serverseitig; LAN-only Modus empfohlen.",
    ),
    ProviderDescriptor(
        id="avareno_bridge",
        name="Avareno Bridge",
        category="bridge",
        connection_method="local_network",
        implemented="partial",
        capabilities=["import_devices", "read_status", "local_only"],
        logo_key="avareno",
        description="Optionale lokale Brücke für Geräte, die keine Cloud brauchen.",
    ),
    ProviderDescriptor(
        id="manual",
        name="Geräte-Pass (manuell)",
        category="manual",
        connection_method="manual",
        implemented="manual_only",
        capabilities=["sync_metadata"],
        description="Ohne Live-Verbindung: Beleg, Garantie, Service und Notizen am Objekt.",
    ),
    # ── Planned: no backend code yet. UI must not present these as active. ──
    ProviderDescriptor(
        id="philips_hue",
        name="Philips Hue",
        category="smart_home",
        connection_method="oauth",
        implemented="planned",
        capabilities=["import_devices", "read_status", "control_power", "control_brightness", "control_color"],
        logo_key="philips-hue",
        description="Erster OAuth/Local-Bridge-Kandidat für Licht.",
    ),
    ProviderDescriptor(
        id="shelly",
        name="Shelly",
        category="smart_home",
        connection_method="local_network",
        implemented="planned",
        capabilities=["import_devices", "read_status", "control_power", "local_only"],
        logo_key="shelly",
        description="Lokale HTTP-API; guter Kandidat für einfache Schalter.",
    ),
    ProviderDescriptor(
        id="home_assistant",
        name="Home Assistant",
        category="bridge",
        connection_method="api_key",
        implemented="partial",
        capabilities=["import_devices", "read_status", "control_power", "sync_metadata"],
        logo_key="home-assistant",
        description="Nutzer-eigene Instanz mit Long-Lived Access Token; Import, Status und An/Aus für Licht, Schalter und Medien.",
        security_notes="LAN-Adressen sind erlaubt (Self-Hosted-Modus); Token wird verschlüsselt gespeichert und nie an den Browser gegeben.",
    ),
    ProviderDescriptor(
        id="tuya_smart_life",
        name="Tuya / Smart Life",
        category="smart_home",
        connection_method="api_key",
        implemented="planned",
        capabilities=["import_devices", "read_status"],
        logo_key="tuya",
        description="Erst Erkennung und Gerätepass, Steuerung später.",
    ),
    ProviderDescriptor(
        id="tp_link_tapo",
        name="TP-Link Tapo",
        category="smart_home",
        connection_method="future",
        implemented="planned",
        capabilities=["import_devices", "read_status", "control_power"],
        logo_key="tapo",
    ),
    ProviderDescriptor(
        id="switchbot",
        name="SwitchBot",
        category="smart_home",
        connection_method="api_key",
        implemented="planned",
        capabilities=["import_devices", "read_status", "control_power"],
        logo_key="switchbot",
    ),
    ProviderDescriptor(
        id="matter_bridge",
        name="Matter / lokale Bridge",
        category="bridge",
        connection_method="future",
        implemented="planned",
        capabilities=["import_devices", "read_status", "local_only"],
        logo_key="matter",
    ),
]


def _configured(provider_id: str) -> bool:
    """Server-side credential presence as a boolean — never the value."""
    if provider_id == "smartthings":
        return bool(smartthings_token())
    if provider_id == "bambu_lab":
        return bambu_lab_configured()
    if provider_id == "avareno_bridge":
        return avareno_bridge_enabled()
    if provider_id == "samsung_local":
        return local_discovery_enabled()
    return False


def public_registry() -> list[dict]:
    """Safe registry payload for the frontend. No secrets, no env values."""
    return [
        {
            "id": provider.id,
            "name": provider.name,
            "category": provider.category,
            "connectionMethod": provider.connection_method,
            "implemented": provider.implemented,
            "capabilities": list(provider.capabilities),
            "logoKey": provider.logo_key,
            "description": provider.description,
            "securityNotes": provider.security_notes,
            "configured": _configured(provider.id),
        }
        for provider in PROVIDERS
    ]


def get_provider(provider_id: str) -> ProviderDescriptor | None:
    return next((provider for provider in PROVIDERS if provider.id == provider_id), None)
