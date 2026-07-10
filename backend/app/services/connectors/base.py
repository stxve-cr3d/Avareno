"""Shared connector interface for Avareno Connect providers.

Every real provider integration implements SmartHomeConnector and maps its
devices into NormalizedDevice, which mirrors the SmartHomeDevice table.

Credential rules (see docs/security/CONNECTOR_SECURITY.md):
- App credentials come from server-side environment variables only.
- User provider tokens are stored server-side only, encrypted via
  app.services.connectors.security.prepare_connector_secret_for_storage.
- Secrets never reach API responses or logs; use redact_connector_payload
  before persisting raw provider payloads.
- Outbound URLs for local/custom connectors must pass validate_connector_url.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal, Protocol

ConnectionMethod = Literal["oauth", "api_key", "local_network", "manual", "future"]

ImplementedStatus = Literal["implemented", "partial", "planned", "manual_only"]

Capability = Literal[
    "import_devices",
    "read_status",
    "control_power",
    "control_brightness",
    "control_color",
    "sync_metadata",
    "local_only",
]

DeviceStatus = Literal["ONLINE", "OFFLINE", "UNKNOWN"]


@dataclass(frozen=True)
class NormalizedDevice:
    """Provider-agnostic device shape; maps 1:1 onto SmartHomeDevice rows."""

    provider: str
    provider_device_id: str
    name: str
    device_type: str = "device"
    room_name: str | None = None
    manufacturer: str | None = None
    model: str | None = None
    status: DeviceStatus = "UNKNOWN"
    capabilities: list[Capability] = field(default_factory=list)
    last_seen_at: str | None = None
    # Raw provider metadata is stored server-side only (rawJson column) and
    # must be passed through redact_connector_payload first.
    raw: dict[str, Any] = field(default_factory=dict)
    item_id: str | None = None


@dataclass(frozen=True)
class ConnectorResult:
    ok: bool
    message: str = ""
    data: dict[str, Any] = field(default_factory=dict)


class SmartHomeConnector(Protocol):
    """Interface every real provider connector grows into.

    Implementations live in app/services/connectors/<provider>.py and are
    registered in registry.py. Methods a provider cannot support yet should
    raise NotImplementedError — the registry capability list is the source
    of truth for what the UI may offer.
    """

    provider_id: str

    def start_connect(self, user_id: str, household_id: str) -> ConnectorResult:
        """Begin authorization (OAuth redirect data, pairing hint, …)."""
        ...

    def validate_credentials(self, credentials: dict[str, Any]) -> ConnectorResult:
        """Check credentials server-side without persisting them."""
        ...

    def list_devices(self, connection: dict[str, Any]) -> list[NormalizedDevice]:
        """Fetch and normalize the provider's devices."""
        ...

    def get_device_status(self, connection: dict[str, Any], provider_device_id: str) -> NormalizedDevice:
        """Fresh status for one device."""
        ...

    def sync(self, connection: dict[str, Any]) -> ConnectorResult:
        """Request-based sync; no background jobs exist in this app yet."""
        ...

    def execute_command(
        self, connection: dict[str, Any], provider_device_id: str, command: str, value: Any = None
    ) -> ConnectorResult:
        """Run a safe, capability-gated command (see HOME_GRAPH_SAFE_CAPABILITIES)."""
        ...

    def disconnect(self, connection: dict[str, Any]) -> ConnectorResult:
        """Revoke provider access where supported and report what was revoked."""
        ...
