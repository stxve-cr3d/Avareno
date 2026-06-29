from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from app.db import PROJECT_ROOT, rows_to_dicts
from app.utils import now_iso


IMPLEMENTATION_STATE = "FOUNDATION_ONLY"

KNOWN_USER_TABLES = [
    "User",
    "Household",
    "HouseholdMember",
    "Space",
    "PlanSubscription",
    "Item",
    "Document",
    "RepairLog",
    "Loop",
    "Reminder",
    "DeviceToken",
    "XpTransaction",
    "ItemActivity",
    "AffiliateClick",
    "SmartHomeConnection",
    "SmartHomeDevice",
    "SmartHomeCommand",
]

DELETION_TODO_AREAS = [
    "user profile",
    "auth user",
    "products/items",
    "documents/files",
    "extracted text/metadata",
    "reminders",
    "tickets/care/resolve",
    "connector configs",
    "connector secrets/tokens",
    "billing subscription state",
    "AI analysis records",
    "logs/audit entries",
    "storage objects",
    "backups policy note",
]

EXPORT_TODO_AREAS = [
    "products/items",
    "document metadata",
    "uploaded document files",
    "extracted text/metadata",
    "care reminders and loops",
    "smart-home/connector metadata",
    "billing plan/subscription state",
    "account/profile settings",
    "consent and permission history",
]

PRIVATE_VAULT_CATEGORIES = [
    "IDENTITY",
    "INSURANCE",
    "PAYMENT",
    "MEDICAL",
    "EMPLOYMENT",
    "CONTRACTS",
    "LEGAL",
    "HIGHLY_PERSONAL",
]


@dataclass(frozen=True)
class SafeAuditEvent:
    event_type: str
    user_id: str
    status: str
    message: str
    created_at: str

    def to_dict(self) -> dict[str, str]:
        return {
            "eventType": self.event_type,
            "userId": self.user_id,
            "status": self.status,
            "message": self.message,
            "createdAt": self.created_at,
        }


def privacy_summary(conn: sqlite3.Connection, user_id: str) -> dict[str, Any]:
    item_count = _count(conn, 'SELECT COUNT(*) FROM "Item" WHERE userId = ?', (user_id,))
    document_count = _count(conn, 'SELECT COUNT(*) FROM "Document" WHERE userId = ?', (user_id,))
    extracted_count = _count(
        conn,
        'SELECT COUNT(*) FROM "Document" WHERE userId = ? AND (extractedText IS NOT NULL OR extractedJson IS NOT NULL)',
        (user_id,),
    )
    vault_count = _count_with_optional_table(
        conn,
        'SELECT COUNT(*) FROM "Document" WHERE userId = ? AND upper(type) IN ({})'.format(
            ",".join("?" for _ in PRIVATE_VAULT_CATEGORIES)
        ),
        (user_id, *PRIVATE_VAULT_CATEGORIES),
    )
    connected_sources = _connected_sources(conn, user_id)

    return {
        "generatedAt": now_iso(),
        "implementationState": IMPLEMENTATION_STATE,
        "dataOverview": [
            {
                "id": "items",
                "label": "Gespeicherte Dinge",
                "value": item_count,
                "status": "Aktiv",
                "note": "Produktpaesse, Kategorien, Seriennummern, Garantie- und Care-Kontext.",
            },
            {
                "id": "documents",
                "label": "Dokumente / Belege",
                "value": document_count,
                "status": "Aktiv",
                "note": "Dateien liegen aktuell im lokalen Upload-Speicher; Metadaten liegen in Document.",
            },
            {
                "id": "sources",
                "label": "Verbundene Quellen",
                "value": len(connected_sources),
                "status": "Vorbereitet",
                "note": "Connect-Quellen bleiben sichtbar und trennbar; Secrets werden nicht an das Frontend gegeben.",
            },
            {
                "id": "billing",
                "label": "Plan & Abrechnung",
                "value": _count_with_optional_table(conn, 'SELECT COUNT(*) FROM "PlanSubscription" WHERE userId = ?', (user_id,)),
                "status": "Foundation",
                "note": "Paddle-Billing ist vorbereitet; Zahlungs- und Kartendaten werden nicht in Avareno gespeichert.",
            },
            {
                "id": "ai-analysis",
                "label": "KI-Analyse",
                "value": extracted_count,
                "status": "Kontrolliert",
                "note": "Extraktionen werden als assistiert markiert und muessen spaeter korrigierbar bleiben.",
            },
            {
                "id": "private-vault",
                "label": "Private Vault",
                "value": vault_count,
                "status": "Schutz geplant",
                "note": "Sensible Kategorien werden nicht automatisch analysiert.",
            },
        ],
        "connectedSources": connected_sources,
        "aiControls": {
            "receiptDocumentAnalysis": "TODO_MODEL",
            "vaultAutoAnalysis": False,
            "userCorrection": "TODO",
            "note": "Beleg- und Dokumentanalyse ist vorbereitet, aber noch kein vollstaendiges Einstellungsmodell.",
        },
        "privateVault": {
            "status": "PLANNED",
            "sensitiveCategories": PRIVATE_VAULT_CATEGORIES,
            "requiresReauth": "TODO",
            "strongerEncryption": "TODO",
        },
        "consentHistory": [],
        "export": export_plan(user_id),
        "deletion": deletion_plan(user_id),
        "thirdPartyProviders": [
            "Supabase Auth (configured in auth foundation)",
            "Paddle billing only after Merchant-of-Record/legal/tax review and production configuration",
            "SmartThings only when token/OAuth is configured",
            "OpenAI or AI provider TODO before real AI extraction",
            "Hosting/email/analytics providers TODO before launch",
        ],
    }


def export_plan(user_id: str) -> dict[str, Any]:
    return {
        "state": IMPLEMENTATION_STATE,
        "userId": user_id,
        "ready": False,
        "includedWhenImplemented": EXPORT_TODO_AREAS,
        "storageImpact": "Export must include database rows plus referenced storage objects without leaking other users' files.",
        "userVisibleMessage": "Datenexport ist vorbereitet, aber noch nicht vollständig implementiert.",
    }


def account_deletion_plan(user_id: str) -> dict[str, Any]:
    return deletion_plan(user_id)


def deletion_plan(user_id: str) -> dict[str, Any]:
    return {
        "state": IMPLEMENTATION_STATE,
        "userId": user_id,
        "ready": False,
        "knownTables": KNOWN_USER_TABLES,
        "knownStorageRoots": [str(PROJECT_ROOT / "uploads")],
        "requiredAreas": DELETION_TODO_AREAS,
        "authDeletion": "Supabase auth user deletion requires server-side admin orchestration; never run from the browser.",
        "backupPolicyNote": "Define retention and restore exclusions before claiming irreversible deletion.",
        "userVisibleMessage": "Kontolöschung ist als Orchestrierung geplant, aber noch nicht aktiv.",
    }


def document_deletion_plan(user_id: str) -> dict[str, Any]:
    return {
        "state": IMPLEMENTATION_STATE,
        "userId": user_id,
        "ready": False,
        "tables": ["Document", "ItemActivity"],
        "storageRoots": [str(PROJECT_ROOT / "uploads")],
        "notes": [
            "Delete database metadata and physical storage objects together.",
            "Recalculate item completeness after document deletion.",
            "Remove extracted text and JSON before any document row is considered deleted.",
        ],
    }


def connector_token_deletion_plan(user_id: str) -> dict[str, Any]:
    return {
        "state": IMPLEMENTATION_STATE,
        "userId": user_id,
        "ready": False,
        "tables": ["SmartHomeConnection"],
        "secretStores": ["TODO encrypted connector secret store"],
        "notes": [
            "Disconnect must revoke provider access where possible.",
            "Frontend must never receive full tokens.",
            "Sync logs must keep safe status only, not raw provider payloads.",
        ],
    }


def ai_extracted_data_deletion_plan(user_id: str) -> dict[str, Any]:
    return {
        "state": IMPLEMENTATION_STATE,
        "userId": user_id,
        "ready": False,
        "tables": ["Document.extractedText", "Document.extractedJson"],
        "futureTables": ["AIAnalysisRecord"],
        "notes": [
            "Delete extracted values separately from original documents when the user requests correction/removal.",
            "Keep only audit-safe status logs after deletion.",
        ],
    }


def safe_audit_event(event_type: str, user_id: str, status: str, message: str) -> dict[str, str]:
    return SafeAuditEvent(
        event_type=event_type,
        user_id=user_id,
        status=status,
        message=_strip_sensitive_terms(message),
        created_at=now_iso(),
    ).to_dict()


def _connected_sources(conn: sqlite3.Connection, user_id: str) -> list[dict[str, Any]]:
    rows = rows_to_dicts(
        conn.execute(
            'SELECT provider, status, lastSyncAt, updatedAt FROM "SmartHomeConnection" WHERE userId = ? ORDER BY updatedAt DESC',
            (user_id,),
        ).fetchall()
    )
    return [
        {
            "id": row["provider"],
            "name": _provider_name(row["provider"]),
            "type": "Avareno Connect",
            "status": row["status"],
            "lastSync": row.get("lastSyncAt"),
            "permissions": ["read:device_identity", "read:status"],
            "disconnectAvailable": False,
            "disconnectTodo": "TODO connector token revocation and deletion flow",
        }
        for row in rows
    ]


def _provider_name(provider: str) -> str:
    names = {
        "SAMSUNG_SMARTTHINGS": "Samsung SmartThings",
        "BAMBU_LAB": "Bambu Lab",
        "LOCAL_DISCOVERY": "Lokale Suche",
        "HOME_ASSISTANT": "Home Assistant",
    }
    return names.get(provider, provider.replace("_", " ").title())


def _count(conn: sqlite3.Connection, query: str, params: tuple[Any, ...]) -> int:
    row = conn.execute(query, params).fetchone()
    return int(row[0] if row else 0)


def _count_with_optional_table(conn: sqlite3.Connection, query: str, params: tuple[Any, ...]) -> int:
    try:
        return _count(conn, query, params)
    except sqlite3.OperationalError:
        return 0


def _strip_sensitive_terms(value: str) -> str:
    blocked = ["token", "secret", "password", "access_code", "authorization", "bearer"]
    sanitized = value
    for term in blocked:
        sanitized = sanitized.replace(term, "[redacted]")
        sanitized = sanitized.replace(term.upper(), "[redacted]")
        sanitized = sanitized.replace(term.title(), "[redacted]")
    return sanitized[:280]
