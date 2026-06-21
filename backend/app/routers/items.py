from __future__ import annotations

from datetime import timedelta

from fastapi import APIRouter, HTTPException

from app.db import db, row_to_dict, rows_to_dicts
from app.dependencies import get_default_user
from app.schemas import ItemCreate, ItemPatch
from app.services.item_service import calculate_completeness_score, missing_fields
from app.services.xp_service import award_xp
from app.utils import make_id, normalize_iso, now_iso, parse_iso

router = APIRouter()


def _documents(conn, item_id: str) -> list[dict]:
    return rows_to_dicts(conn.execute('SELECT * FROM "Document" WHERE itemId = ?', (item_id,)).fetchall())


def _loops(conn, item_id: str) -> list[dict]:
    return rows_to_dicts(conn.execute('SELECT * FROM "Loop" WHERE itemId = ? ORDER BY dueDate ASC', (item_id,)).fetchall())


def _reminders(conn, item_id: str) -> list[dict]:
    return rows_to_dicts(conn.execute('SELECT * FROM "Reminder" WHERE itemId = ? ORDER BY remindAt ASC', (item_id,)).fetchall())


def _item_detail(conn, item_id: str) -> dict | None:
    item = row_to_dict(conn.execute('SELECT * FROM "Item" WHERE id = ?', (item_id,)).fetchone())
    if not item:
        return None
    documents = _documents(conn, item_id)
    item["documents"] = documents
    item["loops"] = _loops(conn, item_id)
    item["reminders"] = _reminders(conn, item_id)
    item["missingFields"] = missing_fields(item, documents)
    return item


@router.get("")
def list_items() -> list[dict]:
    with db() as conn:
        user = get_default_user(conn)
        items = rows_to_dicts(
            conn.execute('SELECT * FROM "Item" WHERE userId = ? ORDER BY updatedAt DESC', (user["id"],)).fetchall()
        )
        for item in items:
            docs = _documents(conn, item["id"])
            item["documents"] = docs
            item["loops"] = _loops(conn, item["id"])
            item["missingFields"] = missing_fields(item, docs)
        return items


@router.get("/{item_id}")
def get_item(item_id: str) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        item = row_to_dict(
            conn.execute('SELECT * FROM "Item" WHERE id = ? AND userId = ?', (item_id, user["id"])).fetchone()
        )
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        detail = _item_detail(conn, item_id)
        return detail or item


@router.post("", status_code=201)
def create_item(payload: ItemCreate) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        now = now_iso()
        item_id = make_id()
        receipt_docs = [{"type": "RECEIPT"}] if payload.documentId else []
        item_data = {
            "purchaseDate": normalize_iso(payload.purchaseDate),
            "merchant": payload.merchant,
            "price": payload.price,
            "manufacturer": payload.manufacturer,
            "model": payload.model,
            "serialNumber": payload.serialNumber,
            "warrantyUntil": normalize_iso(payload.warrantyUntil),
        }
        score = calculate_completeness_score(item_data, receipt_docs)

        conn.execute(
            """INSERT INTO "Item"
               (id, userId, name, category, manufacturer, model, serialNumber, purchaseDate, merchant, price,
                currency, warrantyUntil, location, completenessScore, status, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                item_id,
                user["id"],
                payload.name,
                payload.category,
                payload.manufacturer,
                payload.model,
                payload.serialNumber,
                item_data["purchaseDate"],
                payload.merchant,
                payload.price,
                payload.currency,
                item_data["warrantyUntil"],
                payload.location,
                score,
                "ACTIVE",
                now,
                now,
            ),
        )

        if payload.documentId:
            conn.execute(
                'UPDATE "Document" SET itemId = ?, type = ?, updatedAt = ? WHERE id = ?',
                (item_id, "RECEIPT", now, payload.documentId),
            )
            award_xp(conn, user_id=user["id"], item_id=item_id, action="upload_receipt", points=20)

        if item_data["warrantyUntil"]:
            warranty = parse_iso(item_data["warrantyUntil"])
            remind_at = (warranty - timedelta(days=30)).replace(hour=9, minute=0, second=0, microsecond=0) if warranty else None
            if remind_at:
                loop_id = make_id()
                conn.execute(
                    """INSERT INTO "Loop"
                       (id, userId, itemId, title, description, sourceType, priority, status, dueDate, reminderAt, xpReward, createdAt, updatedAt)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        loop_id,
                        user["id"],
                        item_id,
                        f"Warranty check: {payload.name}",
                        "Review warranty before it expires.",
                        "RECEIPT",
                        "MEDIUM",
                        "OPEN",
                        remind_at.isoformat(),
                        remind_at.isoformat(),
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
                        user["id"],
                        loop_id,
                        item_id,
                        f"Warranty reminder: {payload.name}",
                        "Warranty ends soon.",
                        remind_at.isoformat(),
                        "ACTIVE",
                        now,
                        now,
                    ),
                )

        award_xp(conn, user_id=user["id"], item_id=item_id, action="create_item_from_receipt", points=30)
        return _item_detail(conn, item_id) or {}


@router.patch("/{item_id}")
def patch_item(item_id: str, payload: ItemPatch) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        item = row_to_dict(
            conn.execute('SELECT * FROM "Item" WHERE id = ? AND userId = ?', (item_id, user["id"])).fetchone()
        )
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")

        updates = payload.model_dump(exclude_unset=True)
        updates.pop("documentId", None)
        for key in ["purchaseDate", "warrantyUntil"]:
            if key in updates:
                updates[key] = normalize_iso(updates[key])

        next_item = {**item, **updates}
        docs = _documents(conn, item_id)
        score = calculate_completeness_score(next_item, docs)
        updates["completenessScore"] = score
        updates["updatedAt"] = now_iso()

        assignments = ", ".join(f'"{key}" = ?' for key in updates)
        conn.execute(f'UPDATE "Item" SET {assignments} WHERE id = ?', [*updates.values(), item_id])

        if not item.get("serialNumber") and updates.get("serialNumber"):
            award_xp(conn, user_id=user["id"], item_id=item_id, action="add_serial_number", points=25)
        if int(item["completenessScore"]) < 100 and score == 100:
            award_xp(conn, user_id=user["id"], item_id=item_id, action="complete_item_profile", points=50)

        return _item_detail(conn, item_id) or {}
