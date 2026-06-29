from __future__ import annotations

import hashlib
import hmac
import json
import os
import sqlite3
import time
from dataclasses import dataclass
from typing import Any, Literal
from urllib import error, request

from app.db import row_to_dict
from app.utils import make_id, now_iso

BillingProvider = Literal["paddle", "lemon_squeezy", "stripe"]
PlanKey = Literal["free", "personal", "family"]
SubscriptionStatus = Literal["free", "active", "trialing", "past_due", "paused", "canceled", "incomplete"]

SUPPORTED_PROVIDERS: tuple[BillingProvider, ...] = ("paddle", "lemon_squeezy", "stripe")
ACTIVE_PROVIDER: BillingProvider = "paddle"
WEBHOOK_SIGNATURE_TOLERANCE_SECONDS = 300


class BillingConfigurationError(Exception):
    pass


class BillingProviderError(Exception):
    pass


class BillingValidationError(Exception):
    pass


@dataclass(frozen=True)
class BillingPlan:
    key: PlanKey
    name: str
    price_label: str
    monthly_price_eur: int
    recommended: bool
    available: bool
    checkout_enabled: bool
    cta: str
    note: str
    features: tuple[str, ...]
    item_limit: int
    storage_limit_mb: int

    def to_dict(self) -> dict[str, Any]:
        return {
            "key": self.key,
            "name": self.name,
            "priceLabel": self.price_label,
            "monthlyPriceEur": self.monthly_price_eur,
            "recommended": self.recommended,
            "available": self.available,
            "checkoutEnabled": self.checkout_enabled,
            "cta": self.cta,
            "note": self.note,
            "features": list(self.features),
            "itemLimit": self.item_limit,
            "storageLimitMb": self.storage_limit_mb,
        }


def plan_catalog() -> list[BillingPlan]:
    family_enabled = family_checkout_enabled()
    return [
        BillingPlan(
            key="free",
            name="Free",
            price_label="0 €",
            monthly_price_eur=0,
            recommended=False,
            available=True,
            checkout_enabled=True,
            cta="Kostenlos starten",
            note="Für die ersten Dinge und zum Ausprobieren.",
            features=("Bis zu 10 Dinge", "Begrenzte Belege und Dokumente", "Manuelle Erinnerungen", "Basis-Objektgedächtnis"),
            item_limit=10,
            storage_limit_mb=100,
        ),
        BillingPlan(
            key="personal",
            name="Personal",
            price_label="9 €",
            monthly_price_eur=9,
            recommended=True,
            available=True,
            checkout_enabled=paddle_checkout_configured("personal"),
            cta="Personal wählen",
            note="Für deinen privaten Speicher im Alltag.",
            features=("Großzügige Dinge mit Fair Use", "Belege, Garantien und Handbücher", "Care-Loops und Erinnerungen", "Basis-KI-Extraktion mit Fair Use", "Datenexport und Private Vault Basic"),
            item_limit=1000,
            storage_limit_mb=5000,
        ),
        BillingPlan(
            key="family",
            name="Family",
            price_label="19 €",
            monthly_price_eur=19,
            recommended=False,
            available=family_enabled,
            checkout_enabled=family_enabled and paddle_checkout_configured("family"),
            cta="Family wählen" if family_enabled else "Family vormerken",
            note="Für Haushalte, Familie und gemeinsame Verantwortung.",
            features=("Alles aus Personal", "Mehrere Haushaltsmitglieder", "Geteilte Dinge und Erinnerungen", "Mehr Speicher und mehr KI-Fair-Use", "Erweiterter Private Vault"),
            item_limit=2500,
            storage_limit_mb=15000,
        ),
    ]


def plan_by_key(plan_key: str) -> BillingPlan:
    normalized = plan_key.strip().lower()
    for plan in plan_catalog():
        if plan.key == normalized:
            return plan
    raise BillingValidationError("Unknown plan")


def billing_status(conn: sqlite3.Connection, user: dict[str, Any]) -> dict[str, Any]:
    subscription = get_or_create_subscription(conn, user)
    plan_key = _normalize_plan_key(subscription.get("planKey") or subscription.get("tier"))
    current_plan = plan_by_key(plan_key).to_dict()
    return {
        "provider": ACTIVE_PROVIDER,
        "providerConfigured": paddle_checkout_configured("personal"),
        "familyCheckoutEnabled": family_checkout_enabled(),
        "portalConfigured": bool(os.environ.get("PADDLE_BILLING_PORTAL_URL")),
        "currentPlan": current_plan,
        "subscription": _subscription_view(subscription),
        "plans": [plan.to_dict() for plan in plan_catalog()],
        "legalReviewRequired": True,
        "message": "Billing ist vorbereitet. Paddle muss vor dem öffentlichen Launch rechtlich, steuerlich und technisch geprüft werden.",
    }


def get_or_create_subscription(conn: sqlite3.Connection, user: dict[str, Any]) -> dict[str, Any]:
    existing = row_to_dict(
        conn.execute('SELECT * FROM "PlanSubscription" WHERE userId = ? ORDER BY createdAt ASC LIMIT 1', (user["id"],)).fetchone()
    )
    if existing:
        return existing

    now = now_iso()
    household = conn.execute('SELECT id FROM "Household" WHERE userId = ? ORDER BY createdAt ASC LIMIT 1', (user["id"],)).fetchone()
    subscription_id = make_id()
    conn.execute(
        """INSERT INTO "PlanSubscription"
           (id, userId, householdId, provider, planKey, tier, status, itemLimit, storageLimitMb, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (subscription_id, user["id"], household["id"] if household else None, ACTIVE_PROVIDER, "free", "FREE", "ACTIVE", 10, 100, now, now),
    )
    return row_to_dict(conn.execute('SELECT * FROM "PlanSubscription" WHERE id = ?', (subscription_id,)).fetchone()) or {}


def create_checkout(user: dict[str, Any], plan_key: str) -> dict[str, Any]:
    plan = plan_by_key(plan_key)
    if plan.key == "free":
        return {"planKey": "free", "checkoutUrl": "/signup", "provider": None, "mode": "free"}
    if plan.key == "family" and not family_checkout_enabled():
        raise BillingValidationError("Family is not available yet")
    if not plan.checkout_enabled:
        raise BillingConfigurationError("Paddle checkout is not configured for this plan")

    price_id = paddle_price_id(plan.key)
    api_key = paddle_api_key()
    payload: dict[str, Any] = {
        "items": [{"price_id": price_id, "quantity": 1}],
        "custom_data": {
            "avareno_user_id": user["id"],
            "plan_key": plan.key,
        },
    }
    checkout_success_url = os.environ.get("PADDLE_CHECKOUT_SUCCESS_URL")
    if checkout_success_url:
        payload["checkout"] = {"success_url": checkout_success_url}

    api_request = request.Request(
        paddle_api_url("/transactions"),
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with request.urlopen(api_request, timeout=10) as response:
            body = json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        raise BillingProviderError(f"Paddle checkout failed with HTTP {exc.code}") from exc
    except (error.URLError, json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise BillingProviderError("Paddle checkout is currently unavailable") from exc

    checkout_url = ((body.get("data") or {}).get("checkout") or {}).get("url")
    if not isinstance(checkout_url, str) or not checkout_url.startswith("https://"):
        raise BillingProviderError("Paddle did not return a checkout URL")

    return {"planKey": plan.key, "checkoutUrl": checkout_url, "provider": ACTIVE_PROVIDER, "mode": "checkout"}


def billing_portal_url() -> str:
    portal_url = os.environ.get("PADDLE_BILLING_PORTAL_URL", "").strip()
    if not portal_url:
        raise BillingConfigurationError("Billing portal is not configured yet")
    if not portal_url.startswith("https://"):
        raise BillingConfigurationError("Billing portal URL must use HTTPS")
    return portal_url


def verify_paddle_signature(signature_header: str | None, raw_body: bytes) -> None:
    webhook_secret = os.environ.get("PADDLE_WEBHOOK_SECRET", "").strip()
    if not webhook_secret:
        raise BillingConfigurationError("Paddle webhook secret is not configured")
    if not signature_header:
        raise BillingValidationError("Missing Paddle signature")

    parts = _signature_parts(signature_header)
    timestamp = parts.get("ts")
    received_signature = parts.get("h1")
    if not timestamp or not received_signature:
        raise BillingValidationError("Invalid Paddle signature header")

    try:
        timestamp_number = int(timestamp)
    except ValueError as exc:
        raise BillingValidationError("Invalid Paddle signature timestamp") from exc

    if abs(int(time.time()) - timestamp_number) > WEBHOOK_SIGNATURE_TOLERANCE_SECONDS:
        raise BillingValidationError("Paddle signature timestamp is outside the allowed window")

    signed_payload = timestamp.encode("utf-8") + b":" + raw_body
    expected = hmac.new(webhook_secret.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, received_signature):
        raise BillingValidationError("Invalid Paddle signature")


def record_webhook_event(conn: sqlite3.Connection, payload: dict[str, Any]) -> tuple[str, bool]:
    event_id = str(payload.get("event_id") or payload.get("id") or "")
    event_type = str(payload.get("event_type") or payload.get("type") or "")
    if not event_id or not event_type:
        raise BillingValidationError("Webhook event id/type is missing")

    event_record_id = make_id()
    try:
        conn.execute(
            """INSERT INTO "BillingEvent" (id, provider, eventId, eventType, receivedAt, status)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (event_record_id, ACTIVE_PROVIDER, event_id, event_type, now_iso(), "RECEIVED"),
        )
        return event_record_id, False
    except sqlite3.IntegrityError:
        existing = conn.execute(
            'SELECT id FROM "BillingEvent" WHERE provider = ? AND eventId = ?',
            (ACTIVE_PROVIDER, event_id),
        ).fetchone()
        return (existing["id"] if existing else event_record_id), True


def process_paddle_event(conn: sqlite3.Connection, payload: dict[str, Any]) -> str:
    event_type = str(payload.get("event_type") or payload.get("type") or "")
    data = payload.get("data") if isinstance(payload.get("data"), dict) else {}

    if event_type.startswith("subscription."):
        _upsert_subscription_from_paddle(conn, event_type, data)
        return "PROCESSED"

    if event_type in {"transaction.payment_failed", "transaction.payment_overdue"}:
        subscription_id = _string_value(data, "subscription_id")
        if subscription_id:
            conn.execute(
                """UPDATE "PlanSubscription"
                   SET status = ?, updatedAt = ?
                   WHERE provider = ? AND providerSubscriptionId = ?""",
                ("PAST_DUE", now_iso(), ACTIVE_PROVIDER, subscription_id),
            )
        return "PROCESSED"

    return "IGNORED"


def mark_event_processed(conn: sqlite3.Connection, event_record_id: str, status: str, safe_error: str | None = None) -> None:
    conn.execute(
        """UPDATE "BillingEvent"
           SET processedAt = ?, status = ?, safeError = ?
           WHERE id = ?""",
        (now_iso(), status, _safe_error(safe_error), event_record_id),
    )


def paddle_checkout_configured(plan_key: PlanKey) -> bool:
    if not paddle_api_key_optional():
        return False
    if plan_key == "free":
        return True
    return bool(paddle_price_id_optional(plan_key))


def family_checkout_enabled() -> bool:
    return os.environ.get("AVARENO_FAMILY_BILLING_ENABLED", "").strip().lower() in {"1", "true", "yes", "on"}


def plan_limits(plan_key: str) -> tuple[int, int]:
    plan = plan_by_key(plan_key)
    return plan.item_limit, plan.storage_limit_mb


def paddle_price_id(plan_key: PlanKey) -> str:
    price_id = paddle_price_id_optional(plan_key)
    if price_id:
        return price_id
    raise BillingConfigurationError(f"Paddle price id for {plan_key} is not configured")


def paddle_price_id_optional(plan_key: PlanKey) -> str:
    env_key = {
        "free": "",
        "personal": "PADDLE_PERSONAL_PRICE_ID",
        "family": "PADDLE_FAMILY_PRICE_ID",
    }[plan_key]
    return os.environ.get(env_key, "").strip() if env_key else ""


def paddle_api_key() -> str:
    api_key = paddle_api_key_optional()
    if not api_key:
        raise BillingConfigurationError("Paddle API key is not configured")
    return api_key


def paddle_api_key_optional() -> str:
    return os.environ.get("PADDLE_API_KEY", "").strip()


def paddle_api_url(path: str) -> str:
    environment = os.environ.get("PADDLE_ENVIRONMENT", "sandbox").strip().lower()
    if environment in {"production", "live"}:
        base_url = "https://api.paddle.com"
    elif environment in {"sandbox", "test", ""}:
        base_url = "https://sandbox-api.paddle.com"
    else:
        raise BillingConfigurationError("Paddle environment must be sandbox or production")
    return f"{base_url}{path}"


def _upsert_subscription_from_paddle(conn: sqlite3.Connection, event_type: str, data: dict[str, Any]) -> None:
    provider_subscription_id = _string_value(data, "id")
    provider_customer_id = _string_value(data, "customer_id")
    custom_data = data.get("custom_data") if isinstance(data.get("custom_data"), dict) else {}
    user_id = str(custom_data.get("avareno_user_id") or custom_data.get("user_id") or "").strip()
    if not user_id and provider_subscription_id:
        existing = conn.execute(
            'SELECT userId FROM "PlanSubscription" WHERE provider = ? AND providerSubscriptionId = ?',
            (ACTIVE_PROVIDER, provider_subscription_id),
        ).fetchone()
        user_id = existing["userId"] if existing else ""
    if not user_id:
        return

    plan_key = _plan_key_from_paddle(data)
    item_limit, storage_limit_mb = plan_limits(plan_key)
    status = _subscription_status_from_paddle(event_type, _string_value(data, "status"))
    period = data.get("current_billing_period") if isinstance(data.get("current_billing_period"), dict) else {}
    scheduled_change = data.get("scheduled_change") if isinstance(data.get("scheduled_change"), dict) else {}
    cancel_at_period_end = 1 if scheduled_change and scheduled_change.get("action") == "cancel" else 0
    now = now_iso()

    existing = row_to_dict(
        conn.execute(
            'SELECT * FROM "PlanSubscription" WHERE userId = ? ORDER BY createdAt ASC LIMIT 1',
            (user_id,),
        ).fetchone()
    )
    values = (
        ACTIVE_PROVIDER,
        provider_customer_id,
        provider_subscription_id,
        plan_key,
        plan_key.upper(),
        status,
        item_limit,
        storage_limit_mb,
        _string_value(period, "starts_at"),
        _string_value(period, "ends_at"),
        cancel_at_period_end,
        now,
    )
    if existing:
        conn.execute(
            """UPDATE "PlanSubscription"
               SET provider = ?, providerCustomerId = ?, providerSubscriptionId = ?, planKey = ?, tier = ?, status = ?,
                   itemLimit = ?, storageLimitMb = ?, currentPeriodStart = ?, currentPeriodEnd = ?, cancelAtPeriodEnd = ?, updatedAt = ?
               WHERE id = ?""",
            (*values, existing["id"]),
        )
    else:
        conn.execute(
            """INSERT INTO "PlanSubscription"
               (id, userId, provider, providerCustomerId, providerSubscriptionId, planKey, tier, status, itemLimit, storageLimitMb,
                currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (make_id(), user_id, *values[:-1], now, now),
        )


def _plan_key_from_paddle(data: dict[str, Any]) -> PlanKey:
    custom_data = data.get("custom_data") if isinstance(data.get("custom_data"), dict) else {}
    custom_plan = str(custom_data.get("plan_key") or "").strip().lower()
    if custom_plan in {"free", "personal", "family"}:
        return custom_plan  # type: ignore[return-value]

    price_ids = _paddle_price_ids(data)
    if paddle_price_id_optional("family") in price_ids:
        return "family"
    if paddle_price_id_optional("personal") in price_ids:
        return "personal"
    return "personal"


def _paddle_price_ids(data: dict[str, Any]) -> set[str]:
    values: set[str] = set()
    for item in data.get("items") or []:
        if not isinstance(item, dict):
            continue
        price = item.get("price") if isinstance(item.get("price"), dict) else {}
        price_id = price.get("id") or item.get("price_id")
        if isinstance(price_id, str):
            values.add(price_id)
    return values


def _subscription_status_from_paddle(event_type: str, provider_status: str) -> str:
    if event_type == "subscription.canceled":
        return "CANCELED"
    mapping = {
        "active": "ACTIVE",
        "trialing": "TRIALING",
        "past_due": "PAST_DUE",
        "paused": "PAUSED",
        "canceled": "CANCELED",
    }
    return mapping.get(provider_status.lower(), "INCOMPLETE")


def _normalize_plan_key(value: object) -> PlanKey:
    normalized = str(value or "").strip().lower()
    mapping = {
        "free": "free",
        "personal": "personal",
        "premium": "personal",
        "home": "personal",
        "family": "family",
        "pro": "family",
    }
    return mapping.get(normalized, "free")  # type: ignore[return-value]


def _subscription_view(subscription: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": subscription.get("id"),
        "provider": subscription.get("provider") or ACTIVE_PROVIDER,
        "planKey": _normalize_plan_key(subscription.get("planKey") or subscription.get("tier")),
        "status": subscription.get("status") or "ACTIVE",
        "currentPeriodStart": subscription.get("currentPeriodStart"),
        "currentPeriodEnd": subscription.get("currentPeriodEnd"),
        "cancelAtPeriodEnd": bool(subscription.get("cancelAtPeriodEnd")),
        "itemLimit": subscription.get("itemLimit"),
        "storageLimitMb": subscription.get("storageLimitMb"),
    }


def _signature_parts(header: str) -> dict[str, str]:
    parts: dict[str, str] = {}
    for segment in header.replace(",", ";").split(";"):
        if "=" not in segment:
            continue
        key, value = segment.split("=", 1)
        parts[key.strip()] = value.strip()
    return parts


def _string_value(data: dict[str, Any], key: str) -> str:
    value = data.get(key)
    return value if isinstance(value, str) else ""


def _safe_error(value: str | None) -> str | None:
    if not value:
        return None
    return value[:180]
