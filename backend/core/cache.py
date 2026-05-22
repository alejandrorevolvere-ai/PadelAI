"""Redis caching helper with graceful fallback.

Provides async get/set operations backed by Redis. If Redis is unavailable
(not running, connection refused, etc.) all operations gracefully return None
so the application degrades rather than crashing.
"""

from __future__ import annotations

import json
from typing import Any

from core.config import settings

try:
    import redis.asyncio as aioredis

    _redis_available = True
except ImportError:
    _redis_available = False


_redis_client: aioredis.Redis | None = None


async def _get_client() -> aioredis.Redis | None:
    """Lazy-init and return the Redis client, or None if unavailable."""
    global _redis_client  # noqa: PLW0603
    if not _redis_available:
        return None
    if _redis_client is None:
        try:
            _redis_client = aioredis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2,
            )
            await _redis_client.ping()
        except Exception:  # noqa: BLE001
            _redis_client = None
    return _redis_client


async def get_cached(key: str) -> Any:
    """Retrieve a value from the cache.

    Args:
        key: Cache key to look up.

    Returns:
        The deserialized value, or *None* on cache miss or when Redis is
        unavailable.
    """
    client = await _get_client()
    if client is None:
        return None
    try:
        raw = await client.get(key)
        if raw is None:
            return None
        return json.loads(raw)
    except Exception:  # noqa: BLE001
        return None


async def set_cached(key: str, value: Any, ttl: int = 300) -> None:
    """Store a value in the cache.

    Args:
        key:   Cache key.
        value: Serializable value to store (will be JSON-encoded).
        ttl:   Time-to-live in seconds (default 300 = 5 minutes).
    """
    client = await _get_client()
    if client is None:
        return
    try:
        raw = json.dumps(value, default=str)
        await client.setex(key, ttl, raw)
    except Exception:  # noqa: BLE001
        pass


async def invalidate_cached(key: str) -> None:
    """Remove a single key from the cache.

    Args:
        key: Cache key to delete.
    """
    client = await _get_client()
    if client is None:
        return
    try:
        await client.delete(key)
    except Exception:  # noqa: BLE001
        pass


async def clear_cache() -> None:
    """Flush the entire Redis cache (use with care — affects all apps on same DB)."""
    client = await _get_client()
    if client is None:
        return
    try:
        await client.flushdb()
    except Exception:  # noqa: BLE001
        pass
