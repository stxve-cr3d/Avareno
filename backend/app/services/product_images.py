from __future__ import annotations


def suggest_product_image(item: dict) -> dict | None:
    """Suggest a product image for an item.

    No real image lookup service is integrated yet. The earlier implementation
    shipped a hardcoded LG-OLED demo image, which leaked mock data into real
    user flows — removed for the focused Avareno beta. A future integration
    (manufacturer APIs, barcode databases) can return
    ``{"imageUrl": ..., "sourceName": ..., "sourceUrl": ...}`` here.
    """
    del item  # unused until a real lookup service exists
    return None
