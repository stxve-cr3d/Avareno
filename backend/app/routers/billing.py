from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.db import db
from app.dependencies import require_authenticated_user
from app.schemas import BillingCheckoutRequest, BillingPortalRequest
from app.services.billing import (
    BillingConfigurationError,
    BillingProviderError,
    BillingValidationError,
    billing_invoices,
    billing_status,
    create_billing_portal,
    create_checkout,
)

router = APIRouter()


@router.get("/status")
def status() -> dict:
    with db() as conn:
        user = require_authenticated_user(conn)
        return billing_status(conn, user)


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
