"""Async database engine, session factory, and FastAPI dependency.

Supports both PostgreSQL (asyncpg) and SQLite (aiosqlite) for development.
Detects Supabase PgBouncer (port 6543) and adjusts pool/settings accordingly.

NOTE: ``Base`` is imported from ``models.base`` to ensure all model
registrations use the same DeclarativeBase instance.
"""

from __future__ import annotations

import ssl
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from core.config import settings
from models.base import Base

# ── Detect driver / pooler ────────────────────────────────────────────────────

_is_sqlite = settings.DATABASE_URL.startswith("sqlite")
_is_pooler = ":6543" in settings.DATABASE_URL

# ── Engine kwargs ──────────────────────────────────────────────────────────────

engine_kwargs: dict = {}

if _is_sqlite:
    engine_kwargs["connect_args"] = {"check_same_thread": False}

elif _is_pooler:
    # Supabase PgBouncer (port 6543)
    # - SSL with self-signed cert acceptance
    # - No app-level statement caching (PgBouncer uses transaction pooling)
    _ssl_ctx = ssl.create_default_context()
    _ssl_ctx.check_hostname = False
    _ssl_ctx.verify_mode = ssl.CERT_NONE
    engine_kwargs["connect_args"] = {"ssl": _ssl_ctx}
    engine_kwargs["pool_pre_ping"] = True

else:
    # Standard PostgreSQL (direct connection, no PgBouncer)
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20
    engine_kwargs["pool_pre_ping"] = True
    _ssl_ctx = ssl.create_default_context()
    _ssl_ctx.check_hostname = False
    _ssl_ctx.verify_mode = ssl.CERT_NONE
    engine_kwargs["connect_args"] = {"ssl": _ssl_ctx}

# ── Async Engine ───────────────────────────────────────────────────────────────

async_engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.ENVIRONMENT == "development",
    **engine_kwargs,
)

# ── Session factory ────────────────────────────────────────────────────────────

async_session_factory = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


# ── Dependency ─────────────────────────────────────────────────────────────────

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
