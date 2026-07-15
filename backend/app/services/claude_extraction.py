from __future__ import annotations

import base64
import json
import os
from datetime import datetime, timezone
from typing import Any

# Claude-powered receipt extraction. Replaces mock_extract_receipt when
# ANTHROPIC_API_KEY is set; extract.py falls back to the mock otherwise so
# local dev and tests stay deterministic without a key.
#
# Privacy contract (see ai_data_handling.py): only the single user-selected
# document or pasted text is sent — never secrets, unrelated records, or
# Private Vault documents (ensure_document_can_be_analyzed gates those).

EXTRACTION_MODEL = os.environ.get("AVARENO_EXTRACTION_MODEL", "claude-haiku-4-5")

IMAGE_MEDIA_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
PDF_MEDIA_TYPE = "application/pdf"
MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_PDF_BYTES = 20 * 1024 * 1024
MAX_TEXT_CHARS = 8000

# Strict schema for structured outputs: every field required,
# additionalProperties false. Unknown strings come back as "", unknown price
# as 0 — mirrors the shape the frontend ExtractedReceipt type expects.
RECEIPT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "merchant": {"type": "string", "description": "Händler/Verkäufer, z.B. MediaMarkt. Leer wenn unbekannt."},
        "purchaseDate": {"type": "string", "description": "Kaufdatum als ISO 8601 (YYYY-MM-DD). Leer wenn unbekannt."},
        "itemName": {"type": "string", "description": "Kaufgegenstand, prägnant (Hersteller + Modell + ggf. Zusatz)."},
        "category": {"type": "string", "description": "Kategorie, z.B. TV, Waschmaschine, Möbel, Werkzeug."},
        "manufacturer": {"type": "string", "description": "Hersteller/Marke. Leer wenn unbekannt."},
        "model": {"type": "string", "description": "Modellbezeichnung/-nummer. Leer wenn unbekannt."},
        "price": {"type": "number", "description": "Gesamtpreis des Hauptartikels als Zahl. 0 wenn unbekannt."},
        "currency": {"type": "string", "description": "ISO-Währungscode, z.B. EUR."},
        "warrantyUntil": {"type": "string", "description": "Garantie-Enddatum ISO 8601. Falls nicht auf dem Beleg: Kaufdatum + 2 Jahre (gesetzliche Gewährleistung). Leer wenn kein Kaufdatum."},
        "extractedText": {"type": "string", "description": "Vollständige Transkription des Belegtexts."},
        "confidence": {"type": "number", "description": "Eigene Einschätzung der Extraktionsqualität, 0 bis 1."},
    },
    "required": [
        "merchant",
        "purchaseDate",
        "itemName",
        "category",
        "manufacturer",
        "model",
        "price",
        "currency",
        "warrantyUntil",
        "extractedText",
        "confidence",
    ],
    "additionalProperties": False,
}


class ExtractionError(Exception):
    """User-presentable extraction failure (German message)."""


def extraction_configured() -> bool:
    return bool(os.environ.get("ANTHROPIC_API_KEY"))


_client = None


def _get_client():
    # Lazy import/construction: the anthropic dependency and key are only
    # needed once a real extraction runs.
    global _client
    if _client is None:
        import anthropic

        _client = anthropic.Anthropic()
    return _client


def _prompt(file_name: str | None) -> str:
    today = datetime.now(timezone.utc).date().isoformat()
    hint = f' Der Dateiname lautet "{file_name}".' if file_name else ""
    return (
        "Du extrahierst Kaufbeleg-Daten für eine Haushalts-Inventar-App. "
        f"Heute ist {today}. Lies den Beleg (meist deutsch) und fülle das Schema. "
        "Regeln: Datumsformat YYYY-MM-DD. warrantyUntil nur vom Beleg übernehmen; "
        "falls dort keine Garantie steht, Kaufdatum plus 2 Jahre eintragen. "
        "Unbekannte Textfelder leer lassen, unbekannten Preis als 0. "
        "Bei mehreren Positionen den teuersten/wichtigsten Artikel als Hauptartikel nehmen. "
        "extractedText ist die vollständige Transkription."
        + hint
    )


def _content_blocks(
    file_bytes: bytes | None,
    media_type: str | None,
    text: str | None,
    file_name: str | None,
) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []

    if file_bytes:
        normalized = (media_type or "").lower().split(";")[0].strip()
        encoded = base64.standard_b64encode(file_bytes).decode("ascii")
        if normalized in IMAGE_MEDIA_TYPES:
            if len(file_bytes) > MAX_IMAGE_BYTES:
                raise ExtractionError("Das Bild ist zu groß (max. 5 MB). Bitte ein kleineres Foto verwenden.")
            blocks.append({
                "type": "image",
                "source": {"type": "base64", "media_type": normalized, "data": encoded},
            })
        elif normalized == PDF_MEDIA_TYPE:
            if len(file_bytes) > MAX_PDF_BYTES:
                raise ExtractionError("Das PDF ist zu groß (max. 20 MB).")
            blocks.append({
                "type": "document",
                "source": {"type": "base64", "media_type": PDF_MEDIA_TYPE, "data": encoded},
            })
        else:
            raise ExtractionError("Dateiformat wird nicht unterstützt. Bitte JPG, PNG, WebP oder PDF hochladen.")

    prompt = _prompt(file_name)
    if text and text.strip():
        prompt += "\n\nVom Nutzer eingefügter Belegtext:\n" + text.strip()[:MAX_TEXT_CHARS]
    blocks.append({"type": "text", "text": prompt})
    return blocks


def extract_receipt_with_claude(
    *,
    file_bytes: bytes | None = None,
    media_type: str | None = None,
    text: str | None = None,
    file_name: str | None = None,
) -> dict[str, Any]:
    """Returns the ExtractedReceipt fields plus a model-reported confidence.

    Raises ExtractionError with a German, user-presentable message on failure.
    """
    if not file_bytes and not (text and text.strip()):
        raise ExtractionError("Kein Beleg übergeben. Bitte Datei hochladen oder Text einfügen.")

    import anthropic

    try:
        response = _get_client().messages.create(
            model=EXTRACTION_MODEL,
            max_tokens=4096,
            output_config={"format": {"type": "json_schema", "schema": RECEIPT_SCHEMA}},
            messages=[{"role": "user", "content": _content_blocks(file_bytes, media_type, text, file_name)}],
        )
    except anthropic.RateLimitError as exc:
        raise ExtractionError("Auslese-Dienst ist gerade ausgelastet. Bitte in einer Minute erneut versuchen.") from exc
    except anthropic.APIStatusError as exc:
        raise ExtractionError(f"Auslesen fehlgeschlagen (Dienst-Fehler {exc.status_code}). Bitte erneut versuchen.") from exc
    except anthropic.APIConnectionError as exc:
        raise ExtractionError("Auslese-Dienst nicht erreichbar. Bitte später erneut versuchen.") from exc

    if response.stop_reason == "max_tokens":
        raise ExtractionError("Der Beleg ist zu umfangreich für das Auslesen. Bitte einen Ausschnitt verwenden.")
    if response.stop_reason == "refusal":
        raise ExtractionError("Dieses Dokument kann nicht automatisch ausgelesen werden.")

    text_block = next((block for block in response.content if block.type == "text"), None)
    if text_block is None:
        raise ExtractionError("Auslesen lieferte kein Ergebnis. Bitte erneut versuchen.")

    try:
        data = json.loads(text_block.text)
    except json.JSONDecodeError as exc:
        raise ExtractionError("Auslese-Ergebnis war unlesbar. Bitte erneut versuchen.") from exc

    confidence = data.pop("confidence", 0.5)
    if not isinstance(confidence, (int, float)):
        confidence = 0.5
    data["price"] = data.get("price") or 0
    return {"fields": data, "confidence": max(0.0, min(1.0, float(confidence)))}
