from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter

from app.db import db, row_to_dict
from app.dependencies import get_default_user
from app.schemas import CaptureDropRequest, MessageCapture, UniversalCaptureRequest
from app.services.authorization import require_owned_space
from app.services.item_service import calculate_completeness_score
from app.services.message_parser import parse_message_reminder
from app.services.product_images import suggest_product_image
from app.services.xp_service import award_xp
from app.utils import make_id, now_iso

router = APIRouter()


def _default_household_id(conn, user_id: str) -> str | None:
    household = row_to_dict(conn.execute('SELECT * FROM "Household" WHERE userId = ? ORDER BY createdAt ASC LIMIT 1', (user_id,)).fetchone())
    return household["id"] if household else None


def _guess_item_type(text: str) -> str:
    lowered = text.lower()
    if any(word in lowered for word in ["tv", "oled", "iphone", "laptop", "macbook", "playstation", "router", "waschmaschine"]):
        return "ELECTRONIC"
    if any(word in lowered for word in ["sofa", "tisch", "stuhl", "bett", "schrank", "lampe"]):
        return "FURNITURE"
    if any(word in lowered for word in ["heizung", "fenster", "tuer", "boiler", "kueche", "bad", "boden"]):
        return "INFRASTRUCTURE"
    if any(word in lowered for word in ["auto", "bike", "fahrrad", "e-bike", "scooter"]):
        return "VEHICLE"
    return "THING"


def _guess_category(text: str, item_type: str) -> str:
    lowered = text.lower()
    if "tv" in lowered or "oled" in lowered:
        return "TV"
    if "sofa" in lowered:
        return "Sofa"
    if "fahrrad" in lowered or "bike" in lowered:
        return "Bike"
    if item_type == "INFRASTRUCTURE":
        return "Building"
    return "Other"


def _guess_brand_model(text: str) -> tuple[str | None, str | None]:
    # Only recognize a manufacturer the user actually typed as a word.
    # Never invent brand-specific demo models (the old LG/OLED-C3 special
    # case is removed for the focused beta).
    tokens = set(re.findall(r"[a-zäöüß0-9\-]+", text.lower()))
    for brand in ["LG", "Apple", "Samsung", "Bosch", "Philips", "Siemens", "Sony", "Miele"]:
        if brand.lower() in tokens:
            return brand, None
    return None, None


def _guess_name(text: str, manufacturer: str | None, model: str | None, category: str) -> str:
    words = [word.strip(" ,.;:") for word in text.split() if word.strip(" ,.;:")]
    if manufacturer and model:
        suffix = " ".join([word for word in words if word.lower() in {"wohnzimmer", "kueche", "office", "buero", "keller"}])
        return f"{manufacturer} {model}{f' {suffix}' if suffix else ''}"
    if len(words) <= 5:
        return " ".join(words).strip() or category
    return " ".join(words[:5]).strip()


def _guess_location(conn, text: str, user_id: str, requested_space_id: str | None = None) -> tuple[str | None, str | None]:
    if requested_space_id:
        space = require_owned_space(conn, user_id, requested_space_id)
        return space["id"], space["name"]
    lowered = text.lower()
    spaces = conn.execute(
        """SELECT s.* FROM "Space" s
           JOIN "Household" h ON h.id = s.householdId
           WHERE h.userId = ?
           ORDER BY length(s.name) DESC""",
        (user_id,),
    ).fetchall()
    for space in spaces:
        if space["name"].lower() in lowered:
            return space["id"], space["name"]
    return None, None


def _capture_kind(kind: str, text: str) -> str:
    requested = kind.upper()
    if requested != "AUTO":
        return requested
    lowered = text.lower()
    if any(word in lowered for word in ["antwort", "reply", "melden", "schreiben", "anrufen"]):
        return "MESSAGE"
    if any(word in lowered for word in ["rechnung", "beleg", "receipt", "garantie", "eur", "€"]):
        return "RECEIPT"
    if any(word in lowered for word in ["vertrag", "deadline", "frist", "pruefen", "prüfen", "kuendigen", "kündigen"]):
        return "LOOP"
    return "ITEM"


def _extract_price(text: str) -> float | None:
    match = re.search(r"(\d+(?:[.,]\d{1,2})?)\s*(?:eur|€)", text, flags=re.IGNORECASE)
    if not match:
        return None
    try:
        return float(match.group(1).replace(",", "."))
    except ValueError:
        return None


def _extract_merchant(text: str) -> str | None:
    lowered = text.lower()
    for merchant in ["MediaMarkt", "Saturn", "Amazon", "Apple", "Ikea", "OBI", "Bauhaus"]:
        if merchant.lower() in lowered:
            return merchant
    return None


def _fallback_due_date(text: str) -> str | None:
    lowered = text.lower()
    now = datetime.now(timezone.utc)
    if "morgen" in lowered or "tomorrow" in lowered:
        return (now + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0).isoformat()
    if "naechsten monat" in lowered or "nächsten monat" in lowered or "next month" in lowered:
        return (now + timedelta(days=30)).replace(hour=9, minute=0, second=0, microsecond=0).isoformat()
    if any(word in lowered for word in ["freitag", "friday"]):
        parsed = parse_message_reminder(text)
        return parsed["dueDate"]
    return None


def _create_loop_drop(conn, user_id: str, text: str, kind: str, contact_name: str | None = None) -> dict:
    now = now_iso()
    parsed = parse_message_reminder(text, contact_name) if kind == "MESSAGE" else None
    loop_id = make_id()
    due_date = parsed["dueDate"] if parsed else _fallback_due_date(text)
    reminder_at = parsed["reminderAt"] if parsed else due_date
    title = (parsed["title"] if parsed else text[:72]).strip() or "New reminder"
    source_type = "MESSAGE" if kind == "MESSAGE" else "DOCUMENT" if kind == "DOCUMENT" else "MANUAL"
    conn.execute(
        """INSERT INTO "Loop"
           (id, userId, title, description, sourceType, priority, status, dueDate, reminderAt, xpReward, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            loop_id,
            user_id,
            title,
            parsed["description"] if parsed else text,
            source_type,
            parsed["priority"] if parsed else "MEDIUM",
            "OPEN",
            due_date,
            reminder_at,
            parsed["xpReward"] if parsed else 25,
            now,
            now,
        ),
    )
    if reminder_at:
        conn.execute(
            """INSERT INTO "Reminder"
               (id, userId, loopId, title, message, remindAt, status, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                make_id(),
                user_id,
                loop_id,
                title,
                "Avareno reminder created from capture.",
                reminder_at,
                "ACTIVE",
                now,
                now,
            ),
        )
    award_xp(conn, user_id=user_id, loop_id=loop_id, action=f"capture_{kind.lower()}", points=10)
    return {
        "id": loop_id,
        "kind": kind,
        "title": title,
        "summary": "Loop and reminder created." if reminder_at else "Loop created.",
        "route": f"/app/loops/{loop_id}",
    }


def _create_item_drop(conn, user_id: str, text: str, kind: str) -> dict:
    item_type = _guess_item_type(text)
    category = _guess_category(text, item_type)
    manufacturer, model = _guess_brand_model(text)
    space_id, location = _guess_location(conn, text, user_id)
    household_id = _default_household_id(conn, user_id)
    draft = {
        "name": _guess_name(text, manufacturer, model, category),
        "category": category,
        "itemType": item_type,
        "manufacturer": manufacturer,
        "model": model,
        "spaceId": space_id,
        "location": location,
        "merchant": _extract_merchant(text),
        "price": _extract_price(text),
        "currency": "EUR",
        "notes": text,
        "visibility": "HOUSEHOLD",
    }
    image_suggestion = suggest_product_image(draft)
    if image_suggestion:
        draft["imageUrl"] = image_suggestion["imageUrl"]
    documents = [{"type": "RECEIPT"}] if kind == "RECEIPT" else []
    score = calculate_completeness_score(draft, documents)
    now = now_iso()
    item_id = make_id()
    conn.execute(
        """INSERT INTO "Item"
           (id, userId, householdId, spaceId, name, itemType, category, manufacturer, model, merchant, price, currency,
            imageUrl, location, notes, visibility, completenessScore, status, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            item_id,
            user_id,
            household_id,
            space_id,
            draft["name"],
            draft["itemType"],
            draft["category"],
            draft["manufacturer"],
            draft["model"],
            draft["merchant"],
            draft["price"],
            draft["currency"],
            draft.get("imageUrl"),
            draft["location"],
            draft["notes"],
            draft["visibility"],
            score,
            "ACTIVE",
            now,
            now,
        ),
    )
    conn.execute(
        """INSERT INTO "ItemActivity" (id, itemId, userId, type, message, createdAt)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (make_id(), item_id, user_id, "CAPTURED", f"{kind.title()} capture created item profile.", now),
    )
    award_xp(conn, user_id=user_id, item_id=item_id, action=f"capture_{kind.lower()}", points=20 if kind == "RECEIPT" else 10)
    return {
        "id": item_id,
        "kind": kind,
        "title": draft["name"],
        "summary": f"{category} profile created with {score}% completeness.",
        "route": f"/app/items/{item_id}",
    }


@router.post("/universal")
def universal_capture(payload: UniversalCaptureRequest) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        item_type = payload.itemType or _guess_item_type(payload.text)
        category = _guess_category(payload.text, item_type)
        manufacturer, model = _guess_brand_model(payload.text)
        space_id, location = _guess_location(conn, payload.text, user["id"], payload.spaceId)
        draft = {
            "name": _guess_name(payload.text, manufacturer, model, category),
            "category": category,
            "itemType": item_type,
            "manufacturer": manufacturer,
            "model": model,
            "spaceId": space_id,
            "location": location,
            "currency": "EUR",
            "notes": payload.text,
            "visibility": "HOUSEHOLD",
        }
        image_suggestion = suggest_product_image(draft)
        if image_suggestion:
            draft["imageUrl"] = image_suggestion["imageUrl"]
        missing = [
            label
            for label, value in [
                ("receipt", None),
                ("serial number", None),
                ("warranty date", None),
                ("purchase data", None),
                ("room", space_id),
            ]
            if not value
        ]
        confidence = 0.45 + (0.15 if manufacturer else 0) + (0.15 if model else 0) + (0.1 if space_id else 0)
        return {
            "inputType": payload.inputType,
            "confidence": min(round(confidence, 2), 0.92),
            "draftItem": draft,
            "imageSuggestion": image_suggestion,
            "missing": missing,
            "suggestedActions": [
                "Create object profile",
                "Attach receipt when available",
                "Add serial number photo",
                "Set warranty reminder",
            ],
        }


@router.post("/drop", status_code=201)
def capture_drop(payload: CaptureDropRequest) -> dict:
    text = payload.text.strip()
    kind = _capture_kind(payload.kind, text)
    with db() as conn:
        user = get_default_user(conn)
        if kind in {"MESSAGE", "LOOP", "DOCUMENT"}:
            return _create_loop_drop(conn, user["id"], text, kind, payload.contactName)
        return _create_item_drop(conn, user["id"], text, kind if kind in {"RECEIPT", "ITEM"} else "ITEM")


@router.post("/message", status_code=201)
def capture_message(payload: MessageCapture) -> dict:
    parsed = parse_message_reminder(payload.text, payload.contactName)
    with db() as conn:
        user = get_default_user(conn)
        now = now_iso()
        loop_id = make_id()
        reminder_id = make_id()
        conn.execute(
            """INSERT INTO "Loop"
               (id, userId, title, description, sourceType, priority, status, dueDate, reminderAt, xpReward, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                loop_id,
                user["id"],
                parsed["title"],
                parsed["description"],
                "MESSAGE",
                parsed["priority"],
                "OPEN",
                parsed["dueDate"],
                parsed["reminderAt"],
                parsed["xpReward"],
                now,
                now,
            ),
        )
        conn.execute(
            """INSERT INTO "Reminder"
               (id, userId, loopId, title, message, remindAt, status, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                reminder_id,
                user["id"],
                loop_id,
                parsed["title"],
                "Safe in-app reminder. Later this can open the WhatsApp chat, but the MVP only creates a safe reminder.",
                parsed["reminderAt"],
                "ACTIVE",
                now,
                now,
            ),
        )
        updated_user = award_xp(conn, user_id=user["id"], loop_id=loop_id, action="create_message_reminder", points=10)
        loop = dict(
            conn.execute(
                'SELECT * FROM "Loop" WHERE id = ? AND userId = ?',
                (loop_id, user["id"]),
            ).fetchone()
        )
        reminder = dict(
            conn.execute(
                'SELECT * FROM "Reminder" WHERE id = ? AND userId = ?',
                (reminder_id, user["id"]),
            ).fetchone()
        )
        return {"parsed": parsed, "loop": loop, "reminder": reminder, "user": updated_user}
