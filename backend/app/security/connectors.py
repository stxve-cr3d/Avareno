from __future__ import annotations

import ipaddress
import socket
from dataclasses import dataclass
from typing import Callable
from urllib.parse import urlsplit

BLOCKED_HOST_SUFFIXES = (".localhost", ".local", ".internal", ".lan", ".home", ".corp")
BLOCKED_HOSTS = {"localhost", "metadata.google.internal"}
BLOCKED_METADATA_IPS = {
    ipaddress.ip_address("169.254.169.254"),
    ipaddress.ip_address("100.100.100.200"),
}
ALLOWED_CONNECTOR_SCOPES = {
    "read_profile",
    "read_selected_documents",
    "read_selected_orders",
    "read_selected_devices",
    "webhook_receive",
}


class ConnectorSecurityError(ValueError):
    pass


@dataclass(frozen=True)
class ConnectorUrlValidation:
    original_url: str
    normalized_url: str
    hostname: str
    scheme: str
    resolved_addresses: tuple[str, ...]
    requires_tls_review: bool


Resolver = Callable[[str, int | None, int, int, int, int], list[tuple]]


def validate_connector_url(url: str, *, resolver: Resolver | None = None) -> ConnectorUrlValidation:
    parsed = urlsplit((url or "").strip())
    if not parsed.scheme or not parsed.netloc:
        raise ConnectorSecurityError("Connector URL is empty or malformed")
    if parsed.scheme not in {"http", "https"}:
        raise ConnectorSecurityError("Connector URL must use http or https")
    if parsed.username or parsed.password:
        raise ConnectorSecurityError("Connector URL must not contain credentials")
    if not parsed.hostname:
        raise ConnectorSecurityError("Connector URL hostname is missing")
    host = parsed.hostname.strip().lower().rstrip(".")
    if host in BLOCKED_HOSTS or host.endswith(BLOCKED_HOST_SUFFIXES) or "." not in host:
        raise ConnectorSecurityError("Connector URL hostname is internal or not public")

    addresses = _resolve_host_addresses(host, parsed.port, resolver=resolver)
    for address in addresses:
        _reject_blocked_address(address)

    return ConnectorUrlValidation(
        original_url=url,
        normalized_url=parsed.geturl(),
        hostname=host,
        scheme=parsed.scheme,
        resolved_addresses=tuple(str(address) for address in addresses),
        requires_tls_review=parsed.scheme != "https",
    )


def validate_connector_redirect(source_url: str, redirect_url: str, *, resolver: Resolver | None = None) -> ConnectorUrlValidation:
    source = urlsplit(source_url)
    target = urlsplit(redirect_url)
    if target.scheme and target.netloc:
        return validate_connector_url(redirect_url, resolver=resolver)
    if not source.scheme or not source.netloc:
        raise ConnectorSecurityError("Redirect source URL is invalid")
    joined = f"{source.scheme}://{source.netloc}{redirect_url if redirect_url.startswith('/') else '/' + redirect_url}"
    return validate_connector_url(joined, resolver=resolver)


def connector_permission_summary(scopes: list[str]) -> dict:
    unknown = sorted(scope for scope in scopes if scope not in ALLOWED_CONNECTOR_SCOPES)
    return {
        "requestedScopes": sorted(scopes),
        "unknownScopes": unknown,
        "readOnlyByDefault": True,
        "canProceed": not unknown,
    }


def require_encrypted_connector_secret_storage() -> None:
    raise NotImplementedError(
        "Connector secret storage is not implemented. Add server-side encryption, rotation, and deletion before storing tokens."
    )


def _resolve_host_addresses(host: str, port: int | None, *, resolver: Resolver | None = None) -> list[ipaddress._BaseAddress]:
    resolver = resolver or socket.getaddrinfo
    try:
        infos = resolver(host, port, socket.AF_UNSPEC, socket.SOCK_STREAM, 0, 0)
    except OSError as exc:
        raise ConnectorSecurityError("Connector URL hostname could not be resolved") from exc
    addresses: list[ipaddress._BaseAddress] = []
    for info in infos:
        raw_address = info[4][0]
        try:
            addresses.append(ipaddress.ip_address(raw_address))
        except ValueError as exc:
            raise ConnectorSecurityError("Connector URL resolved to an invalid address") from exc
    if not addresses:
        raise ConnectorSecurityError("Connector URL did not resolve to an address")
    return sorted(set(addresses), key=str)


def _reject_blocked_address(address: ipaddress._BaseAddress) -> None:
    if address in BLOCKED_METADATA_IPS:
        raise ConnectorSecurityError("Connector URL resolved to a cloud metadata endpoint")
    if (
        address.is_loopback
        or address.is_private
        or address.is_link_local
        or address.is_multicast
        or address.is_reserved
        or address.is_unspecified
    ):
        raise ConnectorSecurityError("Connector URL resolved to a blocked network range")

