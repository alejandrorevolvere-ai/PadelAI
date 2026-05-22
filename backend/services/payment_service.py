"""Stripe payment service — checkout sessions and webhook handling."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

import stripe
from fastapi import HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from models.user import Subscription, SubscriptionPlan, SubscriptionStatus, User


async def create_checkout_session(
    db: AsyncSession,
    user_id: UUID,
    plan_id: str,
) -> dict[str, str]:
    """Create a Stripe Checkout Session for the given user and plan.

    1. Map *plan_id* to a Stripe Price ID from ``settings.STRIPE_PRICES``.
    2. Retrieve or create a Stripe Customer for the user.
    3. Create a Stripe Checkout Session with a success/cancel callback.
    4. Return the session URL so the frontend can redirect the user.

    Parameters
    ----------
    db
        Async database session.
    user_id
        UUID of the user initiating checkout.
    plan_id
        Plan slug — one of ``"pro_monthly"``, ``"pro_yearly"``, ``"elite"``.

    Returns
    -------
    dict[str, str]
        ``{"checkout_url": "https://checkout.stripe.com/…"}``.

    Raises
    ------
    HTTPException 400
        If *plan_id* is ``"free"`` (not payable) or unknown.
    HTTPException 404
        If the user does not exist.
    HTTPException 500
        If the Stripe API call fails for any other reason.
    """
    stripe.api_key = settings.STRIPE_SECRET_KEY

    if plan_id == SubscriptionPlan.free.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The free plan cannot be purchased",
        )

    price_id = settings.STRIPE_PRICES.get(plan_id)
    if price_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown or misconfigured plan: {plan_id}",
        )

    # ── Fetch user ────────────────────────────────────────────────────────
    result = await db.execute(select(User).where(User.id == user_id))
    user: User | None = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # ── Stripe Customer (create or reuse) ────────────────────────────────
    customer_id = user.subscription.stripe_customer_id if user.subscription else None
    if customer_id:
        try:
            customer = stripe.Customer.retrieve(customer_id)
        except stripe.StripeError:
            customer = None
    else:
        customer = None

    if customer is None:
        customer = stripe.Customer.create(
            email=user.email,
            name=user.name,
            metadata={"user_id": str(user.id)},
        )
        customer_id = customer.id

        # Persist the customer ID eagerly so webhooks can find it.
        if user.subscription:
            user.subscription.stripe_customer_id = customer_id
            await db.flush()

    # ── Checkout Session ──────────────────────────────────────────────────
    try:
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[
                {
                    "price": price_id,
                    "quantity": 1,
                }
            ],
            mode="subscription",
            success_url=(
                f"{settings.CORS_ORIGINS[0]}/subscription/success"
                "?session_id={CHECKOUT_SESSION_ID}"
            ),
            cancel_url=f"{settings.CORS_ORIGINS[0]}/subscription/cancel",
            metadata={"user_id": str(user.id), "plan_id": plan_id},
        )
    except stripe.StripeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Stripe session creation failed: {exc.user_message or str(exc)}",
        )

    return {"checkout_url": session.url}


async def handle_webhook(request: Request) -> dict[str, str]:
    """Process an incoming Stripe webhook event.

    Verifies the event signature, then handles three event types:

    * ``checkout.session.completed`` — link the Stripe subscription to the
      local ``Subscription`` row and upgrade the plan.
    * ``invoice.paid`` — extend ``current_period_end`` on the subscription.
    * ``customer.subscription.deleted`` — downgrade the subscription to free.

    Parameters
    ----------
    request
        The raw FastAPI ``Request`` object (body accessed via ``await
        request.body()``, headers for signature verification).

    Returns
    -------
    dict[str, str]
        ``{"status": "ok"}`` on success.

    Raises
    ------
    HTTPException 400
        If the signature verification fails or the payload is malformed.
    HTTPException 500
        If the database update fails.
    """
    stripe.api_key = settings.STRIPE_SECRET_KEY

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing Stripe signature header",
        )

    try:
        event: stripe.Event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=sig_header,
            secret=settings.STRIPE_WEBHOOK_SECRET,
        )
    except (ValueError, stripe.SignatureVerificationError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid webhook signature: {exc}",
        )

    event_type: str = event.type
    data_object: dict[str, Any] = event.data.object  # type: ignore[assignment]

    if event_type == "checkout.session.completed":
        await _handle_checkout_completed(data_object)
    elif event_type == "invoice.paid":
        await _handle_invoice_paid(data_object)
    elif event_type == "customer.subscription.deleted":
        await _handle_subscription_deleted(data_object)
    else:
        # Unhandled event types are silently acknowledged.
        pass

    return {"status": "ok"}


# ── Internal webhook handlers ─────────────────────────────────────────────────


async def _handle_checkout_completed(session: dict[str, Any]) -> None:
    """Upgrade the user's subscription after a successful checkout.

    Retrieves the ``Subscription`` row by ``user_id`` from the session
    metadata, assigns the Stripe subscription ID, and sets the plan to
    the one specified in the checkout.
    """
    user_id_str: str | None = session.get("metadata", {}).get("user_id")
    plan_id_str: str | None = session.get("metadata", {}).get("plan_id")
    stripe_sub_id: str | None = session.get("subscription")
    stripe_customer_id: str | None = session.get("customer")

    if not all([user_id_str, plan_id_str, stripe_sub_id]):
        return  # malformed — skip silently; log in production

    async with _get_session() as db:
        user_id = UUID(user_id_str)
        result = await db.execute(
            select(Subscription).where(Subscription.user_id == user_id)
        )
        subscription: Subscription | None = result.scalar_one_or_none()

        if subscription is None:
            return

        # Map plan slug to enum value
        try:
            plan = SubscriptionPlan(plan_id_str)
        except ValueError:
            return  # unknown plan — skip

        subscription.plan = plan
        subscription.stripe_subscription_id = stripe_sub_id
        if stripe_customer_id:
            subscription.stripe_customer_id = stripe_customer_id
        subscription.status = SubscriptionStatus.active

        # Set current_period_end from the subscription object if available
        sub_data = stripe.Subscription.retrieve(stripe_sub_id)
        if sub_data.get("current_period_end"):
            subscription.current_period_end = datetime.fromtimestamp(
                sub_data["current_period_end"], tz=timezone.utc
            )

        await db.flush()
        await db.commit()


async def _handle_invoice_paid(invoice: dict[str, Any]) -> None:
    """Extend the subscription period when an invoice is paid."""
    stripe_sub_id: str | None = invoice.get("subscription")
    if not stripe_sub_id:
        return

    async with _get_session() as db:
        result = await db.execute(
            select(Subscription).where(
                Subscription.stripe_subscription_id == stripe_sub_id
            )
        )
        subscription: Subscription | None = result.scalar_one_or_none()

        if subscription is None:
            return

        subscription.status = SubscriptionStatus.active

        # Fetch updated subscription to get current_period_end
        try:
            sub_data = stripe.Subscription.retrieve(stripe_sub_id)
            if sub_data.get("current_period_end"):
                subscription.current_period_end = datetime.fromtimestamp(
                    sub_data["current_period_end"], tz=timezone.utc
                )
        except stripe.StripeError:
            pass

        await db.flush()
        await db.commit()


async def _handle_subscription_deleted(subscription_data: dict[str, Any]) -> None:
    """Downgrade a subscription to free when the Stripe subscription ends."""
    stripe_sub_id: str | None = subscription_data.get("id")
    if not stripe_sub_id:
        return

    async with _get_session() as db:
        result = await db.execute(
            select(Subscription).where(
                Subscription.stripe_subscription_id == stripe_sub_id
            )
        )
        subscription: Subscription | None = result.scalar_one_or_none()

        if subscription is None:
            return

        subscription.plan = SubscriptionPlan.free
        subscription.stripe_subscription_id = None
        subscription.status = SubscriptionStatus.canceled
        subscription.current_period_end = None

        await db.flush()
        await db.commit()


def _get_session() -> Any:
    """Return a new database session for webhook handlers.

    Webhooks run outside the request-response lifecycle, so they cannot
    use the ``get_db`` dependency. This helper provides an isolated
    session that is always committed on success and rolled back on error.
    """
    from core.database import async_session_factory  # noqa: PLC0415

    return async_session_factory()
