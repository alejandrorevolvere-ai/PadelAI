"""Subscription / billing API routes.

Plan listing, Stripe Checkout session creation, and current
subscription status retrieval.
"""

from __future__ import annotations

from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.deps import get_current_user
from core.database import get_db
from models.user import Subscription, User
from schemas.subscription import (
    CheckoutRequest,
    CheckoutResponse,
    PlanResponse,
    SubscriptionResponse,
)
from services.payment_service import create_checkout_session

router = APIRouter(tags=["subscriptions"])

# ── Hardcoded plan catalogue ────────────────────────────────────────────────

_PLANS: list[PlanResponse] = [
    PlanResponse(
        id="free",
        name="Free",
        price=Decimal("0.00"),
        interval="month",
        features=[
            "5 análisis de vídeo al mes",
            "Repositorio básico de vídeos",
            "Feedback general sobre técnica",
        ],
    ),
    PlanResponse(
        id="pro_monthly",
        name="Pro Monthly",
        price=Decimal("9.99"),
        interval="month",
        features=[
            "Análisis ilimitados de vídeo",
            "Feedback detallado con IA",
            "Comparativa histórica de progreso",
            "Soporte prioritario",
        ],
    ),
    PlanResponse(
        id="pro_yearly",
        name="Pro Yearly",
        price=Decimal("99.99"),
        interval="year",
        features=[
            "Análisis ilimitados de vídeo",
            "Feedback detallado con IA",
            "Comparativa histórica de progreso",
            "Soporte prioritario",
            "2 meses gratis",
        ],
    ),
    PlanResponse(
        id="elite",
        name="Elite",
        price=Decimal("29.99"),
        interval="month",
        features=[
            "Todo lo de Pro",
            "Entrenador personal AI dedicado",
            "Plan de entrenamiento personalizado",
            "Estadísticas avanzadas",
            "Soporte 24/7",
        ],
    ),
]


@router.get("/plans", response_model=list[PlanResponse])
async def list_plans() -> list[PlanResponse]:
    """Return the available subscription plans with prices and features."""
    return _PLANS


@router.post("/create-checkout", response_model=CheckoutResponse)
async def create_checkout(
    body: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    ) -> CheckoutResponse:
    """Create a Stripe Checkout session for the given plan.

    Returns a URL the frontend can redirect to for payment.
    """
    result: dict[str, str] = await create_checkout_session(
        db=db,
        user_id=current_user.id,
        plan_id=body.plan_id,
    )
    return CheckoutResponse(**result)


@router.get("/current", response_model=SubscriptionResponse)
async def get_current_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Subscription:
    """Return the authenticated user's current subscription."""
    result = await db.execute(
        select(Subscription)
        .options(selectinload(Subscription.user))
        .where(Subscription.user_id == current_user.id)
    )
    subscription: Subscription | None = result.scalar_one_or_none()

    # Return a free-plan subscription if no real one exists yet
    if subscription is None:
        from datetime import datetime, timezone

        return Subscription(
            user_id=current_user.id,
            plan="free",
            status="active",
            current_period_end=None,
            created_at=datetime.now(timezone.utc),
        )

    return subscription
