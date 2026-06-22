from __future__ import annotations

from fastapi import APIRouter

from app.db import db, row_to_dict
from app.dependencies import get_default_user
from app.schemas import MessageCapture, UniversalCaptureRequest
from app.services.message_parser import parse_message_reminder
from app.services.product_images import suggest_product_image
from app.services.xp_service import award_xp
from app.utils import make_id, now_iso

router = APIRouter()


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
    lowered = text.lower()
    if "lg" in lowered or "oled" in lowered:
        return "LG", "OLED C3" if "c3" in lowered else None
    if "apple" in lowered or "iphone" in lowered:
        return "Apple", "iPhone" if "iphone" in lowered else None
    if "samsung" in lowered:
        return "Samsung", None
    if "bosch" in lowered:
        return "Bosch", None
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
        space = row_to_dict(conn.execute('SELECT * FROM "Space" WHERE id = ?', (requested_space_id,)).fetchone())
        return requested_space_id, space["name"] if space else None
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
        loop = dict(conn.execute('SELECT * FROM "Loop" WHERE id = ?', (loop_id,)).fetchone())
        reminder = dict(conn.execute('SELECT * FROM "Reminder" WHERE id = ?', (reminder_id,)).fetchone())
        return {"parsed": parsed, "loop": loop, "reminder": reminder, "user": updated_user}
