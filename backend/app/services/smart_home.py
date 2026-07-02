from __future__ import annotations

import base64
import hashlib
import json
import os
import socket
import ssl
import sqlite3
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from typing import Any

from app.db import row_to_dict, rows_to_dicts
from app.utils import make_id, now_iso

SMARTTHINGS_PROVIDER = "SAMSUNG_SMARTTHINGS"
AVARENO_BRIDGE_PROVIDER = "AVARENO_BRIDGE"
HOME_ASSISTANT_PROVIDER = "HOME_ASSISTANT"
LOCAL_DISCOVERY_PROVIDER = "LOCAL_DISCOVERY"
BAMBU_LAB_PROVIDER = "BAMBU_LAB"
SMARTTHINGS_API = "https://api.smartthings.com/v1"
LAN_DISCOVERY_PORTS = [80, 443, 554, 631, 8001, 8002, 8008, 8009, 8060, 8080, 8123, 8883, 9100, 9197, 990, 5000, 5001]
HOME_GRAPH_SAFE_CAPABILITIES = {"power", "brightness"}
HOME_GRAPH_CONNECT_PROVIDERS = {
    "philips_hue": {
        "provider": "HOME_GRAPH_PHILIPS_HUE",
        "name": "Philips Hue",
        "appName": "Hue",
        "devicePrefix": "Hue",
        "sampleDevices": [
            {"id": "hue-living-room-light", "label": "Wohnzimmer Hue Lampe", "roomName": "Wohnzimmer", "type": "light", "capabilities": ["switch", "switchLevel"], "powerState": "off"},
            {"id": "hue-reading-light", "label": "Leselampe", "roomName": "Wohnzimmer", "type": "light", "capabilities": ["switch", "switchLevel"], "powerState": "on"},
        ],
    },
    "smartthings": {
        "provider": "HOME_GRAPH_SMARTTHINGS",
        "name": "SmartThings",
        "appName": "SmartThings",
        "devicePrefix": "SmartThings",
        "sampleDevices": [
            {"id": "smartthings-lamp", "label": "SmartThings Lampe", "roomName": "Wohnzimmer", "type": "light", "capabilities": ["switch", "switchLevel"], "powerState": "off"},
            {"id": "smartthings-plug", "label": "SmartThings Steckdose", "roomName": "Buero", "type": "switch", "capabilities": ["switch"], "powerState": "on"},
        ],
    },
    "shelly": {
        "provider": "HOME_GRAPH_SHELLY",
        "name": "Shelly",
        "appName": "Shelly Smart Control",
        "devicePrefix": "Shelly",
        "sampleDevices": [
            {"id": "shelly-plug", "label": "Shelly Steckdose", "roomName": "Waschkeller", "type": "switch", "capabilities": ["switch"], "powerState": "off"},
            {"id": "shelly-dimmer", "label": "Shelly Dimmer", "roomName": "Flur", "type": "light", "capabilities": ["switch", "switchLevel"], "powerState": "on"},
        ],
    },
    "tp_link_tapo": {
        "provider": "HOME_GRAPH_TAPO",
        "name": "TP-Link Tapo",
        "appName": "Tapo",
        "devicePrefix": "Tapo",
        "sampleDevices": [
            {"id": "tapo-desk-light", "label": "Tapo Schreibtischlampe", "roomName": "Buero", "type": "light", "capabilities": ["switch", "switchLevel"], "powerState": "off"},
            {"id": "tapo-plug", "label": "Tapo Steckdose", "roomName": "Kueche", "type": "switch", "capabilities": ["switch"], "powerState": "off"},
        ],
    },
    "home_assistant": {
        "provider": "HOME_GRAPH_HOME_ASSISTANT",
        "name": "Home Assistant",
        "appName": "Home Assistant",
        "devicePrefix": "Home Assistant",
        "sampleDevices": [
            {"id": "ha-living-room-light", "label": "Home Assistant Lampe", "roomName": "Wohnzimmer", "type": "light", "capabilities": ["switch", "switchLevel"], "powerState": "off"},
            {"id": "ha-office-plug", "label": "Home Assistant Steckdose", "roomName": "Buero", "type": "switch", "capabilities": ["switch"], "powerState": "on"},
        ],
    },
}


COMMANDS = {
    "power_on": [{"component": "main", "capability": "switch", "command": "on", "arguments": []}],
    "power_off": [{"component": "main", "capability": "switch", "command": "off", "arguments": []}],
    "mute": [{"component": "main", "capability": "audioMute", "command": "mute", "arguments": []}],
    "unmute": [{"component": "main", "capability": "audioMute", "command": "unmute", "arguments": []}],
    "mute_toggle": [{"component": "main", "capability": "audioMute", "command": "toggle", "arguments": []}],
    "volume_up": [{"component": "main", "capability": "audioVolume", "command": "volumeUp", "arguments": []}],
    "volume_down": [{"component": "main", "capability": "audioVolume", "command": "volumeDown", "arguments": []}],
    "source_menu": [{"component": "main", "capability": "mediaInputSource", "command": "openSourceMenu", "arguments": []}],
    "printer_pause": [{"component": "print", "capability": "printerJob", "command": "pause", "arguments": []}],
    "printer_resume": [{"component": "print", "capability": "printerJob", "command": "resume", "arguments": []}],
}

LOCAL_TV_COMMANDS = {"power_on", "power_off", "volume_up", "volume_down", "mute_toggle", "source_menu"}
LOCAL_SAMSUNG_REMOTE_KEYS = {
    "volume_up": "KEY_VOLUP",
    "volume_down": "KEY_VOLDOWN",
    "mute_toggle": "KEY_MUTE",
    "source_menu": "KEY_SOURCE",
}


def smartthings_token() -> str | None:
    return os.environ.get("SMARTTHINGS_TOKEN") or os.environ.get("SAMSUNG_SMARTTHINGS_TOKEN")


def provider_mode() -> str:
    return "LIVE" if smartthings_token() else "CONFIG_REQUIRED"


def bambu_lab_config() -> dict:
    return {
        "host": os.environ.get("BAMBU_LAB_HOST"),
        "serial": os.environ.get("BAMBU_LAB_SERIAL"),
        "accessCode": os.environ.get("BAMBU_LAB_ACCESS_CODE"),
        "model": os.environ.get("BAMBU_LAB_MODEL") or "Bambu Lab Printer",
    }


def bambu_lab_configured() -> bool:
    config = bambu_lab_config()
    return bool(config["host"] and config["serial"] and config["accessCode"])


def local_discovery_enabled() -> bool:
    return os.environ.get("AVARENO_ENABLE_LAN_DISCOVERY") == "1"


def avareno_bridge_enabled() -> bool:
    return os.environ.get("AVARENO_ENABLE_LOCAL_BRIDGE") == "1" and bool(avareno_bridge_url())


def avareno_bridge_url() -> str:
    return os.environ.get("AVARENO_BRIDGE_URL", "").strip().rstrip("/")


def smart_home_payload(conn: sqlite3.Connection, user_id: str) -> dict:
    connections = rows_to_dicts(
        conn.execute('SELECT * FROM "SmartHomeConnection" WHERE userId = ? ORDER BY provider ASC', (user_id,)).fetchall()
    )
    devices = rows_to_dicts(
        conn.execute(
            """SELECT d.*, i.name AS itemName, i.imageUrl AS itemImageUrl, i.model AS itemModel, i.manufacturer AS itemManufacturer
               FROM "SmartHomeDevice" d
               LEFT JOIN "Item" i ON i.id = d.itemId
               WHERE d.userId = ?
               ORDER BY d.updatedAt DESC, d.name ASC""",
            (user_id,),
        ).fetchall()
    )
    commands = rows_to_dicts(
        conn.execute(
            """SELECT c.*, d.name AS deviceName
               FROM "SmartHomeCommand" c
               JOIN "SmartHomeDevice" d ON d.id = c.deviceId
               WHERE c.userId = ?
               ORDER BY c.createdAt DESC
               LIMIT 12""",
            (user_id,),
        ).fetchall()
    )

    for device in devices:
        device["capabilities"] = _json_or_empty_list(device.get("capabilities"))
        if device.get("rawJson"):
            device["rawJson"] = _json_or_empty_dict(device["rawJson"])

    insights = _smart_home_insights(conn, user_id, devices)
    bridge_status = _avareno_bridge_runtime_status()
    home_assistant_ready = bool(bridge_status["homeAssistantUrlConfigured"] and bridge_status["homeAssistantTokenConfigured"])

    return {
        "mode": provider_mode(),
        "providers": [
            {
                "id": AVARENO_BRIDGE_PROVIDER,
                "name": "Avareno Bridge",
                "mode": "LOCAL" if avareno_bridge_enabled() else "PLANNED",
                "status": _provider_status(connections, AVARENO_BRIDGE_PROVIDER),
                "tokenConfigured": bridge_status["reachable"],
                "authNote": "Local helper for Home Assistant and later LAN bridges. Runs on the user's machine; no provider secret is sent to the browser.",
            },
            {
                "id": SMARTTHINGS_PROVIDER,
                "name": "Samsung SmartThings",
                "mode": provider_mode(),
                "status": _provider_status(connections, SMARTTHINGS_PROVIDER),
                "tokenConfigured": bool(smartthings_token()),
                "authNote": "Use SMARTTHINGS_TOKEN for local testing. Production should use OAuth 2.0.",
            },
            {
                "id": BAMBU_LAB_PROVIDER,
                "name": "Bambu Lab",
                "mode": "LAN" if bambu_lab_configured() else "CONFIG_REQUIRED",
                "status": _provider_status(connections, BAMBU_LAB_PROVIDER),
                "tokenConfigured": bambu_lab_configured(),
                "authNote": "Bambu works best through LAN/dev mode with printer IP, serial number and access code.",
            },
            {
                "id": HOME_ASSISTANT_PROVIDER,
                "name": "Home Assistant",
                "mode": "BRIDGED" if avareno_bridge_enabled() else "PLANNED",
                "status": _provider_status(connections, HOME_ASSISTANT_PROVIDER),
                "tokenConfigured": home_assistant_ready,
                "authNote": "Best used through Avareno Bridge so one Home Assistant setup can represent many brands.",
            },
            {
                "id": "ALEXA",
                "name": "Alexa",
                "mode": "PLANNED",
                "status": _provider_status(connections, "ALEXA"),
                "tokenConfigured": False,
                "authNote": "Provider slot for products controlled through Alexa ecosystems.",
            },
            {
                "id": "GOOGLE_HOME",
                "name": "Google Home",
                "mode": "PLANNED",
                "status": _provider_status(connections, "GOOGLE_HOME"),
                "tokenConfigured": False,
                "authNote": "Provider slot for Nest and Google Home device identity.",
            },
            {
                "id": "APPLE_HOME",
                "name": "Apple Home",
                "mode": "PLANNED",
                "status": _provider_status(connections, "APPLE_HOME"),
                "tokenConfigured": False,
                "authNote": "Provider slot for HomeKit-style product matching.",
            },
            {
                "id": "MATTER",
                "name": "Matter",
                "mode": "PLANNED",
                "status": _provider_status(connections, "MATTER"),
                "tokenConfigured": False,
                "authNote": "Future direct device layer.",
            },
            {
                "id": LOCAL_DISCOVERY_PROVIDER,
                "name": "Local Discovery",
                "mode": "LAN" if local_discovery_enabled() else "DISABLED",
                "status": _provider_status(connections, LOCAL_DISCOVERY_PROVIDER),
                "tokenConfigured": local_discovery_enabled(),
                "authNote": "Opt-in local search. Set AVARENO_ENABLE_LAN_DISCOVERY=1 for limited private-LAN probes. Demo devices are not used for local discovery.",
            },
        ],
        "devices": devices,
        "commands": commands,
        "insights": insights,
        "quickActions": [
            {"id": "power_on", "label": "Power on"},
            {"id": "power_off", "label": "Power off"},
            {"id": "mute", "label": "Mute"},
            {"id": "unmute", "label": "Unmute"},
            {"id": "volume_up", "label": "Volume +"},
            {"id": "volume_down", "label": "Volume -"},
        ],
        "wow": {
            "label": "Object Control",
            "promise": "Smart devices become real Avareno objects with proof, warranty, room, state, and safe controls in one place.",
        },
        "localDiscovery": {
            "mode": "LAN" if local_discovery_enabled() else "DISABLED",
            "enabled": local_discovery_enabled(),
            "note": "Local search only runs when the user starts it. No demo devices are returned.",
        },
    }


def connect_provider(conn: sqlite3.Connection, user_id: str, household_id: str, provider: str) -> dict:
    provider = provider.upper()
    now = now_iso()
    existing = row_to_dict(
        conn.execute(
            'SELECT * FROM "SmartHomeConnection" WHERE userId = ? AND householdId = ? AND provider = ?',
            (user_id, household_id, provider),
        ).fetchone()
    )
    status = "CONNECTED" if provider in {SMARTTHINGS_PROVIDER, AVARENO_BRIDGE_PROVIDER, HOME_ASSISTANT_PROVIDER, LOCAL_DISCOVERY_PROVIDER, BAMBU_LAB_PROVIDER} else "PLANNED"
    if existing:
        conn.execute(
            'UPDATE "SmartHomeConnection" SET status = ?, lastSyncAt = ?, updatedAt = ? WHERE id = ?',
            (status, now, now, existing["id"]),
        )
        connection_id = existing["id"]
    else:
        connection_id = make_id()
        conn.execute(
            """INSERT INTO "SmartHomeConnection"
               (id, userId, householdId, provider, status, lastSyncAt, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (connection_id, user_id, household_id, provider, status, now, now, now),
        )
    return row_to_dict(conn.execute('SELECT * FROM "SmartHomeConnection" WHERE id = ?', (connection_id,)).fetchone()) or {}


def sync_provider(conn: sqlite3.Connection, user_id: str, household_id: str, provider: str) -> dict:
    provider = provider.upper()
    connection = connect_provider(conn, user_id, household_id, provider)
    if provider == AVARENO_BRIDGE_PROVIDER:
        source_devices = _fetch_avareno_bridge_devices()
        source = "BRIDGE"
    elif provider == HOME_ASSISTANT_PROVIDER and avareno_bridge_enabled():
        source_devices = _fetch_avareno_bridge_devices()
        source = "BRIDGED_HOME_ASSISTANT"
    elif provider == SMARTTHINGS_PROVIDER and smartthings_token():
        source_devices = _fetch_smartthings_devices()
        source = "LIVE"
    elif provider == BAMBU_LAB_PROVIDER and bambu_lab_configured():
        source_devices = _bambu_lab_devices(conn, user_id)
        source = "LAN"
    else:
        source_devices = []
        source = "NOT_CONFIGURED"

    synced = []
    for source_device in source_devices:
        synced.append(_upsert_device(conn, user_id, household_id, connection["id"], provider, source_device, source))

    now = now_iso()
    conn.execute(
        'UPDATE "SmartHomeConnection" SET status = ?, lastSyncAt = ?, updatedAt = ? WHERE id = ?',
        ("CONNECTED" if synced else connection["status"], now, now, connection["id"]),
    )
    return {"provider": provider, "source": source, "synced": len(synced), "devices": synced}


def home_graph_connect_preview(provider_id: str) -> dict:
    provider = _home_graph_provider_config(provider_id)
    if not provider:
        return {
            "providerId": provider_id,
            "available": False,
            "mode": "PLANNED",
            "title": "Steuerung geplant",
            "message": "Dieser Anbieter ist im Home Graph vorgesehen, aber noch nicht fuer den sicheren Connect-Flow freigeschaltet.",
            "safeCapabilities": [],
            "devices": [],
            "privacyNotes": [
                "Keine Verbindung wurde gestartet.",
                "Keine Zugangsdaten werden gespeichert.",
            ],
        }
    devices = [_home_graph_preview_device(provider, device) for device in provider["sampleDevices"]]
    return {
        "providerId": provider_id,
        "provider": provider["provider"],
        "providerName": provider["name"],
        "appName": provider["appName"],
        "available": True,
        "mode": "MOCK_CONNECT",
        "title": f"{provider['name']} sicher vormerken",
        "message": "Dieser Flow importiert nur Demo-Geraete mit ungefaehrlichen Funktionen. Echte Provider-Logins kommen erst nach Security Review.",
        "safeCapabilities": sorted(HOME_GRAPH_SAFE_CAPABILITIES),
        "devices": devices,
        "privacyNotes": [
            "Es werden keine echten Provider-Zugangsdaten abgefragt.",
            "Es werden nur Name, Raum, Typ und ungefaehrliche Capabilities vorgemerkt.",
            "Keine Locks, Kameras, Alarmanlagen, Heizungen oder sicherheitskritischen Befehle.",
        ],
    }


def confirm_home_graph_connect(conn: sqlite3.Connection, user_id: str, household_id: str, provider_id: str, accepted_capabilities: list[str]) -> dict:
    provider = _home_graph_provider_config(provider_id)
    if not provider:
        raise ValueError("Provider is not available for Home Graph Connect yet")
    accepted = {capability for capability in accepted_capabilities if capability in HOME_GRAPH_SAFE_CAPABILITIES}
    if not accepted:
        raise ValueError("At least one safe capability must be accepted")

    now = now_iso()
    provider_code = provider["provider"]
    existing = row_to_dict(
        conn.execute(
            'SELECT * FROM "SmartHomeConnection" WHERE userId = ? AND householdId = ? AND provider = ?',
            (user_id, household_id, provider_code),
        ).fetchone()
    )
    if existing:
        connection_id = existing["id"]
        conn.execute(
            'UPDATE "SmartHomeConnection" SET status = ?, lastSyncAt = ?, updatedAt = ? WHERE id = ?',
            ("CONNECTED", now, now, connection_id),
        )
    else:
        connection_id = make_id()
        conn.execute(
            """INSERT INTO "SmartHomeConnection"
               (id, userId, householdId, provider, status, lastSyncAt, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (connection_id, user_id, household_id, provider_code, "CONNECTED", now, now, now),
        )

    source_devices = [
        _home_graph_source_device(provider, device, accepted)
        for device in provider["sampleDevices"]
    ]
    devices = [
        _upsert_device(conn, user_id, household_id, connection_id, provider_code, source_device, "HOME_GRAPH_MOCK")
        for source_device in source_devices
    ]
    return {
        "providerId": provider_id,
        "provider": provider_code,
        "mode": "MOCK_CONNECT",
        "connected": True,
        "synced": len(devices),
        "safeCapabilities": sorted(accepted),
        "devices": devices,
        "message": "Provider wurde als Home-Graph-Quelle vorgemerkt. Echte Steuerung ist noch nicht aktiv.",
    }


def execute_command(conn: sqlite3.Connection, user_id: str, device_id: str, command: str, value: Any = None) -> dict:
    device = row_to_dict(
        conn.execute('SELECT * FROM "SmartHomeDevice" WHERE id = ? AND userId = ?', (device_id, user_id)).fetchone()
    )
    if not device:
        raise ValueError("Smart home device not found")

    _assert_command_allowed_for_device(device, command)
    commands = _command_payload(command, value)
    if device["provider"] == SMARTTHINGS_PROVIDER and smartthings_token() and not str(device["providerDeviceId"]).startswith("demo-"):
        status = "SENT"
        result = _send_smartthings_command(device["providerDeviceId"], commands)
    elif device["provider"] == LOCAL_DISCOVERY_PROVIDER and command in LOCAL_TV_COMMANDS:
        status = "SENT"
        result = _send_local_tv_command(device, command)
    else:
        status = "RECORDED"
        result = {"ok": False, "mode": "record_only", "commands": commands}

    now = now_iso()
    if command in {"power_on", "power_off"}:
        raw_json = _json_or_empty_dict(device.get("rawJson"))
        token = _samsung_token_from_result(result)
        if token:
            raw_json["samsungRemoteToken"] = token
        mac = _samsung_mac_from_info(result.get("device") if isinstance(result, dict) else None)
        if mac:
            raw_json["wifiMac"] = mac
        # Trust the real state the command layer reported over the optimistic target,
        # so the UI never shows "off" for a TV we couldn't actually switch.
        result_state = result.get("powerState") if isinstance(result, dict) else None
        if result_state == "on":
            db_power = "on"
        elif result_state in ("off", "standby"):
            db_power = "off"
        elif result_state == "unknown":
            db_power = str(device.get("powerState") or "unknown")
        else:
            db_power = "on" if command == "power_on" else "off"
        conn.execute(
            'UPDATE "SmartHomeDevice" SET powerState = ?, status = ?, rawJson = ?, updatedAt = ?, lastSeenAt = ? WHERE id = ?',
            (db_power, "ONLINE", json.dumps(raw_json), now, now, device_id),
        )
    elif command == "set_brightness":
        raw_json = _json_or_empty_dict(device.get("rawJson"))
        raw_json["brightness"] = max(0, min(100, int(value or 0)))
        conn.execute(
            'UPDATE "SmartHomeDevice" SET status = ?, rawJson = ?, updatedAt = ?, lastSeenAt = ? WHERE id = ?',
            ("ONLINE", json.dumps(raw_json), now, now, device_id),
        )
    elif command in {"volume_up", "volume_down", "mute_toggle", "source_menu"}:
        raw_json = _json_or_empty_dict(device.get("rawJson"))
        raw_json["lastMediaCommand"] = command
        conn.execute(
            'UPDATE "SmartHomeDevice" SET status = ?, rawJson = ?, updatedAt = ?, lastSeenAt = ? WHERE id = ?',
            ("ONLINE", json.dumps(raw_json), now, now, device_id),
        )
    else:
        conn.execute('UPDATE "SmartHomeDevice" SET status = ?, updatedAt = ?, lastSeenAt = ? WHERE id = ?', ("ONLINE", now, now, device_id))

    command_id = make_id()
    conn.execute(
        """INSERT INTO "SmartHomeCommand" (id, userId, deviceId, command, payload, status, result, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (command_id, user_id, device_id, command, json.dumps(commands), status, json.dumps(result), now),
    )
    if device.get("itemId"):
        conn.execute(
            """INSERT INTO "ItemActivity" (id, itemId, userId, type, message, createdAt)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (make_id(), device["itemId"], user_id, "SMART_HOME", f"Smart home command: {command}", now),
        )
    return row_to_dict(conn.execute('SELECT * FROM "SmartHomeCommand" WHERE id = ?', (command_id,)).fetchone()) or {}


def link_device_to_item(conn: sqlite3.Connection, user_id: str, device_id: str, item_id: str | None) -> dict:
    device = row_to_dict(
        conn.execute('SELECT * FROM "SmartHomeDevice" WHERE id = ? AND userId = ?', (device_id, user_id)).fetchone()
    )
    if not device:
        raise ValueError("Smart home device not found")
    if item_id:
        item = row_to_dict(conn.execute('SELECT * FROM "Item" WHERE id = ? AND userId = ?', (item_id, user_id)).fetchone())
        if not item:
            raise ValueError("Item not found")
    conn.execute('UPDATE "SmartHomeDevice" SET itemId = ?, updatedAt = ? WHERE id = ?', (item_id, now_iso(), device_id))
    return row_to_dict(conn.execute('SELECT * FROM "SmartHomeDevice" WHERE id = ?', (device_id,)).fetchone()) or {}


def delete_device(conn: sqlite3.Connection, user_id: str, device_id: str) -> dict:
    device = row_to_dict(
        conn.execute('SELECT * FROM "SmartHomeDevice" WHERE id = ? AND userId = ?', (device_id, user_id)).fetchone()
    )
    if not device:
        raise ValueError("Smart home device not found")
    conn.execute('DELETE FROM "SmartHomeCommand" WHERE deviceId = ?', (device_id,))
    conn.execute('DELETE FROM "SmartHomeDevice" WHERE id = ?', (device_id,))
    return {"removed": True, "id": device_id}


def pair_local_device(conn: sqlite3.Connection, user_id: str, device_id: str) -> dict:
    device = row_to_dict(
        conn.execute('SELECT * FROM "SmartHomeDevice" WHERE id = ? AND userId = ?', (device_id, user_id)).fetchone()
    )
    if not device:
        raise ValueError("Smart home device not found")
    raw_json = _json_or_empty_dict(device.get("rawJson"))
    host = _host_without_port(str(raw_json.get("host") or "").strip())
    text = f"{device.get('name') or ''} {device.get('deviceType') or ''} {json.dumps(raw_json)}".lower()
    if device.get("provider") != LOCAL_DISCOVERY_PROVIDER or ("samsung" not in text and "tv" not in text):
        raise ValueError("Only local Samsung TV pairing is supported")
    result = _pair_samsung_tv(host, str(raw_json.get("samsungRemoteToken") or "").strip() or None)
    token = result.get("token")
    device_info = result.get("device")
    if token:
        raw_json["samsungRemoteToken"] = token
    mac = _samsung_mac_from_info(device_info if isinstance(device_info, dict) else None)
    if mac:
        raw_json["wifiMac"] = mac
    if device_info and isinstance(device_info, dict):
        name = device_info.get("name") or (device_info.get("device") or {}).get("name")
        if name:
            raw_json["friendlyName"] = str(name)
    conn.execute(
        'UPDATE "SmartHomeDevice" SET name = ?, rawJson = ?, updatedAt = ?, lastSeenAt = ? WHERE id = ?',
        (str(raw_json.get("friendlyName") or device.get("name") or "Samsung TV"), json.dumps(raw_json), now_iso(), now_iso(), device_id),
    )
    return {"paired": bool(token), "deviceId": device_id, "result": result}


def discover_local_candidates(conn: sqlite3.Connection, user_id: str) -> dict:
    if local_discovery_enabled():
        candidates = _lan_candidates()
        mode = "LAN"
    else:
        candidates = []
        mode = "DISABLED"
    _attach_local_matches(conn, user_id, candidates)
    return {
        "mode": mode,
        "enabled": local_discovery_enabled(),
        "scannedAt": now_iso(),
        "scope": "Parallel private-subnet probes" if mode == "LAN" else "LAN discovery disabled",
        "candidates": candidates,
    }


def probe_local_host(conn: sqlite3.Connection, user_id: str, host: str) -> dict:
    target_host, target_port = _normalize_probe_target(host)
    ports = [target_port] if target_port else [80, 443, 8008, 8060, 8123, 8883, 990]
    open_ports = _open_ports(target_host, ports)
    candidates = [_candidate_from_open_ports(target_host, open_ports)] if open_ports else []
    _attach_local_matches(conn, user_id, candidates)
    return {
        "mode": "LAN",
        "enabled": True,
        "scannedAt": now_iso(),
        "scope": "Targeted private-host probe",
        "target": target_host,
        "candidates": candidates,
    }


def diagnose_bambu_host(conn: sqlite3.Connection, user_id: str, host: str) -> dict:
    target_host, _target_port = _normalize_probe_target(host)
    port_defs = [
        {"port": 8883, "label": "Bambu LAN MQTT", "meaning": "Used by Bambu LAN mode for printer status/control."},
        {"port": 990, "label": "Bambu LAN FTP", "meaning": "Often used by Bambu printers for LAN file transfer."},
        {"port": 80, "label": "Web/HTTP", "meaning": "Generic device web endpoint."},
        {"port": 443, "label": "Web/HTTPS", "meaning": "Generic secure web endpoint."},
    ]
    open_ports = set(_open_ports(target_host, [entry["port"] for entry in port_defs]))
    ports = [{**entry, "open": entry["port"] in open_ports} for entry in port_defs]
    status = _bambu_diagnostic_status(open_ports)
    next_steps = _bambu_diagnostic_steps(status, target_host)
    matched_item = row_to_dict(
        conn.execute(
            """SELECT id, name, location FROM "Item"
               WHERE userId = ? AND (
                 lower(name) LIKE '%bambu%' OR lower(manufacturer) LIKE '%bambu%' OR lower(category) LIKE '%3d%' OR lower(category) LIKE '%printer%'
               )
               ORDER BY updatedAt DESC LIMIT 1""",
            (user_id,),
        ).fetchone()
    )
    return {
        "target": target_host,
        "status": status,
        "summary": _bambu_diagnostic_summary(status, target_host),
        "ports": ports,
        "nextSteps": next_steps,
        "canPrepareSetup": True,
        "matchedItem": matched_item,
        "suggestedSetup": {
            "host": target_host,
            "model": "Bambu Lab P1S",
            "roomName": matched_item.get("location") if matched_item and matched_item.get("location") else "Werkstatt",
        },
    }


def import_local_candidate(
    conn: sqlite3.Connection, user_id: str, household_id: str, candidate_id: str | None, host: str | None = None
) -> dict:
    if not candidate_id and not host:
        raise ValueError("Local discovery candidate or host is required")

    candidate = _candidate_from_probe(conn, user_id, host) if host else None
    if not candidate and candidate_id:
        candidates = discover_local_candidates(conn, user_id)["candidates"]
        candidate = next((entry for entry in candidates if entry["id"] == candidate_id), None)
        if not candidate:
            inferred_host = _host_from_candidate_id(candidate_id)
            if inferred_host:
                candidate = _candidate_from_probe(conn, user_id, inferred_host)
    if not candidate:
        raise ValueError("Local discovery candidate not found")
    if not _is_user_controllable_candidate(candidate):
        raise ValueError("This local device is not a smart-home capable device")
    connection = connect_provider(conn, user_id, household_id, LOCAL_DISCOVERY_PROVIDER)
    source_device = {
        "id": candidate["id"],
        "label": candidate["name"],
        "roomName": candidate.get("roomName"),
        "type": candidate.get("deviceType", "device"),
        "capabilities": candidate.get("capabilities", []),
        "powerState": "unknown",
        "host": candidate.get("host"),
        "category": candidate.get("category"),
        "identity": candidate.get("identity"),
        "connectHint": candidate.get("connectHint"),
        "recommendedAction": candidate.get("recommendedAction"),
        "manualCheck": candidate.get("manualCheck"),
        "signals": candidate.get("signals", []),
        "confidence": candidate.get("confidence", 0.5),
        "confidenceLabel": candidate.get("confidenceLabel"),
    }
    device = _upsert_device(conn, user_id, household_id, connection["id"], LOCAL_DISCOVERY_PROVIDER, source_device, "LOCAL_LAN" if local_discovery_enabled() else "LOCAL_MANUAL")
    if candidate.get("matchedItemId"):
        conn.execute('UPDATE "SmartHomeDevice" SET itemId = ?, updatedAt = ? WHERE id = ?', (candidate["matchedItemId"], now_iso(), device["id"]))
        device["itemId"] = candidate["matchedItemId"]
    return row_to_dict(conn.execute('SELECT * FROM "SmartHomeDevice" WHERE id = ?', (device["id"],)).fetchone()) or device


def setup_bambu_lab_printer(conn: sqlite3.Connection, user_id: str, household_id: str, payload) -> dict:
    connection = connect_provider(conn, user_id, household_id, BAMBU_LAB_PROVIDER)
    item_id = payload.itemId
    if item_id:
        item = row_to_dict(conn.execute('SELECT * FROM "Item" WHERE id = ? AND userId = ?', (item_id, user_id)).fetchone())
        if not item:
            raise ValueError("Item not found")
    elif payload.createItem:
        item_id = _create_or_find_bambu_item(conn, user_id, household_id, payload)

    source_device = {
        "id": f"bambu-{_slug(payload.serial or payload.host)}",
        "label": f"{payload.model} 3D Printer",
        "roomName": payload.roomName,
        "type": "3d_printer",
        "capabilities": ["printerJob", "temperature", "filament", "networkPresence", "maintenance"],
        "powerState": "on",
        "host": payload.host,
        "serial": payload.serial or None,
        "accessMode": "LAN_READY" if payload.accessCode else "LAN_NEEDS_CODE",
        "accessCodeSet": bool(payload.accessCode),
        "printStatus": "idle",
        "filamentRemaining": 68,
        "nozzleTemp": 27,
        "bedTemp": 24,
        "chamberTemp": 25,
        "signals": ["manual setup", "Bambu LAN slot", "credential stored outside device payload"],
    }
    device = _upsert_device(conn, user_id, household_id, connection["id"], BAMBU_LAB_PROVIDER, source_device, "LAN_READY")
    now = now_iso()
    if item_id:
        conn.execute('UPDATE "SmartHomeDevice" SET itemId = ?, updatedAt = ? WHERE id = ?', (item_id, now, device["id"]))
        conn.execute(
            """INSERT INTO "ItemActivity" (id, itemId, userId, type, message, createdAt)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (make_id(), item_id, user_id, "SMART_HOME", f"Bambu Lab printer connected at {payload.host}", now),
        )
        device["itemId"] = item_id
    conn.execute(
        'DELETE FROM "SmartHomeDevice" WHERE userId = ? AND provider = ? AND providerDeviceId = ? AND itemId IS NULL',
        (user_id, BAMBU_LAB_PROVIDER, "bambu-demo-printer"),
    )
    return {
        "provider": BAMBU_LAB_PROVIDER,
        "device": row_to_dict(conn.execute('SELECT * FROM "SmartHomeDevice" WHERE id = ?', (device["id"],)).fetchone()) or device,
        "item": row_to_dict(conn.execute('SELECT * FROM "Item" WHERE id = ?', (item_id,)).fetchone()) if item_id else None,
        "message": "Bambu printer ready",
    }


def record_bambu_print_event(conn: sqlite3.Connection, user_id: str, payload) -> dict:
    event_type = (payload.eventType or "FINISHED").strip().upper().replace(" ", "_")
    if event_type not in {"STARTED", "FINISHED", "PAUSED", "FAILED", "FILAMENT_LOW"}:
        raise ValueError("Unsupported Bambu print event")

    device = _bambu_device_for_event(conn, user_id, payload.deviceId)
    raw_json = _json_or_empty_dict(device.get("rawJson"))
    now = now_iso()
    job_name = (payload.jobName or raw_json.get("lastJobName") or "current print").strip()
    status_by_event = {
        "STARTED": "printing",
        "FINISHED": "idle",
        "PAUSED": "paused",
        "FAILED": "error",
        "FILAMENT_LOW": "filament low",
    }
    raw_json.update(
        {
            "printStatus": status_by_event[event_type],
            "lastPrintEvent": event_type,
            "lastPrintEventAt": now,
            "lastJobName": job_name,
        }
    )
    if payload.filamentRemaining is not None:
        raw_json["filamentRemaining"] = max(0, min(100, int(payload.filamentRemaining)))
    if payload.nozzleTemp is not None:
        raw_json["nozzleTemp"] = int(payload.nozzleTemp)
    if payload.bedTemp is not None:
        raw_json["bedTemp"] = int(payload.bedTemp)
    if payload.chamberTemp is not None:
        raw_json["chamberTemp"] = int(payload.chamberTemp)

    device_status = "ATTENTION" if event_type in {"FAILED", "FILAMENT_LOW", "PAUSED"} else "ONLINE"
    conn.execute(
        'UPDATE "SmartHomeDevice" SET status = ?, rawJson = ?, updatedAt = ?, lastSeenAt = ? WHERE id = ?',
        (device_status, json.dumps(raw_json), now, now, device["id"]),
    )

    copy = _bambu_event_copy(event_type, job_name, device["name"], payload.message)
    command_id = make_id()
    command_payload = {
        "eventType": event_type,
        "jobName": job_name,
        "filamentRemaining": raw_json.get("filamentRemaining"),
        "printStatus": raw_json.get("printStatus"),
    }
    conn.execute(
        """INSERT INTO "SmartHomeCommand" (id, userId, deviceId, command, payload, status, result, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            command_id,
            user_id,
            device["id"],
            f"bambu_event_{event_type.lower()}",
            json.dumps(command_payload),
            "EVENT",
            json.dumps({"ok": True, "message": copy["message"]}),
            now,
        ),
    )

    if device.get("itemId"):
        conn.execute(
            """INSERT INTO "ItemActivity" (id, itemId, userId, type, message, createdAt)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (make_id(), device["itemId"], user_id, "BAMBU_PRINT", copy["activity"], now),
        )

    reminder = None
    if event_type in {"FINISHED", "PAUSED", "FAILED", "FILAMENT_LOW"}:
        reminder = _upsert_bambu_event_reminder(conn, user_id, device.get("itemId"), copy, now)

    updated_device = row_to_dict(
        conn.execute(
            """SELECT d.*, i.name AS itemName, i.imageUrl AS itemImageUrl, i.model AS itemModel, i.manufacturer AS itemManufacturer
               FROM "SmartHomeDevice" d
               LEFT JOIN "Item" i ON i.id = d.itemId
               WHERE d.id = ?""",
            (device["id"],),
        ).fetchone()
    )
    if updated_device:
        updated_device["capabilities"] = _json_or_empty_list(updated_device.get("capabilities"))
        updated_device["rawJson"] = _json_or_empty_dict(updated_device.get("rawJson"))
    return {
        "device": updated_device,
        "command": row_to_dict(conn.execute('SELECT * FROM "SmartHomeCommand" WHERE id = ?', (command_id,)).fetchone()),
        "reminder": reminder,
        "message": copy["message"],
    }


def activate_smart_home_insight(conn: sqlite3.Connection, user_id: str, insight_id: str) -> dict:
    devices = rows_to_dicts(
        conn.execute(
            """SELECT d.*, i.name AS itemName, i.imageUrl AS itemImageUrl, i.model AS itemModel, i.manufacturer AS itemManufacturer
               FROM "SmartHomeDevice" d
               LEFT JOIN "Item" i ON i.id = d.itemId
               WHERE d.userId = ?""",
            (user_id,),
        ).fetchall()
    )
    for device in devices:
        if device.get("rawJson"):
            device["rawJson"] = _json_or_empty_dict(device["rawJson"])
    insights = _smart_home_insights(conn, user_id, devices)
    insight = next((entry for entry in insights if entry["id"] == insight_id), None)
    if not insight:
        raise ValueError("Smart home insight not found")
    if insight["actionType"] != "CREATE_PLAN":
        raise ValueError("Insight needs a manual action")

    item_id = insight.get("itemId")
    title = insight["planTitle"]
    existing = row_to_dict(
        conn.execute(
            """SELECT * FROM "Loop"
               WHERE userId = ? AND title = ? AND COALESCE(itemId, '') = COALESCE(?, '') AND status IN ('OPEN', 'SNOOZED')
               ORDER BY createdAt DESC LIMIT 1""",
            (user_id, title, item_id),
        ).fetchone()
    )
    if existing:
        return {"insight": insight, "loop": existing, "reminder": None, "message": "Plan already exists"}

    now = now_iso()
    due_at = (datetime.now(timezone.utc) + timedelta(days=insight.get("dueInDays", 7))).isoformat()
    loop_id = make_id()
    conn.execute(
        """INSERT INTO "Loop"
           (id, userId, itemId, title, description, sourceType, priority, status, dueDate, reminderAt, xpReward, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            loop_id,
            user_id,
            item_id,
            title,
            insight["planNote"],
            "DEVICE",
            insight.get("priority", "MEDIUM"),
            "OPEN",
            due_at,
            due_at,
            insight.get("xpReward", 35),
            now,
            now,
        ),
    )
    reminder_id = make_id()
    conn.execute(
        """INSERT INTO "Reminder"
           (id, userId, loopId, itemId, title, message, remindAt, status, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            reminder_id,
            user_id,
            loop_id,
            item_id,
            title,
            insight["planNote"],
            due_at,
            "ACTIVE",
            now,
            now,
        ),
    )
    if item_id:
        conn.execute(
            """INSERT INTO "ItemActivity" (id, itemId, userId, type, message, createdAt)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (make_id(), item_id, user_id, "SMART_HOME", f"Smart insight activated: {title}", now),
        )
    loop = row_to_dict(conn.execute('SELECT * FROM "Loop" WHERE id = ?', (loop_id,)).fetchone())
    reminder = row_to_dict(conn.execute('SELECT * FROM "Reminder" WHERE id = ?', (reminder_id,)).fetchone())
    return {"insight": insight, "loop": loop, "reminder": reminder, "message": "Smart plan created"}


def _provider_status(connections: list[dict], provider: str) -> str:
    for connection in connections:
        if connection["provider"] == provider:
            return connection["status"]
    return "AVAILABLE" if provider in {SMARTTHINGS_PROVIDER, AVARENO_BRIDGE_PROVIDER, LOCAL_DISCOVERY_PROVIDER, BAMBU_LAB_PROVIDER} else "PLANNED"


def _create_or_find_bambu_item(conn: sqlite3.Connection, user_id: str, household_id: str, payload) -> str:
    model = payload.model.strip() or "Bambu Lab Printer"
    room = payload.roomName.strip() or "Werkstatt"
    existing = row_to_dict(
        conn.execute(
            """SELECT * FROM "Item"
               WHERE userId = ? AND lower(manufacturer) = ? AND lower(model) = lower(?)
               ORDER BY updatedAt DESC LIMIT 1""",
            (user_id, "bambu lab", model),
        ).fetchone()
    )
    if existing:
        return existing["id"]

    now = now_iso()
    item_id = make_id()
    space_id = _space_for_room(conn, household_id, room)
    notes = "Created from Bambu Lab smart setup. Add purchase proof, nozzle size, plate type, AMS status and filament preferences."
    conn.execute(
        """INSERT INTO "Item"
           (id, userId, householdId, spaceId, name, itemType, category, manufacturer, model, serialNumber, purchaseDate, merchant, price,
            currency, imageUrl, warrantyUntil, location, notes, reorderUrl, affiliateUrl, affiliateProvider, visibility, completenessScore, status, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            item_id,
            user_id,
            household_id,
            space_id,
            f"{model} 3D Printer",
            "ELECTRONIC",
            "3D Printer",
            "Bambu Lab",
            model,
            payload.serial,
            None,
            None,
            None,
            "EUR",
            None,
            None,
            room,
            notes,
            None,
            None,
            None,
            "HOUSEHOLD",
            55 if payload.serial else 45,
            "ACTIVE",
            now,
            now,
        ),
    )
    conn.execute(
        """INSERT INTO "ItemActivity" (id, itemId, userId, type, message, createdAt)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (make_id(), item_id, user_id, "SMART_HOME", "Bambu Lab product profile created from smart setup", now),
    )
    return item_id


def _space_for_room(conn: sqlite3.Connection, household_id: str, room: str) -> str | None:
    existing = row_to_dict(
        conn.execute(
            'SELECT * FROM "Space" WHERE householdId = ? AND lower(name) = lower(?) LIMIT 1',
            (household_id, room),
        ).fetchone()
    )
    if existing:
        return existing["id"]
    root = row_to_dict(
        conn.execute(
            'SELECT * FROM "Space" WHERE householdId = ? AND parentId IS NULL ORDER BY sortOrder ASC LIMIT 1',
            (household_id,),
        ).fetchone()
    )
    now = now_iso()
    space_id = make_id()
    conn.execute(
        """INSERT INTO "Space" (id, householdId, parentId, name, type, sortOrder, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (space_id, household_id, root["id"] if root else None, room, "ROOM", 80, now, now),
    )
    return space_id


def _bambu_device_for_event(conn: sqlite3.Connection, user_id: str, device_id: str | None) -> dict:
    if device_id:
        device = row_to_dict(
            conn.execute(
                """SELECT * FROM "SmartHomeDevice"
                   WHERE id = ? AND userId = ? AND provider = ? AND deviceType = ?""",
                (device_id, user_id, BAMBU_LAB_PROVIDER, "3d_printer"),
            ).fetchone()
        )
    else:
        device = row_to_dict(
            conn.execute(
                """SELECT * FROM "SmartHomeDevice"
                   WHERE userId = ? AND provider = ? AND deviceType = ?
                   ORDER BY updatedAt DESC LIMIT 1""",
                (user_id, BAMBU_LAB_PROVIDER, "3d_printer"),
            ).fetchone()
        )
    if not device:
        raise ValueError("Bambu printer not found")
    return device


def _bambu_event_copy(event_type: str, job_name: str, device_name: str, custom_message: str | None) -> dict:
    title_by_event = {
        "STARTED": f"Print started: {job_name}",
        "FINISHED": f"Print finished: {job_name}",
        "PAUSED": f"Print paused: {job_name}",
        "FAILED": f"Print needs attention: {job_name}",
        "FILAMENT_LOW": f"Filament low: {device_name}",
    }
    default_message_by_event = {
        "STARTED": f"{device_name} started {job_name}.",
        "FINISHED": f"{device_name} finished {job_name}. Remove the print, check the plate and save notes if needed.",
        "PAUSED": f"{device_name} paused {job_name}. Check the printer before the job sits too long.",
        "FAILED": f"{device_name} reported a problem during {job_name}. Check nozzle, plate, filament and error screen.",
        "FILAMENT_LOW": f"{device_name} is low on filament. Check the loaded spool and reorder stock.",
    }
    message = custom_message or default_message_by_event[event_type]
    return {
        "title": title_by_event[event_type],
        "message": message,
        "activity": f"{title_by_event[event_type]} - {message}",
    }


def _upsert_bambu_event_reminder(
    conn: sqlite3.Connection, user_id: str, item_id: str | None, copy: dict, remind_at: str
) -> dict:
    existing = row_to_dict(
        conn.execute(
            """SELECT * FROM "Reminder"
               WHERE userId = ? AND COALESCE(itemId, '') = COALESCE(?, '') AND title = ? AND status = 'ACTIVE'
               ORDER BY createdAt DESC LIMIT 1""",
            (user_id, item_id, copy["title"]),
        ).fetchone()
    )
    if existing:
        conn.execute(
            'UPDATE "Reminder" SET message = ?, remindAt = ?, updatedAt = ? WHERE id = ?',
            (copy["message"], remind_at, remind_at, existing["id"]),
        )
        return row_to_dict(conn.execute('SELECT * FROM "Reminder" WHERE id = ?', (existing["id"],)).fetchone()) or existing

    reminder_id = make_id()
    conn.execute(
        """INSERT INTO "Reminder"
           (id, userId, loopId, itemId, title, message, remindAt, status, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (reminder_id, user_id, None, item_id, copy["title"], copy["message"], remind_at, "ACTIVE", remind_at, remind_at),
    )
    return row_to_dict(conn.execute('SELECT * FROM "Reminder" WHERE id = ?', (reminder_id,)).fetchone()) or {}


def _smart_home_insights(conn: sqlite3.Connection, user_id: str, devices: list[dict]) -> list[dict]:
    active_loop_titles = {
        row["title"]
        for row in conn.execute(
            """SELECT title FROM "Loop"
               WHERE userId = ? AND status IN ('OPEN', 'SNOOZED') AND sourceType = 'DEVICE'""",
            (user_id,),
        ).fetchall()
    }
    insights: list[dict] = []
    linked_devices = [device for device in devices if device.get("itemId")]
    unlinked_devices = [device for device in devices if not device.get("itemId")]

    for device in linked_devices:
        item_name = device.get("itemName") or "linked product"
        if device.get("deviceType") == "tv":
            insights.append(
                _plan_insight(
                    device,
                    item_name,
                    "TV care autopilot",
                    "Screen care, firmware check, remote/control test and warranty context in one reminder.",
                    f"Smart care: {item_name}",
                    "Clean screen safely, check firmware, verify remote/control state, and attach any missing warranty context.",
                    due_in_days=14,
                    priority="MEDIUM",
                    active_loop_titles=active_loop_titles,
                    signal="Product + smart device are linked",
                )
            )
        elif device.get("deviceType") == "3d_printer":
            raw_json = device.get("rawJson") if isinstance(device.get("rawJson"), dict) else {}
            filament = raw_json.get("filamentRemaining")
            insights.append(
                _plan_insight(
                    device,
                    item_name,
                    "Print finish alerts",
                    "Turn Bambu status into Avareno notifications for done, paused, failed and attention-needed prints.",
                    f"Set Bambu alerts: {item_name}",
                    "Set print-finished, paused, failed and attention-needed notification rules for this Bambu printer.",
                    due_in_days=1,
                    priority="HIGH",
                    active_loop_titles=active_loop_titles,
                    signal="Bambu printer linked",
                )
            )
            insights.append(
                _plan_insight(
                    device,
                    item_name,
                    "Filament watch",
                    f"Track spool status and reorder timing{f' around {filament}% remaining' if filament else ''}.",
                    f"Check filament stock: {item_name}",
                    "Check loaded filament, spare spool stock, preferred material and reorder link.",
                    due_in_days=7,
                    priority="MEDIUM",
                    active_loop_titles=active_loop_titles,
                    signal="Consumable object",
                )
            )
            insights.append(
                _plan_insight(
                    device,
                    item_name,
                    "Printer care routine",
                    "Nozzle, build plate, AMS, belts and firmware get a recurring care loop.",
                    f"Bambu maintenance: {item_name}",
                    "Clean build plate, inspect nozzle, check AMS path, verify belts and firmware status.",
                    due_in_days=21,
                    priority="MEDIUM",
                    active_loop_titles=active_loop_titles,
                    signal="Maintenance-heavy object",
                )
            )
        elif device.get("deviceType") == "light":
            insights.append(
                _plan_insight(
                    device,
                    item_name,
                    "Light health check",
                    "Check room assignment, brightness range, scenes and replacement notes before it becomes annoying.",
                    f"Smart check: {item_name}",
                    "Verify room, brightness, scenes and replacement details for this light.",
                    due_in_days=30,
                    priority="LOW",
                    active_loop_titles=active_loop_titles,
                    signal="Controllable light found",
                )
            )
        else:
            insights.append(
                _plan_insight(
                    device,
                    item_name,
                    "Object health note",
                    "Save the useful operational details while the device is already connected.",
                    f"Smart object check: {item_name}",
                    "Review smart status, room, model, warranty and useful notes for this connected object.",
                    due_in_days=21,
                    priority="MEDIUM",
                    active_loop_titles=active_loop_titles,
                    signal="Connected object",
                )
            )

        raw_json = device.get("rawJson") if isinstance(device.get("rawJson"), dict) else {}
        if raw_json.get("host"):
            insights.append(
                _plan_insight(
                    device,
                    item_name,
                    "Local identity saved",
                    f"Keep local network identity documented for support: {raw_json.get('host')}.",
                    f"Save local identity: {item_name}",
                    f"Confirm local host {raw_json.get('host')}, provider, room and fallback control notes.",
                    due_in_days=7,
                    priority="LOW",
                    active_loop_titles=active_loop_titles,
                    signal="Local discovery match",
                )
            )

    for device in unlinked_devices[:3]:
        if device.get("deviceType") == "3d_printer":
            insights.append(
                _plan_insight(
                    device,
                    device.get("name") or "Bambu Lab printer",
                    "Bambu setup checklist",
                    "Prepare LAN/dev mode, serial number, access code, filament watch and print-finish notifications.",
                    f"Set up Bambu in Avareno: {device.get('name') or '3D Printer'}",
                    "Add printer model, room, serial/access-code notes, filament preferences and print-finish notification rules.",
                    due_in_days=1,
                    priority="HIGH",
                    active_loop_titles=active_loop_titles,
                    signal="Bambu printer found",
                )
            )
        insights.append(
            {
                "id": f"link-{device['id']}",
                "type": "MATCH_OBJECT",
                "deviceId": device["id"],
                "itemId": None,
                "title": "Match to physical product",
                "subtitle": f"{device['name']} is controllable, but not yet connected to an Avareno object.",
                "signal": "Needs product identity",
                "priority": "HIGH",
                "actionType": "LINK_ITEM",
                "cta": "Choose product",
                "status": "READY",
                "automation": {
                    "trigger": "Unmatched smart device",
                    "action": "Attach it to the real product record",
                    "outcome": "Controls, warranty, receipt and care history stay together",
                    "channels": ["web", "mobile-ready"],
                },
            }
        )

    has_home_assistant = any(device.get("provider") in {AVARENO_BRIDGE_PROVIDER, HOME_ASSISTANT_PROVIDER} for device in devices)
    if not has_home_assistant:
        insights.append(
            {
                "id": "bridge-home-assistant",
                "type": "BRIDGE",
                "deviceId": None,
                "itemId": None,
                "title": "Avareno Bridge",
                "subtitle": "A local bridge can turn one Home Assistant setup into a central Avareno device layer.",
                "signal": "Local bridge foundation",
                "priority": "MEDIUM",
                "actionType": "DISCOVER_LOCAL",
                "cta": "Search local",
                "status": "READY",
                "automation": {
                    "trigger": "Device identity is missing",
                    "action": "Run opt-in local discovery",
                    "outcome": "Find LAN devices that can be matched to physical things",
                    "channels": ["local", "mobile-ready"],
                },
            }
        )

    unique_insights: list[dict] = []
    seen_plan_titles: set[str] = set()
    for insight in insights:
        plan_title = insight.get("planTitle")
        if plan_title:
            if plan_title in seen_plan_titles:
                continue
            seen_plan_titles.add(plan_title)
        unique_insights.append(insight)

    return unique_insights[:8]


def _plan_insight(
    device: dict,
    item_name: str,
    title: str,
    subtitle: str,
    plan_title: str,
    plan_note: str,
    due_in_days: int,
    priority: str,
    active_loop_titles: set[str],
    signal: str,
) -> dict:
    return {
        "id": f"plan-{device['id']}-{_slug(plan_title)}",
        "type": "CARE_PLAN",
        "deviceId": device["id"],
        "itemId": device.get("itemId"),
        "title": title,
        "subtitle": subtitle,
        "signal": signal,
        "priority": priority,
        "actionType": "CREATE_PLAN",
        "cta": "Create plan",
        "status": "ACTIVE" if plan_title in active_loop_titles else "READY",
        "planTitle": plan_title,
        "planNote": plan_note,
        "dueInDays": due_in_days,
        "xpReward": 35,
        "itemName": item_name,
        "automation": _automation_preview(signal, plan_title, plan_note, due_in_days),
    }


def _automation_preview(signal: str, plan_title: str, plan_note: str, due_in_days: int) -> dict:
    return {
        "trigger": signal,
        "action": plan_note,
        "outcome": f"{plan_title} becomes a reminder, activity log and mobile-ready notification.",
        "nextRun": f"in {due_in_days} day{'s' if due_in_days != 1 else ''}",
        "channels": ["planner", "notifications", "mobile-ready"],
    }


def _slug(value: str) -> str:
    cleaned = "".join(character.lower() if character.isalnum() else "-" for character in value)
    return "-".join(part for part in cleaned.split("-") if part)[:72]


def _fetch_smartthings_devices() -> list[dict]:
    data = _smartthings_request("/devices")
    return data.get("items", []) if isinstance(data, dict) else []


def _fetch_avareno_bridge_devices() -> list[dict]:
    if not avareno_bridge_enabled():
        raise RuntimeError("AVARENO_ENABLE_LOCAL_BRIDGE and AVARENO_BRIDGE_URL are required for local bridge sync")
    if os.environ.get("AVARENO_ENV", os.environ.get("ENV", "")).lower() in {"production", "prod"}:
        raise RuntimeError("Direct local bridge polling is disabled in production; use a paired outbound bridge later")
    data = _bridge_request("/home-assistant/entities")
    entities = data.get("entities") if isinstance(data, dict) else None
    if not isinstance(entities, list):
        raise RuntimeError("Avareno Bridge returned an unexpected entity payload")
    return [entity for entity in entities if isinstance(entity, dict)]


def _avareno_bridge_runtime_status() -> dict:
    status = {
        "reachable": False,
        "homeAssistantUrlConfigured": False,
        "homeAssistantTokenConfigured": False,
    }
    if not avareno_bridge_enabled():
        return status
    try:
        payload = _bridge_request("/home-assistant/status", timeout=2)
    except RuntimeError:
        return status
    status["reachable"] = True
    status["homeAssistantUrlConfigured"] = bool(payload.get("urlConfigured"))
    status["homeAssistantTokenConfigured"] = bool(payload.get("tokenConfigured"))
    return status


def _home_graph_provider_config(provider_id: str) -> dict | None:
    return HOME_GRAPH_CONNECT_PROVIDERS.get(provider_id.strip().lower())


def _home_graph_preview_device(provider: dict, source_device: dict) -> dict:
    capabilities = _extract_capabilities(source_device)
    safe_capabilities = _safe_home_graph_capabilities(capabilities)
    return {
        "id": source_device["id"],
        "name": source_device["label"],
        "roomName": source_device.get("roomName"),
        "deviceType": source_device.get("type", "device"),
        "providerName": provider["name"],
        "connectionLevel": 3 if safe_capabilities else 1,
        "isControllable": bool(safe_capabilities),
        "capabilities": safe_capabilities,
    }


def _home_graph_source_device(provider: dict, source_device: dict, accepted_capabilities: set[str]) -> dict:
    source_capabilities = _extract_capabilities(source_device)
    safe_capabilities = [capability for capability in _safe_home_graph_capabilities(source_capabilities) if capability in accepted_capabilities]
    provider_device_id = f"{provider['provider'].lower()}-{source_device['id']}"
    return {
        **source_device,
        "id": provider_device_id,
        "deviceId": provider_device_id,
        "capabilities": _smartthings_capabilities_from_home_graph(safe_capabilities),
        "homeGraphCapabilities": safe_capabilities,
        "connectionLevel": 3 if safe_capabilities else 1,
        "isControllable": bool(safe_capabilities),
        "providerApp": provider["appName"],
    }


def _safe_home_graph_capabilities(source_capabilities: list[str]) -> list[str]:
    normalized = {capability.lower() for capability in source_capabilities}
    safe: list[str] = []
    if "switch" in normalized:
        safe.append("power")
    if "switchlevel" in normalized or "brightness" in normalized:
        safe.append("brightness")
    return [capability for capability in safe if capability in HOME_GRAPH_SAFE_CAPABILITIES]


def _smartthings_capabilities_from_home_graph(capabilities: list[str]) -> list[str]:
    translated: list[str] = []
    if "power" in capabilities:
        translated.append("switch")
    if "brightness" in capabilities:
        translated.append("switchLevel")
    return translated


def _bridge_request(path: str, timeout: int = 8) -> dict:
    base_url = avareno_bridge_url()
    if not base_url.startswith(("http://127.0.0.1:", "http://localhost:")):
        raise RuntimeError("Local bridge URL must point to localhost in the MVP")
    request = urllib.request.Request(
        f"{base_url}{path}",
        headers={"Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
            payload = json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"Avareno Bridge error {exc.code}: provider request failed") from exc
    except (urllib.error.URLError, json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise RuntimeError("Avareno Bridge is not reachable") from exc
    if isinstance(payload, dict) and payload.get("error"):
        raise RuntimeError("Avareno Bridge could not read Home Assistant")
    return payload if isinstance(payload, dict) else {}


def _send_smartthings_command(provider_device_id: str, commands: list[dict]) -> dict:
    return _smartthings_request(f"/devices/{provider_device_id}/commands", method="POST", body={"commands": commands})


def _send_local_tv_command(device: dict, command: str) -> dict:
    raw_json = _json_or_empty_dict(device.get("rawJson"))
    host = _host_without_port(str(raw_json.get("host") or "").strip())
    token = str(raw_json.get("samsungRemoteToken") or "").strip() or None
    device_info = _samsung_device_info(host) if host else None
    text = " ".join(
        [
            str(device.get("name") or ""),
            str(device.get("deviceType") or ""),
            json.dumps(raw_json),
        ]
    ).lower()
    if not host:
        raise RuntimeError("Local device has no host address for direct control")
    if "samsung" not in text and "tv" not in text:
        raise RuntimeError("Direct local control is only enabled for detected TV devices")
    _resolve_private_host(host)

    if command in LOCAL_SAMSUNG_REMOTE_KEYS:
        result = _send_samsung_tv_key(host, LOCAL_SAMSUNG_REMOTE_KEYS[command], token)
        result["mode"] = result.get("mode") or "samsung_local"
        result["device"] = device_info
        result["powerState"] = _samsung_power_state(device_info) or str(device.get("powerState") or "unknown")
        if not result.get("token") and device_info and _samsung_token_auth_supported(device_info):
            result["pairingHint"] = "Approve Avareno as a remote control on the Samsung TV if the command has no visible effect."
        return result

    # Samsung's KEY_POWER is a TOGGLE. Never send it blindly — first read the real
    # power state and only act when it actually changes the state the user asked for.
    power_state = _samsung_power_state(device_info)

    if command == "power_on":
        # KEY_POWERON is discrete (never toggles off). Wake-on-LAN wakes a fully-off panel.
        if power_state == "on":
            return {"ok": True, "mode": "already_on", "host": host, "powerState": "on", "skipped": True, "device": device_info}
        wol_result = _send_wake_on_lan_for_host(host, _samsung_mac_from_info(device_info) or str(raw_json.get("wifiMac") or ""))
        try:
            ws_result = _send_samsung_tv_key(host, "KEY_POWERON", token)
            return {"ok": True, "mode": "samsung_local", "powerState": "on", "wakeOnLan": wol_result, "remote": ws_result, "device": device_info}
        except RuntimeError:
            if wol_result.get("sent"):
                return {"ok": True, "mode": "wake_on_lan", "host": host, "powerState": "on", "wakeOnLan": wol_result, "device": device_info}
            raise

    # command == "power_off"
    if power_state in ("standby", "off"):
        # Already off — sending the KEY_POWER toggle here would turn the TV back ON.
        return {"ok": True, "mode": "already_off", "host": host, "powerState": "standby", "skipped": True, "device": device_info}
    if power_state is None:
        # We can't confirm the TV is on. Refuse to toggle blindly (risk: turning it on).
        return {
            "ok": False,
            "mode": "unknown_state",
            "host": host,
            "powerState": "unknown",
            "device": device_info,
            "pairingHint": "TV-Status nicht erreichbar. Ausschalten wurde nicht gesendet, um kein versehentliches Einschalten auszulösen.",
        }

    # power_state == "on" -> KEY_POWER now safely toggles the TV OFF.
    result = _send_samsung_tv_key(host, "KEY_POWER", token)
    result["mode"] = result.get("mode") or "samsung_local"
    result["powerState"] = "off"
    result["device"] = device_info
    if not result.get("token") and device_info and _samsung_token_auth_supported(device_info):
        result["pairingHint"] = "Approve Avareno as a remote control on the Samsung TV if the command has no visible effect."
    return result


def _samsung_power_state(info: dict | None) -> str | None:
    """Return 'on' / 'standby' from the Samsung /api/v2/ device info, or None if unknown."""
    if not info:
        return None
    device = info.get("device")
    if isinstance(device, dict):
        raw = device.get("PowerState") or device.get("powerState")
        if raw:
            state = str(raw).strip().lower()
            if state == "on":
                return "on"
            if state in ("standby", "off", "sleep"):
                return "standby"
            return state
    return None


def _host_without_port(host: str) -> str:
    if host.count(":") == 1:
        name, maybe_port = host.rsplit(":", 1)
        if maybe_port.isdigit():
            return name
    return host


def _samsung_device_info(host: str) -> dict | None:
    try:
        with urllib.request.urlopen(f"http://{host}:8001/api/v2/", timeout=2.5) as response:
            data = json.loads(response.read().decode("utf-8"))
            return data if isinstance(data, dict) else None
    except (OSError, urllib.error.URLError, json.JSONDecodeError, UnicodeDecodeError):
        return None


def _samsung_mac_from_info(info: dict | None) -> str | None:
    if not info:
        return None
    device = info.get("device")
    if isinstance(device, dict):
        raw = device.get("wifiMac") or device.get("mac")
        if raw:
            return str(raw).lower()
    return None


def _samsung_token_auth_supported(info: dict | None) -> bool:
    if not info:
        return False
    device = info.get("device")
    if isinstance(device, dict) and str(device.get("TokenAuthSupport")).lower() == "true":
        return True
    return "TokenAuthSupport" in str(info.get("isSupport") or "")


def _send_samsung_tv_key(host: str, key: str, token: str | None = None) -> dict:
    errors: list[str] = []
    for port, secure in ((8002, True), (8001, False)):
        try:
            return _send_samsung_ws_remote_key(host, port, secure, key, token)
        except OSError as exc:
            errors.append(f"{port}: {type(exc).__name__}")
    raise RuntimeError(
        "Samsung TV did not accept the local command. Turn the TV on, approve the Avareno remote prompt on the TV, "
        "or connect SmartThings for cloud control."
    )


def _pair_samsung_tv(host: str, token: str | None = None) -> dict:
    _resolve_private_host(host)
    device_info = _samsung_device_info(host)
    errors: list[str] = []
    for port, secure in ((8002, True), (8001, False)):
        sock = None
        try:
            app_name = base64.b64encode(b"Avareno").decode("ascii")
            path = f"/api/v2/channels/samsung.remote.control?name={urllib.parse.quote(app_name)}"
            if token:
                path += f"&token={urllib.parse.quote(token)}"
            ws_key = base64.b64encode(os.urandom(16)).decode("ascii")
            expected_accept = base64.b64encode(
                hashlib.sha1((ws_key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode("ascii")).digest()
            ).decode("ascii")
            sock = socket.create_connection((host, port), timeout=2.2)
            if secure:
                sock = ssl._create_unverified_context().wrap_socket(sock, server_hostname=host)
            request = (
                f"GET {path} HTTP/1.1\r\n"
                f"Host: {host}:{port}\r\n"
                "Upgrade: websocket\r\n"
                "Connection: Upgrade\r\n"
                f"Sec-WebSocket-Key: {ws_key}\r\n"
                "Sec-WebSocket-Version: 13\r\n"
                "Origin: http://localhost\r\n"
                "\r\n"
            )
            sock.sendall(request.encode("ascii"))
            response = _read_websocket_handshake(sock)
            if b" 101 " not in response.split(b"\r\n", 1)[0]:
                raise OSError("websocket upgrade rejected")
            if expected_accept.encode("ascii") not in response:
                raise OSError("websocket accept mismatch")
            messages = _read_websocket_json_messages(sock, 8.0 if not token else 1.0)
            paired_token = token or _samsung_token_from_messages(messages)
            result = {"ok": True, "mode": "samsung_pair", "host": host, "port": port, "device": device_info}
            if paired_token:
                result["token"] = paired_token
            elif device_info and _samsung_token_auth_supported(device_info):
                result["pairingHint"] = "Approve Avareno as a remote control on the Samsung TV."
            return result
        except OSError as exc:
            errors.append(f"{port}: {type(exc).__name__}")
        finally:
            if sock is not None:
                try:
                    sock.close()
                except OSError:
                    pass
    raise RuntimeError("Samsung TV pairing did not open. Make sure the TV is on and in the same network.")


def _send_samsung_ws_remote_key(host: str, port: int, secure: bool, key: str, token: str | None = None) -> dict:
    app_name = base64.b64encode(b"Avareno").decode("ascii")
    path = f"/api/v2/channels/samsung.remote.control?name={urllib.parse.quote(app_name)}"
    if token:
        path += f"&token={urllib.parse.quote(token)}"
    ws_key = base64.b64encode(os.urandom(16)).decode("ascii")
    expected_accept = base64.b64encode(
        hashlib.sha1((ws_key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode("ascii")).digest()
    ).decode("ascii")
    sock = socket.create_connection((host, port), timeout=2.2)
    if secure:
        context = ssl._create_unverified_context()
        sock = context.wrap_socket(sock, server_hostname=host)
    try:
        request = (
            f"GET {path} HTTP/1.1\r\n"
            f"Host: {host}:{port}\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {ws_key}\r\n"
            "Sec-WebSocket-Version: 13\r\n"
            "Origin: http://localhost\r\n"
            "\r\n"
        )
        sock.sendall(request.encode("ascii"))
        response = _read_websocket_handshake(sock)
        if b" 101 " not in response.split(b"\r\n", 1)[0]:
            raise OSError("websocket upgrade rejected")
        if expected_accept.encode("ascii") not in response:
            raise OSError("websocket accept mismatch")

        messages = _read_websocket_json_messages(sock, 5.5 if not token else 0.8)
        paired_token = _samsung_token_from_messages(messages)
        time.sleep(0.18)
        payload = json.dumps(
            {
                "method": "ms.remote.control",
                "params": {
                    "Cmd": "Click",
                    "DataOfCmd": key,
                    "Option": "false",
                    "TypeOfRemote": "SendRemoteKey",
                },
            }
        ).encode("utf-8")
        sock.sendall(_masked_websocket_text_frame(payload))
        messages.extend(_read_websocket_json_messages(sock, 0.7))
        time.sleep(0.25)
        paired_token = paired_token or _samsung_token_from_messages(messages)
        result = {"ok": True, "mode": "samsung_local", "host": host, "port": port, "key": key}
        if paired_token:
            result["token"] = paired_token
        return result
    finally:
        try:
            sock.close()
        except OSError:
            pass


def _read_websocket_handshake(sock: socket.socket) -> bytes:
    chunks: list[bytes] = []
    sock.settimeout(2.2)
    while b"\r\n\r\n" not in b"".join(chunks):
        chunk = sock.recv(1024)
        if not chunk:
            break
        chunks.append(chunk)
        if sum(len(part) for part in chunks) > 8192:
            break
    return b"".join(chunks)


def _read_websocket_json_messages(sock: socket.socket, seconds: float) -> list[dict]:
    deadline = time.monotonic() + seconds
    messages: list[dict] = []
    sock.settimeout(0.22)
    while time.monotonic() < deadline:
        try:
            frame = _read_websocket_frame(sock)
        except TimeoutError:
            continue
        except (OSError, ValueError):
            break
        if not frame:
            break
        opcode, payload = frame
        if opcode != 1:
            continue
        try:
            data = json.loads(payload.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            continue
        if isinstance(data, dict):
            messages.append(data)
    return messages


def _read_websocket_frame(sock: socket.socket) -> tuple[int, bytes] | None:
    header = _recv_exact(sock, 2)
    if not header:
        return None
    first, second = header
    opcode = first & 0x0F
    masked = bool(second & 0x80)
    length = second & 0x7F
    if length == 126:
        length = int.from_bytes(_recv_exact(sock, 2), "big")
    elif length == 127:
        length = int.from_bytes(_recv_exact(sock, 8), "big")
    mask = _recv_exact(sock, 4) if masked else b""
    payload = _recv_exact(sock, length) if length else b""
    if masked and mask:
        payload = bytes(byte ^ mask[index % 4] for index, byte in enumerate(payload))
    return opcode, payload


def _recv_exact(sock: socket.socket, size: int) -> bytes:
    chunks: list[bytes] = []
    remaining = size
    while remaining > 0:
        chunk = sock.recv(remaining)
        if not chunk:
            raise OSError("websocket closed")
        chunks.append(chunk)
        remaining -= len(chunk)
    return b"".join(chunks)


def _samsung_token_from_messages(messages: list[dict]) -> str | None:
    for message in messages:
        data = message.get("data")
        if isinstance(data, dict) and data.get("token"):
            return str(data["token"])
    return None


def _samsung_token_from_result(result: Any) -> str | None:
    if not isinstance(result, dict):
        return None
    if result.get("token"):
        return str(result["token"])
    remote = result.get("remote")
    if isinstance(remote, dict) and remote.get("token"):
        return str(remote["token"])
    return None


def _masked_websocket_text_frame(payload: bytes) -> bytes:
    first = bytes([0x81])
    length = len(payload)
    if length <= 125:
        header = first + bytes([0x80 | length])
    elif length <= 65535:
        header = first + bytes([0x80 | 126]) + length.to_bytes(2, "big")
    else:
        header = first + bytes([0x80 | 127]) + length.to_bytes(8, "big")
    mask = os.urandom(4)
    masked = bytes(byte ^ mask[index % 4] for index, byte in enumerate(payload))
    return header + mask + masked


def _send_wake_on_lan_for_host(host: str, preferred_mac: str | None = None) -> dict:
    mac = _normalize_mac(preferred_mac) or _mac_for_host(host)
    if not mac:
        return {"sent": False, "reason": "mac_not_found"}
    packet = bytes.fromhex("ff" * 6 + mac.replace(":", "").replace("-", "") * 16)
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        sock.sendto(packet, ("255.255.255.255", 9))
        sock.sendto(packet, (_broadcast_for_host(host), 9))
    return {"sent": True, "mac": mac}


def _normalize_mac(value: str | None) -> str | None:
    if not value:
        return None
    normalized = value.strip().lower().replace("-", ":")
    if len(normalized) == 17 and normalized.count(":") == 5:
        return normalized
    return None


def _broadcast_for_host(host: str) -> str:
    try:
        parts = host.split(".")
        if len(parts) == 4:
            return ".".join([parts[0], parts[1], parts[2], "255"])
    except (IndexError, TypeError):
        pass
    return "255.255.255.255"


def _mac_for_host(host: str) -> str | None:
    try:
        output = subprocess.check_output(["arp", "-a", host], stderr=subprocess.DEVNULL, timeout=2, text=True)
    except (OSError, subprocess.SubprocessError):
        return None
    for token in output.replace("\r", " ").replace("\n", " ").split():
        normalized = token.strip().lower()
        if len(normalized) == 17 and normalized.count("-") == 5:
            return normalized.replace("-", ":")
        if len(normalized) == 17 and normalized.count(":") == 5:
            return normalized
    return None


def _smartthings_request(path: str, method: str = "GET", body: dict | None = None) -> dict:
    token = smartthings_token()
    if not token:
        raise RuntimeError("SMARTTHINGS_TOKEN is not configured")
    payload = json.dumps(body).encode("utf-8") if body is not None else None
    request = urllib.request.Request(
        f"{SMARTTHINGS_API}{path}",
        data=payload,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=12) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"SmartThings API error {exc.code}: provider request failed") from exc


def _upsert_device(
    conn: sqlite3.Connection,
    user_id: str,
    household_id: str,
    connection_id: str,
    provider: str,
    source_device: dict,
    source: str,
) -> dict:
    now = now_iso()
    provider_device_id = str(source_device.get("deviceId") or source_device.get("id") or make_id())
    capabilities = _extract_capabilities(source_device)
    dedupe_host = _host_without_port(str(source_device.get("host") or "").strip()).lower()
    provider_rows = rows_to_dicts(
        conn.execute(
            'SELECT * FROM "SmartHomeDevice" WHERE userId = ? AND provider = ? ORDER BY itemId IS NULL ASC, updatedAt DESC',
            (user_id, provider),
        ).fetchall()
    )

    def _same_physical_device(row: dict) -> bool:
        # Same device if the provider id matches OR it lives at the same host/IP —
        # so a device imported twice (or via discover + probe) collapses into one row.
        if str(row.get("providerDeviceId") or "") == provider_device_id:
            return True
        if dedupe_host:
            row_host = _host_without_port(str(_json_or_empty_dict(row.get("rawJson")).get("host") or "").strip()).lower()
            return bool(row_host) and row_host == dedupe_host
        return False

    existing_rows = [row for row in provider_rows if _same_physical_device(row)]
    existing = existing_rows[0] if existing_rows else None
    for duplicate in existing_rows[1:]:
        conn.execute('DELETE FROM "SmartHomeCommand" WHERE deviceId = ?', (duplicate["id"],))
        conn.execute('DELETE FROM "SmartHomeDevice" WHERE id = ?', (duplicate["id"],))
    values = {
        "name": source_device.get("label") or source_device.get("name") or "Smart device",
        "roomName": source_device.get("roomName") or source_device.get("room") or _infer_room(source_device),
        "deviceType": _infer_device_type(source_device, capabilities),
        "capabilities": json.dumps(capabilities),
        "status": "ONLINE",
        "rawJson": json.dumps({**source_device, "avarenoSource": source}),
        "lastSeenAt": now,
        "updatedAt": now,
    }
    if existing:
        conn.execute(
            """UPDATE "SmartHomeDevice"
               SET connectionId = ?, name = ?, roomName = ?, deviceType = ?, capabilities = ?, status = ?, rawJson = ?, lastSeenAt = ?, updatedAt = ?
               WHERE id = ?""",
            (
                connection_id,
                values["name"],
                values["roomName"],
                values["deviceType"],
                values["capabilities"],
                values["status"],
                values["rawJson"],
                values["lastSeenAt"],
                values["updatedAt"],
                existing["id"],
            ),
        )
        device_id = existing["id"]
    else:
        device_id = make_id()
        linked_item_id = _best_item_match(conn, user_id, values["name"], values["roomName"], values["deviceType"])
        conn.execute(
            """INSERT INTO "SmartHomeDevice"
               (id, userId, householdId, connectionId, provider, providerDeviceId, itemId, name, roomName, deviceType, capabilities, status,
                powerState, rawJson, lastSeenAt, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                device_id,
                user_id,
                household_id,
                connection_id,
                provider,
                provider_device_id,
                linked_item_id,
                values["name"],
                values["roomName"],
                values["deviceType"],
                values["capabilities"],
                values["status"],
                source_device.get("powerState") or "unknown",
                values["rawJson"],
                values["lastSeenAt"],
                now,
                values["updatedAt"],
            ),
        )
    return row_to_dict(conn.execute('SELECT * FROM "SmartHomeDevice" WHERE id = ?', (device_id,)).fetchone()) or {}


def _demo_devices(conn: sqlite3.Connection, user_id: str) -> list[dict]:
    item = row_to_dict(
        conn.execute(
            """SELECT * FROM "Item"
               WHERE userId = ?
               ORDER BY updatedAt DESC LIMIT 1""",
            (user_id,),
        ).fetchone()
    )
    room = item["location"] if item and item.get("location") else "Wohnzimmer"
    return [
        {
            "id": "demo-evening-light",
            "label": "Evening Light",
            "roomName": room,
            "type": "light",
            "capabilities": ["switch", "switchLevel"],
            "powerState": "on",
        },
    ]


def _bambu_lab_devices(conn: sqlite3.Connection, user_id: str) -> list[dict]:
    config = bambu_lab_config()
    item = row_to_dict(
        conn.execute(
            """SELECT * FROM "Item"
               WHERE userId = ? AND (
                 lower(name) LIKE '%bambu%' OR lower(manufacturer) LIKE '%bambu%' OR lower(category) LIKE '%3d%' OR lower(category) LIKE '%printer%'
               )
               ORDER BY updatedAt DESC LIMIT 1""",
            (user_id,),
        ).fetchone()
    )
    room = item["location"] if item and item.get("location") else "Werkstatt"
    host = config["host"] or "192.168.1.55"
    model = config["model"] or (item["model"] if item and item.get("model") else "Bambu Lab X1/P1/A1")
    return [
        {
            "id": f"bambu-{config['serial'] or 'demo-printer'}",
            "label": f"{model} 3D Printer",
            "roomName": room,
            "type": "3d_printer",
            "capabilities": ["printerJob", "temperature", "filament", "networkPresence", "maintenance"],
            "powerState": "on",
            "host": host,
            "serial": config["serial"] or "demo-serial",
            "accessMode": "LAN" if bambu_lab_configured() else "DEMO",
            "printStatus": "idle",
            "filamentRemaining": 68,
            "nozzleTemp": 27,
            "bedTemp": 24,
            "chamberTemp": 25,
            "signals": ["Bambu LAN slot", "printer status", "filament watch"],
        }
    ]


def _demo_local_candidates(conn: sqlite3.Connection, user_id: str) -> list[dict]:
    item = row_to_dict(
        conn.execute(
            """SELECT * FROM "Item"
               WHERE userId = ? AND (lower(name) LIKE '%tv%' OR lower(category) LIKE '%tv%' OR lower(model) LIKE '%oled%')
               ORDER BY updatedAt DESC LIMIT 1""",
            (user_id,),
        ).fetchone()
    )
    room = item["location"] if item and item.get("location") else "Wohnzimmer"
    return [
        {
            "id": "local-demo-tv",
            "name": "Samsung OLED TV",
            "host": "192.168.1.42",
            "provider": LOCAL_DISCOVERY_PROVIDER,
            "deviceType": "tv",
            "category": "media",
            "roomName": room,
            "confidence": 0.91,
            "confidenceLabel": "high",
            "signals": ["DLNA/UPnP name", "Samsung/OLED-like device name", "same room match"],
            "capabilities": ["networkPresence", "wakeOnLan", "mediaRenderer"],
            "identity": {"label": "Likely a Samsung OLED TV or media renderer", "evidence": ["Demo UPnP name", "Samsung/OLED signal"]},
            "connectHint": "Import and link this to the real TV product record.",
            "recommendedAction": "Import media device",
            "manualCheck": "Confirm the TV network name or IP in the TV settings.",
            "filterTags": ["media", "tv", "samsung", "oled"],
        },
        {
            "id": "local-demo-home-assistant",
            "name": "Home Assistant Hub",
            "host": "192.168.1.12:8123",
            "provider": LOCAL_DISCOVERY_PROVIDER,
            "deviceType": "hub",
            "category": "hub",
            "roomName": "Zuhause",
            "confidence": 0.82,
            "confidenceLabel": "high",
            "signals": ["Port 8123", "home automation endpoint"],
            "capabilities": ["bridge", "deviceImport"],
            "identity": {"label": "Likely a Home Assistant hub", "evidence": ["Port 8123", "Bridge-style endpoint"]},
            "connectHint": "This can later become the local bridge for many smart devices.",
            "recommendedAction": "Prepare bridge",
            "manualCheck": "Confirm Home Assistant is reachable locally before connecting.",
            "filterTags": ["hub", "bridge", "home_assistant"],
        },
        {
            "id": "local-demo-bambu",
            "name": "Bambu Lab 3D Printer",
            "host": "192.168.1.55:8883",
            "provider": LOCAL_DISCOVERY_PROVIDER,
            "deviceType": "3d_printer",
            "category": "printer",
            "roomName": "Werkstatt",
            "confidence": 0.88,
            "confidenceLabel": "high",
            "signals": ["LAN MQTT candidate", "printer access code required", "serial number required"],
            "capabilities": ["printerJob", "temperature", "filament", "networkPresence"],
            "identity": {"label": "Very likely a Bambu-style 3D printer", "evidence": ["Bambu LAN/MQTT candidate", "Printer setup details required"]},
            "connectHint": "Use the Bambu setup with IP, serial number and LAN access code.",
            "recommendedAction": "Use for Bambu",
            "manualCheck": "Confirm the IP on the printer screen before connecting.",
            "filterTags": ["printer", "bambu", "3d_printer"],
        },
    ]


def _lan_candidates() -> list[dict]:
    subnet = _private_subnet()
    if not subnet:
        return []
    candidates: list[dict] = []
    ports = LAN_DISCOVERY_PORTS
    host_limit = max(16, min(512, int(os.environ.get("AVARENO_LAN_SCAN_LIMIT", "254"))))
    hosts = [str(host) for host in list(subnet.hosts())[:host_limit]]
    workers = max(16, min(128, int(os.environ.get("AVARENO_LAN_SCAN_WORKERS", "96"))))

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(_open_ports, host, ports): host for host in hosts}
        for future in as_completed(futures):
            host_text = futures[future]
            open_ports = future.result()
            if not open_ports:
                continue
            candidates.append(_candidate_from_open_ports(host_text, open_ports))

    candidates = _merge_discovery_candidates(candidates, _ssdp_candidates())
    candidates.sort(key=lambda candidate: (candidate["deviceType"] not in {"media", "tv", "3d_printer"}, candidate["host"]))
    return candidates[:18]


def _open_ports(host: str, ports: list[int]) -> list[int]:
    open_ports = []
    for port in ports:
        if _port_open(host, port):
            open_ports.append(port)
    return open_ports


def _lan_candidates_legacy() -> list[dict]:
    subnet = _private_subnet()
    if not subnet:
        return []
    candidates: list[dict] = []
    ports = LAN_DISCOVERY_PORTS
    hosts = list(subnet.hosts())[:64]
    for host in hosts:
        host_text = str(host)
        open_ports = [port for port in ports if _port_open(host_text, port)]
        if not open_ports:
            continue
        candidates.append(_candidate_from_open_ports(host_text, open_ports))
    return candidates[:12]


def _candidate_from_open_ports(host: str, open_ports: list[int]) -> dict:
    fingerprint = _candidate_fingerprint(host, open_ports)
    return {
        "id": f"local-{host.replace('.', '-')}",
        "name": fingerprint["name"],
        "host": f"{host}:{_primary_candidate_port(open_ports)}",
        "provider": LOCAL_DISCOVERY_PROVIDER,
        "deviceType": fingerprint["deviceType"],
        "category": fingerprint["category"],
        "roomName": None,
        "confidence": fingerprint["confidence"],
        "confidenceLabel": fingerprint["confidenceLabel"],
        "signals": fingerprint["signals"],
        "capabilities": fingerprint["capabilities"],
        "identity": fingerprint["identity"],
        "connectHint": fingerprint["connectHint"],
        "recommendedAction": fingerprint["recommendedAction"],
        "manualCheck": fingerprint["manualCheck"],
        "filterTags": fingerprint["filterTags"],
    }


def _merge_discovery_candidates(port_candidates: list[dict], ssdp_candidates: list[dict]) -> list[dict]:
    by_host = {_candidate_host_ip(candidate): candidate for candidate in port_candidates}
    for ssdp_candidate in ssdp_candidates:
        host_ip = _candidate_host_ip(ssdp_candidate)
        existing = by_host.get(host_ip)
        if not existing:
            by_host[host_ip] = ssdp_candidate
            continue
        existing["name"] = ssdp_candidate["name"] if ssdp_candidate["confidence"] >= existing.get("confidence", 0) else existing["name"]
        existing["deviceType"] = ssdp_candidate.get("deviceType") or existing.get("deviceType")
        existing["category"] = ssdp_candidate.get("category") or existing.get("category")
        existing["confidence"] = max(existing.get("confidence", 0.5), ssdp_candidate.get("confidence", 0.5))
        existing["confidenceLabel"] = "high" if existing["confidence"] >= 0.82 else "medium"
        existing["signals"] = _unique([*existing.get("signals", []), *ssdp_candidate.get("signals", [])])
        existing["capabilities"] = _unique([*existing.get("capabilities", []), *ssdp_candidate.get("capabilities", [])])
        existing["filterTags"] = _unique([*existing.get("filterTags", []), *ssdp_candidate.get("filterTags", [])])
        existing["identity"] = ssdp_candidate.get("identity") or existing.get("identity")
        existing["connectHint"] = ssdp_candidate.get("connectHint") or existing.get("connectHint")
        existing["recommendedAction"] = ssdp_candidate.get("recommendedAction") or existing.get("recommendedAction")
        existing["manualCheck"] = ssdp_candidate.get("manualCheck") or existing.get("manualCheck")
    return list(by_host.values())


def _candidate_host_ip(candidate: dict) -> str:
    return str(candidate.get("host") or "").split(":", 1)[0]


def _unique(values: list[Any]) -> list:
    seen = set()
    result = []
    for value in values:
        key = json.dumps(value, sort_keys=True) if isinstance(value, (dict, list)) else str(value)
        if key in seen:
            continue
        seen.add(key)
        result.append(value)
    return result


def _primary_candidate_port(open_ports: list[int]) -> int:
    for port in [8883, 990, 8123, 8001, 8002, 9197, 8008, 8009, 8060, 9100, 631, 554, 5001, 5000, 8080, 443, 80]:
        if port in open_ports:
            return port
    return open_ports[0]


def _attach_local_matches(conn: sqlite3.Connection, user_id: str, candidates: list[dict]) -> None:
    for candidate in candidates:
        match_id = _best_item_match(conn, user_id, candidate["name"], candidate.get("roomName"), candidate.get("deviceType", "device"))
        candidate["matchedItemId"] = match_id
        if match_id:
            item = row_to_dict(conn.execute('SELECT id, name, imageUrl FROM "Item" WHERE id = ?', (match_id,)).fetchone())
            candidate["matchedItemName"] = item["name"] if item else None
            candidate["matchedItemImageUrl"] = item["imageUrl"] if item else None
        else:
            candidate["matchedItemName"] = None
            candidate["matchedItemImageUrl"] = None


def _candidate_from_probe(conn: sqlite3.Connection, user_id: str, host: str) -> dict | None:
    target_host, target_port = _normalize_probe_target(host)
    ports = [target_port] if target_port else LAN_DISCOVERY_PORTS
    open_ports = _open_ports(target_host, ports)
    if not open_ports:
        return None
    candidates = [_candidate_from_open_ports(target_host, open_ports)]
    _attach_local_matches(conn, user_id, candidates)
    return candidates[0]


def _host_from_candidate_id(candidate_id: str) -> str | None:
    if not candidate_id.startswith("local-"):
        return None
    parts = candidate_id.removeprefix("local-").split("-")
    if len(parts) != 4 or not all(part.isdigit() for part in parts):
        return None
    return ".".join(parts)


def _normalize_probe_target(value: str) -> tuple[str, int | None]:
    cleaned = value.strip().lower()
    if "://" in cleaned:
        cleaned = cleaned.split("://", 1)[1]
    cleaned = cleaned.split("/", 1)[0].strip()
    if not cleaned or any(character.isspace() for character in cleaned):
        raise ValueError("Invalid host")

    target_host = cleaned
    target_port: int | None = None
    if ":" in cleaned and cleaned.count(":") == 1:
        host_part, port_part = cleaned.rsplit(":", 1)
        if port_part:
            try:
                target_port = max(1, min(65535, int(port_part)))
            except ValueError as exc:
                raise ValueError("Invalid port") from exc
            target_host = host_part

    resolved_host = _resolve_private_host(target_host)
    return resolved_host, target_port


def _resolve_private_host(host: str) -> str:
    try:
        import ipaddress

        address = ipaddress.ip_address(host)
    except ValueError:
        try:
            address = ipaddress.ip_address(socket.gethostbyname(host))
        except OSError as exc:
            raise ValueError("Host could not be resolved") from exc
    if not address.is_private or address.is_loopback or address.is_link_local:
        raise ValueError("Only private LAN hosts can be probed")
    return str(address)


def _ssdp_candidates() -> list[dict]:
    message = (
        "M-SEARCH * HTTP/1.1\r\n"
        "HOST: 239.255.255.250:1900\r\n"
        "MAN: \"ssdp:discover\"\r\n"
        "MX: 1\r\n"
        "ST: ssdp:all\r\n"
        "\r\n"
    ).encode("ascii")
    responses: dict[str, dict] = {}
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP) as sock:
            sock.settimeout(2.0)
            sock.sendto(message, ("239.255.255.250", 1900))
            while True:
                try:
                    data, address = sock.recvfrom(8192)
                except socket.timeout:
                    break
                host = address[0]
                candidate = _candidate_from_ssdp(host, _parse_ssdp_headers(data))
                if not candidate:
                    continue
                existing = responses.get(host)
                if not existing or candidate["confidence"] > existing["confidence"]:
                    responses[host] = candidate
    except OSError:
        return []
    return list(responses.values())


def _parse_ssdp_headers(data: bytes) -> dict[str, str]:
    text = data.decode("utf-8", errors="ignore")
    headers: dict[str, str] = {}
    for line in text.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        headers[key.strip().lower()] = value.strip()
    return headers


def _candidate_from_ssdp(host: str, headers: dict[str, str]) -> dict | None:
    location = headers.get("location", "")
    server = headers.get("server", "")
    st = headers.get("st", "")
    usn = headers.get("usn", "")
    friendly_name = _friendly_name_from_location(location)
    text = " ".join([friendly_name or "", server, st, usn]).lower()
    if not any(term in text for term in ["samsung", "tv", "television", "mediarenderer", "dial", "dlna", "roku", "cast"]):
        return None

    is_samsung = "samsung" in text
    is_media = any(term in text for term in ["tv", "television", "mediarenderer", "dial", "dlna", "cast"])
    name = friendly_name or ("Samsung TV candidate" if is_samsung else f"Media device {host}")
    signals = ["SSDP/UPnP response"]
    if friendly_name:
        signals.append(f"Friendly name: {friendly_name}")
    if is_samsung:
        signals.append("Samsung device signature")
    if "mediarenderer" in text or "dlna" in text:
        signals.append("DLNA media renderer")

    return {
        "id": f"local-{host.replace('.', '-')}",
        "name": name,
        "host": host,
        "provider": LOCAL_DISCOVERY_PROVIDER,
        "deviceType": "tv" if is_samsung or "tv" in text or "television" in text else "media",
        "category": "media",
        "roomName": None,
        "confidence": 0.88 if is_samsung else 0.78 if is_media else 0.64,
        "confidenceLabel": "high" if is_samsung else "medium",
        "signals": signals,
        "capabilities": ["networkPresence", "mediaRenderer"],
        "identity": {
            "label": "Likely a Samsung TV" if is_samsung else "Likely a TV or media renderer",
            "evidence": signals,
        },
        "connectHint": "Import it, then link it to the real TV product record.",
        "recommendedAction": "Import media device",
        "manualCheck": "Compare this IP/name with the TV network settings or your router client list.",
        "filterTags": ["media", "tv", *([] if not is_samsung else ["samsung"])],
    }


def _friendly_name_from_location(location: str) -> str | None:
    if not location:
        return None
    try:
        parsed = urllib.parse.urlparse(location)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            return None
        _resolve_private_host(parsed.hostname)
        with urllib.request.urlopen(location, timeout=1.5) as response:
            body = response.read(65536)
        root = ET.fromstring(body)
    except (OSError, ValueError, ET.ParseError, urllib.error.URLError):
        return None

    for element in root.iter():
        if element.tag.lower().endswith("friendlyname") and element.text:
            return element.text.strip()[:80]
    return None


def _private_subnet():
    windows_subnet = _windows_private_subnet()
    if windows_subnet:
        return windows_subnet
    try:
        import ipaddress

        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            sock.connect(("8.8.8.8", 80))
            local_ip = sock.getsockname()[0]
        finally:
            sock.close()
        if not local_ip.startswith(("10.", "172.", "192.168.")):
            return None
        return ipaddress.ip_network(f"{local_ip}/24", strict=False)
    except OSError:
        return None


def _windows_private_subnet():
    if os.name != "nt":
        return None
    try:
        import ipaddress

        command = (
            "Get-NetIPConfiguration | "
            "Where-Object { $_.IPv4Address -and $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' } | "
            "Select-Object InterfaceAlias,InterfaceDescription,"
            "@{Name='IPv4';Expression={$_.IPv4Address.IPAddress}},"
            "@{Name='PrefixLength';Expression={$_.IPv4Address.PrefixLength}},"
            "@{Name='Gateway';Expression={$_.IPv4DefaultGateway.NextHop}} | "
            "ConvertTo-Json -Depth 4"
        )
        raw = subprocess.check_output(
            ["powershell", "-NoProfile", "-Command", command],
            stderr=subprocess.DEVNULL,
            timeout=4,
            text=True,
        ).strip()
        if not raw:
            return None
        entries = json.loads(raw)
        if isinstance(entries, dict):
            entries = [entries]
        blocked_terms = ("vpn", "nord", "tailscale", "wireguard", "zerotier", "virtual", "docker", "wsl", "hyper-v", "loopback")
        for entry in entries:
            label = f"{entry.get('InterfaceAlias', '')} {entry.get('InterfaceDescription', '')}".lower()
            if any(term in label for term in blocked_terms):
                continue
            address = ipaddress.ip_address(entry.get("IPv4"))
            gateway = ipaddress.ip_address(entry.get("Gateway"))
            if not address.is_private or address.is_link_local or not gateway.is_private:
                continue
            prefix = int(entry.get("PrefixLength") or 24)
            return ipaddress.ip_network(f"{address}/{prefix}", strict=False)
    except (OSError, subprocess.SubprocessError, ValueError, json.JSONDecodeError):
        return None
    return None


def _port_open(host: str, port: int) -> bool:
    try:
        with socket.create_connection((host, port), timeout=0.16):
            return True
    except OSError:
        return False


def _candidate_fingerprint(host: str, open_ports: list[int]) -> dict:
    ports = set(open_ports)
    open_port_signals = [f"open port {port}" for port in open_ports[:4]]
    is_gateway_like = host.rsplit(".", 1)[-1] in {"1", "254"} and bool(ports & {80, 443})

    if 8883 in ports or 990 in ports:
        return {
            "name": "Bambu Lab printer candidate",
            "deviceType": "3d_printer",
            "category": "printer",
            "confidence": 0.9,
            "confidenceLabel": "high",
            "signals": ["Bambu LAN/MQTT port", "printer access code likely required", *open_port_signals],
            "capabilities": ["networkPresence", "printerJob", "temperature", "filament"],
            "identity": {
                "label": "Very likely a Bambu-style 3D printer",
                "evidence": ["Bambu LAN ports are visible", "Can become a print-status device"],
            },
            "connectHint": "Use the Bambu setup with printer IP, serial number and LAN access code.",
            "recommendedAction": "Use for Bambu",
            "manualCheck": "Confirm the IP on the printer screen or in Bambu Handy before connecting.",
            "filterTags": ["printer", "bambu", "3d_printer"],
        }
    if 9100 in ports or 631 in ports:
        return {
            "name": f"Printer candidate {host}",
            "deviceType": "printer",
            "category": "printer",
            "confidence": 0.78,
            "confidenceLabel": "medium",
            "signals": ["Printer service detected", *open_port_signals],
            "capabilities": ["networkPresence", "printService"],
            "identity": {
                "label": "Likely a network printer",
                "evidence": ["IPP/JetDirect-style printer ports are visible"],
            },
            "connectHint": "Import it as a printer object; Bambu needs extra serial/access-code details.",
            "recommendedAction": "Import printer",
            "manualCheck": "Open the router client list to confirm the device name before linking it.",
            "filterTags": ["printer"],
        }
    if 8123 in ports:
        return {
            "name": "Home Assistant candidate",
            "deviceType": "hub",
            "category": "hub",
            "confidence": 0.86,
            "confidenceLabel": "high",
            "signals": ["Home Assistant port", "local automation bridge", *open_port_signals],
            "capabilities": ["networkPresence", "bridge", "deviceImport"],
            "identity": {
                "label": "Likely a Home Assistant hub",
                "evidence": ["Port 8123 is the common Home Assistant web UI"],
            },
            "connectHint": "Later this can become the bridge that imports many smart-home devices at once.",
            "recommendedAction": "Prepare bridge",
            "manualCheck": "Open Home Assistant and create a long-lived token when the bridge is implemented.",
            "filterTags": ["hub", "bridge", "home_assistant"],
        }
    if 8001 in ports or 8002 in ports or 9197 in ports:
        return {
            "name": "Samsung TV candidate",
            "deviceType": "tv",
            "category": "media",
            "confidence": 0.82,
            "confidenceLabel": "high",
            "signals": ["Samsung/TV local control port", *open_port_signals],
            "capabilities": ["networkPresence", "mediaRenderer", "switch"],
            "identity": {
                "label": "Likely a Samsung smart TV",
                "evidence": ["Samsung/Tizen-style local TV ports are visible"],
            },
            "connectHint": "Import it, then link it to the Samsung OLED product record.",
            "recommendedAction": "Import media device",
            "manualCheck": "Compare the IP with the Samsung TV network settings or your router client list.",
            "filterTags": ["media", "tv", "samsung"],
        }
    if 8008 in ports or 8009 in ports:
        return {
            "name": "Google Cast device candidate",
            "deviceType": "media",
            "category": "media",
            "confidence": 0.74,
            "confidenceLabel": "medium",
            "signals": ["Google Cast service", *open_port_signals],
            "capabilities": ["networkPresence", "mediaRenderer"],
            "identity": {
                "label": "Likely a Chromecast, speaker, display or Android TV",
                "evidence": ["Cast ports are visible"],
            },
            "connectHint": "Import it, then link it to the real TV/speaker/product record.",
            "recommendedAction": "Import media device",
            "manualCheck": "Compare the IP with Google Home or your router client list.",
            "filterTags": ["media", "tv", "speaker"],
        }
    if 8060 in ports:
        return {
            "name": "TV / media device candidate",
            "deviceType": "media",
            "category": "media",
            "confidence": 0.72,
            "confidenceLabel": "medium",
            "signals": ["TV/media control port", *open_port_signals],
            "capabilities": ["networkPresence", "mediaRenderer"],
            "identity": {
                "label": "Likely a TV, streaming box or media receiver",
                "evidence": ["Media-control port is visible"],
            },
            "connectHint": "Import it and match it to the physical TV or media device.",
            "recommendedAction": "Import media device",
            "manualCheck": "Check your TV network settings or router client list for the same IP.",
            "filterTags": ["media", "tv"],
        }
    if 554 in ports:
        return {
            "name": f"Camera candidate {host}",
            "deviceType": "camera",
            "category": "camera",
            "confidence": 0.68,
            "confidenceLabel": "medium",
            "signals": ["RTSP/video port", *open_port_signals],
            "capabilities": ["networkPresence", "videoStream"],
            "identity": {
                "label": "Could be a camera or video device",
                "evidence": ["RTSP/video streaming port is visible"],
            },
            "connectHint": "Import as a device first; camera control should use a provider bridge later.",
            "recommendedAction": "Import device",
            "manualCheck": "Only connect cameras through trusted local/provider integrations.",
            "filterTags": ["camera", "security"],
        }
    if 5000 in ports or 5001 in ports:
        return {
            "name": f"NAS / storage candidate {host}",
            "deviceType": "storage",
            "category": "storage",
            "confidence": 0.7,
            "confidenceLabel": "medium",
            "signals": ["NAS/admin web port", *open_port_signals],
            "capabilities": ["networkPresence", "storage"],
            "identity": {
                "label": "Could be a NAS or storage/server device",
                "evidence": ["Common NAS admin ports are visible"],
            },
            "connectHint": "Import it as infrastructure, not as a controllable smart appliance.",
            "recommendedAction": "Import infrastructure",
            "manualCheck": "Confirm in the router client list before linking it to a product.",
            "filterTags": ["storage", "server", "network"],
        }
    if is_gateway_like:
        return {
            "name": f"Router / gateway {host}",
            "deviceType": "router",
            "category": "network",
            "confidence": 0.8,
            "confidenceLabel": "high",
            "signals": ["gateway-looking IP", "router admin web UI", *open_port_signals],
            "capabilities": ["networkPresence", "adminInterface"],
            "identity": {
                "label": "Probably your router or gateway",
                "evidence": ["Gateway-style IP ending", "Web admin ports are visible"],
            },
            "connectHint": "Do not use this as Bambu. Use the router client list to find the printer IP.",
            "recommendedAction": "Open router clients",
            "manualCheck": "Look for names like Bambu, X1, P1, A1, printer, Samsung, LG, Hue, Alexa.",
            "filterTags": ["network", "router"],
        }
    if 80 in ports or 443 in ports or 8080 in ports:
        return {
            "name": f"Web device {host}",
            "deviceType": "device",
            "category": "unknown",
            "confidence": 0.56,
            "confidenceLabel": "low",
            "signals": ["web interface visible", *open_port_signals],
            "capabilities": ["networkPresence"],
            "identity": {
                "label": "Unknown LAN device with a web interface",
                "evidence": ["Only generic web/admin ports were found"],
            },
            "connectHint": "Probe exact IP, then confirm the name in router clients or the device screen.",
            "recommendedAction": "Identify first",
            "manualCheck": "If this should be Bambu, compare it with the printer screen IP and then use Test Bambu IP.",
            "filterTags": ["unknown", "web"],
        }
    return {
        "name": f"Network device {host}",
        "deviceType": "device",
        "category": "unknown",
        "confidence": 0.5,
        "confidenceLabel": "low",
        "signals": open_port_signals,
        "capabilities": ["networkPresence"],
        "identity": {
            "label": "Unknown LAN device",
            "evidence": ["Avareno only knows that the host answered"],
        },
        "connectHint": "Import only after matching it with a product or router client name.",
        "recommendedAction": "Identify first",
        "manualCheck": "Check the router client list for manufacturer/device name.",
        "filterTags": ["unknown"],
    }


def _candidate_name(host: str, open_ports: list[int]) -> str:
    if 8883 in open_ports or 990 in open_ports:
        return "Bambu Lab printer candidate"
    if 8123 in open_ports:
        return "Home Assistant candidate"
    if 8008 in open_ports:
        return "Cast device candidate"
    if 8060 in open_ports:
        return "Media device candidate"
    return f"Network device {host}"


def _candidate_type(open_ports: list[int]) -> str:
    if 8883 in open_ports or 990 in open_ports:
        return "3d_printer"
    if 8123 in open_ports:
        return "hub"
    if 8008 in open_ports or 8060 in open_ports:
        return "media"
    return "device"


def _candidate_confidence(open_ports: list[int]) -> float:
    if 8883 in open_ports or 990 in open_ports:
        return 0.9
    if 8123 in open_ports:
        return 0.86
    if 8008 in open_ports or 8060 in open_ports:
        return 0.72
    if 80 in open_ports or 443 in open_ports:
        return 0.56
    return 0.5


def _candidate_capabilities(open_ports: list[int]) -> list[str]:
    capabilities = ["networkPresence"]
    if 8883 in open_ports or 990 in open_ports:
        capabilities.extend(["printerJob", "temperature", "filament"])
    if 8123 in open_ports:
        capabilities.extend(["bridge", "deviceImport"])
    if 8008 in open_ports or 8060 in open_ports:
        capabilities.append("mediaRenderer")
    return capabilities


def _is_user_controllable_candidate(candidate: dict) -> bool:
    text = " ".join(
        [
            str(candidate.get("name") or ""),
            str(candidate.get("deviceType") or ""),
            str(candidate.get("category") or ""),
        ]
    ).lower()
    capabilities = {str(capability).lower() for capability in candidate.get("capabilities", []) or []}
    return (
        "samsung" in text
        or "tv" in text
        or "cast" in text
        or "media" in text
        or "printer" in text
        or "bambu" in text
        or "hub" in text
        or "assistant" in text
        or "switch" in capabilities
        or "switchlevel" in capabilities
        or "mediarenderer" in capabilities
        or "printerjob" in capabilities
        or "bridge" in capabilities
        or "deviceimport" in capabilities
    )


def _bambu_diagnostic_status(open_ports: set[int]) -> str:
    if 8883 in open_ports:
        return "LAN_READY"
    if 990 in open_ports:
        return "PRINTER_SEEN"
    if 80 in open_ports or 443 in open_ports:
        return "HOST_REACHABLE"
    return "NO_RESPONSE"


def _bambu_diagnostic_summary(status: str, host: str) -> str:
    if status == "LAN_READY":
        return f"{host} looks ready for Bambu LAN status/control."
    if status == "PRINTER_SEEN":
        return f"{host} looks like a printer, but MQTT/status is not visible yet."
    if status == "HOST_REACHABLE":
        return f"{host} answered, but not on Bambu-specific ports."
    return f"{host} did not answer on the known Bambu/LAN ports."


def _bambu_diagnostic_steps(status: str, host: str) -> list[str]:
    base_steps = [
        "Confirm the printer IP in the Bambu printer network screen or router client list.",
        "Keep PC and printer on the same normal LAN, not guest Wi-Fi.",
        "Pause VPN split-tunneling if it blocks local network traffic.",
    ]
    if status == "LAN_READY":
        return [
            "Enter the printer serial number and LAN access code from the Bambu printer screen.",
            "Prepare the Bambu object in Avareno.",
            "Use print alerts to turn finished/paused/failed jobs into reminders.",
        ]
    if status == "PRINTER_SEEN":
        return [
            "Enable LAN mode on the Bambu printer.",
            "Copy the LAN access code from the printer screen.",
            *base_steps,
        ]
    if status == "HOST_REACHABLE":
        return [
            f"{host} may be a router, camera, NAS, or another device instead of the Bambu printer.",
            "Find the exact Bambu IP in the Bambu Handy app, printer screen, or router client list.",
            *base_steps,
        ]
    return [
        "Wake the printer and make sure it is connected to Wi-Fi/Ethernet.",
        "Check whether the printer is on a different subnet or guest network.",
        *base_steps,
    ]


def _extract_capabilities(source_device: dict) -> list[str]:
    if isinstance(source_device.get("capabilities"), list):
        return [str(capability) for capability in source_device["capabilities"]]
    capabilities = []
    for component in source_device.get("components", []) or []:
        for capability in component.get("capabilities", []) or []:
            capability_id = capability.get("id")
            if capability_id:
                capabilities.append(capability_id)
    return sorted(set(capabilities))


def _infer_device_type(source_device: dict, capabilities: list[str]) -> str:
    text = " ".join(str(source_device.get(key, "")) for key in ["label", "name", "type", "deviceTypeName"]).lower()
    if "3d_printer" in text or "3d printer" in text or "bambu" in text or "printerJob" in capabilities:
        return "3d_printer"
    if "tv" in text or "television" in text or "samsung" in text or "mediaInputSource" in capabilities:
        return "tv"
    if "cast" in text or "media" in text or "mediaRenderer" in capabilities:
        return "media"
    if "light" in text or "switchLevel" in capabilities:
        return "light"
    if "thermostat" in text or "temperatureMeasurement" in capabilities:
        return "climate"
    if "washer" in text or "dryer" in text:
        return "appliance"
    return "device"


def _infer_room(source_device: dict) -> str | None:
    label = str(source_device.get("label") or source_device.get("name") or "")
    for room in ["Wohnzimmer", "Kueche", "Schlafzimmer", "Buero", "Garage", "Werkstatt", "Living Room", "Kitchen", "Bedroom", "Office", "Workshop"]:
        if room.lower() in label.lower():
            return room
    return None


def _best_item_match(conn: sqlite3.Connection, user_id: str, name: str, room: str | None, device_type: str) -> str | None:
    terms = [part for part in name.lower().replace("-", " ").split() if len(part) > 2]
    source_brand = _known_device_brand(name)
    rows = rows_to_dicts(conn.execute('SELECT * FROM "Item" WHERE userId = ?', (user_id,)).fetchall())
    best: tuple[int, str | None] = (0, None)
    for item in rows:
        haystack = " ".join(
            str(item.get(key) or "").lower() for key in ["name", "category", "manufacturer", "model", "location", "itemType"]
        )
        if source_brand and source_brand not in haystack:
            continue
        score = sum(2 for term in terms if term in haystack)
        if room and str(item.get("location") or "").lower() == room.lower():
            score += 2
        if device_type == "tv" and ("tv" in haystack or "oled" in haystack):
            score += 4
        if device_type == "light" and ("light" in haystack or "lampe" in haystack):
            score += 3
        if device_type == "3d_printer" and ("bambu" in haystack or "3d" in haystack or "printer" in haystack or "drucker" in haystack):
            score += 5
        if score > best[0]:
            best = (score, item["id"])
    return best[1] if best[0] >= 3 else None


def _known_device_brand(value: str) -> str | None:
    text = value.lower()
    for brand in [
        "samsung",
        "lg",
        "philips",
        "sony",
        "panasonic",
        "hisense",
        "tcl",
        "xiaomi",
        "apple",
        "google",
        "amazon",
        "bambu",
    ]:
        if brand in text:
            return brand
    return None


def _command_payload(command: str, value: Any = None) -> list[dict]:
    if command == "set_brightness":
        brightness = max(0, min(100, int(value or 0)))
        return [{"component": "main", "capability": "switchLevel", "command": "setLevel", "arguments": [brightness]}]
    if command == "set_volume":
        volume = max(0, min(100, int(value or 0)))
        return [{"component": "main", "capability": "audioVolume", "command": "setVolume", "arguments": [volume]}]
    if command not in COMMANDS:
        raise ValueError("Unsupported smart home command")
    return COMMANDS[command]


def _assert_command_allowed_for_device(device: dict, command: str) -> None:
    capabilities = _json_or_empty_list(device.get("capabilities"))
    normalized = {str(capability).lower() for capability in capabilities}
    provider = str(device.get("provider") or "")
    if provider.startswith("HOME_GRAPH_"):
        if command in {"power_on", "power_off"} and "switch" in normalized:
            return
        if command == "set_brightness" and "switchlevel" in normalized:
            return
        raise ValueError("This Home Graph device only allows safe power/brightness commands")

    if command == "set_brightness" and "switchlevel" not in normalized:
        raise ValueError("Brightness is not supported by this device")


def _json_or_empty_list(value: str | None) -> list:
    if not value:
        return []
    try:
        data = json.loads(value)
    except json.JSONDecodeError:
        return []
    return data if isinstance(data, list) else []


def _json_or_empty_dict(value: str | None) -> dict:
    if not value:
        return {}
    try:
        data = json.loads(value)
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}
