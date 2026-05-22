"""Tests for subscription endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from tests.conftest import auth_headers


@pytest.mark.asyncio
async def test_get_plans(client: AsyncClient) -> None:
    """GET /api/v1/subscriptions/plans returns the available plans."""
    resp = await client.get("/api/v1/subscriptions/plans")
    assert resp.status_code == 200
    data = resp.json()
    # Should be a list with at least "free" plan
    assert isinstance(data, list)
    plan_ids = [p["id"] for p in data]
    assert "free" in plan_ids


@pytest.mark.asyncio
async def test_get_current_subscription(client: AsyncClient) -> None:
    """GET /api/v1/subscriptions/current returns the user's subscription."""
    headers = await auth_headers(client)
    resp = await client.get("/api/v1/subscriptions/current", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "plan" in data
    assert "status" in data
