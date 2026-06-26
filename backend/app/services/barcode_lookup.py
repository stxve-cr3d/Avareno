from __future__ import annotations

import json
import os
import re
import sqlite3
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from app.db import row_to_dict


def normalize_barcode(value: str) -> str:
    digits = re.sub(r"\D", "", value or "")
    if len(digits) not in {8, 12, 13, 14}:
        raise ValueError("Barcode must be an EAN-8, UPC-A, EAN-13 or GTIN-14 value")
    return digits


def barcode_format(code: str) -> str:
    if len(code) == 8:
        return "EAN_8"
    if len(code) == 12:
        return "UPC_A"
    if len(code) == 13:
        return "EAN_13"
    return "GTIN_14"


def lookup_barcode(conn: sqlite3.Connection, user_id: str, raw_code: str) -> dict:
    code = normalize_barcode(raw_code)
    local_item = row_to_dict(
        conn.execute(
            'SELECT * FROM "Item" WHERE userId = ? AND barcode = ? ORDER BY updatedAt DESC LIMIT 1',
            (user_id, code),
        ).fetchone()
    )
    if local_item:
        return {
            "barcode": code,
            "barcodeFormat": local_item.get("barcodeFormat") or barcode_format(code),
            "status": "LOCAL_MATCH",
            "source": "Avareno",
            "item": local_item,
            "product": _product_from_item(local_item, code),
            "canCreate": False,
        }

    product = _lookup_barcode_lookup_api(code) or _lookup_open_food_facts(code)
    if product:
        return {
            "barcode": code,
            "barcodeFormat": barcode_format(code),
            "status": "FOUND",
            "source": product["sourceName"],
            "product": product,
            "item": None,
            "canCreate": True,
        }

    return {
        "barcode": code,
        "barcodeFormat": barcode_format(code),
        "status": "NOT_FOUND",
        "source": None,
        "product": None,
        "item": None,
        "canCreate": True,
        "message": "No product data found. Create a local Avareno product memory and keep the barcode attached.",
    }


def _product_from_item(item: dict, code: str) -> dict:
    return {
        "barcode": code,
        "barcodeFormat": item.get("barcodeFormat") or barcode_format(code),
        "name": item.get("name"),
        "category": item.get("category"),
        "manufacturer": item.get("manufacturer"),
        "model": item.get("model"),
        "imageUrl": item.get("imageUrl"),
        "sourceName": "Avareno",
        "sourceUrl": f"/items/{item['id']}",
        "confidence": 1,
    }


def _lookup_barcode_lookup_api(code: str) -> dict | None:
    api_key = os.environ.get("BARCODE_LOOKUP_API_KEY")
    if not api_key:
        return None
    url = "https://api.barcodelookup.com/v3/products?" + urllib.parse.urlencode(
        {"barcode": code, "formatted": "y", "key": api_key}
    )
    payload = _get_json(url)
    products = payload.get("products") if isinstance(payload, dict) else None
    if not products:
        return None
    product = products[0]
    images = product.get("images") or []
    return _clean_product(
        {
            "barcode": code,
            "barcodeFormat": barcode_format(code),
            "name": product.get("title") or product.get("product_name"),
            "category": product.get("category"),
            "manufacturer": product.get("brand") or product.get("manufacturer"),
            "model": product.get("model"),
            "imageUrl": images[0] if images else None,
            "sourceName": "Barcode Lookup",
            "sourceUrl": "https://www.barcodelookup.com",
            "confidence": 0.84,
        }
    )


def _lookup_open_food_facts(code: str) -> dict | None:
    fields = ",".join(
        [
            "code",
            "product_name",
            "generic_name",
            "brands",
            "categories",
            "image_front_url",
            "image_url",
            "quantity",
        ]
    )
    url = f"https://world.openfoodfacts.org/api/v2/product/{urllib.parse.quote(code)}.json?fields={fields}"
    payload = _get_json(url)
    if not isinstance(payload, dict) or payload.get("status") != 1:
        return None
    product = payload.get("product") or {}
    name = product.get("product_name") or product.get("generic_name")
    brands = [part.strip() for part in str(product.get("brands") or "").split(",") if part.strip()]
    categories = [part.strip() for part in str(product.get("categories") or "").split(",") if part.strip()]
    return _clean_product(
        {
            "barcode": code,
            "barcodeFormat": barcode_format(code),
            "name": name,
            "category": categories[0] if categories else "Food",
            "manufacturer": brands[0] if brands else None,
            "model": product.get("quantity"),
            "imageUrl": product.get("image_front_url") or product.get("image_url"),
            "sourceName": "Open Food Facts",
            "sourceUrl": f"https://world.openfoodfacts.org/product/{code}",
            "confidence": 0.72,
        }
    )


def _get_json(url: str) -> dict[str, Any]:
    request = urllib.request.Request(url, headers={"User-Agent": "Avareno/0.1 barcode lookup"})
    try:
        with urllib.request.urlopen(request, timeout=4) as response:
            return json.loads(response.read().decode("utf-8"))
    except (TimeoutError, urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError):
        return {}


def _clean_product(product: dict) -> dict | None:
    if not product.get("name"):
        return None
    return product
