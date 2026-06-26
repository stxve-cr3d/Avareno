from __future__ import annotations


def _has_document_type(documents: list[dict], *types: str) -> bool:
    wanted = {document_type.upper() for document_type in types}
    return any(str(document.get("type", "")).upper() in wanted for document in documents)


def calculate_completeness_score(item: dict, documents: list[dict] | None = None) -> int:
    documents = documents or []
    score = 0
    if _has_document_type(documents, "RECEIPT"):
        score += 20
    if item.get("purchaseDate") and item.get("merchant") and item.get("price") is not None:
        score += 20
    if item.get("manufacturer") and item.get("model"):
        score += 15
    if item.get("serialNumber"):
        score += 15
    if item.get("warrantyUntil"):
        score += 10
    if item.get("manualUrl") or _has_document_type(documents, "MANUAL"):
        score += 10
    if item.get("driverUrl") or item.get("softwareUrl") or _has_document_type(documents, "DRIVER", "SOFTWARE"):
        score += 5
    if item.get("supportUrl") or item.get("supportContact"):
        score += 5
    return min(score, 100)


def missing_fields(item: dict, documents: list[dict] | None = None) -> list[str]:
    documents = documents or []
    missing: list[str] = []
    if not _has_document_type(documents, "RECEIPT"):
        missing.append("receipt")
    if not item.get("serialNumber"):
        missing.append("serial number")
    if not item.get("warrantyUntil"):
        missing.append("warranty date")
    if not item.get("manualUrl") and not _has_document_type(documents, "MANUAL"):
        missing.append("manual")
    if not item.get("driverUrl") and not item.get("softwareUrl") and not _has_document_type(documents, "DRIVER", "SOFTWARE"):
        missing.append("driver/software")
    if not item.get("supportUrl") and not item.get("supportContact"):
        missing.append("support contact")
    if not item.get("manufacturer") or not item.get("model"):
        missing.append("model data")
    if not item.get("purchaseDate") or not item.get("merchant") or item.get("price") is None:
        missing.append("purchase data")
    return missing
