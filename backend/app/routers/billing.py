from __future__ import annotations

import os

from fastapi import APIRouter, Depends, HTTPException

from app.config import beta_features, require_beta_feature
from app.db import db
from app.dependencies import get_default_user, require_authenticated_user
from app.schemas import BillingCheckoutRequest, BillingPortalRequest, DevPlanSetRequest
from app.services.billing import (
    BillingConfigurationError,
    BillingProviderError,
    BillingValidationError,
    billing_invoices,
    billing_status,
    cancel_subscription,
    change_subscription_plan,
    create_billing_portal,
    create_checkout,
    create_embedded_checkout,
    create_elements_checkout,
    create_payment_method_update_session,
    get_or_create_subscription,
    plan_by_key,
    reactivate_subscription,
)
from app.services.entitlements import usage_summary

def _require_billing_enabled() -> None:
    require_beta_feature(beta_features().billing, detail="Billing is disabled for the private beta.")


router = APIRouter(dependencies=[Depends(_require_billing_enabled)])


def _is_production() -> bool:
    return os.environ.get("AVARENO_ENV", os.environ.get("ENV", "")).strip().lower() in {"production", "prod"}


@router.get("/status")
def status() -> dict:
    with db() as conn:
        user = require_authenticated_user(conn)
        return billing_status(conn, user)


@router.get("/usage")
def usage() -> dict:
    with db() as conn:
        user = require_authenticated_user(conn)
        return usage_summary(conn, user)


@router.get("/invoices")
def invoices() -> list[dict]:
    with db() as conn:
        user = require_authenticated_user(conn)
        return billing_invoices(conn, user)


@router.post("/checkout")
def checkout(payload: BillingCheckoutRequest) -> dict:
    with db() as conn:
        user = require_authenticated_user(conn)
        try:
            return create_checkout(conn, user, payload.planKey, payload.billingInterval)
        except BillingValidationError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except BillingConfigurationError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except BillingProviderError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/checkout/embedded")
def embedded_checkout(payload: BillingCheckoutRequest) -> dict:
    with db() as conn:
        user = require_authenticated_user(conn)
        try:
            return create_embedded_checkout(conn, user, payload.planKey, payload.billingInterval)
        except BillingValidationError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except BillingConfigurationError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except BillingProviderError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/checkout/elements")
def elements_checkout(payload: BillingCheckoutRequest) -> dict:
    with db() as conn:
        user = require_authenticated_user(conn)
        try:
            return create_elements_checkout(conn, user, payload.planKey, payload.billingInterval)
        except BillingValidationError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except BillingConfigurationError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except BillingProviderError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/subscription/cancel")
def subscription_cancel() -> dict:
    with db() as conn:
        user = require_authenticated_user(conn)
        try:
            return cancel_subscription(conn, user)
        except BillingValidationError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except BillingConfigurationError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except BillingProviderError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/subscription/reactivate")
def subscription_reactivate() -> dict:
    with db() as conn:
        user = require_authenticated_user(conn)
        try:
            return reactivate_subscription(conn, user)
        except BillingValidationError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except BillingConfigurationError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except BillingProviderError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/subscription/change-plan")
def subscription_change_plan(payload: BillingCheckoutRequest) -> dict:
    with db() as conn:
        user = require_authenticated_user(conn)
        try:
            return change_subscription_plan(conn, user, payload.planKey, payload.billingInterval)
        except BillingValidationError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except BillingConfigurationError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except BillingProviderError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/portal/payment-method")
def portal_payment_method(payload: BillingPortalRequest) -> dict:
    with db() as conn:
        user = require_authenticated_user(conn)
        try:
            return create_payment_method_update_session(conn, user, payload.returnUrl)
        except BillingValidationError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except BillingConfigurationError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except BillingProviderError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc


if not _is_production():
    # Development-only plan switcher. Registered at import time only outside
    # production, so the route does not even exist in a production deployment.
    @router.post("/dev/set-plan")
    def dev_set_plan(payload: DevPlanSetRequest) -> dict:
        if _is_production():  # defense in depth if env changes at runtime
            raise HTTPException(status_code=404, detail="Not found")
        plan_key = payload.planKey.strip().lower()
        try:
            plan = plan_by_key(plan_key)
        except BillingValidationError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        with db() as conn:
            # get_default_user: real auth user when a token is present,
            # local seed user otherwise - both are fine for a dev-only switch.
            user = get_default_user(conn)
            get_or_create_subscription(conn, user)
            conn.execute(
                'UPDATE "PlanSubscription" SET planKey = ?, tier = ?, status = ?, itemLimit = ?, storageLimitMb = ? WHERE userId = ?',
                (plan.key, plan.key.upper(), "ACTIVE", plan.item_limit, plan.storage_limit_mb, user["id"]),
            )
            return {"ok": True, "planKey": plan.key, "usage": usage_summary(conn, user)}


@router.post("/portal")
def portal(payload: BillingPortalRequest) -> dict:
    with db() as conn:
        user = require_authenticated_user(conn)
        try:
            return create_billing_portal(conn, user, payload.returnUrl)
        except BillingValidationError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except BillingConfigurationError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except BillingProviderError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc
