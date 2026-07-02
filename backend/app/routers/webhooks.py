from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException, Request

from app.db import db
from app.services.billing import (
    ACTIVE_PROVIDER,
    BillingConfigurationError,
    BillingProviderError,
    BillingValidationError,
    mark_event_processed,
    process_stripe_event,
    record_webhook_event,
    verify_stripe_signature,
)

router = APIRouter()


@router.post("/stripe")
async def stripe_webhook(request: Request) -> dict:
    raw_body = await request.body()
    try:
        verify_stripe_signature(request.headers.get("Stripe-Signature"), raw_body)
    except BillingConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except BillingValidationError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise HTTPException(status_code=400, detail="Webhook payload is not valid JSON") from exc

    with db() as conn:
        try:
            event_record_id, duplicate = record_webhook_event(conn, payload, ACTIVE_PROVIDER)
            if duplicate:
                return {"ok": True, "status": "duplicate"}

            status = process_stripe_event(conn, payload)
            mark_event_processed(conn, event_record_id, status)
            return {"ok": True, "status": status.lower()}
        except BillingValidationError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except BillingProviderError as exc:
            if "event_record_id" in locals():
                mark_event_processed(conn, event_record_id, "FAILED", str(exc))
            raise HTTPException(status_code=422, detail="Webhook could not be processed safely") from exc

