from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.privacy.audit_log import build_safe_audit_event

KNOWN_USER_TABLES = [
    "User",
    "Profile",
    "Item",
    "Document",
    "ItemActivity",
    "Loop",
    "Ticket",
    "RewardProgress",
    "SmartHomeConnection",
    "SmartHomeDevice",
    "SmartHomeCommand",
    "Notification",
]

KNOWN_STORAGE_BUCKETS = [
    "avatars",
    "object-images",
    "receipts",
    "documents",
    "support-files",
]

DELETION_DOMAINS = [
    "application_database_rows",
    "storage_objects",
    "local_upload_files",
    "connector_tokens",
    "connector_sync_logs",
    "ai_extracted_facts",
    "raw_ai_prompts_and_outputs_if_retained",
    "supabase_auth_user",
    "backup_retention",
]


@dataclass(frozen=True)
class AccountDeletionPlan:
    user_id: str
    status: str = "foundation_only"
    tables: list[str] = field(default_factory=lambda: list(KNOWN_USER_TABLES))
    buckets: list[str] = field(default_factory=lambda: list(KNOWN_STORAGE_BUCKETS))
    domains: list[str] = field(default_factory=lambda: list(DELETION_DOMAINS))
    blockers: list[str] = field(default_factory=lambda: [
        "No transactional deletion orchestrator is implemented yet.",
        "Supabase Auth user deletion and session invalidation need a server-side service role flow.",
        "Storage object deletion must verify user-owned paths before deletion.",
        "Connector token revocation/deletion is not implemented yet.",
        "Backup retention and audit log retention policy need legal/DSB review.",
    ])

    def as_dict(self) -> dict[str, Any]:
        return {
            "status": self.status,
            "userId": self.user_id,
            "knownTables": self.tables,
            "knownBuckets": self.buckets,
            "deletionDomains": self.domains,
            "blockers": self.blockers,
            "message": "Account deletion is planned but not complete; do not show it as finished.",
        }


def build_account_deletion_plan(user_id: str) -> AccountDeletionPlan:
    return AccountDeletionPlan(user_id=user_id)


def build_document_deletion_plan(user_id: str, document_id: str) -> dict[str, Any]:
    return {
        "status": "foundation_only",
        "userId": user_id,
        "documentId": document_id,
        "steps": [
            "Verify document belongs to user.",
            "Delete database document row or mark deletion state.",
            "Delete storage object or local upload file after path ownership check.",
            "Delete or detach AI-extracted facts tied to the document.",
            "Write a safe audit event without filename, raw text, or file content.",
        ],
        "message": "Document deletion plan only; execution is not implemented here.",
    }


def request_account_deletion(user_id: str) -> dict[str, Any]:
    plan = build_account_deletion_plan(user_id)
    audit_event = build_safe_audit_event(
        action="privacy.account_deletion.requested",
        actor_user_id=user_id,
        subject_user_id=user_id,
        status="foundation_only",
        context={"known_tables": len(plan.tables), "known_buckets": len(plan.buckets)},
    )
    return {
        **plan.as_dict(),
        "auditEvent": audit_event.as_dict(),
    }

