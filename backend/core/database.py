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
    # Supabase PgBouncer (port 6543):
    # - SSL required (Supabase uses self-signed certs on pooler)
    # - statement_cache_size=0 because PgBouncer uses transaction pooling
    #   and prepared statements don't persist across transactions
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    engine_kwargs["connect_args"] = {
        "ssl": ctx,
        "statement_cache_size": 0,
    }
    engine_kwargs["pool_pre_ping"] = True

else:
    # Standard PostgreSQL (direct connection)
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["connect_args"] = {"ssl": True}

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
