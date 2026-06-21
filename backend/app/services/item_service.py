from __future__ import annotations


def calculate_completeness_score(item: dict, documents: list[dict] | None = None) -> int:
    documents = documents or []
    score = 0
    if any(document.get("type") == "RECEIPT" for document in documents):
        score += 25
    if item.get("purchaseDate") and item.get("merchant") and item.get("price") is not None:
        score += 25
    if item.get("manufacturer") and item.get("model"):
        score += 20
    if item.get("serialNumber"):
        score += 20
    if item.get("warrantyUntil"):
        score += 10
    return min(score, 100)


def missing_fields(item: dict, documents: list[dict] | None = None) -> list[str]:
    documents = documents or []
    missing: list[str] = []
    if not any(document.get("type") == "RECEIPT" for document in documents):
        missing.append("receipt")
    if not item.get("serialNumber"):
        missing.append("serial number")
    if not item.get("warrantyUntil"):
        missing.append("warranty date")
    if not item.get("manufacturer") or not item.get("model"):
        missing.append("model data")
    if not item.get("purchaseDate") or not item.get("merchant") or item.get("price") is None:
        missing.append("purchase data")
    return missing
