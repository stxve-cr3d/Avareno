from __future__ import annotations

import json
import re
import sqlite3
import tempfile
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from app.services.document_storage import UPLOAD_ROOT
from app.db import rows_to_dicts
from app.utils import make_id, now_iso


IMPLEMENTATION_STATE = "PARTIAL_MVP_CONTROLS"

KNOWN_USER_TABLES = [
    "User",
    "Household",
    "HouseholdMember",
    "Space",
    "PlanSubscription",
    "BillingInvoice",
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
    "ConsentEvent",
    "PrivacyAuditEvent",
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
    "billing subscription and invoice metadata",
    "AI analysis records",
    "logs/audit entries",
    "storage objects",
    "backups policy note",
]

EXPORT_TODO_AREAS = [
    "Supabase Auth provider-side account export",
    "provider-side billing/customer portal export",
    "provider-side connector export/revocation receipts",
    "backup retention/restoration exclusions",
]

EXPORT_ACTIVE_AREAS = [
    "account/profile database row",
    "products/items",
    "document metadata and AI-extracted fields",
    "uploaded local document file bundle",
    "care reminders and loops",
    "repair logs",
    "smart-home/connector metadata stored locally",
    "billing plan/subscription state and invoice metadata stored locally",
    "consent and privacy audit history stored locally",
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
    consent_history = _consent_history(conn, user_id)

    return {
        "generatedAt": now_iso(),
        "implementationState": IMPLEMENTATION_STATE,
        "dataOverview": [
            {
                "id": "items",
                "label": "Gespeicherte Objekte",
                "value": item_count,
                "status": "Aktiv",
                "note": "Produktpässe, Kategorien, Seriennummern, Garantie- und Care-Kontext.",
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
                "status": "Kontrolliert",
                "note": "Aktive Connect-Quellen sind trennbar; Secrets werden nicht an das Frontend gegeben.",
            },
            {
                "id": "billing",
                "label": "Plan & Abrechnung",
                "value": _count_with_optional_table(conn, 'SELECT COUNT(*) FROM "PlanSubscription" WHERE userId = ?', (user_id,)),
                "status": "Foundation",
                "note": "Stripe-Billing ist vorbereitet; Zahlungsdaten werden nicht gespeichert, Rechnungen werden nur als Metadaten/Stripe-Links synchronisiert.",
            },
            {
                "id": "ai-analysis",
                "label": "KI-Analyse",
                "value": extracted_count,
                "status": "Kontrollierbar",
                "note": "Gespeicherte Extraktionen können korrigiert oder gelöscht werden.",
            },
            {
                "id": "private-vault",
                "label": "Private Vault",
                "value": vault_count,
                "status": "Guardrail",
                "note": "Sensible Kategorien werden nicht automatisch analysiert; Re-Auth und stärkere Verschlüsselung bleiben offen.",
            },
        ],
        "connectedSources": connected_sources,
        "aiControls": {
            "receiptDocumentAnalysis": "EXPLICIT_REQUEST_ONLY",
            "vaultAutoAnalysis": False,
            "userCorrection": "DOCUMENT_ENDPOINT_ACTIVE",
            "extractedRecordCount": extracted_count,
            "deleteAvailable": True,
            "note": "Beleg- und Dokumentanalyse bleibt nutzerausgeloest; gespeicherte Extraktionen koennen geloescht oder korrigiert werden.",
        },
        "privateVault": {
            "status": "PLANNED",
            "sensitiveCategories": PRIVATE_VAULT_CATEGORIES,
            "requiresReauth": "TODO",
            "strongerEncryption": "TODO",
        },
        "consentHistory": consent_history,
        "export": export_plan(user_id),
        "deletion": deletion_plan(user_id),
        "thirdPartyProviders": [
            "Supabase Auth (configured in auth foundation)",
            "Stripe billing only after Checkout, webhook, tax, legal and production configuration review",
            "SmartThings only when token/OAuth is configured",
            "OpenAI or AI provider TODO before real AI extraction",
            "Hosting/email/analytics providers TODO before launch",
        ],
    }


def export_plan(user_id: str) -> dict[str, Any]:
    return {
        "state": IMPLEMENTATION_STATE,
        "userId": user_id,
        "ready": True,
        "included": EXPORT_ACTIVE_AREAS,
        "includedWhenImplemented": EXPORT_TODO_AREAS,
        "storageImpact": "Der aktive MVP-Export liefert Datenbankdaten als JSON und lokale Upload-Dateien als ZIP-Bundle.",
        "userVisibleMessage": "Export für gespeicherte Avareno-Daten und lokale Dokumentdateien ist aktiv. Provider-Exporte bleiben vor Launch offen.",
    }


def account_deletion_plan(user_id: str) -> dict[str, Any]:
    return deletion_plan(user_id)


def deletion_plan(user_id: str) -> dict[str, Any]:
    return {
        "state": IMPLEMENTATION_STATE,
        "userId": user_id,
        "ready": False,
        "knownTables": KNOWN_USER_TABLES,
        "knownStorageRoots": [str(UPLOAD_ROOT)],
        "requiredAreas": DELETION_TODO_AREAS,
        "authDeletion": "Supabase auth user deletion requires server-side admin orchestration; never run from the browser.",
        "backupPolicyNote": "Define retention and restore exclusions before claiming irreversible deletion.",
        "userVisibleMessage": "Kontolöschung kann als Anfrage protokolliert werden. Vollständige Ausführung bleibt blockiert, bis Auth, Storage, Provider und Backups orchestriert sind.",
    }


def document_deletion_plan(user_id: str) -> dict[str, Any]:
    return {
        "state": IMPLEMENTATION_STATE,
        "userId": user_id,
        "ready": True,
        "tables": ["Document", "ItemActivity"],
        "storageRoots": [str(UPLOAD_ROOT)],
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
        "ready": True,
        "tables": ["SmartHomeConnection"],
        "secretStores": ["TODO encrypted connector secret store"],
        "notes": [
            "Local connector metadata can be disconnected now.",
            "Provider-side token revocation is still TODO where real OAuth/token providers are configured.",
            "Frontend must never receive full tokens.",
            "Sync logs must keep safe status only, not raw provider payloads.",
        ],
    }


def ai_extracted_data_deletion_plan(user_id: str) -> dict[str, Any]:
    return {
        "state": IMPLEMENTATION_STATE,
        "userId": user_id,
        "ready": True,
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


def record_privacy_audit_event(
    conn: sqlite3.Connection,
    *,
    user_id: str,
    event_type: str,
    status: str,
    message: str,
    provider: str | None = None,
    context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    event_id = make_id()
    created_at = now_iso()
    safe_context = _safe_context(context or {})
    safe_message = _strip_sensitive_terms(message)
    conn.execute(
        """INSERT INTO "PrivacyAuditEvent"
           (id, userId, eventType, status, message, provider, safeContext, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            event_id,
            user_id,
            event_type,
            status,
            safe_message,
            provider,
            json.dumps(safe_context, ensure_ascii=False, sort_keys=True),
            created_at,
        ),
    )
    return {
        "id": event_id,
        "eventType": event_type,
        "userId": user_id,
        "status": status,
        "message": safe_message,
        "provider": provider,
        "safeContext": safe_context,
        "createdAt": created_at,
    }


def build_user_export(conn: sqlite3.Connection, user_id: str) -> dict[str, Any]:
    export_id = make_id()
    generated_at = now_iso()
    payload = _build_user_export_payload(
        conn,
        user_id=user_id,
        export_id=export_id,
        generated_at=generated_at,
        scope="local_mvp_database_json",
    )
    audit = record_privacy_audit_event(
        conn,
        user_id=user_id,
        event_type="DATA_EXPORT_CREATED",
        status="READY",
        message="Local database JSON export created.",
        context={"export_id": export_id, "format_version": 1},
    )
    return {
        "state": IMPLEMENTATION_STATE,
        "ready": True,
        "fileName": f"avareno-export-{generated_at[:10]}.json",
        "mediaType": "application/json",
        "export": payload,
        "audit": audit,
        "limitations": EXPORT_TODO_AREAS,
        "userVisibleMessage": "JSON-Export wurde erstellt. Provider-Exporte bleiben vor Launch offen.",
    }


def build_user_export_bundle(conn: sqlite3.Connection, user_id: str) -> dict[str, Any]:
    export_id = make_id()
    generated_at = now_iso()
    payload = _build_user_export_payload(
        conn,
        user_id=user_id,
        export_id=export_id,
        generated_at=generated_at,
        scope="local_mvp_database_and_document_bundle",
    )
    file_entries = _document_file_entries(payload["data"].get("documents", []))
    manifest = _build_export_manifest(
        export_id=export_id,
        generated_at=generated_at,
        file_entries=file_entries,
    )

    temp = tempfile.NamedTemporaryFile(prefix="avareno-export-", suffix=".zip", delete=False)
    bundle_path = Path(temp.name)
    temp.close()
    try:
        with zipfile.ZipFile(bundle_path, mode="w", compression=zipfile.ZIP_DEFLATED, allowZip64=True) as archive:
            archive.writestr("README.txt", _export_readme_text(generated_at))
            archive.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2))
            archive.writestr("data/avareno-export.json", json.dumps(payload, ensure_ascii=False, indent=2))
            for entry in file_entries:
                source = entry.get("_sourcePath")
                bundle_file_path = entry.get("bundlePath")
                if not source or not bundle_file_path:
                    continue
                archive.write(Path(str(source)), arcname=str(bundle_file_path))
    except Exception:
        bundle_path.unlink(missing_ok=True)
        raise

    included_count = sum(1 for entry in file_entries if entry["status"] == "included")
    missing_count = sum(1 for entry in file_entries if entry["status"] != "included")
    audit = record_privacy_audit_event(
        conn,
        user_id=user_id,
        event_type="DATA_EXPORT_BUNDLE_CREATED",
        status="READY",
        message="Local database and document ZIP export created.",
        context={
            "export_id": export_id,
            "format_version": 1,
            "included_object_count": included_count,
            "missing_object_count": missing_count,
        },
    )
    return {
        "state": IMPLEMENTATION_STATE,
        "ready": True,
        "path": bundle_path,
        "fileName": f"avareno-export-{generated_at[:10]}.zip",
        "mediaType": "application/zip",
        "audit": audit,
        "manifest": manifest,
        "limitations": EXPORT_TODO_AREAS,
        "userVisibleMessage": "ZIP-Export mit Datenbankdaten, Manifest und lokalen Dokumentdateien wurde erstellt. Provider-Exporte bleiben vor Launch offen.",
    }


def _build_user_export_payload(
    conn: sqlite3.Connection,
    *,
    user_id: str,
    export_id: str,
    generated_at: str,
    scope: str,
) -> dict[str, Any]:
    payload = {
        "exportId": export_id,
        "generatedAt": generated_at,
        "formatVersion": 1,
        "scope": scope,
        "limitations": EXPORT_TODO_AREAS,
        "data": {
            "user": _single_row(conn, 'SELECT id, name, email, xp, level, createdAt, updatedAt FROM "User" WHERE id = ?', (user_id,)),
            "households": _rows(conn, 'SELECT * FROM "Household" WHERE userId = ? ORDER BY createdAt ASC', (user_id,)),
            "householdMembers": _rows(
                conn,
                """SELECT hm.* FROM "HouseholdMember" hm
                   JOIN "Household" h ON h.id = hm.householdId
                   WHERE h.userId = ?
                   ORDER BY hm.createdAt ASC""",
                (user_id,),
            ),
            "spaces": _rows(
                conn,
                """SELECT s.* FROM "Space" s
                   JOIN "Household" h ON h.id = s.householdId
                   WHERE h.userId = ?
                   ORDER BY s.sortOrder ASC, s.createdAt ASC""",
                (user_id,),
            ),
            "planSubscriptions": _rows(conn, 'SELECT * FROM "PlanSubscription" WHERE userId = ? ORDER BY createdAt ASC', (user_id,)),
            "billingInvoices": _rows(conn, 'SELECT * FROM "BillingInvoice" WHERE userId = ? ORDER BY COALESCE(invoiceCreatedAt, createdAt) ASC', (user_id,)),
            "items": _rows(conn, 'SELECT * FROM "Item" WHERE userId = ? ORDER BY createdAt ASC', (user_id,)),
            "documents": _rows(conn, 'SELECT * FROM "Document" WHERE userId = ? ORDER BY createdAt ASC', (user_id,)),
            "repairLogs": _rows(conn, 'SELECT * FROM "RepairLog" WHERE userId = ? ORDER BY createdAt ASC', (user_id,)),
            "loops": _rows(conn, 'SELECT * FROM "Loop" WHERE userId = ? ORDER BY createdAt ASC', (user_id,)),
            "reminders": _rows(conn, 'SELECT * FROM "Reminder" WHERE userId = ? ORDER BY createdAt ASC', (user_id,)),
            "deviceTokens": _rows(conn, 'SELECT * FROM "DeviceToken" WHERE userId = ? ORDER BY createdAt ASC', (user_id,)),
            "xpTransactions": _rows(conn, 'SELECT * FROM "XpTransaction" WHERE userId = ? ORDER BY createdAt ASC', (user_id,)),
            "itemActivities": _rows(conn, 'SELECT * FROM "ItemActivity" WHERE userId = ? ORDER BY createdAt ASC', (user_id,)),
            "affiliateClicks": _rows(conn, 'SELECT * FROM "AffiliateClick" WHERE userId = ? ORDER BY createdAt ASC', (user_id,)),
            "smartHomeConnections": _rows(conn, 'SELECT * FROM "SmartHomeConnection" WHERE userId = ? ORDER BY createdAt ASC', (user_id,)),
            "smartHomeDevices": _rows(conn, 'SELECT * FROM "SmartHomeDevice" WHERE userId = ? ORDER BY createdAt ASC', (user_id,)),
            "smartHomeCommands": _rows(conn, 'SELECT * FROM "SmartHomeCommand" WHERE userId = ? ORDER BY createdAt ASC', (user_id,)),
            "consentHistory": _rows(conn, 'SELECT * FROM "ConsentEvent" WHERE userId = ? ORDER BY createdAt ASC', (user_id,)),
            "privacyAuditEvents": _rows(
                conn,
                'SELECT id, eventType, status, message, provider, safeContext, createdAt FROM "PrivacyAuditEvent" WHERE userId = ? ORDER BY createdAt ASC',
                (user_id,),
            ),
        },
    }
    return payload


def _build_export_manifest(
    *,
    export_id: str,
    generated_at: str,
    file_entries: list[dict[str, Any]],
) -> dict[str, Any]:
    public_entries = [{key: value for key, value in entry.items() if key != "_sourcePath"} for entry in file_entries]
    included_count = sum(1 for entry in public_entries if entry["status"] == "included")
    missing_count = sum(1 for entry in public_entries if entry["status"] != "included")
    return {
        "exportId": export_id,
        "generatedAt": generated_at,
        "formatVersion": 1,
        "scope": "local_mvp_database_and_document_bundle",
        "files": {
            "databaseJson": "data/avareno-export.json",
            "manifest": "manifest.json",
            "readme": "README.txt",
        },
        "documentFiles": public_entries,
        "summary": {
            "documentRecordCount": len(public_entries),
            "includedDocumentFileCount": included_count,
            "missingDocumentFileCount": missing_count,
        },
        "limitations": EXPORT_TODO_AREAS,
        "securityNotes": [
            "Bundle paths are relative to this ZIP archive.",
            "Local server filesystem paths are intentionally not included in this manifest.",
            "Provider-side account, billing, connector and backup exports require separate production orchestration.",
        ],
    }


def _document_file_entries(documents: list[dict[str, Any]]) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for document in documents:
        document_id = str(document.get("id") or "unknown-document")
        safe_document_id = _safe_export_file_name(document_id)
        original_name = str(document.get("fileName") or "document")
        doc_type = _safe_export_path_part(str(document.get("type") or "OTHER"))
        safe_name = _safe_export_file_name(original_name)
        bundle_path = f"documents/{doc_type}/{safe_document_id}-{safe_name}"
        source_path = _safe_local_export_upload_path(document.get("filePath"))

        entry: dict[str, Any] = {
            "documentId": document_id,
            "itemId": document.get("itemId"),
            "type": document.get("type"),
            "fileName": original_name,
            "mimeType": document.get("mimeType"),
            "bundlePath": None,
            "status": "missing_local_file",
            "sizeBytes": None,
        }

        if source_path is None:
            entry["status"] = "unsupported_storage_path"
        elif source_path.exists() and source_path.is_file():
            entry["status"] = "included"
            entry["bundlePath"] = bundle_path
            entry["sizeBytes"] = source_path.stat().st_size
            entry["_sourcePath"] = str(source_path)

        entries.append(entry)
    return entries


def _safe_local_export_upload_path(file_path: str | None) -> Path | None:
    if not file_path or not file_path.startswith("/uploads/"):
        return None

    root = UPLOAD_ROOT.resolve()
    target = (root / file_path.removeprefix("/uploads/")).resolve()
    try:
        target.relative_to(root)
    except ValueError:
        return None
    return target


def _safe_export_file_name(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9._-]", "-", Path(value).name).strip(".-")
    return (cleaned or "document")[:140]


def _safe_export_path_part(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9_-]", "-", value.upper()).strip("-")
    return (cleaned or "OTHER")[:48]


def _export_readme_text(generated_at: str) -> str:
    return "\n".join(
        [
            "Avareno data export",
            f"Generated at: {generated_at}",
            "",
            "This ZIP contains the local MVP database export, a manifest, and available local document files.",
            "It does not include provider-side Supabase Auth exports, billing/customer portal exports, connector revocation receipts, or backup-retention proof.",
            "Check manifest.json for included and missing document files.",
            "",
        ]
    )


def disconnect_connected_source(conn: sqlite3.Connection, user_id: str, source_id: str) -> dict[str, Any] | None:
    row = conn.execute(
        """SELECT * FROM "SmartHomeConnection"
           WHERE userId = ? AND (id = ? OR provider = ?)
           ORDER BY updatedAt DESC
           LIMIT 1""",
        (user_id, source_id, source_id),
    ).fetchone()
    if not row:
        return None

    provider = row["provider"]
    device_ids = [
        device["id"]
        for device in conn.execute(
            'SELECT id FROM "SmartHomeDevice" WHERE userId = ? AND provider = ?',
            (user_id, provider),
        ).fetchall()
    ]
    if device_ids:
        placeholders = ",".join("?" for _ in device_ids)
        conn.execute(
            f'DELETE FROM "SmartHomeCommand" WHERE userId = ? AND deviceId IN ({placeholders})',
            (user_id, *device_ids),
        )
    conn.execute('DELETE FROM "SmartHomeDevice" WHERE userId = ? AND provider = ?', (user_id, provider))
    now = now_iso()
    conn.execute(
        """UPDATE "SmartHomeConnection"
           SET status = ?, lastSyncAt = NULL, updatedAt = ?
           WHERE id = ? AND userId = ?""",
        ("DISCONNECTED", now, row["id"], user_id),
    )
    audit = record_privacy_audit_event(
        conn,
        user_id=user_id,
        event_type="CONNECTED_SOURCE_DISCONNECTED",
        status="DISCONNECTED",
        message="Local connector metadata disconnected; provider token revocation still depends on provider integration.",
        provider=provider,
        context={"connection_id": row["id"], "deleted_device_count": len(device_ids)},
    )
    return {
        "id": row["id"],
        "provider": provider,
        "status": "DISCONNECTED",
        "providerRevocation": "not_configured",
        "deletedDeviceCount": len(device_ids),
        "audit": audit,
    }


def delete_ai_extracted_data(conn: sqlite3.Connection, user_id: str, document_id: str | None = None) -> dict[str, Any] | None:
    params: tuple[Any, ...]
    where = 'userId = ? AND (extractedText IS NOT NULL OR extractedJson IS NOT NULL)'
    params = (user_id,)
    if document_id:
        document = conn.execute('SELECT id FROM "Document" WHERE id = ? AND userId = ?', (document_id, user_id)).fetchone()
        if not document:
            return None
        where += " AND id = ?"
        params = (user_id, document_id)

    count = _count(conn, f'SELECT COUNT(*) FROM "Document" WHERE {where}', params)
    conn.execute(
        f'UPDATE "Document" SET extractedText = NULL, extractedJson = NULL, updatedAt = ? WHERE {where}',
        (now_iso(), *params),
    )
    audit = record_privacy_audit_event(
        conn,
        user_id=user_id,
        event_type="AI_EXTRACTED_DATA_DELETED",
        status="DELETED",
        message="AI-extracted document fields deleted.",
        context={"document_scope": "single" if document_id else "all", "deleted_record_count": count},
    )
    return {
        "state": IMPLEMENTATION_STATE,
        "deletedRecordCount": count,
        "documentId": document_id,
        "audit": audit,
        "userVisibleMessage": "Gespeicherte KI-Extraktionen wurden gelöscht.",
    }


def request_account_deletion_record(conn: sqlite3.Connection, user_id: str) -> dict[str, Any]:
    audit = record_privacy_audit_event(
        conn,
        user_id=user_id,
        event_type="ACCOUNT_DELETION_REQUESTED",
        status="BLOCKED_MANUAL_REVIEW",
        message="Account deletion request recorded; full deletion orchestration is not production-ready.",
        context={"known_table_count": len(KNOWN_USER_TABLES), "storage_root_count": 1},
    )
    return {
        **account_deletion_plan(user_id),
        "requestId": audit["id"],
        "audit": audit,
    }


def _connected_sources(conn: sqlite3.Connection, user_id: str) -> list[dict[str, Any]]:
    rows = rows_to_dicts(
        conn.execute(
            """SELECT id, provider, status, lastSyncAt, updatedAt
               FROM "SmartHomeConnection"
               WHERE userId = ? AND upper(status) NOT IN ('AVAILABLE', 'PLANNED', 'DISCONNECTED')
               ORDER BY updatedAt DESC""",
            (user_id,),
        ).fetchall()
    )
    return [
        {
            "id": row["id"],
            "provider": row["provider"],
            "name": _provider_name(row["provider"]),
            "type": "Avareno Connect",
            "status": row["status"],
            "lastSync": row.get("lastSyncAt"),
            "permissions": ["read:device_identity", "read:status"],
            "disconnectAvailable": True,
            "disconnectTodo": "Provider-side token revocation remains TODO when a real provider token is configured.",
        }
        for row in rows
    ]


def _consent_history(conn: sqlite3.Connection, user_id: str) -> list[dict[str, Any]]:
    rows = rows_to_dicts(
        conn.execute(
            """SELECT id, scope, label, status, legalBasis, source, createdAt, revokedAt
               FROM "ConsentEvent"
               WHERE userId = ?
               ORDER BY createdAt DESC
               LIMIT 20""",
            (user_id,),
        ).fetchall()
    )
    return [
        {
            "id": row["id"],
            "scope": row["scope"],
            "label": row["label"],
            "status": row["status"],
            "legalBasis": row.get("legalBasis"),
            "source": row["source"],
            "createdAt": row["createdAt"],
            "revokedAt": row.get("revokedAt"),
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


def _single_row(conn: sqlite3.Connection, query: str, params: tuple[Any, ...]) -> dict[str, Any] | None:
    row = conn.execute(query, params).fetchone()
    return dict(row) if row else None


def _rows(conn: sqlite3.Connection, query: str, params: tuple[Any, ...]) -> list[dict[str, Any]]:
    try:
        return rows_to_dicts(conn.execute(query, params).fetchall())
    except sqlite3.OperationalError:
        return []


def _safe_context(context: dict[str, Any]) -> dict[str, str | int | bool | None]:
    blocked = {"token", "secret", "password", "authorization", "payload", "raw", "prompt", "content", "file", "document_text"}
    safe: dict[str, str | int | bool | None] = {}
    for key, value in context.items():
        normalized_key = key.lower().replace("-", "_")
        if any(term in normalized_key for term in blocked):
            safe[key] = "[redacted]"
        elif isinstance(value, (str, int, bool)) or value is None:
            safe[key] = value
        else:
            safe[key] = f"[{type(value).__name__}]"
    return safe


def _strip_sensitive_terms(value: str) -> str:
    blocked = ["token", "secret", "password", "access_code", "authorization", "bearer"]
    sanitized = value
    for term in blocked:
        sanitized = sanitized.replace(term, "[redacted]")
        sanitized = sanitized.replace(term.upper(), "[redacted]")
        sanitized = sanitized.replace(term.title(), "[redacted]")
    return sanitized[:280]
