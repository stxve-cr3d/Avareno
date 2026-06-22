from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from app.utils import make_id, now_iso

BACKEND_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_ROOT.parent
DB_PATH = BACKEND_ROOT / "second_memory.db"
SCHEMA_PATH = BACKEND_ROOT / "schema.sql"


def connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    ensure_runtime_schema(conn)
    return conn


def ensure_runtime_schema(conn: sqlite3.Connection) -> None:
    try:
        columns = {row["name"] for row in conn.execute('PRAGMA table_info("Item")').fetchall()}
    except sqlite3.OperationalError:
        return
    if columns and "imageUrl" not in columns:
        conn.execute('ALTER TABLE "Item" ADD COLUMN "imageUrl" TEXT')
    item_columns = {
        "householdId": "TEXT",
        "spaceId": "TEXT",
        "itemType": "TEXT NOT NULL DEFAULT 'THING'",
        "notes": "TEXT",
        "reorderUrl": "TEXT",
        "affiliateUrl": "TEXT",
        "affiliateProvider": "TEXT",
        "visibility": "TEXT NOT NULL DEFAULT 'HOUSEHOLD'",
    }
    for name, definition in item_columns.items():
        if columns and name not in columns:
            conn.execute(f'ALTER TABLE "Item" ADD COLUMN "{name}" {definition}')
    device_columns = {row["name"] for row in conn.execute('PRAGMA table_info("DeviceToken")').fetchall()}
    if not device_columns:
        conn.execute(
            """CREATE TABLE IF NOT EXISTS "DeviceToken" (
              "id" TEXT NOT NULL PRIMARY KEY,
              "userId" TEXT NOT NULL,
              "platform" TEXT NOT NULL,
              "pushToken" TEXT NOT NULL UNIQUE,
              "deviceName" TEXT,
              "lastSeenAt" TEXT NOT NULL,
              "createdAt" TEXT NOT NULL,
              "updatedAt" TEXT NOT NULL,
              FOREIGN KEY ("userId") REFERENCES "User" ("id")
            )"""
        )
    _ensure_product_tables(conn)
    _ensure_smart_home_tables(conn)
    _ensure_default_product_structure(conn)
    _ensure_default_smart_home_devices(conn)


def _ensure_product_tables(conn: sqlite3.Connection) -> None:
    conn.execute(
        """CREATE TABLE IF NOT EXISTS "Household" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "type" TEXT NOT NULL DEFAULT 'HOME',
          "createdAt" TEXT NOT NULL,
          "updatedAt" TEXT NOT NULL,
          FOREIGN KEY ("userId") REFERENCES "User" ("id")
        )"""
    )
    conn.execute(
        """CREATE TABLE IF NOT EXISTS "HouseholdMember" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "householdId" TEXT NOT NULL,
          "userId" TEXT,
          "email" TEXT NOT NULL,
          "name" TEXT,
          "role" TEXT NOT NULL DEFAULT 'VIEWER',
          "status" TEXT NOT NULL DEFAULT 'INVITED',
          "createdAt" TEXT NOT NULL,
          "updatedAt" TEXT NOT NULL,
          FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE CASCADE,
          FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL
        )"""
    )
    conn.execute(
        """CREATE TABLE IF NOT EXISTS "Space" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "householdId" TEXT NOT NULL,
          "parentId" TEXT,
          "name" TEXT NOT NULL,
          "type" TEXT NOT NULL DEFAULT 'ROOM',
          "sortOrder" INTEGER NOT NULL DEFAULT 0,
          "createdAt" TEXT NOT NULL,
          "updatedAt" TEXT NOT NULL,
          FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE CASCADE,
          FOREIGN KEY ("parentId") REFERENCES "Space" ("id") ON DELETE SET NULL
        )"""
    )
    conn.execute(
        """CREATE TABLE IF NOT EXISTS "AffiliatePartner" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "slug" TEXT NOT NULL UNIQUE,
          "baseUrl" TEXT,
          "commissionNote" TEXT,
          "status" TEXT NOT NULL DEFAULT 'ACTIVE',
          "createdAt" TEXT NOT NULL,
          "updatedAt" TEXT NOT NULL
        )"""
    )
    conn.execute(
        """CREATE TABLE IF NOT EXISTS "PlanSubscription" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "householdId" TEXT,
          "tier" TEXT NOT NULL DEFAULT 'FREE',
          "status" TEXT NOT NULL DEFAULT 'ACTIVE',
          "itemLimit" INTEGER NOT NULL DEFAULT 25,
          "storageLimitMb" INTEGER NOT NULL DEFAULT 100,
          "createdAt" TEXT NOT NULL,
          "updatedAt" TEXT NOT NULL,
          FOREIGN KEY ("userId") REFERENCES "User" ("id"),
          FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE SET NULL
        )"""
    )
    conn.execute(
        """CREATE TABLE IF NOT EXISTS "SmartHomeConnection" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "householdId" TEXT,
          "provider" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
          "lastSyncAt" TEXT,
          "createdAt" TEXT NOT NULL,
          "updatedAt" TEXT NOT NULL,
          FOREIGN KEY ("userId") REFERENCES "User" ("id"),
          FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE SET NULL
        )"""
    )
    conn.execute(
        """CREATE TABLE IF NOT EXISTS "ItemActivity" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "itemId" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "type" TEXT NOT NULL,
          "message" TEXT NOT NULL,
          "createdAt" TEXT NOT NULL,
          FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE,
          FOREIGN KEY ("userId") REFERENCES "User" ("id")
        )"""
    )
    conn.execute(
        """CREATE TABLE IF NOT EXISTS "AffiliateClick" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "itemId" TEXT,
          "partnerSlug" TEXT,
          "targetUrl" TEXT NOT NULL,
          "source" TEXT NOT NULL DEFAULT 'ITEM_REORDER',
          "createdAt" TEXT NOT NULL,
          FOREIGN KEY ("userId") REFERENCES "User" ("id"),
          FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE SET NULL
        )"""
    )


def _ensure_smart_home_tables(conn: sqlite3.Connection) -> None:
    conn.execute(
        """CREATE TABLE IF NOT EXISTS "SmartHomeDevice" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "householdId" TEXT,
          "connectionId" TEXT,
          "provider" TEXT NOT NULL,
          "providerDeviceId" TEXT NOT NULL,
          "itemId" TEXT,
          "name" TEXT NOT NULL,
          "roomName" TEXT,
          "deviceType" TEXT NOT NULL DEFAULT 'device',
          "capabilities" TEXT,
          "status" TEXT NOT NULL DEFAULT 'ONLINE',
          "powerState" TEXT,
          "rawJson" TEXT,
          "lastSeenAt" TEXT,
          "createdAt" TEXT NOT NULL,
          "updatedAt" TEXT NOT NULL,
          FOREIGN KEY ("userId") REFERENCES "User" ("id"),
          FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE SET NULL,
          FOREIGN KEY ("connectionId") REFERENCES "SmartHomeConnection" ("id") ON DELETE SET NULL,
          FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE SET NULL
        )"""
    )
    conn.execute(
        """CREATE TABLE IF NOT EXISTS "SmartHomeCommand" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "deviceId" TEXT NOT NULL,
          "command" TEXT NOT NULL,
          "payload" TEXT,
          "status" TEXT NOT NULL DEFAULT 'SIMULATED',
          "result" TEXT,
          "createdAt" TEXT NOT NULL,
          FOREIGN KEY ("userId") REFERENCES "User" ("id"),
          FOREIGN KEY ("deviceId") REFERENCES "SmartHomeDevice" ("id") ON DELETE CASCADE
        )"""
    )


def _ensure_default_product_structure(conn: sqlite3.Connection) -> None:
    try:
        users = conn.execute('SELECT * FROM "User"').fetchall()
    except sqlite3.OperationalError:
        return
    if not users:
        return

    now = now_iso()
    partner = conn.execute('SELECT id FROM "AffiliatePartner" WHERE slug = ?', ("mavora-reorder",)).fetchone()
    if not partner:
        conn.execute(
            """INSERT INTO "AffiliatePartner"
               (id, name, slug, baseUrl, commissionNote, status, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                make_id(),
                "Mavora Reorder Network",
                "mavora-reorder",
                "https://example.com/reorder",
                "Demo partner slot for future affiliate tracking.",
                "ACTIVE",
                now,
                now,
            ),
        )

    for user in users:
        household = conn.execute('SELECT * FROM "Household" WHERE userId = ? ORDER BY createdAt ASC LIMIT 1', (user["id"],)).fetchone()
        if household:
            household_id = household["id"]
        else:
            household_id = make_id()
            conn.execute(
                'INSERT INTO "Household" (id, userId, name, type, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
                (household_id, user["id"], f"{user['name']}'s Home", "HOME", now, now),
            )

        member = conn.execute(
            'SELECT id FROM "HouseholdMember" WHERE householdId = ? AND userId = ?',
            (household_id, user["id"]),
        ).fetchone()
        if not member:
            conn.execute(
                """INSERT INTO "HouseholdMember"
                   (id, householdId, userId, email, name, role, status, createdAt, updatedAt)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (make_id(), household_id, user["id"], user["email"], user["name"], "OWNER", "ACTIVE", now, now),
            )

        plan = conn.execute('SELECT id FROM "PlanSubscription" WHERE userId = ? ORDER BY createdAt ASC LIMIT 1', (user["id"],)).fetchone()
        if not plan:
            conn.execute(
                """INSERT INTO "PlanSubscription"
                   (id, userId, householdId, tier, status, itemLimit, storageLimitMb, createdAt, updatedAt)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (make_id(), user["id"], household_id, "FREE", "ACTIVE", 25, 100, now, now),
            )

        root = conn.execute(
            'SELECT * FROM "Space" WHERE householdId = ? AND parentId IS NULL ORDER BY sortOrder ASC LIMIT 1',
            (household_id,),
        ).fetchone()
        if root:
            root_id = root["id"]
        else:
            root_id = make_id()
            conn.execute(
                """INSERT INTO "Space" (id, householdId, parentId, name, type, sortOrder, createdAt, updatedAt)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (root_id, household_id, None, "Zuhause", "HOME", 0, now, now),
            )

        default_spaces = [("Wohnzimmer", "ROOM"), ("Kueche", "ROOM"), ("Schlafzimmer", "ROOM"), ("Keller", "STORAGE"), ("Garage", "STORAGE")]
        for index, (name, space_type) in enumerate(default_spaces, start=1):
            exists = conn.execute(
                'SELECT id FROM "Space" WHERE householdId = ? AND lower(name) = lower(?)',
                (household_id, name),
            ).fetchone()
            if not exists:
                conn.execute(
                    """INSERT INTO "Space" (id, householdId, parentId, name, type, sortOrder, createdAt, updatedAt)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    (make_id(), household_id, root_id, name, space_type, index, now, now),
                )

        item_locations = conn.execute(
            'SELECT DISTINCT location FROM "Item" WHERE userId = ? AND location IS NOT NULL AND trim(location) != ?',
            (user["id"], ""),
        ).fetchall()
        for index, row in enumerate(item_locations, start=20):
            name = row["location"]
            exists = conn.execute(
                'SELECT id FROM "Space" WHERE householdId = ? AND lower(name) = lower(?)',
                (household_id, name),
            ).fetchone()
            if not exists:
                conn.execute(
                    """INSERT INTO "Space" (id, householdId, parentId, name, type, sortOrder, createdAt, updatedAt)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    (make_id(), household_id, root_id, name, "ROOM", index, now, now),
                )

        conn.execute(
            'UPDATE "Item" SET householdId = ? WHERE userId = ? AND householdId IS NULL',
            (household_id, user["id"]),
        )
        items = conn.execute('SELECT id, location, category, itemType FROM "Item" WHERE userId = ?', (user["id"],)).fetchall()
        for item in items:
            if item["location"]:
                space = conn.execute(
                    'SELECT id FROM "Space" WHERE householdId = ? AND lower(name) = lower(?)',
                    (household_id, item["location"]),
                ).fetchone()
                if space:
                    conn.execute(
                        'UPDATE "Item" SET spaceId = ? WHERE id = ? AND spaceId IS NULL',
                        (space["id"], item["id"]),
                    )
            category = (item["category"] or "").lower()
            if item["itemType"] == "THING" and category in {"tv", "phone", "laptop", "audio", "appliance", "electronics"}:
                conn.execute('UPDATE "Item" SET itemType = ? WHERE id = ?', ("ELECTRONIC", item["id"]))

        for provider, status in [
            ("SAMSUNG_SMARTTHINGS", "AVAILABLE"),
            ("BAMBU_LAB", "AVAILABLE"),
            ("LOCAL_DISCOVERY", "AVAILABLE"),
            ("HOME_ASSISTANT", "AVAILABLE"),
            ("MATTER", "PLANNED"),
        ]:
            exists = conn.execute(
                'SELECT id FROM "SmartHomeConnection" WHERE userId = ? AND householdId = ? AND provider = ?',
                (user["id"], household_id, provider),
            ).fetchone()
            if not exists:
                conn.execute(
                    """INSERT INTO "SmartHomeConnection"
                       (id, userId, householdId, provider, status, lastSyncAt, createdAt, updatedAt)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    (make_id(), user["id"], household_id, provider, status, None, now, now),
                )


def _ensure_default_smart_home_devices(conn: sqlite3.Connection) -> None:
    try:
        users = conn.execute('SELECT * FROM "User"').fetchall()
    except sqlite3.OperationalError:
        return
    if not users:
        return

    now = now_iso()
    for user in users:
        household = conn.execute('SELECT * FROM "Household" WHERE userId = ? ORDER BY createdAt ASC LIMIT 1', (user["id"],)).fetchone()
        if not household:
            continue
        connection = conn.execute(
            'SELECT * FROM "SmartHomeConnection" WHERE userId = ? AND householdId = ? AND provider = ?',
            (user["id"], household["id"], "SAMSUNG_SMARTTHINGS"),
        ).fetchone()
        if not connection:
            continue
        tv_item = conn.execute(
            """SELECT * FROM "Item"
               WHERE userId = ? AND (lower(name) LIKE '%tv%' OR lower(category) LIKE '%tv%' OR lower(manufacturer) = 'lg' OR lower(manufacturer) = 'samsung')
               ORDER BY updatedAt DESC LIMIT 1""",
            (user["id"],),
        ).fetchone()
        exists = conn.execute(
            'SELECT id FROM "SmartHomeDevice" WHERE userId = ? AND providerDeviceId = ?',
            (user["id"], "demo-living-room-tv"),
        ).fetchone()
        if not exists:
            conn.execute(
                """INSERT INTO "SmartHomeDevice"
                   (id, userId, householdId, connectionId, provider, providerDeviceId, itemId, name, roomName, deviceType, capabilities, status,
                    powerState, rawJson, lastSeenAt, createdAt, updatedAt)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    make_id(),
                    user["id"],
                    household["id"],
                    connection["id"],
                    "SAMSUNG_SMARTTHINGS",
                    "demo-living-room-tv",
                    tv_item["id"] if tv_item else None,
                    "Living Room TV",
                    tv_item["location"] if tv_item and tv_item["location"] else "Wohnzimmer",
                    "tv",
                    '["switch","audioVolume","audioMute","mediaInputSource"]',
                    "ONLINE",
                    "off",
                    '{"demo":true,"source":"Mavora seed"}',
                    now,
                    now,
                    now,
                ),
            )


@contextmanager
def db() -> Iterator[sqlite3.Connection]:
    conn = connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def row_to_dict(row: sqlite3.Row | None) -> dict | None:
    return dict(row) if row else None


def rows_to_dicts(rows: list[sqlite3.Row]) -> list[dict]:
    return [dict(row) for row in rows]


def init_database() -> None:
    with connection() as conn:
        conn.executescript(SCHEMA_PATH.read_text())
