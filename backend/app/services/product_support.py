from __future__ import annotations

import re
from urllib.parse import quote_plus


SAMSUNG_DE_SUPPORT = "https://www.samsung.com/de/support"


def _clean(value: str | None) -> str:
    return (value or "").strip()


def _compact_model(value: str | None) -> str:
    return re.sub(r"[^A-Za-z0-9]", "", _clean(value)).upper()


def _looks_like_samsung_de_model(model: str) -> bool:
    if not model:
        return False
    # German Samsung TV model codes commonly end in XZG and include the size/model family.
    return model.endswith("XZG") and bool(re.match(r"^(GQ|GU|QE|UE|QN|HG)\d{2}[A-Z0-9]+XZG$", model))


def _brand_from_item(item: dict) -> str:
    text = " ".join(str(item.get(key) or "") for key in ["manufacturer", "name", "model"])
    if "samsung" in text.lower():
        return "Samsung"
    return _clean(item.get("manufacturer"))


def _support_link(field: str, label: str, url: str, reason: str, confidence: float) -> dict:
    return {
        "field": field,
        "label": label,
        "url": url,
        "sourceName": "Samsung Support Deutschland",
        "sourceUrl": url,
        "confidence": confidence,
        "reason": reason,
    }


def build_product_support_suggestion(item: dict) -> dict:
    """Return official product support link suggestions without calling third parties.

    The resolver is intentionally conservative. It creates deterministic official
    URLs where the provider has stable model-support routes and otherwise returns
    provider guidance instead of scraping or sending serial numbers externally.
    """

    brand = _brand_from_item(item)
    model = _compact_model(item.get("model"))
    serial_present = bool(_clean(item.get("serialNumber")))
    provider_plan = [
        {
            "provider": "Samsung",
            "identifier": "model_name",
            "status": "supported_static_route",
            "purpose": "Manuals, firmware/software and support links from the official model support page.",
            "privacy": "Avareno can build the official URL locally; no serial number is needed.",
        },
        {
            "provider": "Dell TechDirect",
            "identifier": "service_tag",
            "status": "provider_api_required",
            "purpose": "Warranty and support metadata for Dell assets.",
            "privacy": "Requires explicit user action before a service tag is sent to Dell.",
        },
        {
            "provider": "HP Warranty API",
            "identifier": "serial_number",
            "status": "provider_api_required",
            "purpose": "Warranty metadata for supported HP devices.",
            "privacy": "Requires explicit user action before a serial number is sent to HP.",
        },
        {
            "provider": "Lenovo Warranty API",
            "identifier": "serial_number_or_machine_type",
            "status": "partner_access_required",
            "purpose": "Warranty metadata for Lenovo assets where API credentials exist.",
            "privacy": "Requires explicit user action and documented Lenovo credentials.",
        },
        {
            "provider": "GS1",
            "identifier": "gtin_ean_upc",
            "status": "optional_lookup_provider",
            "purpose": "Brand/product identity verification from barcode data, not manuals or drivers.",
            "privacy": "Requires explicit user action before barcode data is sent to GS1 or another catalog provider.",
        },
        {
            "provider": "Search API fallback",
            "identifier": "brand_model",
            "status": "future_review_required",
            "purpose": "Find official manufacturer pages when no direct provider route exists.",
            "privacy": "Needs provider review; queries can reveal owned products.",
        },
    ]

    suggestion = {
        "provider": brand or "unknown",
        "model": model or _clean(item.get("model")),
        "serialNumberUsed": False,
        "confidence": 0.0,
        "links": [],
        "supportContact": None,
        "privacyNote": "Vorschlag nutzt nur gespeicherte Produktdaten. Seriennummern werden in dieser MVP-Version nicht an Hersteller oder Suchanbieter gesendet.",
        "providerPlan": provider_plan,
    }

    if brand == "Samsung" and _looks_like_samsung_de_model(model):
        support_url = f"{SAMSUNG_DE_SUPPORT}/model/{quote_plus(model)}/"
        links = [
            _support_link(
                "manualUrl",
                "Handbuch",
                support_url,
                "Offizielle Samsung Modellseite mit Handbuchbereich.",
                0.94,
            ),
            _support_link(
                "driverUrl",
                "Treiber/Firmware",
                support_url,
                "Samsung TV-Firmware und Upgrade-Dateien liegen auf der Modell-Supportseite.",
                0.9,
            ),
            _support_link(
                "softwareUrl",
                "Software/Firmware",
                support_url,
                "Offizielle Samsung Modellseite mit Software- und Firmwarebereich.",
                0.92,
            ),
            _support_link(
                "supportUrl",
                "Support",
                support_url,
                "Offizielle Samsung Supportseite fuer diesen Modellcode.",
                0.94,
            ),
        ]
        suggestion.update(
            {
                "provider": "Samsung",
                "confidence": 0.93,
                "links": links,
                "supportContact": "Samsung Support Deutschland",
            }
        )
        return suggestion

    if brand == "Samsung":
        fallback_url = f"{SAMSUNG_DE_SUPPORT}/downloads/?search={quote_plus(model)}" if model else f"{SAMSUNG_DE_SUPPORT}/downloads/"
        suggestion.update(
            {
                "provider": "Samsung",
                "confidence": 0.45 if model else 0.25,
                "links": [
                    _support_link(
                        "supportUrl",
                        "Samsung Supportsuche",
                        fallback_url,
                        "Kein sicherer deutscher Modellrouten-Treffer; Supportsuche vor dem Speichern pruefen.",
                        0.45,
                    )
                ],
                "supportContact": "Samsung Support Deutschland",
            }
        )
        return suggestion

    if serial_present:
        suggestion["privacyNote"] = (
            "Seriennummer ist gespeichert, wird hier aber nicht extern verwendet. "
            "Hersteller-APIs fuer Garantie oder exakte Geraeteidentitaet brauchen vor Produktion eine separate Datenschutz- und Providerpruefung."
        )
    return suggestion
