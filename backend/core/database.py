"""Async database engine, session factory, and FastAPI dependency.

Supports both PostgreSQL (asyncpg) and SQLite (aiosqlite) for development.
Selects the appropriate connect arguments based on the DATABASE_URL scheme.

NOTE: ``Base`` is imported from ``models.base`` to ensure all model
registrations use the same DeclarativeBase instance.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from core.config import settings
from models.base import Base

# ── Detect driver ───────────────────────────────────────────────────────────

_is_sqlite = settings.DATABASE_URL.startswith("sqlite")

engine_kwargs: dict = {}
if _is_sqlite:
    # SQLite doesn't support pools and needs check_same_thread=False
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20
    engine_kwargs["pool_pre_ping"] = True
    # SSL via connect_args for asyncpg
    engine_kwargs["connect_args"] = {"ssl": "require"}

# ── Async Engine ─────────────────────────────────────────────────────────────

async_engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.ENVIRONMENT == "development",
    **engine_kwargs,
)

# ── Session factory ──────────────────────────────────────────────────────────

async_session_factory = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


# ── Dependency ───────────────────────────────────────────────────────────────

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields a database session.

    Automatically commits on success, rolls back on exception.
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
