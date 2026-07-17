from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter

from app.db import db, row_to_dict, rows_to_dicts
from app.dependencies import get_default_user
from app.services.item_service import missing_fields
from app.utils import parse_iso

router = APIRouter()


@router.get("/home-binder")
def home_binder() -> dict:
    with db() as conn:
        user = get_default_user(conn)
        household = row_to_dict(conn.execute('SELECT * FROM "Household" WHERE userId = ? ORDER BY createdAt ASC LIMIT 1', (user["id"],)).fetchone())
        items = rows_to_dicts(conn.execute('SELECT * FROM "Item" WHERE userId = ? ORDER BY location ASC, updatedAt DESC', (user["id"],)).fetchall())
        now = datetime.now(timezone.utc)
        soon = now + timedelta(days=90)
        total_value = 0.0
        protected = 0
        missing_total = 0
        spaces: dict[str, dict] = {}

        for item in items:
            documents = rows_to_dicts(
                conn.execute(
                    'SELECT * FROM "Document" WHERE itemId = ? AND userId = ? AND vaultId IS NULL',
                    (item["id"], user["id"]),
                ).fetchall()
            )
            item["documents"] = documents
            item["missingFields"] = missing_fields(item, documents)
            item["space"] = (
                row_to_dict(
                    conn.execute(
                        '''SELECT s.* FROM "Space" s
                           JOIN "Household" h ON h.id = s.householdId
                           WHERE s.id = ? AND h.userId = ?''',
                        (item["spaceId"], user["id"]),
                    ).fetchone()
                )
                if item.get("spaceId")
                else None
            )
            total_value += float(item.get("price") or 0)
            missing_total += len(item["missingFields"])
            warranty = parse_iso(item.get("warrantyUntil"))
            item["binderStatus"] = {
                "hasProof": bool(documents),
                "warrantyActive": bool(warranty and warranty > now),
                "warrantySoon": bool(warranty and now < warranty <= soon),
                "insuranceReady": bool(documents and item.get("serialNumber") and item.get("price") is not None),
            }
            if item["binderStatus"]["warrantyActive"]:
                protected += 1
            space_name = item["space"]["name"] if item.get("space") else item.get("location") or "Unassigned"
            spaces.setdefault(space_name, {"name": space_name, "itemCount": 0, "value": 0.0})
            spaces[space_name]["itemCount"] += 1
            spaces[space_name]["value"] += float(item.get("price") or 0)

        readiness = 100 if not items else max(0, min(100, round(100 - (missing_total / max(len(items) * 5, 1)) * 100)))
        return {
            "generatedAt": now.isoformat(),
            "household": household,
            "summary": {
                "itemCount": len(items),
                "totalValue": round(total_value, 2),
                "protectedCount": protected,
                "readiness": readiness,
                "missingDataPoints": missing_total,
            },
            "spaces": list(spaces.values()),
            "items": items,
            "wow": {
                "label": "Emergency Home Binder",
                "promise": "One report for insurance, warranty, moving, family access, and emergency overview.",
            },
        }


@router.get("/commerce")
def commerce_report() -> dict:
    with db() as conn:
        user = get_default_user(conn)
        reorderable = rows_to_dicts(
            conn.execute(
                """SELECT * FROM "Item"
                   WHERE userId = ? AND (reorderUrl IS NOT NULL OR affiliateUrl IS NOT NULL)
                   ORDER BY updatedAt DESC""",
                (user["id"],),
            ).fetchall()
        )
        clicks = rows_to_dicts(
            conn.execute('SELECT * FROM "AffiliateClick" WHERE userId = ? ORDER BY createdAt DESC LIMIT 50', (user["id"],)).fetchall()
        )
        partners = rows_to_dicts(conn.execute('SELECT * FROM "AffiliatePartner" WHERE status = ? ORDER BY name ASC', ("ACTIVE",)).fetchall())
        return {
            "reorderableItems": reorderable,
            "clicks": clicks,
            "partners": partners,
            "summary": {
                "reorderableCount": len(reorderable),
                "clickCount": len(clicks),
                "partnerCount": len(partners),
            },
        }
