from __future__ import annotations

SENSITIVE_VAULT_CATEGORIES = {
    "insurance",
    "identity",
    "payment",
    "health",
    "employment",
    "contract",
    "legal",
    "tax",
    "family",
    "private_correspondence",
}

PRIVATE_VAULT_FOUNDATION_STATUS = {
    "status": "foundation_only",
    "autoAnalysisAllowed": False,
    "requiresExplicitUserAction": True,
    "openSecurityWork": [
        "Re-authentication before sensitive actions",
        "PIN/passkey unlock flow",
        "Stronger encryption architecture",
        "Separate retention and deletion policy",
        "DSFA/DPIA screening before production",
    ],
}


def classify_private_vault_category(category: str) -> dict:
    normalized = category.strip().lower().replace(" ", "_").replace("-", "_")
    return {
        "category": normalized,
        "isSensitiveVaultCategory": normalized in SENSITIVE_VAULT_CATEGORIES,
        "autoAnalysisAllowed": False if normalized in SENSITIVE_VAULT_CATEGORIES else None,
    }

