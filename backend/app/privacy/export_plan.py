from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.privacy.audit_log import build_safe_audit_event

EXPORT_DATA_CATEGORIES = [
    "account_profile",
    "object_memory",
    "documents_and_files",
    "care_loops",
    "resolve_tickets",
    "friend_privacy_preferences",
    "ai_extracted_facts",
    "connector_metadata",
    "consent_and_permission_history",
]

EXPORT_STORAGE_AREAS = [
    "Supabase Auth user record",
    "application database rows owned by the user",
    "Supabase Storage buckets: avatars, object-images, receipts, documents, support-files",
    "local MVP uploads directory",
    "future connector sync logs without raw payloads",
]


@dataclass(frozen=True)
class DataExportPlan:
    user_id: str
    status: str = "partial_mvp_controls"
    categories: list[str] = field(default_factory=lambda: list(EXPORT_DATA_CATEGORIES))
    storage_areas: list[str] = field(default_factory=lambda: list(EXPORT_STORAGE_AREAS))
    blockers: list[str] = field(default_factory=lambda: [
        "No production export job/status flow is implemented yet.",
        "Local MVP file bundling and signed API downloads exist, but private object-storage exports are not implemented yet.",
        "Supabase Auth export and provider-side retention need review.",
        "Raw AI prompt/output retention policy is not finalized.",
    ])

    def as_dict(self) -> dict[str, Any]:
        return {
            "status": self.status,
            "userId": self.user_id,
            "categories": self.categories,
            "storageAreas": self.storage_areas,
            "blockers": self.blockers,
            "message": "Local MVP export is partially implemented; do not show this as a complete production export process.",
        }


def build_data_export_plan(user_id: str) -> DataExportPlan:
    return DataExportPlan(user_id=user_id)


def request_data_export(user_id: str) -> dict[str, Any]:
    plan = build_data_export_plan(user_id)
    audit_event = build_safe_audit_event(
        action="privacy.export.requested",
        actor_user_id=user_id,
        subject_user_id=user_id,
        status="partial_mvp_controls",
        context={"categories": len(plan.categories)},
    )
    return {
        **plan.as_dict(),
        "auditEvent": audit_event.as_dict(),
    }
