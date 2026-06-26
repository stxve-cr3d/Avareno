from __future__ import annotations

import sqlite3

from app.db import row_to_dict, rows_to_dicts


ITEM_TYPES = [
    {"id": "THING", "label": "Alles", "description": "Default fuer Dinge, die nicht in eine enge Kategorie passen."},
    {"id": "ELECTRONIC", "label": "Elektronik", "description": "TV, Smartphone, Laptop, Audio, Haushaltsgeraete."},
    {"id": "FURNITURE", "label": "Moebel", "description": "Sofa, Bett, Tisch, Lampen, Einrichtung."},
    {"id": "INFRASTRUCTURE", "label": "Gebaeude", "description": "Heizung, Fenster, Tueren, Boden, Kueche, Bad."},
    {"id": "VEHICLE", "label": "Fahrzeug", "description": "Auto, Fahrrad, E-Bike, Scooter."},
    {"id": "COLLECTIBLE", "label": "Wertstueck", "description": "Sammlerstuecke, Schmuck, Kunst, besondere Dinge."},
]


CAPTURE_METHODS = [
    {"id": "PHOTO", "label": "Foto", "status": "MVP", "promise": "Objekt erkennen und Profil vorschlagen."},
    {"id": "RECEIPT", "label": "Rechnung", "status": "MVP", "promise": "Beleg analysieren und Garantie ableiten."},
    {"id": "BARCODE", "label": "Barcode / QR", "status": "NEXT", "promise": "Produktdaten mit einem Scan finden."},
    {"id": "EMAIL", "label": "E-Mail Import", "status": "NEXT", "promise": "Online-Bestellungen automatisch einlesen."},
    {"id": "VOICE", "label": "Voice Note", "status": "LATER", "promise": "Schnell erfassen ohne Formular."},
    {"id": "SMART_HOME", "label": "Smart Home", "status": "WOW", "promise": "Geraete aus Home Assistant, Matter und Co. importieren."},
]


PREMIUM_FEATURES = [
    {"id": "UNLIMITED_ITEMS", "label": "Unbegrenzte Dinge", "free": False, "premium": True},
    {"id": "FAMILY_SHARING", "label": "Familienfreigabe", "free": False, "premium": True},
    {"id": "ADVANCED_SPACES", "label": "Gebaeude, Raeume, Zonen", "free": True, "premium": True},
    {"id": "AI_EXTRACTION", "label": "AI-Erkennung", "free": "limited", "premium": True},
    {"id": "SMART_HOME", "label": "Smart-Home-Anbindung", "free": False, "premium": True},
    {"id": "INSURANCE_REPORT", "label": "Versicherungsreport", "free": False, "premium": True},
]


WOW_FEATURES = [
    {
        "id": "OBJECT_TIMELINE",
        "label": "Object Memory Timeline",
        "description": "Jedes Ding bekommt eine Historie aus Kauf, Reparatur, Raumwechsel, Garantie und Notizen.",
    },
    {
        "id": "EMERGENCY_BINDER",
        "label": "Emergency Home Binder",
        "description": "Ein Tap erzeugt eine strukturierte Hausakte fuer Versicherung, Umzug oder Schaden.",
    },
    {
        "id": "REORDER_INTELLIGENCE",
        "label": "Reorder Intelligence",
        "description": "Avareno findet passende Ersatzteile, Verbrauchsmaterial, neue Modelle und Shop-Links.",
    },
    {
        "id": "HOME_ASSISTANT_IMPORT",
        "label": "Smart Home Import",
        "description": "Geraete koennen spaeter automatisch aus Smart-Home-Systemen entstehen.",
    },
]


def _with_item_counts(conn: sqlite3.Connection, spaces: list[dict]) -> list[dict]:
    counts = {
        row["spaceId"]: row["count"]
        for row in conn.execute(
            'SELECT spaceId, COUNT(*) AS count FROM "Item" WHERE spaceId IS NOT NULL GROUP BY spaceId'
        ).fetchall()
    }
    return [{**space, "itemCount": counts.get(space["id"], 0)} for space in spaces]


def structure_payload(conn: sqlite3.Connection, user_id: str) -> dict:
    household = row_to_dict(
        conn.execute('SELECT * FROM "Household" WHERE userId = ? ORDER BY createdAt ASC LIMIT 1', (user_id,)).fetchone()
    )
    household_id = household["id"] if household else None
    spaces = (
        rows_to_dicts(
            conn.execute(
                'SELECT * FROM "Space" WHERE householdId = ? ORDER BY parentId IS NOT NULL, sortOrder ASC, name ASC',
                (household_id,),
            ).fetchall()
        )
        if household_id
        else []
    )
    members = (
        rows_to_dicts(
            conn.execute(
                'SELECT * FROM "HouseholdMember" WHERE householdId = ? ORDER BY role ASC, createdAt ASC',
                (household_id,),
            ).fetchall()
        )
        if household_id
        else []
    )
    plan = row_to_dict(
        conn.execute('SELECT * FROM "PlanSubscription" WHERE userId = ? ORDER BY createdAt ASC LIMIT 1', (user_id,)).fetchone()
    )
    partners = rows_to_dicts(conn.execute('SELECT * FROM "AffiliatePartner" WHERE status = ? ORDER BY name ASC', ("ACTIVE",)).fetchall())
    smart_home = (
        rows_to_dicts(
            conn.execute(
                'SELECT * FROM "SmartHomeConnection" WHERE userId = ? ORDER BY provider ASC',
                (user_id,),
            ).fetchall()
        )
        if household_id
        else []
    )
    item_count = conn.execute('SELECT COUNT(*) AS count FROM "Item" WHERE userId = ?', (user_id,)).fetchone()["count"]
    free_limit = plan["itemLimit"] if plan else 25

    return {
        "household": household,
        "spaces": _with_item_counts(conn, spaces),
        "members": members,
        "plan": plan,
        "usage": {
            "items": item_count,
            "itemLimit": free_limit,
            "isLimitReached": bool(plan and plan["tier"] == "FREE" and item_count >= free_limit),
        },
        "itemTypes": ITEM_TYPES,
        "captureMethods": CAPTURE_METHODS,
        "premiumFeatures": PREMIUM_FEATURES,
        "wowFeatures": WOW_FEATURES,
        "affiliateProgram": {
            "status": "FOUNDATION_READY",
            "partners": partners,
            "rules": [
                "Shop-Links muessen hilfreich sein, nicht werblich.",
                "Jeder Klick wird messbar, damit Revenue spaeter sauber zugeordnet werden kann.",
                "Premium darf Affiliate nicht ersetzen, sondern ergaenzen.",
            ],
        },
        "sharing": {
            "status": "FOUNDATION_READY",
            "roles": ["OWNER", "EDITOR", "VIEWER"],
            "defaultVisibility": "HOUSEHOLD",
        },
        "smartHome": {
            "status": "FOUNDATION_READY",
            "connections": smart_home,
            "targetProviders": ["SAMSUNG_SMARTTHINGS", "BAMBU_LAB", "LOCAL_DISCOVERY", "ALEXA", "GOOGLE_HOME", "APPLE_HOME", "HOME_ASSISTANT", "MATTER"],
        },
    }
