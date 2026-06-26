from __future__ import annotations

import json
import os
import socket
import sqlite3
import subprocess
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from typing import Any

from app.db import row_to_dict, rows_to_dicts
from app.utils import make_id, now_iso

SMARTTHINGS_PROVIDER = "SAMSUNG_SMARTTHINGS"
LOCAL_DISCOVERY_PROVIDER = "LOCAL_DISCOVERY"
BAMBU_LAB_PROVIDER = "BAMBU_LAB"
SMARTTHINGS_API = "https://api.smartthings.com/v1"
LAN_DISCOVERY_PORTS = [80, 443, 554, 631, 8008, 8009, 8060, 8080, 8123, 8883, 9100, 990, 5000, 5001]


COMMANDS = {
    "power_on": [{"component": "main", "capability": "switch", "command": "on", "arguments": []}],
    "power_off": [{"component": "main", "capability": "switch", "command": "off", "arguments": []}],
    "mute": [{"component": "main", "capability": "audioMute", "command": "mute", "arguments": []}],
    "unmute": [{"component": "main", "capability": "audioMute", "command": "unmute", "arguments": []}],
    "volume_up": [{"component": "main", "capability": "audioVolume", "command": "volumeUp", "arguments": []}],
    "volume_down": [{"component": "main", "capability": "audioVolume", "command": "volumeDown", "arguments": []}],
    "printer_pause": [{"component": "print", "capability": "printerJob", "command": "pause", "arguments": []}],
    "printer_resume": [{"component": "print", "capability": "printerJob", "command": "resume", "arguments": []}],
}


def smartthings_token() -> str | None:
    return os.environ.get("SMARTTHINGS_TOKEN") or os.environ.get("SAMSUNG_SMARTTHINGS_TOKEN")


def provider_mode() -> str:
    return "LIVE" if smartthings_token() else "DEMO"


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

    return {
        "mode": provider_mode(),
        "providers": [
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
                "mode": "LAN" if bambu_lab_configured() else "DEMO",
                "status": _provider_status(connections, BAMBU_LAB_PROVIDER),
                "tokenConfigured": bambu_lab_configured(),
                "authNote": "Bambu works best through LAN/dev mode with printer IP, serial number and access code. Demo is safe until configured.",
            },
            {
                "id": "HOME_ASSISTANT",
                "name": "Home Assistant",
                "mode": "PLANNED",
                "status": _provider_status(connections, "HOME_ASSISTANT"),
                "tokenConfigured": False,
                "authNote": "Local-first bridge planned.",
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
                "mode": "LAN" if local_discovery_enabled() else "DEMO",
                "status": _provider_status(connections, LOCAL_DISCOVERY_PROVIDER),
                "tokenConfigured": local_discovery_enabled(),
                "authNote": "Opt-in local search. Demo by default; set AVARENO_ENABLE_LAN_DISCOVERY=1 for limited LAN probes.",
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
            "mode": "LAN" if local_discovery_enabled() else "DEMO",
            "enabled": local_discovery_enabled(),
            "note": "Local search only runs when the user starts it.",
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
    status = "CONNECTED" if provider in {SMARTTHINGS_PROVIDER, "HOME_ASSISTANT", LOCAL_DISCOVERY_PROVIDER, BAMBU_LAB_PROVIDER} else "PLANNED"
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
    if provider == SMARTTHINGS_PROVIDER and smartthings_token():
        source_devices = _fetch_smartthings_devices()
        source = "LIVE"
    elif provider == BAMBU_LAB_PROVIDER:
        source_devices = _bambu_lab_devices(conn, user_id)
        source = "LAN" if bambu_lab_configured() else "DEMO"
    else:
        source_devices = _demo_devices(conn, user_id)
        source = "DEMO"

    synced = []
    for source_device in source_devices:
        synced.append(_upsert_device(conn, user_id, household_id, connection["id"], provider, source_device, source))

    now = now_iso()
    conn.execute(
        'UPDATE "SmartHomeConnection" SET status = ?, lastSyncAt = ?, updatedAt = ? WHERE id = ?',
        ("CONNECTED" if synced else connection["status"], now, now, connection["id"]),
    )
    return {"provider": provider, "source": source, "synced": len(synced), "devices": synced}


def execute_command(conn: sqlite3.Connection, user_id: str, device_id: str, command: str, value: Any = None) -> dict:
    device = row_to_dict(
        conn.execute('SELECT * FROM "SmartHomeDevice" WHERE id = ? AND userId = ?', (device_id, user_id)).fetchone()
    )
    if not device:
        raise ValueError("Smart home device not found")

    commands = _command_payload(command, value)
    if device["provider"] == SMARTTHINGS_PROVIDER and smartthings_token() and not str(device["providerDeviceId"]).startswith("demo-"):
        status = "SENT"
        result = _send_smartthings_command(device["providerDeviceId"], commands)
    else:
        status = "SIMULATED"
        result = {"ok": True, "mode": "demo", "commands": commands}

    now = now_iso()
    if command in {"power_on", "power_off"}:
        conn.execute(
            'UPDATE "SmartHomeDevice" SET powerState = ?, status = ?, updatedAt = ?, lastSeenAt = ? WHERE id = ?',
            ("on" if command == "power_on" else "off", "ONLINE", now, now, device_id),
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


def discover_local_candidates(conn: sqlite3.Connection, user_id: str) -> dict:
    if local_discovery_enabled():
        candidates = _lan_candidates()
        mode = "LAN"
    else:
        candidates = _demo_local_candidates(conn, user_id)
        mode = "DEMO"
    _attach_local_matches(conn, user_id, candidates)
    return {
        "mode": mode,
        "enabled": local_discovery_enabled(),
        "scannedAt": now_iso(),
        "scope": "Demo candidates" if mode == "DEMO" else "Parallel private-subnet probes",
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
    device = _upsert_device(conn, user_id, household_id, connection["id"], LOCAL_DISCOVERY_PROVIDER, source_device, "LOCAL_DEMO" if not local_discovery_enabled() else "LOCAL_LAN")
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
    return "AVAILABLE" if provider in {SMARTTHINGS_PROVIDER, LOCAL_DISCOVERY_PROVIDER, BAMBU_LAB_PROVIDER} else "PLANNED"


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

    has_home_assistant = any(device.get("deviceType") == "hub" or device.get("provider") == "HOME_ASSISTANT" for device in devices)
    if not has_home_assistant:
        insights.append(
            {
                "id": "bridge-home-assistant",
                "type": "BRIDGE",
                "deviceId": None,
                "itemId": None,
                "title": "Home Assistant bridge",
                "subtitle": "One local bridge can make Samsung, Alexa, Matter and LAN devices feel like one Avareno layer later.",
                "signal": "Future local-first control",
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


def _send_smartthings_command(provider_device_id: str, commands: list[dict]) -> dict:
    return _smartthings_request(f"/devices/{provider_device_id}/commands", method="POST", body={"commands": commands})


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
        message = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"SmartThings API error {exc.code}: {message}") from exc


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
    existing = row_to_dict(
        conn.execute(
            'SELECT * FROM "SmartHomeDevice" WHERE userId = ? AND provider = ? AND providerDeviceId = ?',
            (user_id, provider, provider_device_id),
        ).fetchone()
    )
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
               WHERE userId = ? AND (lower(name) LIKE '%tv%' OR lower(category) LIKE '%tv%')
               ORDER BY updatedAt DESC LIMIT 1""",
            (user_id,),
        ).fetchone()
    )
    room = item["location"] if item and item.get("location") else "Wohnzimmer"
    return [
        {
            "id": "demo-living-room-tv",
            "label": "Living Room TV",
            "roomName": room,
            "type": "tv",
            "capabilities": ["switch", "audioVolume", "audioMute", "mediaInputSource"],
            "powerState": "off",
        },
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
            "name": "Living Room TV",
            "host": "192.168.1.42",
            "provider": LOCAL_DISCOVERY_PROVIDER,
            "deviceType": "tv",
            "category": "media",
            "roomName": room,
            "confidence": 0.91,
            "confidenceLabel": "high",
            "signals": ["DLNA/UPnP name", "TV-like hostname", "same room match"],
            "capabilities": ["networkPresence", "wakeOnLan", "mediaRenderer"],
            "identity": {"label": "Likely a TV or media renderer", "evidence": ["Demo UPnP name", "Existing TV product match"]},
            "connectHint": "Import and link this to the real TV product record.",
            "recommendedAction": "Import media device",
            "manualCheck": "Confirm the TV network name or IP in the TV settings.",
            "filterTags": ["media", "tv"],
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

    candidates.sort(key=lambda candidate: (candidate["deviceType"] != "3d_printer", candidate["host"]))
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


def _primary_candidate_port(open_ports: list[int]) -> int:
    for port in [8883, 990, 8123, 8008, 8009, 8060, 9100, 631, 554, 5001, 5000, 8080, 443, 80]:
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
    if "tv" in text or "television" in text or "mediaInputSource" in capabilities:
        return "tv"
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
    rows = rows_to_dicts(conn.execute('SELECT * FROM "Item" WHERE userId = ?', (user_id,)).fetchall())
    best: tuple[int, str | None] = (0, None)
    for item in rows:
        haystack = " ".join(
            str(item.get(key) or "").lower() for key in ["name", "category", "manufacturer", "model", "location", "itemType"]
        )
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


def _command_payload(command: str, value: Any = None) -> list[dict]:
    if command == "set_volume":
        volume = max(0, min(100, int(value or 0)))
        return [{"component": "main", "capability": "audioVolume", "command": "setVolume", "arguments": [volume]}]
    if command not in COMMANDS:
        raise ValueError("Unsupported smart home command")
    return COMMANDS[command]


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
