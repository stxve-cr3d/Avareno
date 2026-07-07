from __future__ import annotations

from fastapi import APIRouter, Query

from app.db import db, rows_to_dicts
from app.dependencies import get_default_user
from app.services.item_service import missing_fields
from app.utils import parse_iso

router = APIRouter()


def _contains(values: list[str | None], query: str) -> bool:
    raw = " ".join(value or "" for value in values).lower()
    return query in raw


@router.get("")
def search(q: str = Query("", min_length=0)) -> dict:
    query = q.strip().lower()
    if not query:
        return {"query": q, "results": []}

    with db() as conn:
        user = get_default_user(conn)
        results: list[dict] = []

        items = rows_to_dicts(conn.execute('SELECT * FROM "Item" WHERE userId = ?', (user["id"],)).fetchall())
        for item in items:
            docs = rows_to_dicts(conn.execute('SELECT * FROM "Document" WHERE itemId = ? AND vaultId IS NULL', (item["id"],)).fetchall())
            if _contains(
                [
                    item.get("name"),
                    item.get("category"),
                    item.get("manufacturer"),
                    item.get("model"),
                    item.get("serialNumber"),
                    item.get("barcode"),
                    item.get("merchant"),
                    item.get("location"),
                    " ".join(document.get("fileName", "") for document in docs),
                ],
                query,
            ):
                fields = missing_fields(item, docs)
                results.append(
                    {
                        "id": item["id"],
                        "type": "ITEM",
                        "title": item["name"],
                        "subtitle": f"{item.get('category') or 'Objekt'} - {item.get('model') or 'ohne Model'}",
                        "meta": f"{item.get('completenessScore', 0)}% komplett",
                        "route": f"/items/{item['id']}",
                        "status": " - ".join(fields[:2]) if fields else "vollständig",
                    }
                )

        loops = rows_to_dicts(conn.execute('SELECT * FROM "Loop" WHERE userId = ?', (user["id"],)).fetchall())
        for loop in loops:
            if _contains([loop.get("title"), loop.get("description"), loop.get("sourceType"), loop.get("priority"), loop.get("status")], query):
                due = parse_iso(loop.get("dueDate"))
                results.append(
                    {
                        "id": loop["id"],
                        "type": "LOOP",
                        "title": loop["title"],
                        "subtitle": loop.get("description") or "Offener Loop",
                        "meta": due.date().isoformat() if due else "kein Datum",
                        "route": f"/loops/{loop['id']}",
                        "status": loop.get("status"),
                    }
                )

        docs = rows_to_dicts(conn.execute('SELECT * FROM "Document" WHERE userId = ? AND vaultId IS NULL', (user["id"],)).fetchall())
        for document in docs:
            if _contains([document.get("fileName"), document.get("type"), document.get("extractedText")], query):
                route = f"/items/{document['itemId']}" if document.get("itemId") else "/items"
                results.append(
                    {
                        "id": document["id"],
                        "type": "DOCUMENT",
                        "title": document["fileName"],
                        "subtitle": document.get("type") or "Dokument",
                        "meta": document.get("mimeType"),
                        "route": route,
                        "status": "gesichert",
                    }
                )

        reminders = rows_to_dicts(conn.execute('SELECT * FROM "Reminder" WHERE userId = ?', (user["id"],)).fetchall())
        for reminder in reminders:
            if _contains([reminder.get("title"), reminder.get("message"), reminder.get("status")], query):
                route = f"/loops/{reminder['loopId']}" if reminder.get("loopId") else "/items"
                results.append(
                    {
                        "id": reminder["id"],
                        "type": "REMINDER",
                        "title": reminder["title"],
                        "subtitle": reminder["message"],
                        "meta": reminder.get("remindAt"),
                        "route": route,
                        "status": reminder.get("status"),
                    }
                )

        return {"query": q, "results": results[:20]}
