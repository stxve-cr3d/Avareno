from __future__ import annotations

import json
import os
import socket
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError, as_completed
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import urlparse


BRIDGE_VERSION = "0.1.0"
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8765
DEFAULT_HOME_ASSISTANT_CANDIDATES = (
    "http://homeassistant.local:8123",
    "http://homeassistant:8123",
    "http://ha.local:8123",
)
SAFE_ATTRIBUTE_KEYS = {
    "friendly_name",
    "device_class",
    "unit_of_measurement",
    "supported_features",
    "manufacturer",
    "model",
    "sw_version",
}


def main() -> None:
    host = os.environ.get("AVARENO_BRIDGE_HOST", DEFAULT_HOST).strip() or DEFAULT_HOST
    port = _int_env("AVARENO_BRIDGE_PORT", DEFAULT_PORT)
    server = ThreadingHTTPServer((host, port), BridgeHandler)
    print(f"Avareno Bridge {BRIDGE_VERSION} listening on http://{host}:{port}")
    server.serve_forever()


class BridgeHandler(BaseHTTPRequestHandler):
    server_version = f"AvarenoBridge/{BRIDGE_VERSION}"

    def do_GET(self) -> None:
        if self.path == "/health":
            self._json({"ok": True, "service": "avareno-bridge", "version": BRIDGE_VERSION})
            return

        if self.path == "/discover/home-assistant":
            self._json({"candidates": discover_home_assistant()})
            return

        if self.path == "/home-assistant/status":
            self._json(home_assistant_status())
            return

        if self.path == "/home-assistant/entities":
            try:
                entities = home_assistant_entities()
                self._json({"source": configured_home_assistant_url(), "entities": entities})
            except BridgeError as exc:
                self._json({"error": str(exc)}, status=400)
            return

        self._json({"error": "Not found"}, status=404)

    def log_message(self, format: str, *args: Any) -> None:
        return

    def _json(self, payload: dict[str, Any], status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=True, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


class BridgeError(Exception):
    pass


def discover_home_assistant() -> list[dict[str, Any]]:
    urls = home_assistant_candidates()
    candidates_by_url: dict[str, dict[str, Any]] = {
        url: {
            "url": url,
            "reachable": False,
            "message": "Discovery timed out",
            "latencyMs": None,
        }
        for url in urls
    }

    executor = ThreadPoolExecutor(max_workers=min(len(urls), 4) or 1)
    futures = {executor.submit(probe_home_assistant_candidate, url): url for url in urls}
    try:
        for future in as_completed(futures, timeout=2.5):
            url = futures[future]
            try:
                candidates_by_url[url] = future.result()
            except BridgeError as exc:
                candidates_by_url[url]["message"] = str(exc)
    except FutureTimeoutError:
        pass
    finally:
        executor.shutdown(wait=False, cancel_futures=True)

    return [candidates_by_url[url] for url in urls]


def probe_home_assistant_candidate(url: str) -> dict[str, Any]:
    started = time.time()
    ok, message = probe_home_assistant(url)
    return {
        "url": url,
        "reachable": ok,
        "message": message,
        "latencyMs": int((time.time() - started) * 1000),
    }


def configured_home_assistant_url() -> str | None:
    configured = os.environ.get("HOME_ASSISTANT_URL", "").strip()
    return normalize_url(configured) if configured else None


def configured_home_assistant_token() -> str | None:
    token = os.environ.get("HOME_ASSISTANT_TOKEN", "").strip()
    return token or None


def home_assistant_status() -> dict[str, Any]:
    return {
        "urlConfigured": configured_home_assistant_url() is not None,
        "tokenConfigured": configured_home_assistant_token() is not None,
    }


def home_assistant_entities() -> list[dict[str, Any]]:
    token = configured_home_assistant_token()
    if not token:
        raise BridgeError("HOME_ASSISTANT_TOKEN is not configured")

    url = configured_home_assistant_url()
    if not url:
        raise BridgeError("HOME_ASSISTANT_URL is not configured")

    data = request_json(f"{url}/api/states", token=token, timeout=6)
    if not isinstance(data, list):
        raise BridgeError("Home Assistant returned an unexpected states payload")

    return [entity for entity in (safe_entity(entry) for entry in data) if entity is not None]


def safe_entity(entry: Any) -> dict[str, Any] | None:
    if not isinstance(entry, dict):
        return None

    entity_id = entry.get("entity_id")
    if not isinstance(entity_id, str) or "." not in entity_id:
        return None

    domain, slug = entity_id.split(".", 1)
    attributes = entry.get("attributes") if isinstance(entry.get("attributes"), dict) else {}
    friendly_name = attributes.get("friendly_name")
    name = friendly_name if isinstance(friendly_name, str) and friendly_name.strip() else slug.replace("_", " ").title()
    state = entry.get("state") if isinstance(entry.get("state"), str) else "unknown"
    safe_attributes = {key: attributes[key] for key in SAFE_ATTRIBUTE_KEYS if key in attributes and _safe_scalar(attributes[key])}

    return {
        "id": entity_id,
        "entityId": entity_id,
        "label": name,
        "domain": domain,
        "type": infer_device_type(domain, safe_attributes),
        "roomName": None,
        "capabilities": infer_capabilities(domain, safe_attributes),
        "powerState": "on" if state == "on" else "off" if state == "off" else "unknown",
        "state": state,
        "attributes": safe_attributes,
    }


def infer_device_type(domain: str, attributes: dict[str, Any]) -> str:
    device_class = str(attributes.get("device_class") or "").lower()
    if domain == "light":
        return "light"
    if domain == "switch":
        return "switch"
    if domain == "sensor":
        return device_class or "sensor"
    if domain == "binary_sensor":
        return device_class or "binary_sensor"
    if domain == "climate":
        return "thermostat"
    if domain == "vacuum":
        return "vacuum"
    if domain == "media_player":
        return "media"
    if domain == "lock":
        return "lock"
    if domain == "cover":
        return "cover"
    return domain or "device"


def infer_capabilities(domain: str, attributes: dict[str, Any]) -> list[str]:
    capabilities = ["homeAssistantEntity", domain]
    if domain in {"light", "switch", "fan", "media_player", "climate", "vacuum", "lock", "cover"}:
        capabilities.append("switch")
    if domain == "light":
        capabilities.extend(["brightness", "color"])
    if domain == "sensor":
        capabilities.append(str(attributes.get("device_class") or "sensor"))
    if domain == "climate":
        capabilities.extend(["temperature", "hvacMode"])
    return sorted({capability for capability in capabilities if capability})


def probe_home_assistant(url: str) -> tuple[bool, str]:
    try:
        payload = request_json(f"{normalize_url(url)}/api/", timeout=1)
    except BridgeError as exc:
        return False, str(exc)
    message = payload.get("message") if isinstance(payload, dict) else None
    return True, str(message or "Home Assistant API reachable")


def request_json(url: str, token: str | None = None, timeout: int = 5) -> Any:
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raise BridgeError(f"HTTP {exc.code}") from exc
    except (urllib.error.URLError, TimeoutError, socket.timeout, json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise BridgeError(type(exc).__name__) from exc


def home_assistant_url() -> str:
    configured = configured_home_assistant_url()
    if configured:
        return configured
    for candidate in home_assistant_candidates():
        ok, _message = probe_home_assistant(candidate)
        if ok:
            return normalize_url(candidate)
    raise BridgeError("Home Assistant was not found")


def home_assistant_candidates() -> list[str]:
    configured = os.environ.get("HOME_ASSISTANT_DISCOVERY_URLS", "").strip()
    values = configured.split(",") if configured else list(DEFAULT_HOME_ASSISTANT_CANDIDATES)
    return [normalize_url(value) for value in values if value.strip()]


def normalize_url(value: str) -> str:
    url = value.strip().rstrip("/")
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise BridgeError("Invalid Home Assistant URL")
    return url


def _safe_scalar(value: Any) -> bool:
    return isinstance(value, (str, int, float, bool)) or value is None


def _int_env(key: str, default: int) -> int:
    try:
        return int(os.environ.get(key, str(default)))
    except ValueError:
        return default


if __name__ == "__main__":
    main()
