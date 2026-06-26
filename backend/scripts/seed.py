from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.db import db, init_database  # noqa: E402
from app.services.product_images import LG_C3_IMAGE_URL  # noqa: E402
from app.utils import make_id, now_iso  # noqa: E402


def next_friday() -> datetime:
    now = datetime.now(timezone.utc)
    delta = (4 - now.weekday() + 7) % 7 or 7
    return (now + timedelta(days=delta)).replace(hour=18, minute=0, second=0, microsecond=0)


def main() -> None:
    init_database()
    now = now_iso()
    due_friday = next_friday()
    remind_thursday = (due_friday - timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)

    with db() as conn:
        user_id = make_id()
        item_id = make_id()
        document_id = make_id()
        repair_id = make_id()
        warranty_loop_id = make_id()
        message_loop_id = make_id()

        conn.execute(
            'INSERT INTO "User" (id, name, email, xp, level, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
            (user_id, "Steve", "steve@example.com", 85, 1, now, now),
        )
        conn.execute(
            """INSERT INTO "Item"
               (id, userId, name, category, manufacturer, model, purchaseDate, merchant, price, currency,
                imageUrl, warrantyUntil, location, manualUrl, driverUrl, softwareUrl, supportUrl, supportContact,
                completenessScore, status, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                item_id,
                user_id,
                "LG OLED C3 Wohnzimmer",
                "TV",
                "LG",
                "OLED65C3",
                "2025-09-14T12:00:00+00:00",
                "MediaMarkt",
                1499,
                "EUR",
                LG_C3_IMAGE_URL,
                "2027-09-14T12:00:00+00:00",
                "Wohnzimmer",
                "https://www.lg.com/support/product/lg-OLED65C3",
                "https://www.lg.com/support/software-firmware",
                "https://www.lg.com/support/software-firmware",
                "https://www.lg.com/support/contact",
                "LG Support",
                80,
                "ACTIVE",
                now,
                now,
            ),
        )
        conn.execute(
            """INSERT INTO "Document"
               (id, userId, itemId, type, fileName, filePath, mimeType, extractedText, extractedJson, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                document_id,
                user_id,
                item_id,
                "RECEIPT",
                "mediamarkt-lg-oled-receipt.pdf",
                "/uploads/sample-receipt.pdf",
                "application/pdf",
                "MediaMarkt LG OLED65C3 1499 EUR",
                '{"merchant":"MediaMarkt","manufacturer":"LG","model":"OLED65C3","price":1499}',
                now,
                now,
            ),
        )
        conn.execute(
            """INSERT INTO "RepairLog"
               (id, userId, itemId, date, problem, resolution, cost, status, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                repair_id,
                user_id,
                item_id,
                "2026-01-20T10:00:00+00:00",
                "HDMI cable caused intermittent signal drop.",
                "Cable replaced and input renamed.",
                19.99,
                "RESOLVED",
                now,
                now,
            ),
        )
        conn.execute(
            """INSERT INTO "Loop"
               (id, userId, itemId, title, description, sourceType, priority, status, dueDate, reminderAt, xpReward, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                warranty_loop_id,
                user_id,
                item_id,
                "Garantie vom LG TV pruefen",
                "Warranty is stored. Serial number is still missing.",
                "RECEIPT",
                "MEDIUM",
                "OPEN",
                "2027-08-14T09:00:00+00:00",
                "2027-08-14T09:00:00+00:00",
                25,
                now,
                now,
            ),
        )
        conn.execute(
            """INSERT INTO "Reminder"
               (id, userId, loopId, itemId, title, message, remindAt, status, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                make_id(),
                user_id,
                warranty_loop_id,
                item_id,
                "Warranty Saver",
                "LG TV warranty ends soon.",
                "2027-08-14T09:00:00+00:00",
                "ACTIVE",
                now,
                now,
            ),
        )
        conn.execute(
            """INSERT INTO "Loop"
               (id, userId, title, description, sourceType, priority, status, dueDate, reminderAt, xpReward, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                message_loop_id,
                user_id,
                "Miesa wegen Freitag erinnern",
                "Message reminder created from pasted text.",
                "MESSAGE",
                "MEDIUM",
                "OPEN",
                due_friday.isoformat(),
                remind_thursday.isoformat(),
                25,
                now,
                now,
            ),
        )
        conn.execute(
            """INSERT INTO "Reminder"
               (id, userId, loopId, title, message, remindAt, status, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                make_id(),
                user_id,
                message_loop_id,
                "Miesa kommt Freitag",
                "Du wolltest wegen Freitag antworten.",
                remind_thursday.isoformat(),
                "ACTIVE",
                now,
                now,
            ),
        )
        conn.executemany(
            'INSERT INTO "XpTransaction" (id, userId, loopId, itemId, action, points, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
                (make_id(), user_id, None, item_id, "first_receipt", 20, now),
                (make_id(), user_id, None, item_id, "create_item_from_receipt", 30, now),
                (make_id(), user_id, message_loop_id, None, "create_message_reminder", 10, now),
            ],
        )
    print("Seeded Avareno Python backend")


if __name__ == "__main__":
    main()
