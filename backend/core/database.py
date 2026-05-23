"""Async database engine, session factory, and FastAPI dependency.

Supports both PostgreSQL (asyncpg) and SQLite (aiosqlite) for development.
For Supabase pooler connections, SSL is handled via the DATABASE_URL
parameter ``sslmode=require`` — do NOT add extra connect_args that
asyncpg does not recognise (e.g. ``pgbouncer``).
"""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from core.config import settings

# ── Detect driver ───────────────────────────────────────────────────────────

_is_sqlite = settings.DATABASE_URL.startswith("sqlite")
_is_pooler = "pooler.supabase" in settings.DATABASE_URL

engine_kwargs: dict = {}
if _is_sqlite:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
elif _is_pooler:
    # Supabase PgBouncer pooler: no pool, SSL via URL param only
    engine_kwargs["pool_size"] = 0          # disable pooling for pgbouncer
    engine_kwargs["max_overflow"] = -1
    engine_kwargs["pool_pre_ping"] = True
    # NOTE: do NOT add connect_args here — asyncpg+SQLAlchemy reads sslmode
    #       from the URL query string (sslmode=require is already there).
    #       Adding unknown keys (e.g. ``pgbouncer``) causes a TypeError.
else:
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20
    engine_kwargs["pool_pre_ping"] = True

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
    """FastAPI dependency that yields a database session."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
