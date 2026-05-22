"""Shared pytest fixtures for the PadelAI Tutor backend."""

from __future__ import annotations

import asyncio
import os
from collections.abc import AsyncGenerator
from typing import Any

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

# ── Set test DB env BEFORE any app import ───────────────────────────────────

TEST_DB = "padel_ai_test.db"
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///./{TEST_DB}"

# ── Now import app (reads DATABASE_URL from env) ──────────────────────────

from core.database import Base, async_engine, async_session_factory, get_db  # noqa: E402
from main import app  # noqa: E402

# ── Bump rate limits for testing (prevent 429 across tests) ────────────────
from core.security_middleware import _auth_limiter, _general_limiter  # noqa: E402

_auth_limiter._max = 1000
_general_limiter._max = 10000


@pytest_asyncio.fixture(scope="session")
def event_loop():
    """Create a single event loop per test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


async def _override_get_db() -> AsyncGenerator[Any, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


app.dependency_overrides[get_db] = _override_get_db


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Provide an async test client with fresh tables per test."""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac
    finally:
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[Any, None]:
    """Provide a raw DB session for direct model operations."""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    try:
        async with async_session_factory() as session:
            yield session
    finally:
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


# ── Auth helpers ──────────────────────────────────────────────────────────────


async def register_user(
    client: AsyncClient,
    email: str = "test@example.com",
    name: str = "Test User",
    password: str = "TestPass123!",
) -> dict[str, Any]:
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "name": name, "password": password},
    )
    return resp.json()


async def login_user(
    client: AsyncClient,
    email: str = "test@example.com",
    password: str = "TestPass123!",
) -> dict[str, Any]:
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    return resp.json()


async def auth_headers(client: AsyncClient) -> dict[str, str]:
    data = await register_user(client)
    token = data.get("access_token", "")
    return {"Authorization": f"Bearer {token}"}
