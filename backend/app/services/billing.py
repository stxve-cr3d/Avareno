from __future__ import annotations

import hashlib
import hmac
import json
import os
import sqlite3
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Literal
from urllib import error, parse, request

from app.db import row_to_dict
from app.utils import make_id, now_iso

BillingProvider = Literal["internal", "paddle", "lemon_squeezy", "stripe"]
PlanKey = Literal["free", "personal", "pro", "family"]
BillingInterval = Literal["monthly", "yearly"]

ACTIVE_PROVIDER: BillingProvider = "stripe"
FREE_PROVIDER: BillingProvider = "internal"
WEBHOOK_SIGNATURE_TOLERANCE_SECONDS = 300
STRIPE_API_BASE = "https://api.stripe.com/v1"

ACCESS_BLOCKING_STATUSES = {"CANCELED", "INCOMPLETE_EXPIRED", "PAST_DUE", "UNPAID"}


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
    monthly_price_eur: float
    yearly_price_eur: float
    stripe_lookup_key_monthly: str | None
    stripe_lookup_key_yearly: str | None
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
            "yearlyPriceEur": self.yearly_price_eur,
            "stripeLookupKeys": {
                "monthly": self.stripe_lookup_key_monthly,
                "yearly": self.stripe_lookup_key_yearly,
            },
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
    return [
        BillingPlan(
            key="free",
            name="Free",
            price_label="0 EUR",
            monthly_price_eur=0,
            yearly_price_eur=0,
            stripe_lookup_key_monthly=None,
            stripe_lookup_key_yearly=None,
            recommended=False,
            available=True,
            checkout_enabled=True,
            cta="Kostenlos starten",
            note="Fuer die ersten Objekte und zum Ausprobieren.",
            features=("30 Objekte", "100 MB Dokumentenspeicher", "5 Erinnerungen", "10 AI-Aktionen pro Monat", "1 Vault", "Garantie- und Beleg-Tracking"),
            item_limit=30,
            storage_limit_mb=100,
        ),
        BillingPlan(
            key="personal",
            name="Personal",
            price_label="4,99 EUR",
            monthly_price_eur=4.99,
            yearly_price_eur=49,
            stripe_lookup_key_monthly="avareno_personal_monthly",
            stripe_lookup_key_yearly="avareno_personal_yearly",
            recommended=False,
            available=True,
            checkout_enabled=stripe_checkout_configured("personal"),
            cta="Personal waehlen",
            note="Fuer deinen privaten Speicher im Alltag.",
            features=("300 Objekte", "2 GB Dokumentenspeicher", "100 Erinnerungen", "100 AI-Aktionen pro Monat", "1 Vault", "Basis-Exporte"),
            item_limit=300,
            storage_limit_mb=2048,
        ),
        BillingPlan(
            key="pro",
            name="Pro",
            price_label="8,99 EUR",
            monthly_price_eur=8.99,
            yearly_price_eur=89,
            stripe_lookup_key_monthly="avareno_pro_monthly",
            stripe_lookup_key_yearly="avareno_pro_yearly",
            recommended=True,
            available=True,
            checkout_enabled=stripe_checkout_configured("pro"),
            cta="Pro waehlen",
            note="Fuer groessere Objektgedaechtnisse und mehr AI-Unterstuetzung.",
            features=("2.000 Objekte", "20 GB Dokumentenspeicher", "1.000 Erinnerungen", "500 AI-Aktionen pro Monat", "3 Vaults", "Eigene Felder", "Vollstaendige Exporte"),
            item_limit=2000,
            storage_limit_mb=20480,
        ),
        BillingPlan(
            key="family",
            name="Family",
            price_label="12,99 EUR",
            monthly_price_eur=12.99,
            yearly_price_eur=129,
            stripe_lookup_key_monthly="avareno_family_monthly",
            stripe_lookup_key_yearly="avareno_family_yearly",
            recommended=False,
            available=True,
            checkout_enabled=stripe_checkout_configured("family"),
            cta="Family waehlen",
            note="Fuer Haushalte, Familie und gemeinsame Verantwortung.",
            features=("5.000 Objekte", "50 GB Dokumentenspeicher", "2.500 Erinnerungen", "1.000 AI-Aktionen pro Monat", "5 Vaults", "5 Haushaltsmitglieder", "Geteilte Bereiche"),
            item_limit=5000,
            storage_limit_mb=51200,
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
    return {
        "provider": ACTIVE_PROVIDER,
        "providerConfigured": stripe_checkout_configured("personal"),
        "familyCheckoutEnabled": stripe_checkout_configured("family"),
        "portalConfigured": stripe_portal_configured(),
        "currentPlan": plan_by_key(plan_key).to_dict(),
        "subscription": _subscription_view(subscription),
        "plans": [plan.to_dict() for plan in plan_catalog()],
        "legalReviewRequired": True,
        "message": "Billing is connected to Stripe server-side when STRIPE_SECRET_KEY and price env vars are configured. Legal/tax review is still required before paid launch.",
    }


def billing_invoices(conn: sqlite3.Connection, user: dict[str, Any]) -> list[dict[str, Any]]:
    rows = conn.execute(
        """SELECT * FROM "BillingInvoice"
           WHERE userId = ?
           ORDER BY COALESCE(invoiceCreatedAt, createdAt) DESC
           LIMIT 24""",
        (user["id"],),
    ).fetchall()
    return [_invoice_view(dict(row)) for row in rows]


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
        (subscription_id, user["id"], household["id"] if household else None, FREE_PROVIDER, "free", "FREE", "ACTIVE", 30, 100, now, now),
    )
    return row_to_dict(conn.execute('SELECT * FROM "PlanSubscription" WHERE id = ?', (subscription_id,)).fetchone()) or {}


def create_checkout(
    conn: sqlite3.Connection,
    user: dict[str, Any],
    plan_key: str,
    billing_interval: str,
) -> dict[str, Any]:
    plan = plan_by_key(plan_key)
    interval = _normalize_billing_interval(billing_interval)
    if plan.key == "free":
        raise BillingValidationError("Free is not a Stripe checkout plan")

    price_id = get_stripe_price_id(plan.key, interval)
    customer_id = get_or_create_stripe_customer(conn, user)
    session = stripe_api_post(
        "/checkout/sessions",
        {
            "mode": "subscription",
            "customer": customer_id,
            "client_reference_id": user["id"],
            "locale": stripe_checkout_locale(),
            "billing_address_collection": "auto",
            "line_items[0][price]": price_id,
            "line_items[0][quantity]": "1",
            "success_url": stripe_checkout_success_url(),
            "cancel_url": stripe_checkout_cancel_url(plan.key, interval),
            "custom_text[submit][message]": "Avareno speichert keine Zahlungsdaten. Zahlung, Rechnung und Abo-Verwaltung laufen sicher ueber Stripe.",
            "metadata[userId]": user["id"],
            "metadata[planId]": plan.key,
            "metadata[billingInterval]": interval,
            "subscription_data[metadata][userId]": user["id"],
            "subscription_data[metadata][planId]": plan.key,
            "subscription_data[metadata][billingInterval]": interval,
        },
    )
    checkout_url = session.get("url")
    if not isinstance(checkout_url, str) or not checkout_url.startswith("https://"):
        raise BillingProviderError("Stripe did not return a checkout URL")
    return {"planKey": plan.key, "billingInterval": interval, "checkoutUrl": checkout_url, "provider": ACTIVE_PROVIDER, "mode": "checkout"}


def create_billing_portal(conn: sqlite3.Connection, user: dict[str, Any], return_url: str | None = None) -> dict[str, Any]:
    subscription = get_or_create_subscription(conn, user)
    customer_id = str(subscription.get("providerCustomerId") or "").strip()
    if not customer_id:
        raise BillingValidationError("Stripe customer is not available for this account")
    session = stripe_api_post(
        "/billing_portal/sessions",
        {
            "customer": customer_id,
            "return_url": _safe_return_url(return_url) or stripe_portal_return_url(),
        },
    )
    portal_url = session.get("url")
    if not isinstance(portal_url, str) or not portal_url.startswith("https://"):
        raise BillingProviderError("Stripe did not return a billing portal URL")
    return {"provider": ACTIVE_PROVIDER, "portalUrl": portal_url}


def get_or_create_stripe_customer(conn: sqlite3.Connection, user: dict[str, Any]) -> str:
    subscription = get_or_create_subscription(conn, user)
    existing_customer_id = str(subscription.get("providerCustomerId") or "").strip()
    if existing_customer_id:
        if not _stripe_customer_uses_internal_email(existing_customer_id):
            return existing_customer_id

        # Older sandbox customers may have been created with an internal auth
        # alias. Create a clean customer so Checkout can collect the real email.
        conn.execute(
            """UPDATE "PlanSubscription"
               SET providerCustomerId = NULL, updatedAt = ?
               WHERE id = ?""",
            (now_iso(), subscription["id"]),
        )
    customer_payload = {
        "name": user.get("name") or "",
        "metadata[userId]": user["id"],
    }
    email = _stripe_customer_email(user)
    if email:
        customer_payload["email"] = email

    customer = stripe_api_post(
        "/customers",
        customer_payload,
    )
    customer_id = customer.get("id")
    if not isinstance(customer_id, str) or not customer_id.startswith("cus_"):
        raise BillingProviderError("Stripe did not return a customer id")

    conn.execute(
        """UPDATE "PlanSubscription"
           SET provider = ?, providerCustomerId = ?, updatedAt = ?
           WHERE id = ?""",
        (ACTIVE_PROVIDER, customer_id, now_iso(), subscription["id"]),
    )
    return customer_id


def _stripe_customer_uses_internal_email(customer_id: str) -> bool:
    try:
        customer = stripe_api_get(f"/customers/{parse.quote(customer_id)}")
    except BillingProviderError:
        return False

    email = customer.get("email")
    return isinstance(email, str) and email.strip().lower().endswith("@auth.avareno.local")


def _stripe_customer_email(user: dict[str, Any]) -> str | None:
    email = str(user.get("email") or "").strip().lower()
    if not email or "@" not in email:
        return None
    if email.endswith("@auth.avareno.local"):
        return None
    return email


def verify_stripe_signature(signature_header: str | None, raw_body: bytes) -> None:
    webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "").strip()
    if not webhook_secret:
        raise BillingConfigurationError("Stripe webhook secret is not configured")
    if not signature_header:
        raise BillingValidationError("Missing Stripe signature")

    parts = _signature_parts(signature_header)
    timestamp = parts.get("t")
    signatures = [value for key, value in parts.items() if key == "v1"]
    if not timestamp or not signatures:
        raise BillingValidationError("Invalid Stripe signature header")
    try:
        timestamp_number = int(timestamp)
    except ValueError as exc:
        raise BillingValidationError("Invalid Stripe signature timestamp") from exc
    if abs(int(time.time()) - timestamp_number) > WEBHOOK_SIGNATURE_TOLERANCE_SECONDS:
        raise BillingValidationError("Stripe signature timestamp is outside the allowed window")

    signed_payload = timestamp.encode("utf-8") + b"." + raw_body
    expected = hmac.new(webhook_secret.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()
    if not any(hmac.compare_digest(expected, received) for received in signatures):
        raise BillingValidationError("Invalid Stripe signature")


def record_webhook_event(conn: sqlite3.Connection, payload: dict[str, Any], provider: BillingProvider = ACTIVE_PROVIDER) -> tuple[str, bool]:
    event_id = str(payload.get("event_id") or payload.get("id") or "")
    event_type = str(payload.get("event_type") or payload.get("type") or "")
    if not event_id or not event_type:
        raise BillingValidationError("Webhook event id/type is missing")

    event_record_id = make_id()
    try:
        conn.execute(
            """INSERT INTO "BillingEvent" (id, provider, eventId, eventType, receivedAt, status)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (event_record_id, provider, event_id, event_type, now_iso(), "RECEIVED"),
        )
        return event_record_id, False
    except sqlite3.IntegrityError:
        existing = conn.execute(
            'SELECT id FROM "BillingEvent" WHERE provider = ? AND eventId = ?',
            (provider, event_id),
        ).fetchone()
        return (existing["id"] if existing else event_record_id), True


def process_stripe_event(conn: sqlite3.Connection, payload: dict[str, Any]) -> str:
    event_type = str(payload.get("type") or "")
    data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
    obj = data.get("object") if isinstance(data.get("object"), dict) else {}

    if event_type == "checkout.session.completed":
        _process_checkout_completed(conn, obj)
        return "PROCESSED"
    if event_type in {"customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"}:
        _upsert_subscription_from_stripe_subscription(conn, obj)
        return "PROCESSED"
    if event_type in {"invoice.finalized", "invoice.paid", "invoice.payment_succeeded"}:
        _process_invoice_event(conn, obj, "ACTIVE")
        return "PROCESSED"
    if event_type == "invoice.payment_failed":
        _process_invoice_event(conn, obj, "PAST_DUE")
        return "PROCESSED"
    if event_type in {"invoice.voided", "invoice.marked_uncollectible"}:
        _upsert_billing_invoice(conn, obj)
        return "PROCESSED"
    return "IGNORED"


def mark_event_processed(conn: sqlite3.Connection, event_record_id: str, status: str, safe_error: str | None = None) -> None:
    conn.execute(
        """UPDATE "BillingEvent"
           SET processedAt = ?, status = ?, safeError = ?
           WHERE id = ?""",
        (now_iso(), status, _safe_error(safe_error), event_record_id),
    )


def stripe_checkout_configured(plan_key: PlanKey) -> bool:
    if plan_key == "free":
        return True
    return bool(stripe_api_key_optional() and _stripe_price_id_optional(plan_key, "monthly") and _stripe_price_id_optional(plan_key, "yearly"))


def stripe_portal_configured() -> bool:
    return bool(stripe_api_key_optional())


def get_stripe_price_id(plan_key: PlanKey, interval: BillingInterval) -> str:
    price_id = _stripe_price_id_optional(plan_key, interval)
    if price_id:
        return price_id
    raise BillingConfigurationError(f"Stripe price id for {plan_key}/{interval} is not configured")


def get_plan_by_stripe_price_id(price_id: str) -> tuple[PlanKey, BillingInterval] | None:
    normalized = price_id.strip()
    for plan_key in ("personal", "pro", "family"):
        for interval in ("monthly", "yearly"):
            if _stripe_price_id_optional(plan_key, interval) == normalized:
                return plan_key, interval
    return None


def plan_limits(plan_key: str) -> tuple[int, int]:
    plan = plan_by_key(plan_key)
    return plan.item_limit, plan.storage_limit_mb


def stripe_api_post(path: str, values: dict[str, str]) -> dict[str, Any]:
    return stripe_api_request(path, method="POST", values=values)


def stripe_api_get(path: str) -> dict[str, Any]:
    return stripe_api_request(path, method="GET")


def stripe_api_request(path: str, method: str, values: dict[str, str] | None = None) -> dict[str, Any]:
    api_key = stripe_api_key()
    data = parse.urlencode({key: value for key, value in (values or {}).items() if value is not None}).encode("utf-8") if values is not None else None
    api_request = request.Request(
        f"{STRIPE_API_BASE}{path}",
        data=data,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method=method,
    )
    try:
        with request.urlopen(api_request, timeout=12) as response:
            return json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        safe_message = _stripe_error_message(exc)
        raise BillingProviderError(safe_message or f"Stripe request failed with HTTP {exc.code}") from exc
    except (error.URLError, json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise BillingProviderError("Stripe is currently unavailable") from exc


def stripe_api_key() -> str:
    api_key = stripe_api_key_optional()
    if not api_key:
        raise BillingConfigurationError("Stripe secret key is not configured")
    return api_key


def stripe_api_key_optional() -> str:
    return os.environ.get("STRIPE_SECRET_KEY", "").strip()


def stripe_checkout_locale() -> str:
    locale = os.environ.get("STRIPE_CHECKOUT_LOCALE", "de").strip().lower()
    if locale in {"auto", "de", "en", "fr", "es", "it", "nl"}:
        return locale
    return "de"


def stripe_checkout_success_url() -> str:
    configured = os.environ.get("STRIPE_CHECKOUT_SUCCESS_URL", "").strip()
    if configured:
        return configured
    return f"{_app_origin()}/app/settings/account?billing=success"


def stripe_checkout_cancel_url(plan_key: PlanKey | None = None, interval: BillingInterval | None = None) -> str:
    configured = os.environ.get("STRIPE_CHECKOUT_CANCEL_URL", "").strip()
    if configured:
        return configured
    if plan_key in {"personal", "pro", "family"}:
        selected_interval = interval or "monthly"
        return f"{_app_origin()}/checkout/{plan_key}?interval={selected_interval}&billing=cancelled"
    return f"{_app_origin()}/pricing?billing=cancelled"


def stripe_portal_return_url() -> str:
    configured = os.environ.get("STRIPE_BILLING_PORTAL_RETURN_URL", "").strip()
    if configured:
        return configured
    return f"{_app_origin()}/app/settings/account"


def _process_checkout_completed(conn: sqlite3.Connection, session: dict[str, Any]) -> None:
    subscription_id = _string_value(session, "subscription")
    customer_id = _string_value(session, "customer")
    user_id = _metadata_value(session, "userId") or _string_value(session, "client_reference_id")
    if subscription_id:
        try:
            subscription = stripe_api_get(f"/subscriptions/{parse.quote(subscription_id)}")
            _upsert_subscription_from_stripe_subscription(conn, subscription, user_id=user_id or None, customer_id=customer_id or None)
            return
        except BillingProviderError:
            pass
    plan_key = _metadata_value(session, "planId")
    interval = _metadata_value(session, "billingInterval")
    if user_id and customer_id and plan_key and interval:
        _upsert_subscription_state(
            conn,
            user_id=user_id,
            provider_customer_id=customer_id,
            provider_subscription_id=subscription_id,
            stripe_price_id="",
            plan_key=_normalize_plan_key(plan_key),
            billing_interval=_normalize_billing_interval(interval),
            status="ACTIVE",
            current_period_start="",
            current_period_end="",
            cancel_at_period_end=False,
        )


def _process_invoice_event(conn: sqlite3.Connection, invoice: dict[str, Any], fallback_status: str) -> None:
    _upsert_billing_invoice(conn, invoice)
    subscription_id = _string_value(invoice, "subscription") or _nested_string(invoice, ["parent", "subscription_details", "subscription"])
    if subscription_id:
        try:
            subscription = stripe_api_get(f"/subscriptions/{parse.quote(subscription_id)}")
            _upsert_subscription_from_stripe_subscription(conn, subscription)
            return
        except BillingProviderError:
            pass
        conn.execute(
            """UPDATE "PlanSubscription"
               SET status = ?, planKey = CASE WHEN ? IN ('PAST_DUE', 'UNPAID', 'CANCELED', 'INCOMPLETE_EXPIRED') THEN 'free' ELSE planKey END,
                   itemLimit = CASE WHEN ? IN ('PAST_DUE', 'UNPAID', 'CANCELED', 'INCOMPLETE_EXPIRED') THEN 30 ELSE itemLimit END,
                   storageLimitMb = CASE WHEN ? IN ('PAST_DUE', 'UNPAID', 'CANCELED', 'INCOMPLETE_EXPIRED') THEN 100 ELSE storageLimitMb END,
                   updatedAt = ?
               WHERE provider = ? AND providerSubscriptionId = ?""",
            (fallback_status, fallback_status, fallback_status, fallback_status, now_iso(), ACTIVE_PROVIDER, subscription_id),
        )


def _upsert_billing_invoice(conn: sqlite3.Connection, invoice: dict[str, Any]) -> None:
    provider_invoice_id = _string_value(invoice, "id")
    if not provider_invoice_id:
        return

    provider_customer_id = _string_value(invoice, "customer")
    provider_subscription_id = _string_value(invoice, "subscription") or _nested_string(invoice, ["parent", "subscription_details", "subscription"])
    user_id = _invoice_user_id(conn, invoice, provider_customer_id, provider_subscription_id)
    if not user_id:
        return

    now = now_iso()
    status = (_string_value(invoice, "status") or "unknown").upper()
    transitions = invoice.get("status_transitions") if isinstance(invoice.get("status_transitions"), dict) else {}
    values = (
        user_id,
        ACTIVE_PROVIDER,
        provider_invoice_id,
        provider_customer_id,
        provider_subscription_id,
        _string_value(invoice, "number"),
        status,
        (_string_value(invoice, "currency") or "eur").lower(),
        _integer_value(invoice, "amount_due"),
        _integer_value(invoice, "amount_paid"),
        _integer_value(invoice, "amount_remaining"),
        _unix_to_iso(invoice.get("period_start")),
        _unix_to_iso(invoice.get("period_end")),
        _safe_stripe_url(_string_value(invoice, "hosted_invoice_url")),
        _safe_stripe_url(_string_value(invoice, "invoice_pdf")),
        _unix_to_iso(invoice.get("created")),
        _unix_to_iso(transitions.get("finalized_at")),
        _unix_to_iso(transitions.get("paid_at")),
        now,
    )
    existing = conn.execute(
        'SELECT id FROM "BillingInvoice" WHERE provider = ? AND providerInvoiceId = ?',
        (ACTIVE_PROVIDER, provider_invoice_id),
    ).fetchone()
    if existing:
        conn.execute(
            """UPDATE "BillingInvoice"
               SET userId = ?, provider = ?, providerInvoiceId = ?, providerCustomerId = ?, providerSubscriptionId = ?,
                   invoiceNumber = ?, status = ?, currency = ?, amountDue = ?, amountPaid = ?, amountRemaining = ?,
                   periodStart = ?, periodEnd = ?, hostedInvoiceUrl = ?, invoicePdfUrl = ?, invoiceCreatedAt = ?,
                   finalizedAt = ?, paidAt = ?, updatedAt = ?
               WHERE id = ?""",
            (*values, existing["id"]),
        )
        return

    conn.execute(
        """INSERT INTO "BillingInvoice"
           (id, userId, provider, providerInvoiceId, providerCustomerId, providerSubscriptionId, invoiceNumber, status,
            currency, amountDue, amountPaid, amountRemaining, periodStart, periodEnd, hostedInvoiceUrl, invoicePdfUrl,
            invoiceCreatedAt, finalizedAt, paidAt, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (make_id(), *values, now),
    )


def _invoice_user_id(
    conn: sqlite3.Connection,
    invoice: dict[str, Any],
    provider_customer_id: str,
    provider_subscription_id: str,
) -> str:
    metadata_user_id = _metadata_value(invoice, "userId")
    if metadata_user_id:
        return metadata_user_id

    subscription_details = invoice.get("subscription_details") if isinstance(invoice.get("subscription_details"), dict) else {}
    metadata = subscription_details.get("metadata") if isinstance(subscription_details.get("metadata"), dict) else {}
    subscription_user_id = metadata.get("userId")
    if isinstance(subscription_user_id, str) and subscription_user_id:
        return subscription_user_id

    if provider_subscription_id:
        row = conn.execute(
            'SELECT userId FROM "PlanSubscription" WHERE provider = ? AND providerSubscriptionId = ? ORDER BY createdAt ASC LIMIT 1',
            (ACTIVE_PROVIDER, provider_subscription_id),
        ).fetchone()
        if row:
            return row["userId"]

    if provider_customer_id:
        row = conn.execute(
            'SELECT userId FROM "PlanSubscription" WHERE providerCustomerId = ? ORDER BY createdAt ASC LIMIT 1',
            (provider_customer_id,),
        ).fetchone()
        if row:
            return row["userId"]

    return ""


def _upsert_subscription_from_stripe_subscription(
    conn: sqlite3.Connection,
    subscription: dict[str, Any],
    user_id: str | None = None,
    customer_id: str | None = None,
) -> None:
    provider_subscription_id = _string_value(subscription, "id")
    provider_customer_id = customer_id or _string_value(subscription, "customer")
    metadata_user_id = user_id or _metadata_value(subscription, "userId")
    if not metadata_user_id and provider_customer_id:
        existing = conn.execute(
            'SELECT userId FROM "PlanSubscription" WHERE providerCustomerId = ? ORDER BY createdAt ASC LIMIT 1',
            (provider_customer_id,),
        ).fetchone()
        metadata_user_id = existing["userId"] if existing else ""
    if not metadata_user_id:
        return

    stripe_price_id = _stripe_price_from_subscription(subscription)
    mapped = get_plan_by_stripe_price_id(stripe_price_id) if stripe_price_id else None
    metadata_plan = _metadata_value(subscription, "planId")
    metadata_interval = _metadata_value(subscription, "billingInterval")
    plan_key = mapped[0] if mapped else _normalize_plan_key(metadata_plan)
    billing_interval = mapped[1] if mapped else _normalize_billing_interval(metadata_interval or "monthly")
    status = _subscription_status_from_stripe(_string_value(subscription, "status"))

    _upsert_subscription_state(
        conn,
        user_id=metadata_user_id,
        provider_customer_id=provider_customer_id,
        provider_subscription_id=provider_subscription_id,
        stripe_price_id=stripe_price_id,
        plan_key=plan_key,
        billing_interval=billing_interval,
        status=status,
        current_period_start=_unix_to_iso(subscription.get("current_period_start")),
        current_period_end=_unix_to_iso(subscription.get("current_period_end")),
        cancel_at_period_end=bool(subscription.get("cancel_at_period_end")),
    )


def _upsert_subscription_state(
    conn: sqlite3.Connection,
    *,
    user_id: str,
    provider_customer_id: str,
    provider_subscription_id: str,
    stripe_price_id: str,
    plan_key: PlanKey,
    billing_interval: BillingInterval,
    status: str,
    current_period_start: str,
    current_period_end: str,
    cancel_at_period_end: bool,
) -> None:
    effective_plan_key = "free" if status in ACCESS_BLOCKING_STATUSES else plan_key
    plan = plan_by_key(effective_plan_key)
    existing = row_to_dict(
        conn.execute('SELECT * FROM "PlanSubscription" WHERE userId = ? ORDER BY createdAt ASC LIMIT 1', (user_id,)).fetchone()
    )
    now = now_iso()
    values = (
        ACTIVE_PROVIDER,
        provider_customer_id,
        provider_subscription_id,
        stripe_price_id,
        billing_interval,
        effective_plan_key,
        effective_plan_key.upper(),
        status,
        plan.item_limit,
        plan.storage_limit_mb,
        current_period_start,
        current_period_end,
        1 if cancel_at_period_end else 0,
        now,
    )
    if existing:
        conn.execute(
            """UPDATE "PlanSubscription"
               SET provider = ?, providerCustomerId = ?, providerSubscriptionId = ?, stripePriceId = ?, billingInterval = ?,
                   planKey = ?, tier = ?, status = ?, itemLimit = ?, storageLimitMb = ?, currentPeriodStart = ?,
                   currentPeriodEnd = ?, cancelAtPeriodEnd = ?, updatedAt = ?
               WHERE id = ?""",
            (*values, existing["id"]),
        )
    else:
        conn.execute(
            """INSERT INTO "PlanSubscription"
               (id, userId, provider, providerCustomerId, providerSubscriptionId, stripePriceId, billingInterval, planKey, tier, status,
                itemLimit, storageLimitMb, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (make_id(), user_id, *values[:-1], now, now),
        )


def _stripe_price_from_subscription(subscription: dict[str, Any]) -> str:
    items = subscription.get("items") if isinstance(subscription.get("items"), dict) else {}
    data = items.get("data") if isinstance(items.get("data"), list) else []
    for item in data:
        if not isinstance(item, dict):
            continue
        price = item.get("price") if isinstance(item.get("price"), dict) else {}
        price_id = price.get("id")
        if isinstance(price_id, str):
            return price_id
    return ""


def _stripe_price_id_optional(plan_key: PlanKey, interval: BillingInterval) -> str:
    env_key = {
        ("personal", "monthly"): "STRIPE_PRICE_PERSONAL_MONTHLY",
        ("personal", "yearly"): "STRIPE_PRICE_PERSONAL_YEARLY",
        ("pro", "monthly"): "STRIPE_PRICE_PRO_MONTHLY",
        ("pro", "yearly"): "STRIPE_PRICE_PRO_YEARLY",
        ("family", "monthly"): "STRIPE_PRICE_FAMILY_MONTHLY",
        ("family", "yearly"): "STRIPE_PRICE_FAMILY_YEARLY",
    }.get((plan_key, interval))
    return os.environ.get(env_key, "").strip() if env_key else ""


def _normalize_plan_key(value: object) -> PlanKey:
    normalized = str(value or "").strip().lower()
    mapping: dict[str, PlanKey] = {
        "free": "free",
        "personal": "personal",
        "premium": "personal",
        "home": "personal",
        "pro": "pro",
        "family": "family",
    }
    return mapping.get(normalized, "free")


def _normalize_billing_interval(value: object) -> BillingInterval:
    normalized = str(value or "").strip().lower()
    if normalized not in {"monthly", "yearly"}:
        raise BillingValidationError("Unknown billing interval")
    return normalized  # type: ignore[return-value]


def _subscription_status_from_stripe(provider_status: str) -> str:
    mapping = {
        "active": "ACTIVE",
        "trialing": "TRIALING",
        "past_due": "PAST_DUE",
        "canceled": "CANCELED",
        "incomplete": "INCOMPLETE",
        "incomplete_expired": "INCOMPLETE_EXPIRED",
        "unpaid": "UNPAID",
        "paused": "PAUSED",
    }
    return mapping.get(provider_status.lower(), "INCOMPLETE")


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
        "billingInterval": subscription.get("billingInterval"),
        "stripePriceId": subscription.get("stripePriceId"),
    }


def _invoice_view(invoice: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": invoice.get("id"),
        "provider": invoice.get("provider") or ACTIVE_PROVIDER,
        "providerInvoiceId": invoice.get("providerInvoiceId"),
        "invoiceNumber": invoice.get("invoiceNumber"),
        "status": invoice.get("status"),
        "currency": invoice.get("currency") or "eur",
        "amountDue": invoice.get("amountDue") or 0,
        "amountPaid": invoice.get("amountPaid") or 0,
        "amountRemaining": invoice.get("amountRemaining") or 0,
        "periodStart": invoice.get("periodStart"),
        "periodEnd": invoice.get("periodEnd"),
        "hostedInvoiceUrl": invoice.get("hostedInvoiceUrl"),
        "invoicePdfUrl": invoice.get("invoicePdfUrl"),
        "invoiceCreatedAt": invoice.get("invoiceCreatedAt"),
        "finalizedAt": invoice.get("finalizedAt"),
        "paidAt": invoice.get("paidAt"),
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


def _integer_value(data: dict[str, Any], key: str) -> int:
    value = data.get(key)
    if isinstance(value, bool):
        return 0
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    return 0


def _nested_string(data: dict[str, Any], keys: list[str]) -> str:
    current: Any = data
    for key in keys:
        if not isinstance(current, dict):
            return ""
        current = current.get(key)
    return current if isinstance(current, str) else ""


def _metadata_value(data: dict[str, Any], key: str) -> str:
    metadata = data.get("metadata") if isinstance(data.get("metadata"), dict) else {}
    value = metadata.get(key)
    return value if isinstance(value, str) else ""


def _unix_to_iso(value: object) -> str:
    if not isinstance(value, (int, float)):
        return ""
    return datetime.fromtimestamp(value, tz=timezone.utc).isoformat()


def _safe_stripe_url(value: str) -> str:
    if not value:
        return ""
    parsed = parse.urlparse(value)
    if parsed.scheme != "https":
        return ""
    if not parsed.netloc.endswith("stripe.com") and not parsed.netloc.endswith("stripe.com."):
        return ""
    return value


def _safe_error(value: str | None) -> str | None:
    if not value:
        return None
    return value[:180]


def _stripe_error_message(exc: error.HTTPError) -> str:
    try:
        payload = json.loads(exc.read().decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return ""
    message = ((payload.get("error") or {}) if isinstance(payload, dict) else {}).get("message")
    return str(message)[:180] if message else ""


def _app_origin() -> str:
    return (
        os.environ.get("AVARENO_APP_URL")
        or os.environ.get("APP_URL")
        or os.environ.get("FRONTEND_URL")
        or "http://localhost:5173"
    ).strip().rstrip("/")


def _safe_return_url(value: str | None) -> str | None:
    if not value:
        return None
    parsed = parse.urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None
    return value
