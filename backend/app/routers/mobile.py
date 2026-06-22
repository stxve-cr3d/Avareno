from __future__ import annotations

from fastapi import APIRouter

from app.db import db, row_to_dict, rows_to_dicts
from app.dependencies import get_default_user
from app.routers.planner import planner_payload
from app.schemas import MobileDeviceRegister
from app.services.item_service import missing_fields
from app.services.planning import list_notifications
from app.services.smart_home import smart_home_payload
from app.services.structure import structure_payload
from app.utils import make_id, now_iso

router = APIRouter()


@router.get("/bootstrap")
def mobile_bootstrap() -> dict:
    with db() as conn:
        user = get_default_user(conn)
        items = rows_to_dicts(
            conn.execute(
                'SELECT * FROM "Item" WHERE userId = ? ORDER BY updatedAt DESC LIMIT 20',
                (user["id"],),
            ).fetchall()
        )
        for item in items:
            documents = rows_to_dicts(conn.execute('SELECT * FROM "Document" WHERE itemId = ?', (item["id"],)).fetchall())
            item["documents"] = documents
            item["missingFields"] = missing_fields(item, documents)
        notifications = list_notifications(conn, user["id"], days=30)
        return {
            "apiVersion": "2026-06-22",
            "user": user,
            "planner": planner_payload(conn, user["id"], days=14),
            "structure": structure_payload(conn, user["id"]),
            "smartHome": smart_home_payload(conn, user["id"]),
            "notifications": notifications,
            "recentItems": items,
            "features": {
                "pushRegistration": True,
                "notificationActions": ["read", "dismiss", "snooze"],
                "planningActions": ["createAction"],
                "smartHomeActions": ["linkDevice", "runCommand", "bambuPrintEvent", "probeLocalHost"],
            },
        }


@router.post("/devices", status_code=201)
def register_mobile_device(payload: MobileDeviceRegister) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        now = now_iso()
        existing = row_to_dict(
            conn.execute(
                'SELECT * FROM "DeviceToken" WHERE pushToken = ? AND userId = ?',
                (payload.pushToken, user["id"]),
            ).fetchone()
        )
        if existing:
            conn.execute(
                'UPDATE "DeviceToken" SET platform = ?, deviceName = ?, lastSeenAt = ?, updatedAt = ? WHERE id = ?',
                (payload.platform, payload.deviceName, now, now, existing["id"]),
            )
            return row_to_dict(conn.execute('SELECT * FROM "DeviceToken" WHERE id = ?', (existing["id"],)).fetchone()) or {}

        device_id = make_id()
        conn.execute(
            """INSERT INTO "DeviceToken"
               (id, userId, platform, pushToken, deviceName, lastSeenAt, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (device_id, user["id"], payload.platform, payload.pushToken, payload.deviceName, now, now, now),
        )
        return row_to_dict(conn.execute('SELECT * FROM "DeviceToken" WHERE id = ?', (device_id,)).fetchone()) or {}
