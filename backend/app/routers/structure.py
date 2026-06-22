from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.db import db, row_to_dict, rows_to_dicts
from app.dependencies import get_default_user
from app.schemas import AffiliateClickCreate, HouseholdInviteCreate, ItemActivityCreate, PlanTierUpdate, SmartHomeConnectRequest, SpaceCreate
from app.services.smart_home import connect_provider
from app.services.structure import structure_payload
from app.utils import make_id, now_iso

router = APIRouter()


def _default_household(conn, user_id: str) -> dict:
    household = row_to_dict(
        conn.execute('SELECT * FROM "Household" WHERE userId = ? ORDER BY createdAt ASC LIMIT 1', (user_id,)).fetchone()
    )
    if not household:
        raise HTTPException(status_code=404, detail="Household not found")
    return household


@router.get("")
def get_structure() -> dict:
    with db() as conn:
        user = get_default_user(conn)
        return structure_payload(conn, user["id"])


@router.get("/spaces")
def list_spaces() -> list[dict]:
    with db() as conn:
        user = get_default_user(conn)
        household = _default_household(conn, user["id"])
        spaces = rows_to_dicts(
            conn.execute(
                'SELECT * FROM "Space" WHERE householdId = ? ORDER BY parentId IS NOT NULL, sortOrder ASC, name ASC',
                (household["id"],),
            ).fetchall()
        )
        return spaces


@router.post("/spaces", status_code=201)
def create_space(payload: SpaceCreate) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        household = _default_household(conn, user["id"])
        now = now_iso()
        sort_order = conn.execute(
            'SELECT COUNT(*) AS count FROM "Space" WHERE householdId = ?',
            (household["id"],),
        ).fetchone()["count"]
        space_id = make_id()
        conn.execute(
            """INSERT INTO "Space" (id, householdId, parentId, name, type, sortOrder, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (space_id, household["id"], payload.parentId, payload.name, payload.type, sort_order + 1, now, now),
        )
        return row_to_dict(conn.execute('SELECT * FROM "Space" WHERE id = ?', (space_id,)).fetchone()) or {}


@router.post("/household/invites", status_code=201)
def invite_household_member(payload: HouseholdInviteCreate) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        household = _default_household(conn, user["id"])
        now = now_iso()
        existing = row_to_dict(
            conn.execute(
                'SELECT * FROM "HouseholdMember" WHERE householdId = ? AND lower(email) = lower(?)',
                (household["id"], payload.email),
            ).fetchone()
        )
        if existing:
            return existing
        member_id = make_id()
        conn.execute(
            """INSERT INTO "HouseholdMember"
               (id, householdId, userId, email, name, role, status, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (member_id, household["id"], None, payload.email, payload.name, payload.role, "INVITED", now, now),
        )
        return row_to_dict(conn.execute('SELECT * FROM "HouseholdMember" WHERE id = ?', (member_id,)).fetchone()) or {}


@router.patch("/plan")
def update_plan(payload: PlanTierUpdate) -> dict:
    limits = {
        "FREE": {"itemLimit": 25, "storageLimitMb": 100},
        "PREMIUM": {"itemLimit": 1000, "storageLimitMb": 5000},
        "PRO": {"itemLimit": 10000, "storageLimitMb": 25000},
    }
    tier = payload.tier.upper()
    if tier not in limits:
        raise HTTPException(status_code=400, detail="Unknown plan tier")

    with db() as conn:
        user = get_default_user(conn)
        household = _default_household(conn, user["id"])
        now = now_iso()
        existing = row_to_dict(
            conn.execute('SELECT * FROM "PlanSubscription" WHERE userId = ? ORDER BY createdAt ASC LIMIT 1', (user["id"],)).fetchone()
        )
        if existing:
            conn.execute(
                """UPDATE "PlanSubscription"
                   SET tier = ?, status = ?, itemLimit = ?, storageLimitMb = ?, updatedAt = ?
                   WHERE id = ?""",
                (tier, "ACTIVE", limits[tier]["itemLimit"], limits[tier]["storageLimitMb"], now, existing["id"]),
            )
            plan_id = existing["id"]
        else:
            plan_id = make_id()
            conn.execute(
                """INSERT INTO "PlanSubscription"
                   (id, userId, householdId, tier, status, itemLimit, storageLimitMb, createdAt, updatedAt)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (plan_id, user["id"], household["id"], tier, "ACTIVE", limits[tier]["itemLimit"], limits[tier]["storageLimitMb"], now, now),
            )
        return row_to_dict(conn.execute('SELECT * FROM "PlanSubscription" WHERE id = ?', (plan_id,)).fetchone()) or {}


@router.post("/smart-home/connect", status_code=201)
def connect_smart_home(payload: SmartHomeConnectRequest) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        household = _default_household(conn, user["id"])
        return connect_provider(conn, user["id"], household["id"], payload.provider)


@router.post("/items/{item_id}/activity", status_code=201)
def create_item_activity(item_id: str, payload: ItemActivityCreate) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        item = row_to_dict(conn.execute('SELECT * FROM "Item" WHERE id = ? AND userId = ?', (item_id, user["id"])).fetchone())
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        activity_id = make_id()
        conn.execute(
            """INSERT INTO "ItemActivity" (id, itemId, userId, type, message, createdAt)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (activity_id, item_id, user["id"], payload.type, payload.message, now_iso()),
        )
        return row_to_dict(conn.execute('SELECT * FROM "ItemActivity" WHERE id = ?', (activity_id,)).fetchone()) or {}


@router.post("/affiliate/clicks", status_code=201)
def record_affiliate_click(payload: AffiliateClickCreate) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        click_id = make_id()
        conn.execute(
            """INSERT INTO "AffiliateClick" (id, userId, itemId, partnerSlug, targetUrl, source, createdAt)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (click_id, user["id"], payload.itemId, payload.partnerSlug, payload.targetUrl, payload.source, now_iso()),
        )
        return row_to_dict(conn.execute('SELECT * FROM "AffiliateClick" WHERE id = ?', (click_id,)).fetchone()) or {}
