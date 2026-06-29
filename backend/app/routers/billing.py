from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.db import db
from app.dependencies import get_default_user
from app.schemas import BillingCheckoutRequest, BillingPortalRequest
from app.services.billing import (
    BillingConfigurationError,
    BillingProviderError,
    BillingValidationError,
    billing_portal_url,
    billing_status,
    create_checkout,
)

router = APIRouter()


@router.get("/status")
def status() -> dict:
    with db() as conn:
        user = get_default_user(conn)
        return billing_status(conn, user)


@router.post("/checkout")
def checkout(payload: BillingCheckoutRequest) -> dict:
    with db() as conn:
        user = get_default_user(conn)
        try:
            return create_checkout(user, payload.planKey)
        except BillingValidationError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except BillingConfigurationError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except BillingProviderError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/portal")
def portal(_: BillingPortalRequest) -> dict:
    try:
        return {"provider": "paddle", "portalUrl": billing_portal_url()}
    except BillingConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
