"""Stripe webhook handler.

Receives raw events from Stripe, validates the signature,
and delegates processing to the payment service.
"""

from __future__ import annotations

from fastapi import APIRouter, Request
from starlette import status

from services.payment_service import handle_webhook

router = APIRouter(tags=["webhooks"])


@router.post("/stripe", status_code=status.HTTP_200_OK)
async def stripe_webhook(
    request: Request,
) -> dict[str, str]:
    """Handle an incoming Stripe webhook event.

    The raw request body is forwarded directly to
    :func:`payment_service.handle_webhook` so that Stripe's
    signature verification can operate on the untouched payload.

    Returns ``200 OK`` with ``{"status": "ok"}`` on success.
    """
    result: dict[str, str] = await handle_webhook(request)
    return result
