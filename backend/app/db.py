from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from threading import Lock
from typing import Iterator

from app.utils import make_id, now_iso

BACKEND_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_ROOT.parent
DB_PATH = Path(os.environ.get("AVARENO_DB_PATH", str(BACKEND_ROOT / "second_memory.db"))).expanduser()
SCHEMA_PATH = BACKEND_ROOT / "schema.sql"
_SCHEMA_LOCK = Lock()


def connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA busy_timeout = 5000")
    with _SCHEMA_LOCK:
        try:
            ensure_runtime_schema(conn)
            conn.commit()
        except Exception:
            conn.rollback()
            raise
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
        "barcode": "TEXT",
        "barcodeFormat": "TEXT",
        "notes": "TEXT",
        "manualUrl": "TEXT",
        "driverUrl": "TEXT",
        "softwareUrl": "TEXT",
        "supportUrl": "TEXT",
        "supportContact": "TEXT",
        "reorderUrl": "TEXT",
        "affiliateUrl": "TEXT",
        "affiliateProvider": "TEXT",
        "visibility": "TEXT NOT NULL DEFAULT 'HOUSEHOLD'",
    }
    for name, definition in item_columns.items():
        if columns and name not in columns:
            conn.execute(f'ALTER TABLE "Item" ADD COLUMN "{name}" {definition}')
    if columns:
        conn.execute('CREATE INDEX IF NOT EXISTS "Item_userId_barcode_idx" ON "Item" ("userId", "barcode")')
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
    _ensure_privacy_tables(conn)
    _ensure_product_tables(conn)
    _ensure_smart_home_tables(conn)
    _ensure_social_tables(conn)
    _ensure_vault_and_usage_tables(conn)
    _ensure_default_product_structure(conn)
    _ensure_default_smart_home_devices(conn)


def _ensure_vault_and_usage_tables(conn: sqlite3.Connection) -> None:
    document_columns = {row["name"] for row in conn.execute('PRAGMA table_info("Document")').fetchall()}
    if document_columns:
        if "fileSize" not in document_columns:
            conn.execute('ALTER TABLE "Document" ADD COLUMN "fileSize" INTEGER')
        if "vaultId" not in document_columns:
            conn.execute('ALTER TABLE "Document" ADD COLUMN "vaultId" TEXT')
        conn.execute('CREATE INDEX IF NOT EXISTS "Document_vaultId_idx" ON "Document" ("vaultId")')
        # Backfill sizes for documents uploaded before fileSize existed, so the
        # storage quota counts existing files. Missing files stay NULL.
        pending = conn.execute('SELECT id, filePath FROM "Document" WHERE fileSize IS NULL AND filePath LIKE \'/uploads/%\'').fetchall()
        for row in pending:
            candidate = PROJECT_ROOT / "uploads" / row["filePath"].removeprefix("/uploads/")
            try:
                size = candidate.stat().st_size
            except OSError:
                continue
            conn.execute('UPDATE "Document" SET fileSize = ? WHERE id = ?', (int(size), row["id"]))
    conn.execute(
        """CREATE TABLE IF NOT EXISTS "Vault" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "createdAt" TEXT NOT NULL,
          "updatedAt" TEXT NOT NULL,
          FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
        )"""
    )
    conn.execute('CREATE INDEX IF NOT EXISTS "Vault_userId_idx" ON "Vault" ("userId")')
    conn.execute(
        """CREATE TABLE IF NOT EXISTS "VaultSecurity" (
          "userId" TEXT NOT NULL PRIMARY KEY,
          "pinHash" TEXT NOT NULL,
          "failedAttempts" INTEGER NOT NULL DEFAULT 0,
          "lockedUntil" TEXT,
          "createdAt" TEXT NOT NULL,
          "updatedAt" TEXT NOT NULL,
          FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
        )"""
    )
    conn.execute(
        """CREATE TABLE IF NOT EXISTS "UsageCounter" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "kind" TEXT NOT NULL,
          "period" TEXT NOT NULL,
          "count" INTEGER NOT NULL DEFAULT 0,
          "updatedAt" TEXT NOT NULL,
          UNIQUE ("userId", "kind", "period"),
          FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
        )"""
    )


def _ensure_privacy_tables(conn: sqlite3.Connection) -> None:
    conn.execute(
        """CREATE TABLE IF NOT EXISTS "PrivacyAuditEvent" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "eventType" TEXT NOT NULL,
          "status" TEXT NOT NULL,
          "message" TEXT NOT NULL,
          "provider" TEXT,
          "safeContext" TEXT,
          "createdAt" TEXT NOT NULL,
          FOREIGN KEY ("userId") REFERENCES "User" ("id")
        )"""
    )
    conn.execute(
        """CREATE TABLE IF NOT EXISTS "ConsentEvent" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "scope" TEXT NOT NULL,
          "label" TEXT NOT NULL,
          "status" TEXT NOT NULL,
          "legalBasis" TEXT,
          "source" TEXT NOT NULL DEFAULT 'app',
          "createdAt" TEXT NOT NULL,
          "revokedAt" TEXT,
          FOREIGN KEY ("userId") REFERENCES "User" ("id")
        )"""
    )
    conn.execute('CREATE INDEX IF NOT EXISTS "PrivacyAuditEvent_userId_createdAt_idx" ON "PrivacyAuditEvent" ("userId", "createdAt")')
    conn.execute('CREATE INDEX IF NOT EXISTS "ConsentEvent_userId_createdAt_idx" ON "ConsentEvent" ("userId", "createdAt")')


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
          "provider" TEXT NOT NULL DEFAULT 'internal',
          "providerCustomerId" TEXT,
          "providerSubscriptionId" TEXT,
          "stripePriceId" TEXT,
          "billingInterval" TEXT,
          "planKey" TEXT NOT NULL DEFAULT 'free',
          "tier" TEXT NOT NULL DEFAULT 'FREE',
          "status" TEXT NOT NULL DEFAULT 'ACTIVE',
          "itemLimit" INTEGER NOT NULL DEFAULT 30,
          "storageLimitMb" INTEGER NOT NULL DEFAULT 100,
          "currentPeriodStart" TEXT,
          "currentPeriodEnd" TEXT,
          "cancelAtPeriodEnd" INTEGER NOT NULL DEFAULT 0,
          "createdAt" TEXT NOT NULL,
          "updatedAt" TEXT NOT NULL,
          FOREIGN KEY ("userId") REFERENCES "User" ("id"),
          FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE SET NULL
        )"""
    )
    plan_columns = {row["name"] for row in conn.execute('PRAGMA table_info("PlanSubscription")').fetchall()}
    plan_column_definitions = {
        "provider": "TEXT NOT NULL DEFAULT 'internal'",
        "providerCustomerId": "TEXT",
        "providerSubscriptionId": "TEXT",
        "stripePriceId": "TEXT",
        "billingInterval": "TEXT",
        "planKey": "TEXT NOT NULL DEFAULT 'free'",
        "currentPeriodStart": "TEXT",
        "currentPeriodEnd": "TEXT",
        "cancelAtPeriodEnd": "INTEGER NOT NULL DEFAULT 0",
    }
    for name, definition in plan_column_definitions.items():
        if name not in plan_columns:
            conn.execute(f'ALTER TABLE "PlanSubscription" ADD COLUMN "{name}" {definition}')
    conn.execute("""UPDATE "PlanSubscription" SET planKey = 'free' WHERE upper(tier) = 'FREE'""")
    conn.execute("""UPDATE "PlanSubscription" SET planKey = 'personal', tier = 'PERSONAL' WHERE upper(tier) IN ('HOME', 'PREMIUM', 'PERSONAL')""")
    conn.execute("""UPDATE "PlanSubscription" SET planKey = 'pro', tier = 'PRO' WHERE upper(tier) = 'PRO'""")
    conn.execute("""UPDATE "PlanSubscription" SET planKey = 'family', tier = 'FAMILY' WHERE upper(tier) = 'FAMILY'""")
    conn.execute("""UPDATE "PlanSubscription" SET provider = 'internal' WHERE planKey = 'free' AND provider IN ('paddle', 'stripe', 'lemon_squeezy') AND providerCustomerId IS NULL AND providerSubscriptionId IS NULL""")
    conn.execute("""UPDATE "PlanSubscription" SET itemLimit = 30, storageLimitMb = 100 WHERE planKey = 'free'""")
    conn.execute("""UPDATE "PlanSubscription" SET itemLimit = 300, storageLimitMb = 2048 WHERE planKey = 'personal'""")
    conn.execute("""UPDATE "PlanSubscription" SET itemLimit = 2000, storageLimitMb = 20480 WHERE planKey = 'pro'""")
    conn.execute("""UPDATE "PlanSubscription" SET itemLimit = 5000, storageLimitMb = 51200 WHERE planKey = 'family'""")
    conn.execute('CREATE INDEX IF NOT EXISTS "PlanSubscription_userId_idx" ON "PlanSubscription" ("userId")')
    conn.execute('CREATE INDEX IF NOT EXISTS "PlanSubscription_providerSubscriptionId_idx" ON "PlanSubscription" ("provider", "providerSubscriptionId")')
    conn.execute(
        """CREATE TABLE IF NOT EXISTS "BillingEvent" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "provider" TEXT NOT NULL,
          "eventId" TEXT NOT NULL,
          "eventType" TEXT NOT NULL,
          "receivedAt" TEXT NOT NULL,
          "processedAt" TEXT,
          "status" TEXT NOT NULL DEFAULT 'RECEIVED',
          "safeError" TEXT,
          UNIQUE ("provider", "eventId")
        )"""
    )
    conn.execute(
        """CREATE TABLE IF NOT EXISTS "BillingInvoice" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "provider" TEXT NOT NULL DEFAULT 'stripe',
          "providerInvoiceId" TEXT NOT NULL,
          "providerCustomerId" TEXT,
          "providerSubscriptionId" TEXT,
          "invoiceNumber" TEXT,
          "status" TEXT NOT NULL,
          "currency" TEXT NOT NULL DEFAULT 'eur',
          "amountDue" INTEGER NOT NULL DEFAULT 0,
          "amountPaid" INTEGER NOT NULL DEFAULT 0,
          "amountRemaining" INTEGER NOT NULL DEFAULT 0,
          "periodStart" TEXT,
          "periodEnd" TEXT,
          "hostedInvoiceUrl" TEXT,
          "invoicePdfUrl" TEXT,
          "invoiceCreatedAt" TEXT,
          "finalizedAt" TEXT,
          "paidAt" TEXT,
          "createdAt" TEXT NOT NULL,
          "updatedAt" TEXT NOT NULL,
          UNIQUE ("provider", "providerInvoiceId"),
          FOREIGN KEY ("userId") REFERENCES "User" ("id")
        )"""
    )
    conn.execute('CREATE INDEX IF NOT EXISTS "BillingInvoice_userId_createdAt_idx" ON "BillingInvoice" ("userId", "invoiceCreatedAt")')
    conn.execute('CREATE INDEX IF NOT EXISTS "BillingInvoice_providerInvoiceId_idx" ON "BillingInvoice" ("provider", "providerInvoiceId")')
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
    conn.execute(
        """CREATE TABLE IF NOT EXISTS "RepairLog" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "itemId" TEXT NOT NULL,
          "date" TEXT NOT NULL,
          "problem" TEXT NOT NULL,
          "resolution" TEXT,
          "cost" REAL,
          "status" TEXT NOT NULL DEFAULT 'OPEN',
          "createdAt" TEXT NOT NULL,
          "updatedAt" TEXT NOT NULL,
          FOREIGN KEY ("userId") REFERENCES "User" ("id"),
          FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE
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


def _ensure_social_tables(conn: sqlite3.Connection) -> None:
    # Friendships are stored symmetrically (one row per direction) so that a
    # user's friends are a simple "WHERE userId = ?" lookup. Both rows share the
    # same status and are created/removed together.
    conn.execute(
        """CREATE TABLE IF NOT EXISTS "Friendship" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "friendUserId" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'ACCEPTED',
          "createdAt" TEXT NOT NULL,
          "updatedAt" TEXT NOT NULL,
          UNIQUE ("userId", "friendUserId"),
          FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE,
          FOREIGN KEY ("friendUserId") REFERENCES "User" ("id") ON DELETE CASCADE
        )"""
    )
    # Each user has a single reusable, human-friendly invite code. Entering
    # someone else's active code connects the two accounts as friends.
    conn.execute(
        """CREATE TABLE IF NOT EXISTS "FriendInviteCode" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "code" TEXT NOT NULL UNIQUE,
          "status" TEXT NOT NULL DEFAULT 'ACTIVE',
          "createdAt" TEXT NOT NULL,
          "expiresAt" TEXT,
          FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
        )"""
    )
    # Per-user motivation-privacy preferences. These decide what (if anything) a
    # friend may see of this user's progress. Enforced server-side.
    conn.execute(
        """CREATE TABLE IF NOT EXISTS "MotivationPrivacy" (
          "userId" TEXT NOT NULL PRIMARY KEY,
          "motivationEnabled" INTEGER NOT NULL DEFAULT 1,
          "leaderboardEnabled" INTEGER NOT NULL DEFAULT 1,
          "hideXpFromFriends" INTEGER NOT NULL DEFAULT 0,
          "hideStreakFromFriends" INTEGER NOT NULL DEFAULT 1,
          "allowFriendInvites" INTEGER NOT NULL DEFAULT 1,
          "updatedAt" TEXT NOT NULL,
          FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
        )"""
    )
    # Private named groups of a user's friends (owner-only, for their own view).
    conn.execute(
        """CREATE TABLE IF NOT EXISTS "FriendCircle" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "createdAt" TEXT NOT NULL,
          "updatedAt" TEXT NOT NULL,
          FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
        )"""
    )
    conn.execute(
        """CREATE TABLE IF NOT EXISTS "FriendCircleMember" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "circleId" TEXT NOT NULL,
          "friendUserId" TEXT NOT NULL,
          "createdAt" TEXT NOT NULL,
          UNIQUE ("circleId", "friendUserId"),
          FOREIGN KEY ("circleId") REFERENCES "FriendCircle" ("id") ON DELETE CASCADE,
          FOREIGN KEY ("friendUserId") REFERENCES "User" ("id") ON DELETE CASCADE
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
    partner = conn.execute('SELECT id FROM "AffiliatePartner" WHERE slug = ?', ("avareno-reorder",)).fetchone()
    if not partner:
        conn.execute(
            """INSERT OR IGNORE INTO "AffiliatePartner"
               (id, name, slug, baseUrl, commissionNote, status, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                make_id(),
                "Avareno Reorder Network",
                "avareno-reorder",
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
                   (id, userId, householdId, provider, planKey, tier, status, itemLimit, storageLimitMb, createdAt, updatedAt)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (make_id(), user["id"], household_id, "internal", "free", "FREE", "ACTIVE", 30, 100, now, now),
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
        conn.execute(
            'DELETE FROM "SmartHomeDevice" WHERE providerDeviceId IN (?, ?)',
            ("demo-living-room-tv", "local-demo-tv"),
        )
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
        # Do not seed a demo TV. TVs should come from real local discovery
        # or an explicit provider connection so users can trust the device list.


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
