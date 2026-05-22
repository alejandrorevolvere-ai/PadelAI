"""Tests for user profile endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from tests.conftest import auth_headers, register_user


@pytest.mark.asyncio
async def test_get_me(client: AsyncClient) -> None:
    """GET /api/v1/users/me returns the current user profile."""
    headers = await auth_headers(client)
    resp = await client.get("/api/v1/users/me", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "test@example.com"
    assert data["name"] == "Test User"
    assert "id" in data
    assert "created_at" in data


@pytest.mark.asyncio
async def test_update_me(client: AsyncClient) -> None:
    """PATCH /api/v1/users/me updates user fields."""
    headers = await auth_headers(client)
    resp = await client.patch(
        "/api/v1/users/me",
        headers=headers,
        json={"name": "Updated Name"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Updated Name"


@pytest.mark.asyncio
async def test_get_me_unauthorized(client: AsyncClient) -> None:
    """GET /api/v1/users/me without token returns 401."""
    resp = await client.get("/api/v1/users/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_me_invalid_token(client: AsyncClient) -> None:
    """GET /api/v1/users/me with bad token returns 401."""
    resp = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": "Bearer invalidtoken123"},
    )
    assert resp.status_code == 401
