from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any
from urllib import error, parse, request


class SupabaseAdminConfigurationError(RuntimeError):
    pass


class SupabaseAdminOperationError(RuntimeError):
    pass


@dataclass(frozen=True)
class StorageDeletionResult:
    deleted_object_count: int
    checked_bucket_count: int


def require_supabase_admin_configuration() -> tuple[str, str]:
    url = (os.environ.get("SUPABASE_URL") or "").strip().rstrip("/")
    service_role_key = (os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or "").strip()
    if not url or not service_role_key:
        raise SupabaseAdminConfigurationError(
            "Supabase server administration is not configured; account deletion was not started."
        )
    return url, service_role_key


def supabase_admin_configured() -> bool:
    return bool((os.environ.get("SUPABASE_URL") or "").strip()) and bool(
        (os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or "").strip()
    )


def delete_user_storage_objects(user_id: str) -> StorageDeletionResult:
    url, service_role_key = require_supabase_admin_configuration()
    buckets = _list_buckets(url, service_role_key)
    deleted_count = 0

    for bucket in buckets:
        paths = _list_user_paths(url, service_role_key, bucket, user_id)
        for offset in range(0, len(paths), 100):
            batch = paths[offset : offset + 100]
            _request_json(
                url,
                service_role_key,
                method="DELETE",
                path=f"/storage/v1/object/{parse.quote(bucket, safe='')}",
                body={"prefixes": batch},
            )
            deleted_count += len(batch)

        remaining = _list_user_paths(url, service_role_key, bucket, user_id)
        if remaining:
            raise SupabaseAdminOperationError("Private storage deletion could not be verified.")

    return StorageDeletionResult(deleted_object_count=deleted_count, checked_bucket_count=len(buckets))


def delete_supabase_auth_user(user_id: str) -> None:
    url, service_role_key = require_supabase_admin_configuration()
    try:
        _request_json(
            url,
            service_role_key,
            method="DELETE",
            path=f"/auth/v1/admin/users/{parse.quote(user_id, safe='')}?should_soft_delete=false",
        )
    except SupabaseAdminOperationError as exc:
        if getattr(exc, "status_code", None) == 404:
            return
        raise


def delete_user_database_rows(user_id: str) -> None:
    """Delete the user's Supabase public profile and cascading app rows.

    The beta migration defines ON DELETE CASCADE from User for user-owned
    tables. Memberships in another owner's household are removed explicitly
    because their FK intentionally uses ON DELETE SET NULL.
    """
    url, service_role_key = require_supabase_admin_configuration()
    user_filter = parse.urlencode({"userId": f"eq.{user_id}"})
    id_filter = parse.urlencode({"id": f"eq.{user_id}"})
    _request_json(
        url,
        service_role_key,
        method="DELETE",
        path=f"/rest/v1/HouseholdMember?{user_filter}",
        headers={"Prefer": "return=minimal"},
    )
    _request_json(
        url,
        service_role_key,
        method="DELETE",
        path=f"/rest/v1/User?{id_filter}",
        headers={"Prefer": "return=minimal"},
    )

    remaining_profile = _request_json(
        url,
        service_role_key,
        method="GET",
        path=f"/rest/v1/User?select=id&{id_filter}&limit=1",
    )
    remaining_membership = _request_json(
        url,
        service_role_key,
        method="GET",
        path=f"/rest/v1/HouseholdMember?select=id&{user_filter}&limit=1",
    )
    if remaining_profile or remaining_membership:
        raise SupabaseAdminOperationError("Supabase database deletion could not be verified.")


def _list_buckets(url: str, service_role_key: str) -> list[str]:
    payload = _request_json(url, service_role_key, method="GET", path="/storage/v1/bucket")
    if not isinstance(payload, list):
        raise SupabaseAdminOperationError("Supabase Storage returned an unreadable bucket list.")
    buckets: list[str] = []
    for entry in payload:
        bucket_id = entry.get("id") if isinstance(entry, dict) else None
        if isinstance(bucket_id, str) and bucket_id and "/" not in bucket_id:
            buckets.append(bucket_id)
    return buckets


def _list_user_paths(url: str, service_role_key: str, bucket: str, user_id: str) -> list[str]:
    collected: list[str] = []
    pending_prefixes = [user_id.strip("/")]
    seen_prefixes: set[str] = set()

    while pending_prefixes:
        prefix = pending_prefixes.pop()
        if not prefix or prefix in seen_prefixes:
            continue
        seen_prefixes.add(prefix)
        offset = 0
        while True:
            payload = _request_json(
                url,
                service_role_key,
                method="POST",
                path=f"/storage/v1/object/list/{parse.quote(bucket, safe='')}",
                body={
                    "prefix": prefix,
                    "limit": 100,
                    "offset": offset,
                    "sortBy": {"column": "name", "order": "asc"},
                },
            )
            if not isinstance(payload, list):
                raise SupabaseAdminOperationError("Supabase Storage returned an unreadable object list.")
            for entry in payload:
                if not isinstance(entry, dict):
                    continue
                name = entry.get("name")
                if not isinstance(name, str) or not name or "/" in name or name in {".", ".."}:
                    continue
                full_path = f"{prefix}/{name}"
                is_folder = entry.get("id") is None and entry.get("metadata") is None
                if is_folder:
                    pending_prefixes.append(full_path)
                else:
                    collected.append(full_path)
            if len(payload) < 100:
                break
            offset += len(payload)

    return sorted(set(collected))


def _request_json(
    base_url: str,
    service_role_key: str,
    *,
    method: str,
    path: str,
    body: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
) -> Any:
    encoded = json.dumps(body).encode("utf-8") if body is not None else None
    admin_request = request.Request(
        f"{base_url}{path}",
        data=encoded,
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Bearer {service_role_key}",
            "apikey": service_role_key,
            **(headers or {}),
        },
        method=method,
    )
    try:
        with request.urlopen(admin_request, timeout=15) as response:
            raw = response.read()
    except error.HTTPError as exc:
        operation_error = SupabaseAdminOperationError(
            f"Supabase administration request failed with HTTP {exc.code}."
        )
        operation_error.status_code = exc.code  # type: ignore[attr-defined]
        raise operation_error from exc
    except error.URLError as exc:
        raise SupabaseAdminOperationError("Supabase administration service is unreachable.") from exc

    if not raw:
        return None
    try:
        return json.loads(raw.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise SupabaseAdminOperationError("Supabase administration service returned unreadable data.") from exc
