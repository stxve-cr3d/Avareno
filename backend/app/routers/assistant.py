from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException

from app.db import db, row_to_dict, rows_to_dicts
from app.dependencies import get_default_user
from app.schemas import AssistantAskRequest
from app.services.entitlements import PlanLimitExceeded, consume_ai_action
from app.services.item_service import missing_fields
from app.utils import parse_iso

router = APIRouter()


def _load_items(conn, user_id: str) -> list[dict]:
    items = rows_to_dicts(conn.execute('SELECT * FROM "Item" WHERE userId = ? ORDER BY updatedAt DESC', (user_id,)).fetchall())
    for item in items:
        item["documents"] = rows_to_dicts(conn.execute('SELECT * FROM "Document" WHERE itemId = ? AND vaultId IS NULL', (item["id"],)).fetchall())
        item["space"] = row_to_dict(conn.execute('SELECT * FROM "Space" WHERE id = ?', (item["spaceId"],)).fetchone()) if item.get("spaceId") else None
        item["missingFields"] = missing_fields(item, item["documents"])
    return items


def _card(item: dict, note: str | None = None) -> dict:
    identity = " / ".join([value for value in [item.get("manufacturer"), item.get("model")] if value]) or item.get("category") or "Objekt"
    location = (item.get("space") or {}).get("name") or item.get("location") or "Kein Raum"
    return {
        "kind": "item",
        "title": item["name"],
        "subtitle": f"{identity} · {location}",
        "meta": note or f"{item.get('completenessScore', 0)}% gespeichert",
        "href": f"/items/{item['id']}",
        "imageUrl": item.get("imageUrl"),
    }


def _matches_question(item: dict, question: str) -> bool:
    haystack = " ".join(
        str(value or "")
        for value in [
            item.get("name"),
            item.get("category"),
            item.get("manufacturer"),
            item.get("model"),
            item.get("location"),
            (item.get("space") or {}).get("name"),
        ]
    ).lower()
    return any(token in haystack for token in question.split() if len(token) > 2)


@router.post("/ask")
def ask_avareno(payload: AssistantAskRequest) -> dict:
    question = payload.question.strip().lower()
    with db() as conn:
        user = get_default_user(conn)
        try:
            consume_ai_action(conn, user)
        except PlanLimitExceeded as exc:
            raise HTTPException(status_code=402, detail=exc.payload()) from exc
        items = _load_items(conn, user["id"])
        now = datetime.now(timezone.utc)
        soon = now + timedelta(days=90)

        if any(word in question for word in ["garantie", "warranty", "ablauf", "expire", "läuft", "läuft"]):
            warranty_items = [
                item
                for item in items
                if item.get("warrantyUntil") and (parse_iso(item.get("warrantyUntil")) or now) > now
            ]
            warranty_items.sort(key=lambda item: parse_iso(item.get("warrantyUntil")) or soon)
            soon_count = len([item for item in warranty_items if (parse_iso(item.get("warrantyUntil")) or soon) <= soon])
            return {
                "intent": "warranty",
                "answer": f"{len(warranty_items)} Objekte haben eine aktive Garantie. {soon_count} davon laufen in den nächsten 90 Tagen aus.",
                "cards": [_card(item, f"Garantie bis {item.get('warrantyUntil', '')[:10]}") for item in warranty_items[:5]],
                "actions": ["Home-Übersicht öffnen", "Fehlende Belege ergänzen", "Erinnerung anlegen"],
                "confidence": 0.88,
            }

        if any(word in question for word in ["rechnung", "beleg", "receipt", "proof", "dokument"]):
            with_docs = [item for item in items if item.get("documents")]
            without_docs = [item for item in items if not item.get("documents")]
            cards = [_card(item, f"{len(item.get('documents', []))} Beleg(e)") for item in with_docs[:4]]
            cards.extend(_card(item, "Beleg fehlt") for item in without_docs[:2])
            return {
                "intent": "proof",
                "answer": f"{len(with_docs)} Objekte haben Belege. {len(without_docs)} brauchen noch einen Beleg.",
                "cards": cards[:6],
                "actions": ["Beleg hochladen", "Fehlende Belege ansehen", "Familie fragen"],
                "confidence": 0.86,
            }

        if any(word in question for word in ["fehlt", "missing", "unvollständig", "unvollständig", "complete"]):
            incomplete = [item for item in items if item.get("missingFields")]
            return {
                "intent": "missing",
                "answer": f"{len(incomplete)} Objekte brauchen noch Daten. Am häufigsten fehlen Beleg, Seriennummer oder Garantie.",
                "cards": [_card(item, "Fehlt: " + ", ".join(item.get("missingFields", [])[:3])) for item in incomplete[:6]],
                "actions": ["Seriennummer ergänzen", "Beleg anhängen", "Erfassen öffnen"],
                "confidence": 0.84,
            }

        if any(word in question for word in ["wert", "value", "versicherung", "insurance", "hausakte", "binder"]):
            total_value = round(sum(float(item.get("price") or 0) for item in items), 2)
            ready = [
                item
                for item in items
                if item.get("documents") and item.get("serialNumber") and item.get("price") is not None
            ]
            return {
                "intent": "binder",
                "answer": f"Deine gespeicherten Objekte haben aktuell {total_value} EUR dokumentierten Wert. {len(ready)} von {len(items)} sind versicherungsbereit.",
                "cards": [_card(item, f"{item.get('price') or 0} {item.get('currency', 'EUR')}") for item in items[:6]],
                "actions": ["Home-Übersicht öffnen", "Fehlende Daten ergänzen", "Später exportieren"],
                "confidence": 0.9,
            }

        if any(word in question for word in ["nachkaufen", "shop", "reorder", "kaufen", "ersatz"]):
            reorderable = [item for item in items if item.get("reorderUrl") or item.get("affiliateUrl")]
            missing_links = [item for item in items if not item.get("reorderUrl") and not item.get("affiliateUrl")]
            return {
                "intent": "reorder",
                "answer": f"{len(reorderable)} Objekte haben schon einen Shop-Link. {len(missing_links)} können später für Affiliate/Nachkauf vorbereitet werden.",
                "cards": [_card(item, "Shop-Link vorhanden") for item in reorderable[:4]] + [_card(item, "Noch kein Shop-Link") for item in missing_links[:2]],
                "actions": ["Nachkauf-Link ergänzen", "Klick verfolgen", "Ersatz vorschlagen"],
                "confidence": 0.82,
            }

        spaces = rows_to_dicts(conn.execute('SELECT * FROM "Space" ORDER BY name ASC').fetchall())
        matching_space = next((space for space in spaces if space["name"].lower() in question), None)
        if matching_space:
            space_items = [item for item in items if item.get("spaceId") == matching_space["id"] or item.get("location", "").lower() == matching_space["name"].lower()]
            return {
                "intent": "space",
                "answer": f"In {matching_space['name']} sind {len(space_items)} Objekte gespeichert.",
                "cards": [_card(item) for item in space_items[:6]],
                "actions": ["Raum-Filter öffnen", "Objekt zu diesem Raum hinzufügen", "Aufgabe für den Raum anlegen"],
                "confidence": 0.87,
            }

        matches = [item for item in items if _matches_question(item, question)]
        if matches:
            return {
                "intent": "search",
                "answer": f"Ich habe {len(matches)} passende Objekte gefunden.",
                "cards": [_card(item) for item in matches[:6]],
                "actions": ["Objekt öffnen", "Nachweis anhängen", "Erinnerung anlegen"],
                "confidence": 0.76,
            }

        return {
            "intent": "fallback",
            "answer": "Ich kann aktuell nach Objekten, Räumen, Rechnungen, Garantien, fehlenden Daten, Wert und Nachkaufen suchen.",
            "cards": [_card(item) for item in items[:4]],
            "actions": ["Garantien anzeigen", "Fehlende Daten anzeigen", "Home-Übersicht öffnen"],
            "confidence": 0.55,
        }
