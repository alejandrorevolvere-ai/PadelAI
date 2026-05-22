"""Tests for model integrity and database relationships."""

from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.user import Subscription, User
from tests.conftest import auth_headers, login_user, register_user


@pytest.mark.asyncio
async def test_user_creation_with_subscription(client: AsyncClient) -> None:
    """Creating a user should auto-create a free subscription."""
    from core.database import async_session_factory
    from sqlalchemy import select
    from models.user import User

    data = await register_user(client)
    assert "user" in data, f"Response missing 'user' key: {data}"
    assert "access_token" in data
    assert "refresh_token" in data

    # Verify subscription exists via DB
    from uuid import UUID
    user_id = UUID(data["user"]["id"])
    async with async_session_factory() as session:
        from models.user import Subscription
        result = await session.execute(
            select(Subscription).where(Subscription.user_id == user_id)
        )
        sub = result.scalar_one_or_none()
        assert sub is not None, "Subscription should exist"
        assert sub.plan == "free"
        assert sub.status == "active"


@pytest.mark.asyncio
async def test_user_orm_relationship(client: AsyncClient, db_session: AsyncSession) -> None:
    """Verify the ORM relationship between User and Subscription."""
    from core.security import hash_password

    user = User(
        email="ormtest@example.com",
        name="ORM Test",
        hashed_password=hash_password("TestPass123!"),
    )
    db_session.add(user)
    await db_session.flush()

    sub = Subscription(
        user_id=user.id,
        plan="free",
        status="active",
    )
    db_session.add(sub)
    await db_session.commit()

    # Reload with relationship eagerly loaded
    from sqlalchemy.orm import selectinload
    result = await db_session.execute(
        select(User).options(selectinload(User.subscription)).where(User.id == user.id)
    )
    loaded = result.scalar_one()
    assert loaded.subscription is not None
    assert loaded.subscription.plan == "free"
    assert loaded.email == "ormtest@example.com"
