from __future__ import annotations

import json
from datetime import timedelta

from fastapi import APIRouter, HTTPException, Query

from app.db import db, row_to_dict, rows_to_dicts
from app.dependencies import get_default_user
from app.schemas import ItemCreate, ItemPatch, RepairLogCreate
from app.services.barcode_lookup import barcode_format, lookup_barcode, normalize_barcode
from app.services.entitlements import PlanLimitExceeded, require_item_capacity
from app.services.item_service import calculate_completeness_score, missing_fields
from app.services.product_support import build_product_support_suggestion
from app.services.product_images import suggest_product_image
from app.services.providers.compatibility_provider import build_provider_preview
from app.services.xp_service import award_xp
from app.utils import make_id, normalize_iso, now_iso, parse_iso

router = APIRouter()


def _documents(conn, item_id: str) -> list[dict]:
    return rows_to_dicts(conn.execute('SELECT * FROM "Document" WHERE itemId = ? AND vaultId IS NULL', (item_id,)).fetchall())


def _loops(conn, item_id: str) -> list[dict]:
    return rows_to_dicts(conn.execute('SELECT * FROM "Loop" WHERE itemId = ? ORDER BY dueDate ASC', (item_id,)).fetchall())


def _reminders(conn, item_id: str) -> list[dict]:
    return rows_to_dicts(conn.execute('SELECT * FROM "Reminder" WHERE itemId = ? ORDER BY remindAt ASC', (item_id,)).fetchall())


def _space(conn, space_id: str | None) -> dict | None:
    if not space_id:
        return None
    return row_to_dict(conn.execute('SELECT * FROM "Space" WHERE id = ?', (space_id,)).fetchone())


def _household(conn, household_id: str | None) -> dict | None:
    if not household_id:
        return None
    return row_to_dict(conn.execute('SELECT * FROM "Household" WHERE id = ?', (household_id,)).fetchone())


def _activities(conn, item_id: str) -> list[dict]:
    return rows_to_dicts(conn.execute('SELECT * FROM "ItemActivity" WHERE itemId = ? ORDER BY createdAt DESC', (item_id,)).fetchall())


def _repair_logs(conn, item_id: str) -> list[dict]:
    return rows_to_dicts(conn.execute('SELECT * FROM "RepairLog" WHERE itemId = ? ORDER BY date DESC, createdAt DESC', (item_id,)).fetchall())


def _has_document(documents: list[dict], document_type: str) -> bool:
    return any((document.get("type") or "").upper() == document_type for document in documents)


def _document_attachments(documents: list[dict]) -> list[dict]:
    support_types = {"RECEIPT", "WARRANTY", "MANUAL", "DRIVER", "SOFTWARE", "OTHER"}
    attachments = []
    for document in documents:
        document_type = (document.get("type") or "OTHER").upper()
        if document_type not in support_types:
            continue
        attachments.append(
            {
                "id": document.get("id"),
                "type": document_type,
                "fileName": document.get("fileName") or "Document",
                "filePath": f"/api/documents/{document.get('id')}/download" if document.get("id") else None,
            }
        )
    return attachments


def _smart_home_devices(conn, item_id: str) -> list[dict]:
    devices = rows_to_dicts(
        conn.execute(
            """SELECT * FROM "SmartHomeDevice"
               WHERE itemId = ?
               ORDER BY provider ASC, name ASC""",
            (item_id,),
        ).fetchall()
    )
    for device in devices:
        capabilities = device.get("capabilities")
        if capabilities:
            try:
                device["capabilities"] = json.loads(capabilities)
            except Exception:
                device["capabilities"] = []
        else:
            device["capabilities"] = []
        raw_json = device.get("rawJson")
        if raw_json:
            try:
                device["rawJson"] = json.loads(raw_json)
            except Exception:
                device["rawJson"] = {}
        else:
            device["rawJson"] = {}
    return devices


def _default_household_id(conn, user_id: str) -> str | None:
    household = row_to_dict(conn.execute('SELECT * FROM "Household" WHERE userId = ? ORDER BY createdAt ASC LIMIT 1', (user_id,)).fetchone())
    return household["id"] if household else None


def _resolve_space_id(conn, household_id: str | None, location: str | None, requested_space_id: str | None = None) -> str | None:
    if requested_space_id:
        return requested_space_id
    if not household_id:
        return None
    if location:
        space = row_to_dict(
            conn.execute(
                'SELECT * FROM "Space" WHERE householdId = ? AND lower(name) = lower(?) LIMIT 1',
                (household_id, location),
            ).fetchone()
        )
        if space:
            return space["id"]
    space = row_to_dict(
        conn.execute(
            'SELECT * FROM "Space" WHERE householdId = ? ORDER BY parentId IS NOT NULL DESC, sortOrder ASC LIMIT 1',
            (household_id,),
        ).fetchone()
    )
    return space["id"] if space else None


def _item_detail(conn, item_id: str) -> dict | None:
    item = row_to_dict(conn.execute('SELECT * FROM "Item" WHERE id = ?', (item_id,)).fetchone())
    if not item:
        return None
    documents = _documents(conn, item_id)
    item["documents"] = documents
    item["loops"] = _loops(conn, item_id)
    item["reminders"] = _reminders(conn, item_id)
    item["space"] = _space(conn, item.get("spaceId"))
    item["household"] = _household(conn, item.get("householdId"))
    item["activities"] = _activities(conn, item_id)
    item["repairLogs"] = _repair_logs(conn, item_id)
    item["smartHomeDevices"] = _smart_home_devices(conn, item_id)
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
            item["space"] = _space(conn, item.get("spaceId"))
            item["missingFields"] = missing_fields(item, docs)
        return items


@router.get("/lookup/barcode")
def lookup_item_barcode(code: str = Query(min_length=4)) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        try:
            return lookup_barcode(conn, user["id"], code)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc


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
        try:
            require_item_capacity(conn, user)
        except PlanLimitExceeded as exc:
            raise HTTPException(status_code=402, detail=exc.payload()) from exc
        now = now_iso()
        item_id = make_id()
        household_id = payload.householdId or _default_household_id(conn, user["id"])
        space_id = _resolve_space_id(conn, household_id, payload.location, payload.spaceId)
        receipt_docs = [{"type": "RECEIPT"}] if payload.documentId else []
        try:
            normalized_barcode = normalize_barcode(payload.barcode) if payload.barcode else None
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        item_data = {
            "purchaseDate": normalize_iso(payload.purchaseDate),
            "merchant": payload.merchant,
            "price": payload.price,
            "manufacturer": payload.manufacturer,
            "model": payload.model,
            "serialNumber": payload.serialNumber,
            "barcode": normalized_barcode,
            "barcodeFormat": payload.barcodeFormat or (barcode_format(normalized_barcode) if normalized_barcode else None),
            "imageUrl": payload.imageUrl,
            "manualUrl": payload.manualUrl,
            "driverUrl": payload.driverUrl,
            "softwareUrl": payload.softwareUrl,
            "supportUrl": payload.supportUrl,
            "supportContact": payload.supportContact,
            "warrantyUntil": normalize_iso(payload.warrantyUntil),
        }
        score = calculate_completeness_score(item_data, receipt_docs)

        conn.execute(
            """INSERT INTO "Item"
               (id, userId, householdId, spaceId, name, itemType, category, manufacturer, model, serialNumber, purchaseDate, merchant, price,
                barcode, barcodeFormat, currency, imageUrl, warrantyUntil, location, notes, manualUrl, driverUrl, softwareUrl, supportUrl, supportContact,
                reorderUrl, affiliateUrl, affiliateProvider, visibility, completenessScore, status, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                item_id,
                user["id"],
                household_id,
                space_id,
                payload.name,
                payload.itemType,
                payload.category,
                payload.manufacturer,
                payload.model,
                payload.serialNumber,
                item_data["purchaseDate"],
                payload.merchant,
                payload.price,
                item_data["barcode"],
                item_data["barcodeFormat"],
                payload.currency,
                payload.imageUrl,
                item_data["warrantyUntil"],
                payload.location,
                payload.notes,
                payload.manualUrl,
                payload.driverUrl,
                payload.softwareUrl,
                payload.supportUrl,
                payload.supportContact,
                payload.reorderUrl,
                payload.affiliateUrl,
                payload.affiliateProvider,
                payload.visibility,
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
        conn.execute(
            """INSERT INTO "ItemActivity" (id, itemId, userId, type, message, createdAt)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (make_id(), item_id, user["id"], "CREATED", "Item profile created.", now),
        )
        return _item_detail(conn, item_id) or {}


@router.get("/{item_id}/image-suggestion")
def get_image_suggestion(item_id: str) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        item = row_to_dict(
            conn.execute('SELECT * FROM "Item" WHERE id = ? AND userId = ?', (item_id, user["id"])).fetchone()
        )
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        suggestion = suggest_product_image(item)
        if not suggestion:
            raise HTTPException(status_code=404, detail="No image suggestion found")
        return suggestion


@router.get("/{item_id}/compatibility/provider-preview")
def get_compatibility_provider_preview(item_id: str) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        item = row_to_dict(
            conn.execute('SELECT * FROM "Item" WHERE id = ? AND userId = ?', (item_id, user["id"])).fetchone()
        )
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        return build_provider_preview(item, user["id"])


@router.post("/{item_id}/support-links/resolve")
def resolve_item_support_links(item_id: str) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        item = row_to_dict(
            conn.execute('SELECT * FROM "Item" WHERE id = ? AND userId = ?', (item_id, user["id"])).fetchone()
        )
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        return build_product_support_suggestion(item)


@router.delete("/{item_id}")
def delete_item(item_id: str) -> dict:
    """Delete an object plus its attached documents (files included).

    Loops/reminders/repairs cascade via foreign keys; linked smart-home
    devices are unlinked (SET NULL), never deleted. The action is audited
    like document deletion. Irreversible - the UI must confirm first.
    """
    from app.routers.documents import _document_file_path
    from app.services.privacy import record_privacy_audit_event

    with db() as conn:
        user = get_default_user(conn)
        item = row_to_dict(
            conn.execute('SELECT * FROM "Item" WHERE id = ? AND userId = ?', (item_id, user["id"])).fetchone()
        )
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")

        documents = rows_to_dicts(
            conn.execute('SELECT * FROM "Document" WHERE itemId = ? AND userId = ?', (item_id, user["id"])).fetchall()
        )
        files_deleted = 0
        for document in documents:
            upload_target = _document_file_path(document, missing_ok=True)
            if upload_target and upload_target.exists():
                upload_target.unlink()
                files_deleted += 1
        conn.execute('DELETE FROM "Document" WHERE itemId = ? AND userId = ?', (item_id, user["id"]))
        # Children with ON DELETE CASCADE / SET NULL are handled by SQLite
        # (PRAGMA foreign_keys=ON in db()).
        conn.execute('DELETE FROM "Item" WHERE id = ? AND userId = ?', (item_id, user["id"]))

        record_privacy_audit_event(
            conn,
            user_id=user["id"],
            event_type="ITEM_DELETED",
            status="DELETED",
            message="Object deleted with its documents; reminders and repairs cascaded; devices unlinked.",
            context={"item_id": item_id, "documents_deleted": len(documents), "files_deleted": files_deleted},
        )
        return {"ok": True, "deleted": item_id, "documentsDeleted": len(documents)}


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
        if "barcode" in updates:
            try:
                updates["barcode"] = normalize_barcode(updates["barcode"]) if updates["barcode"] else None
            except ValueError as exc:
                raise HTTPException(status_code=400, detail=str(exc)) from exc
            if updates["barcode"] and not updates.get("barcodeFormat"):
                updates["barcodeFormat"] = barcode_format(updates["barcode"])
        for key in ["purchaseDate", "warrantyUntil"]:
            if key in updates:
                updates[key] = normalize_iso(updates[key])
        if "location" in updates or "spaceId" in updates or "householdId" in updates:
            household_id = updates.get("householdId") or item.get("householdId") or _default_household_id(conn, user["id"])
            updates["householdId"] = household_id
            updates["spaceId"] = _resolve_space_id(conn, household_id, updates.get("location") or item.get("location"), updates.get("spaceId"))

        next_item = {**item, **updates}
        docs = _documents(conn, item_id)
        score = calculate_completeness_score(next_item, docs)
        updates["completenessScore"] = score
        updates["updatedAt"] = now_iso()

        assignments = ", ".join(f'"{key}" = ?' for key in updates)
        conn.execute(f'UPDATE "Item" SET {assignments} WHERE id = ?', [*updates.values(), item_id])

        if not item.get("serialNumber") and updates.get("serialNumber"):
            award_xp(conn, user_id=user["id"], item_id=item_id, action="add_serial_number", points=25)
            conn.execute(
                """INSERT INTO "ItemActivity" (id, itemId, userId, type, message, createdAt)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (make_id(), item_id, user["id"], "UPDATED", "Serial number added.", now_iso()),
            )
        if int(item["completenessScore"]) < 100 and score == 100:
            award_xp(conn, user_id=user["id"], item_id=item_id, action="complete_item_profile", points=50)

        return _item_detail(conn, item_id) or {}


@router.post("/{item_id}/repairs", status_code=201)
def create_repair_log(item_id: str, payload: RepairLogCreate) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        item = row_to_dict(
            conn.execute('SELECT * FROM "Item" WHERE id = ? AND userId = ?', (item_id, user["id"])).fetchone()
        )
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")

        now = now_iso()
        repair_id = make_id()
        repair_date = normalize_iso(payload.date) or now
        status = payload.status.upper()
        conn.execute(
            """INSERT INTO "RepairLog"
               (id, userId, itemId, date, problem, resolution, cost, status, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                repair_id,
                user["id"],
                item_id,
                repair_date,
                payload.problem,
                payload.resolution,
                payload.cost,
                status,
                now,
                now,
            ),
        )
        conn.execute(
            """INSERT INTO "ItemActivity" (id, itemId, userId, type, message, createdAt)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (make_id(), item_id, user["id"], "REPAIR", f"Repair log added: {payload.problem}", now),
        )
        if status in {"OPEN", "WAITING"}:
            loop_id = make_id()
            conn.execute(
                """INSERT INTO "Loop"
                   (id, userId, itemId, title, description, sourceType, priority, status, dueDate, reminderAt, xpReward, createdAt, updatedAt)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    loop_id,
                    user["id"],
                    item_id,
                    f"Repair follow-up: {item['name']}",
                    payload.problem,
                    "DEVICE",
                    "MEDIUM",
                    "OPEN",
                    None,
                    None,
                    25,
                    now,
                    now,
                ),
            )
        award_xp(conn, user_id=user["id"], item_id=item_id, action="add_repair_log", points=15)
        return _item_detail(conn, item_id) or {}


@router.post("/{item_id}/support-draft")
def create_support_draft(item_id: str) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        item = row_to_dict(
            conn.execute('SELECT * FROM "Item" WHERE id = ? AND userId = ?', (item_id, user["id"])).fetchone()
        )
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")

        documents = _documents(conn, item_id)
        repairs = _repair_logs(conn, item_id)
        latest_repair = repairs[0] if repairs else None
        attachments = _document_attachments(documents)
        has_receipt = _has_document(documents, "RECEIPT")
        has_warranty = _has_document(documents, "WARRANTY")
        has_manual = _has_document(documents, "MANUAL") or bool(item.get("manualUrl"))
        support_target = item.get("supportContact") or item.get("supportUrl") or "support team"
        identity = " ".join(part for part in [item.get("manufacturer"), item.get("model")] if part) or item["name"]
        subject = f"Support request for {identity}"

        checklist = [
            {
                "label": "Product identity",
                "status": "ready" if item.get("manufacturer") or item.get("model") else "missing",
                "detail": identity if item.get("manufacturer") or item.get("model") else "Add manufacturer or model.",
            },
            {
                "label": "Serial number",
                "status": "ready" if item.get("serialNumber") else "missing",
                "detail": item.get("serialNumber") or "Add the serial number before sending.",
            },
            {
                "label": "Receipt",
                "status": "ready" if has_receipt else "missing",
                "detail": "Receipt attached." if has_receipt else "Attach receipt or proof of purchase.",
            },
            {
                "label": "Warranty proof",
                "status": "ready" if item.get("warrantyUntil") or has_warranty else "missing",
                "detail": item.get("warrantyUntil") or ("Warranty document attached." if has_warranty else "Add warranty date or warranty document."),
            },
            {
                "label": "Issue history",
                "status": "ready" if latest_repair else "missing",
                "detail": latest_repair.get("problem") if latest_repair else "Add a Repair Log entry with the current problem.",
            },
            {
                "label": "Support target",
                "status": "ready" if item.get("supportContact") or item.get("supportUrl") else "missing",
                "detail": item.get("supportContact") or item.get("supportUrl") or "Add support email, phone, or portal URL.",
            },
            {
                "label": "Manual",
                "status": "ready" if has_manual else "missing",
                "detail": "Manual available." if has_manual else "Optional, but useful for model-specific support.",
            },
        ]
        missing_info = [
            {"id": entry["label"].lower().replace(" ", "-"), "label": entry["label"], "action": entry["detail"]}
            for entry in checklist
            if entry["status"] == "missing"
        ]
        ready_score = round((sum(1 for entry in checklist if entry["status"] == "ready") / len(checklist)) * 100)
        issue_summary = latest_repair.get("problem") if latest_repair else item.get("notes") or "No issue note yet"

        body_lines = [
            f"Hello {support_target},",
            "",
            f"I need help with my {item['name']}.",
            f"Product: {identity}",
            f"Serial number: {item.get('serialNumber') or 'not available yet'}",
            f"Purchased at: {item.get('merchant') or 'unknown'}",
            f"Purchase date: {item.get('purchaseDate') or 'unknown'}",
            f"Warranty until: {item.get('warrantyUntil') or 'unknown'}",
        ]
        if latest_repair:
            body_lines.extend(
                [
                    "",
                    "Latest repair / issue:",
                    f"- Date: {latest_repair.get('date')}",
                    f"- Problem: {latest_repair.get('problem')}",
                    f"- Status: {latest_repair.get('status')}",
                ]
            )
            if latest_repair.get("resolution"):
                body_lines.append(f"- Notes: {latest_repair['resolution']}")
        if item.get("notes"):
            body_lines.extend(["", f"Additional notes: {item['notes']}"])
        if attachments:
            body_lines.extend(["", "Prepared attachments:"])
            body_lines.extend(f"- {attachment['fileName']} ({attachment['type']})" for attachment in attachments)
        if missing_info:
            body_lines.extend(["", "Still missing before sending:"])
            body_lines.extend(f"- {entry['label']}: {entry['action']}" for entry in missing_info)
        body_lines.extend(["", "Please let me know the next steps.", "", f"Best, {user['name']}"])

        now = now_iso()
        conn.execute(
            """INSERT INTO "ItemActivity" (id, itemId, userId, type, message, createdAt)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (make_id(), item_id, user["id"], "SUPPORT_DRAFT", "Support request draft prepared.", now),
        )
        return {
            "to": support_target,
            "subject": subject,
            "body": "\n".join(body_lines),
            "checklist": checklist,
            "attachments": attachments,
            "missingInfo": missing_info,
            "readyScore": ready_score,
            "issueSummary": issue_summary,
        }
