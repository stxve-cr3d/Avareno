from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from app.services.connectors.security import ConnectorSecurityError, validate_connector_url
from app.utils import now_iso

CompatibilityLevel = str

EXACT_CANONICAL_MODEL_ID = "canon_88_mini_55"


def build_provider_preview(item: dict, user_id: str) -> dict:
    identity = normalize_product_identity(item)
    candidates = _collect_provider_candidates(identity)
    printable_candidates = _collect_printable_candidates(identity)
    offers = _collect_offers(identity)
    resolved_edges = [_create_compatibility_edge(candidate, identity) for candidate in candidates]
    printable_models = [_resolve_printable_model(candidate, identity) for candidate in printable_candidates]

    exact_edges = [edge for edge in resolved_edges if edge["compatibilityLevel"] == "exact_match"]
    possible_edges = [edge for edge in resolved_edges if edge["compatibilityLevel"] in {"family_match", "unverified"}]
    exact_printables = [model for model in printable_models if model["compatibilityLevel"] == "exact_match"]
    possible_printables = [model for model in printable_models if model["compatibilityLevel"] in {"family_match", "unverified"}]

    return {
        "mode": _provider_mode(),
        "userId": user_id,
        "identity": identity,
        "modelConfirmationRequired": not bool(identity.get("canonicalModelId")),
        "providerStatus": _provider_status(),
        "providerCandidates": candidates,
        "printableCandidates": printable_candidates,
        "resolved": {
            "exactCompatible": exact_edges,
            "possibleCompatible": possible_edges,
            "notCompatibleCount": len([edge for edge in resolved_edges if edge["compatibilityLevel"] == "not_compatible"]),
            "exactPrintable": exact_printables,
            "possiblePrintable": possible_printables,
            "notCompatiblePrintableCount": len([model for model in printable_models if model["compatibilityLevel"] == "not_compatible"]),
        },
        "offers": _offers_for_exact_edges(offers, exact_edges),
        "guardrails": [
            "Provider data is raw candidate data only.",
            "Only the Compatibility Resolver may create compatibility decisions.",
            "No fuzzy title match is final proof.",
            "Price data is shown only for exact compatible items.",
            "3D print data must pass exact model and user capability checks before primary recommendation.",
        ],
    }


def normalize_product_identity(item: dict) -> dict:
    product_name = _clean(item.get("productName") or item.get("name")) or "Unknown product"
    brand = _clean(item.get("brand") or item.get("manufacturer")) or ("Canon" if product_name.lower().startswith("canon ") else None)
    model = _clean(item.get("modelName") or item.get("model"))
    model_name, model_number = _split_model(model or product_name)
    serial_number = _clean(item.get("serialNumber"))
    identifiers = {
        "gtin": _clean(item.get("gtin") or item.get("barcode")),
        "ean": _clean(item.get("ean") or item.get("barcode")),
        "upc": _clean(item.get("upc")),
        "mpn": _clean(item.get("mpn")),
        "sku": _clean(item.get("sku")),
        "serialNumber": serial_number,
        "serialPrefix": serial_number[:4] if serial_number else None,
    }

    identity = {
        "id": item.get("id") or _slugify(" ".join(part for part in [brand, product_name, model_name, model_number] if part)),
        "brand": brand,
        "productName": product_name,
        "category": item.get("category"),
        "modelName": model_name or model,
        "modelNumber": model_number,
        "variant": item.get("variant"),
        "generation": item.get("generation"),
        "releaseYear": item.get("releaseYear"),
        "canonicalModelId": None,
        "identifiers": identifiers,
    }
    identity["canonicalModelId"] = get_canonical_model_id(identity)
    return identity


def get_canonical_model_id(identity: dict) -> str | None:
    identifiers = identity.get("identifiers") or {}
    joined = " ".join(
        str(part)
        for part in [identity.get("brand"), identity.get("productName"), identity.get("modelName"), identity.get("modelNumber")]
        if part
    ).lower()
    strong_identifier = identifiers.get("ean") in {"4000000880551", "4549290880557"} or identifiers.get("mpn") == "CAN-88-MINI-55"

    if strong_identifier or ((identity.get("brand") or "").lower() == "canon" and "88 mini" in joined and "55" in joined):
        return EXACT_CANONICAL_MODEL_ID
    if identity.get("brand") and identity.get("modelName") and identity.get("modelNumber"):
        return _slugify(f"{identity['brand']}_{identity['modelName']}_{identity['modelNumber']}")
    return None


def _collect_provider_candidates(identity: dict) -> list[dict]:
    sandbox = _sandbox_candidates("AVARENO_COMPATIBILITY_SANDBOX_URL", identity)
    if sandbox:
        return [_normalize_provider_candidate(candidate) for candidate in sandbox]
    return _mock_provider_candidates()


def _collect_printable_candidates(identity: dict) -> list[dict]:
    sandbox = _sandbox_candidates("AVARENO_PRINTABLE_SANDBOX_URL", identity)
    if sandbox:
        return [_normalize_printable_candidate(candidate) for candidate in sandbox]
    return _mock_printable_candidates()


def _collect_offers(identity: dict) -> list[dict]:
    sandbox = _sandbox_candidates("AVARENO_RETAIL_SANDBOX_URL", identity)
    if sandbox:
        return [_normalize_offer(offer) for offer in sandbox]
    return _mock_offers()


def _sandbox_candidates(env_name: str, identity: dict) -> list[dict]:
    if _provider_mode() != "sandbox":
        return []
    base_url = os.environ.get(env_name)
    if not base_url:
        return []
    query = urllib.parse.urlencode(
        {
            "brand": identity.get("brand") or "",
            "productName": identity.get("productName") or "",
            "modelName": identity.get("modelName") or "",
            "modelNumber": identity.get("modelNumber") or "",
            "canonicalModelId": identity.get("canonicalModelId") or "",
            "ean": (identity.get("identifiers") or {}).get("ean") or "",
            "mpn": (identity.get("identifiers") or {}).get("mpn") or "",
        }
    )
    separator = "&" if "?" in base_url else "?"
    payload = _get_json(f"{base_url}{separator}{query}", _sandbox_headers(env_name))
    if isinstance(payload, dict):
        candidates = payload.get("candidates") or payload.get("items") or payload.get("offers") or payload.get("models") or []
        return candidates if isinstance(candidates, list) else []
    return payload if isinstance(payload, list) else []


def _sandbox_headers(env_name: str) -> dict[str, str]:
    key_name = env_name.replace("_URL", "_KEY")
    headers = {"User-Agent": "Avareno/0.1 provider sandbox"}
    if os.environ.get(key_name):
        headers["Authorization"] = f"Bearer {os.environ[key_name]}"
    return headers


def _get_json(url: str, headers: dict[str, str]) -> Any:
    try:
        safe_url = validate_connector_url(url)
    except ConnectorSecurityError:
        return {}
    request = urllib.request.Request(safe_url, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            return json.loads(response.read().decode("utf-8"))
    except (TimeoutError, urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError):
        return {}


def _create_compatibility_edge(candidate: dict, source_identity: dict) -> dict:
    compatibility_level = _resolve_compatibility(candidate, source_identity)
    source = candidate.get("provider") or "ai_suggested"
    return {
        "id": f"edge_{candidate['id']}",
        "sourceProductId": source_identity["id"],
        "sourceCanonicalModelId": source_identity.get("canonicalModelId"),
        "targetProductId": candidate.get("normalizedTargetProductId"),
        "targetCanonicalModelId": candidate.get("normalizedTargetCanonicalModelId"),
        "relationType": candidate.get("relationType"),
        "compatibilityLevel": compatibility_level,
        "confidence": round(min(1, max(0, candidate.get("rawConfidence", 0.4) * 0.65 + _source_trust_score(source) * 0.35)), 3),
        "source": source,
        "evidenceText": candidate.get("evidenceText"),
        "verifiedAt": now_iso() if compatibility_level in {"exact_match", "not_compatible"} else None,
    }


def _resolve_compatibility(candidate: dict, source_identity: dict) -> CompatibilityLevel:
    if not source_identity.get("canonicalModelId"):
        return "unverified"
    detected_model = str(candidate.get("detectedModel") or "").lower()
    evidence = str(candidate.get("evidenceText") or "").lower()
    target_canonical = candidate.get("normalizedTargetCanonicalModelId")
    exact = (
        target_canonical == source_identity["canonicalModelId"]
        or "canon 88 mini 55" in detected_model
        or "canon 88 mini 55" in evidence
        or source_identity["canonicalModelId"] in evidence
    )

    if target_canonical == "canon_e88" or detected_model == "canon e88":
        return "not_compatible"
    if exact and candidate.get("provider") != "ai_suggested":
        return "exact_match"
    if "canon mini series" in detected_model or "canon 88 series" in detected_model:
        return "family_match"
    return "unverified"


def _resolve_printable_model(candidate: dict, source_identity: dict) -> dict:
    model = dict(candidate)
    if not source_identity.get("canonicalModelId"):
        model["compatibilityLevel"] = "unverified"
        return model
    detected_model = str(candidate.get("detectedModel") or "").lower()
    evidence = str(candidate.get("evidenceText") or "").lower()
    exact_confirmations = int((candidate.get("qualitySignals") or {}).get("exactModelFitConfirmations") or 0)

    if candidate.get("detectedCanonicalModelId") == "canon_e88" or detected_model == "canon e88":
        model["compatibilityLevel"] = "not_compatible"
    elif candidate.get("detectedCanonicalModelId") == source_identity["canonicalModelId"] or "canon 88 mini 55" in evidence or exact_confirmations > 0:
        model["compatibilityLevel"] = "exact_match"
    elif "canon mini series" in detected_model:
        model["compatibilityLevel"] = "family_match"
    else:
        model["compatibilityLevel"] = "unverified"
    return model


def _offers_for_exact_edges(offers: list[dict], exact_edges: list[dict]) -> dict:
    exact_ids = {edge["targetProductId"] for edge in exact_edges}
    grouped: dict[str, list[dict]] = {target_id: [] for target_id in exact_ids}
    for offer in offers:
        target_id = offer.get("targetProductId")
        if target_id in grouped:
            grouped[target_id].append(offer)
    for target_id, values in grouped.items():
        grouped[target_id] = sorted(values, key=lambda offer: _offer_score(offer), reverse=True)
    return grouped


def _offer_score(offer: dict) -> float:
    availability_scores = {"in_stock": 1, "limited": 0.66, "unknown": 0.32, "out_of_stock": 0}
    policy_scores = {"good": 1, "average": 0.65, "poor": 0.25, "unknown": 0.4}
    return round(
        availability_scores.get(offer.get("availability"), 0.32) * 0.35
        + float(offer.get("sellerTrustScore") or 0.5) * 0.35
        + policy_scores.get(offer.get("returnPolicyQuality"), 0.4) * 0.2
        + _source_trust_score(offer.get("source") or "retailer") * 0.1,
        3,
    )


def _provider_status() -> list[dict]:
    rows = [
        ("compatibility", "AVARENO_COMPATIBILITY_SANDBOX_URL"),
        ("retail", "AVARENO_RETAIL_SANDBOX_URL"),
        ("printable", "AVARENO_PRINTABLE_SANDBOX_URL"),
    ]
    return [
        {
            "provider": provider,
            "mode": "sandbox" if _provider_mode() == "sandbox" and os.environ.get(env_name) else "mock",
            "configured": bool(os.environ.get(env_name)),
        }
        for provider, env_name in rows
    ]


def _normalize_provider_candidate(candidate: dict) -> dict:
    return {
        "id": str(candidate.get("id") or _slugify(candidate.get("rawTitle") or candidate.get("title") or "candidate")),
        "provider": candidate.get("provider") or "retailer",
        "rawTitle": candidate.get("rawTitle") or candidate.get("title") or "Unknown candidate",
        "brand": candidate.get("brand"),
        "detectedModel": candidate.get("detectedModel") or candidate.get("model"),
        "detectedIdentifiers": candidate.get("detectedIdentifiers") or {},
        "relationType": candidate.get("relationType") or "accessory",
        "sourceUrl": candidate.get("sourceUrl"),
        "evidenceText": candidate.get("evidenceText") or "Sandbox provider returned this as a raw candidate.",
        "rawConfidence": float(candidate.get("rawConfidence") or candidate.get("confidence") or 0.5),
        "normalizedTargetProductId": candidate.get("normalizedTargetProductId") or _slugify(candidate.get("rawTitle") or candidate.get("title") or "candidate"),
        "normalizedTargetCanonicalModelId": candidate.get("normalizedTargetCanonicalModelId"),
    }


def _normalize_printable_candidate(candidate: dict) -> dict:
    quality = candidate.get("qualitySignals") or {}
    requirements = candidate.get("printRequirements") or {}
    return {
        "id": str(candidate.get("id") or _slugify(candidate.get("title") or "printable")),
        "title": candidate.get("title") or "Printable model",
        "source": candidate.get("source") or "printables",
        "sourceUrl": candidate.get("sourceUrl"),
        "creatorName": candidate.get("creatorName") or "Unknown creator",
        "fileTypes": candidate.get("fileTypes") or ["stl"],
        "license": candidate.get("license") or "unknown",
        "detectedBrand": candidate.get("detectedBrand") or candidate.get("brand"),
        "detectedModel": candidate.get("detectedModel") or candidate.get("model"),
        "detectedCanonicalModelId": candidate.get("detectedCanonicalModelId"),
        "detectedPartType": candidate.get("detectedPartType") or "accessory",
        "compatibilityLevel": candidate.get("compatibilityLevel") or "unverified",
        "evidenceText": candidate.get("evidenceText") or "Sandbox provider returned this as a raw printable candidate.",
        "printRequirements": {
            "technology": requirements.get("technology") or "fdm",
            "materials": requirements.get("materials") or ["PLA"],
            "minBuildVolumeMm": requirements.get("minBuildVolumeMm") or {"x": 80, "y": 70, "z": 35},
            "nozzle": requirements.get("nozzle") or 0.4,
            "layerHeight": requirements.get("layerHeight") or 0.2,
            "supportsRequired": bool(requirements.get("supportsRequired", False)),
            "difficulty": requirements.get("difficulty") or "easy",
            "safetyCategory": requirements.get("safetyCategory") or "non_critical",
        },
        "qualitySignals": {
            "makesCount": int(quality.get("makesCount") or 0),
            "rating": float(quality.get("rating") or 0),
            "downloads": int(quality.get("downloads") or 0),
            "lastUpdated": quality.get("lastUpdated") or now_iso(),
            "hasPhotos": bool(quality.get("hasPhotos", False)),
            "hasAssemblyInstructions": bool(quality.get("hasAssemblyInstructions", False)),
            "userFitConfirmations": int(quality.get("userFitConfirmations") or 0),
            "exactModelFitConfirmations": int(quality.get("exactModelFitConfirmations") or 0),
        },
        "rawConfidence": float(candidate.get("rawConfidence") or candidate.get("confidence") or 0.5),
    }


def _normalize_offer(offer: dict) -> dict:
    return {
        "id": str(offer.get("id") or _slugify(f"{offer.get('retailerName', 'retailer')}_{offer.get('targetProductId', 'part')}")),
        "targetProductId": offer.get("targetProductId"),
        "retailerName": offer.get("retailerName") or "Sandbox retailer",
        "price": float(offer.get("price") or 0),
        "currency": offer.get("currency") or "EUR",
        "availability": offer.get("availability") or "unknown",
        "deliveryEstimate": offer.get("deliveryEstimate"),
        "returnPolicyQuality": offer.get("returnPolicyQuality") or "unknown",
        "sellerTrustScore": float(offer.get("sellerTrustScore") or 0.5),
        "lastCheckedAt": offer.get("lastCheckedAt") or now_iso(),
        "source": offer.get("source") or "retailer",
    }


def _mock_provider_candidates() -> list[dict]:
    return [
        _normalize_provider_candidate(
            {
                "id": "canon_bp_55",
                "provider": "manufacturer",
                "rawTitle": "Canon Battery Pack BP-55",
                "brand": "Canon",
                "detectedModel": "Canon 88 Mini 55",
                "detectedIdentifiers": {"mpn": "BP-55"},
                "relationType": "spare_part",
                "evidenceText": "Listed for Canon 88 Mini 55",
                "rawConfidence": 0.99,
                "normalizedTargetProductId": "canon_bp_55",
                "normalizedTargetCanonicalModelId": EXACT_CANONICAL_MODEL_ID,
            }
        ),
        _normalize_provider_candidate(
            {
                "id": "canon_mini_55_case",
                "provider": "manual",
                "rawTitle": "Canon Mini 55 Carry Case",
                "brand": "Canon",
                "detectedModel": "Canon 88 Mini 55",
                "relationType": "accessory",
                "evidenceText": "Accessory table in Canon 88 Mini 55 manual",
                "rawConfidence": 0.95,
                "normalizedTargetProductId": "canon_mini_55_case",
                "normalizedTargetCanonicalModelId": EXACT_CANONICAL_MODEL_ID,
            }
        ),
        _normalize_provider_candidate(
            {
                "id": "canon_mini_series_strap",
                "provider": "ai_suggested",
                "rawTitle": "Canon Mini Series Universal Strap",
                "brand": "Canon",
                "detectedModel": "Canon Mini Series",
                "relationType": "accessory",
                "evidenceText": "Only product family mentioned",
                "rawConfidence": 0.62,
                "normalizedTargetProductId": "canon_mini_series_strap",
            }
        ),
        _normalize_provider_candidate(
            {
                "id": "canon_e88_battery",
                "provider": "manufacturer",
                "rawTitle": "Canon E88 Battery",
                "brand": "Canon",
                "detectedModel": "Canon E88",
                "relationType": "spare_part",
                "evidenceText": "Different Canon E88 model branch",
                "rawConfidence": 0.98,
                "normalizedTargetProductId": "canon_e88_battery",
                "normalizedTargetCanonicalModelId": "canon_e88",
            }
        ),
    ]


def _mock_printable_candidates() -> list[dict]:
    return [
        _normalize_printable_candidate(
            {
                "id": "canon_88_mini_55_battery_cover",
                "title": "Canon 88 Mini 55 Battery Cover",
                "source": "thingiverse",
                "creatorName": "LensLab",
                "fileTypes": ["stl", "3mf"],
                "license": "CC BY 4.0",
                "detectedModel": "Canon 88 Mini 55",
                "detectedCanonicalModelId": EXACT_CANONICAL_MODEL_ID,
                "detectedPartType": "cover",
                "evidenceText": "Description explicitly states Canon 88 Mini 55",
                "qualitySignals": {"userFitConfirmations": 8, "exactModelFitConfirmations": 6, "rating": 4.7, "downloads": 724, "hasPhotos": True, "hasAssemblyInstructions": True},
            }
        ),
        _normalize_printable_candidate(
            {
                "id": "canon_mini_series_strap_clip",
                "title": "Canon Mini Series Universal Strap Clip",
                "source": "makerworld",
                "creatorName": "ClipWorks",
                "fileTypes": ["3mf"],
                "license": "Standard Digital File License",
                "detectedModel": "Canon Mini Series",
                "detectedPartType": "adapter",
                "evidenceText": "Only Canon Mini Series mentioned",
                "qualitySignals": {"userFitConfirmations": 3, "exactModelFitConfirmations": 0, "rating": 3.8, "downloads": 310, "hasPhotos": True},
            }
        ),
        _normalize_printable_candidate(
            {
                "id": "canon_e88_battery_door",
                "title": "Canon E88 Battery Door",
                "source": "thingiverse",
                "creatorName": "CameraFixer",
                "detectedModel": "Canon E88",
                "detectedCanonicalModelId": "canon_e88",
                "detectedPartType": "cover",
                "evidenceText": "Explicitly for Canon E88, not Canon 88 Mini 55",
                "qualitySignals": {"exactModelFitConfirmations": 0, "rating": 4.1, "downloads": 223},
            }
        ),
    ]


def _mock_offers() -> list[dict]:
    return [
        _normalize_offer({"id": "shop_a_bp55", "targetProductId": "canon_bp_55", "retailerName": "Shop A", "price": 19.9, "availability": "limited", "returnPolicyQuality": "average", "sellerTrustScore": 0.48, "source": "retailer"}),
        _normalize_offer({"id": "shop_b_bp55", "targetProductId": "canon_bp_55", "retailerName": "Shop B", "price": 24.9, "availability": "in_stock", "returnPolicyQuality": "good", "sellerTrustScore": 0.9, "source": "retailer"}),
        _normalize_offer({"id": "canon_store_bp55", "targetProductId": "canon_bp_55", "retailerName": "Official Canon Store", "price": 28.9, "availability": "in_stock", "returnPolicyQuality": "good", "sellerTrustScore": 0.98, "source": "manufacturer"}),
        _normalize_offer({"id": "canon_store_case", "targetProductId": "canon_mini_55_case", "retailerName": "Official Canon Store", "price": 18.9, "availability": "in_stock", "returnPolicyQuality": "good", "sellerTrustScore": 0.95, "source": "manufacturer"}),
    ]


def _source_trust_score(source: str) -> float:
    scores = {
        "manufacturer": 0.98,
        "manual": 0.95,
        "gs1": 0.92,
        "barcode": 0.88,
        "invoice": 0.82,
        "avareno_verified": 0.9,
        "icecat": 0.78,
        "community_confirmed": 0.74,
        "user_confirmed": 0.7,
        "printable_platform": 0.64,
        "retailer": 0.62,
        "ai_suggested": 0.34,
    }
    return scores.get(source, 0.4)


def _provider_mode() -> str:
    return "sandbox" if os.environ.get("AVARENO_PROVIDER_MODE", "mock").lower() == "sandbox" else "mock"


def _split_model(value: str) -> tuple[str | None, str | None]:
    lower = value.lower()
    if "88 mini" in lower and "55" in lower:
        return "88 Mini", "55"
    parts = value.rsplit(" ", 1)
    if len(parts) == 2 and parts[1].isdigit():
        return parts[0], parts[1]
    return value, None


def _clean(value: Any) -> str | None:
    return value.strip() if isinstance(value, str) and value.strip() else None


def _slugify(value: str) -> str:
    return "".join(char.lower() if char.isalnum() else "_" for char in value).strip("_")
