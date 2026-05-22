"""Subscription schemas.

Pydantic v2 models for subscription/plan-related request/response payloads.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class PlanResponse(BaseModel):
    """Response schema for a subscription plan."""

    id: str
    name: str
    price: Decimal
    interval: str
    features: list[str]


class CheckoutRequest(BaseModel):
    """Request schema to create a Stripe checkout session."""

    plan_id: str


class CheckoutResponse(BaseModel):
    """Response schema containing the Stripe checkout URL."""

    checkout_url: str


class SubscriptionResponse(BaseModel):
    """Response schema for user subscription data."""

    id: UUID
    plan: str
    status: str
    current_period_end: Optional[datetime] = None
    created_at: datetime
