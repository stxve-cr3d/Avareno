from __future__ import annotations

import json
import sqlite3

from fastapi import HTTPException

from app.db import row_to_dict
from app.utils import now_iso


def _not_found(detail: str) -> HTTPException:
    """Use the same response for missing and inaccessible resources."""
    return HTTPException(status_code=404, detail=detail)


def require_owned_item(conn: sqlite3.Connection, user_id: str, item_id: str) -> dict:
    item = row_to_dict(
        conn.execute(
            'SELECT * FROM "Item" WHERE id = ? AND userId = ?',
            (item_id, user_id),
        ).fetchone()
    )
    if not item:
        raise _not_found("Item not found")
    return item


def require_owned_document(
    conn: sqlite3.Connection,
    user_id: str,
    document_id: str,
    *,
    allow_vault: bool = True,
) -> dict:
    vault_clause = "" if allow_vault else " AND vaultId IS NULL"
    document = row_to_dict(
        conn.execute(
            f'SELECT * FROM "Document" WHERE id = ? AND userId = ?{vault_clause}',
            (document_id, user_id),
        ).fetchone()
    )
    if not document:
        raise _not_found("Document not found")
    return document


def require_owned_household(conn: sqlite3.Connection, user_id: str, household_id: str) -> dict:
    household = row_to_dict(
        conn.execute(
            'SELECT * FROM "Household" WHERE id = ? AND userId = ?',
            (household_id, user_id),
        ).fetchone()
    )
    if not household:
        raise _not_found("Household not found")
    return household


def require_owned_space(
    conn: sqlite3.Connection,
    user_id: str,
    space_id: str,
    *,
    household_id: str | None = None,
) -> dict:
    household_clause = " AND s.householdId = ?" if household_id else ""
    params: list[str] = [space_id, user_id]
    if household_id:
        params.append(household_id)
    space = row_to_dict(
        conn.execute(
            f'''SELECT s.*
                FROM "Space" s
                JOIN "Household" h ON h.id = s.householdId
                WHERE s.id = ? AND h.userId = ?{household_clause}''',
            params,
        ).fetchone()
    )
    if not space:
        raise _not_found("Space not found")
    return space


def require_owned_loop(conn: sqlite3.Connection, user_id: str, loop_id: str) -> dict:
    loop = row_to_dict(
        conn.execute(
            'SELECT * FROM "Loop" WHERE id = ? AND userId = ?',
            (loop_id, user_id),
        ).fetchone()
    )
    if not loop:
        raise _not_found("Loop not found")
    return loop


def require_document_extraction_access(conn: sqlite3.Connection, user_id: str, document_id: str) -> dict:
    """Authorize receipt processing without trusting a client-provided tenant.

    The document owner may process their document. A household owner or active
    editor may process a non-Vault document only when the document, linked item,
    and household form a consistent ownership chain.
    """
    document = row_to_dict(
        conn.execute(
            '''SELECT d.*
               FROM "Document" d
               WHERE d.id = ?
                 AND (
                   d.userId = ?
                   OR (
                     d.vaultId IS NULL
                     AND EXISTS (
                       SELECT 1
                       FROM "Item" i
                       JOIN "Household" h ON h.id = i.householdId
                       WHERE i.id = d.itemId
                         AND i.userId = d.userId
                         AND (
                           h.userId = ?
                           OR EXISTS (
                             SELECT 1
                             FROM "HouseholdMember" hm
                             WHERE hm.householdId = h.id
                               AND hm.userId = ?
                               AND upper(hm.status) = 'ACTIVE'
                               AND upper(hm.role) IN ('OWNER', 'EDITOR')
                           )
                         )
                     )
                   )
                 )''',
            (document_id, user_id, user_id, user_id),
        ).fetchone()
    )
    if not document:
        raise _not_found("Document not found")
    return document


def update_document_extraction(
    conn: sqlite3.Connection,
    user_id: str,
    document_id: str,
    *,
    extracted_text: str,
    extraction_result: dict,
) -> None:
    """Re-apply the same authorization boundary at the final write."""
    cursor = conn.execute(
        '''UPDATE "Document"
           SET extractedText = ?, extractedJson = ?, updatedAt = ?
           WHERE id = ?
             AND (
               userId = ?
               OR (
                 vaultId IS NULL
                 AND EXISTS (
                   SELECT 1
                   FROM "Item" i
                   JOIN "Household" h ON h.id = i.householdId
                   WHERE i.id = "Document".itemId
                     AND i.userId = "Document".userId
                     AND (
                       h.userId = ?
                       OR EXISTS (
                         SELECT 1
                         FROM "HouseholdMember" hm
                         WHERE hm.householdId = h.id
                           AND hm.userId = ?
                           AND upper(hm.status) = 'ACTIVE'
                           AND upper(hm.role) IN ('OWNER', 'EDITOR')
                       )
                     )
                 )
               )
             )''',
        (
            extracted_text,
            json.dumps(extraction_result),
            now_iso(),
            document_id,
            user_id,
            user_id,
            user_id,
        ),
    )
    if cursor.rowcount != 1:
        raise _not_found("Document not found")
