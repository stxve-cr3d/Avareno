from __future__ import annotations


LG_C3_IMAGE_URL = (
    "https://media.us.lg.com/transform/ecomm-PDPGalleryThumbnail-350x350/"
    "b7a77420-3fb6-4ca9-9b00-552b20956548/"
    "Tvs_OLED65C3PUA_gallery-01_5000x5000?io=transform%3Afill%2Cwidth%3A700"
)


def suggest_product_image(item: dict) -> dict | None:
    manufacturer = (item.get("manufacturer") or "").lower()
    model = (item.get("model") or "").lower()
    name = (item.get("name") or "").lower()

    if manufacturer == "lg" and ("oled65c3" in model or "oled c3" in name or "oled65c3" in name):
        return {
            "imageUrl": LG_C3_IMAGE_URL,
            "sourceName": "LG official product page",
            "sourceUrl": "https://www.lg.com/us/tvs/lg-oled65c3pua-oled-4k-tv",
        }

    return None
