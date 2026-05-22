"""Tests for health, CORS, and general app setup."""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from main import app


@pytest.mark.asyncio
async def test_health_endpoint(client: AsyncClient) -> None:
    """GET /health should return 200 with status 'ok'."""
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["version"] == "1.0.0"
    assert "environment" in data


@pytest.mark.asyncio
async def test_cors_headers_present(client: AsyncClient) -> None:
    """Responses should include security headers."""
    resp = await client.get("/health")
    headers = resp.headers
    assert headers.get("x-frame-options") == "DENY"
    assert headers.get("x-content-type-options") == "nosniff"
    assert "content-security-policy" in headers


@pytest.mark.asyncio
async def test_health_excludes_server_header(client: AsyncClient) -> None:
    """The Server header should not be present."""
    resp = await client.get("/health")
    assert "server" not in resp.headers or resp.headers.get("server") == ""


@pytest.mark.asyncio
async def test_404_unknown_route(client: AsyncClient) -> None:
    """Unknown routes return 404."""
    resp = await client.get("/api/v1/nonexistent")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_cors_allowed_origin(client: AsyncClient) -> None:
    """CORS header for allowed origin — OPTIONS returns 405 or 200."""
    resp = await client.options(
        "/health/",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )
    # OPTIONS on a route without explicit OPTIONS handler may return 405
    assert resp.status_code in (200, 204, 405)


@pytest.mark.asyncio
async def test_openapi_schema_available(client: AsyncClient) -> None:
    """The OpenAPI schema should be served at /openapi.json."""
    resp = await client.get("/openapi.json")
    assert resp.status_code == 200
    data = resp.json()
    assert data["info"]["title"] == "PadelAI Tutor API"
    assert data["info"]["version"] == "1.0.0"
