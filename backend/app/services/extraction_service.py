from __future__ import annotations

from datetime import datetime, timezone


def _add_years(value: datetime, years: int) -> datetime:
    return value.replace(year=value.year + years)


def mock_extract_receipt(file_name: str | None = None, text: str | None = None) -> dict:
    # Keep this mock narrow. Real AI/OCR must never receive secrets, unrelated
    # user records, or Private Vault documents automatically.
    raw = f"{file_name or ''} {text or ''}".lower()
    today = datetime.now(timezone.utc).replace(hour=12, minute=0, second=0, microsecond=0)

    merchant = "MediaMarkt" if "mediamarkt" in raw else "Saturn" if "saturn" in raw else "Unknown"

    if "lg" in raw:
        return {
            "merchant": merchant,
            "purchaseDate": today.isoformat(),
            "itemName": "LG OLED C3 Wohnzimmer",
            "category": "TV",
            "manufacturer": "LG",
            "model": "OLED65C3",
            "price": 1499,
            "currency": "EUR",
            "warrantyUntil": _add_years(today, 2).isoformat(),
            "extractedText": "Mock OCR: MediaMarkt LG OLED C3 receipt, 1499 EUR.",
        }

    if "samsung" in raw:
        return {
            "merchant": merchant,
            "purchaseDate": today.isoformat(),
            "itemName": "Samsung QLED TV",
            "category": "TV",
            "manufacturer": "Samsung",
            "model": "QE55Q80C",
            "price": 899,
            "currency": "EUR",
            "warrantyUntil": _add_years(today, 2).isoformat(),
            "extractedText": "Mock OCR: Samsung QLED receipt, 899 EUR.",
        }

    return {
        "merchant": merchant,
        "purchaseDate": today.isoformat(),
        "itemName": "Living Room TV",
        "category": "TV",
        "manufacturer": "Unknown",
        "model": "Unknown",
        "price": 0,
        "currency": "EUR",
        "warrantyUntil": _add_years(today, 2).isoformat(),
        "extractedText": "Mock OCR: generic receipt data. TODO: replace with OCR plus OpenAI Vision.",
    }
