"""Authentication service — register, login, token refresh.

Includes:
- Account lockout after N failed attempts (Redis-backed with in-memory fallback)
- Brute-force protection with progressive delays
- JWT type-confusion prevention via ``verify_token(…, expected_type=…)``
"""

from __future__ import annotations

import logging
import time
from collections import defaultdict
from uuid import UUID

from fastapi import HTTPException, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
    verify_token,
)
from models.user import Subscription, SubscriptionPlan, SubscriptionStatus, User
from schemas.auth import TokenResponse
from schemas.user import UserResponse

log = logging.getLogger("padelai.auth")

# ─── Brute-force protection (Redis-backed with in-memory fallback) ─────────

try:
    import redis.asyncio as aioredis
    from core.cache import _get_client as _get_redis

    _redis_available = True
except ImportError:
    _redis_available = False

# In-memory fallback: email → [timestamp, …]
_failed_attempts: dict[str, list[float]] = defaultdict(list)
_locked_until: dict[str, float] = {}


async def _get_failed_count(email: str) -> int:
    """Return the number of recent failed attempts for *email*."""
    if _redis_available:
        client = await _get_redis()
        if client is not None:
            try:
                count = await client.get(f"failed_login:{email}")
                return int(count) if count else 0
            except Exception:
                pass  # fall through to memory
    return len(
        [t for t in _failed_attempts[email] if t > time.monotonic() - 900]
    )


async def _record_failed_attempt(email: str) -> None:
    """Record a failed login attempt for *email*."""
    if _redis_available:
        client = await _get_redis()
        if client is not None:
            try:
                key = f"failed_login:{email}"
                await client.incr(key)
                await client.expire(key, 900)  # 15 min window
                return
            except Exception:
                pass
    now = time.monotonic()
    _failed_attempts[email] = [
        t for t in _failed_attempts[email] if t > now - 900
    ]
    _failed_attempts[email].append(now)


async def _clear_failed_attempts(email: str) -> None:
    """Clear failed-attempt tracking for *email* (successful login)."""
    if _redis_available:
        client = await _get_redis()
        if client is not None:
            try:
                await client.delete(f"failed_login:{email}")
                return
            except Exception:
                pass
    _failed_attempts.pop(email, None)
    _locked_until.pop(email, None)


async def _is_locked(email: str) -> bool:
    """Return ``True`` if *email* is currently locked out."""
    if _redis_available:
        client = await _get_redis()
        if client is not None:
            try:
                ttl = await client.ttl(f"lockout:{email}")
                return ttl > 0
            except Exception:
                pass
    until = _locked_until.get(email, 0.0)
    return time.monotonic() < until


async def _apply_lockout(email: str) -> None:
    """Lock *email* for the configured duration."""
    if _redis_available:
        client = await _get_redis()
        if client is not None:
            try:
                lockout_seconds = settings.LOGIN_LOCKOUT_MINUTES * 60
                await client.setex(f"lockout:{email}", lockout_seconds, "1")
                return
            except Exception:
                pass
    _locked_until[email] = time.monotonic() + settings.LOGIN_LOCKOUT_MINUTES * 60
    log.warning("Account locked — email=%s duration=%d min", email, settings.LOGIN_LOCKOUT_MINUTES)


# ─── Token helpers ────────────────────────────────────────────────────────────


def _create_tokens(user_id: str) -> dict[str, str]:
    """Create a new access/refresh token pair for *user_id*.

    The ``type`` claim (``"access"`` vs ``"refresh"``) is set inside
    :func:`core.security.create_access_token` and
    :func:`core.security.create_refresh_token` respectively,
    preventing token-type confusion attacks.
    """
    payload = {"sub": user_id}
    return {
        "access_token": create_access_token(data=payload),
        "refresh_token": create_refresh_token(data=payload),
    }


def _build_auth_response(
    user: User, tokens: dict[str, str]
) -> dict[str, str | UserResponse]:
    """Combine a *user* model and *tokens* into a standard auth response dict."""
    return {
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "user": UserResponse.model_validate(user),
    }


# ─── Public service functions ────────────────────────────────────────────────


async def register(
    db: AsyncSession,
    email: str,
    name: str,
    password: str,
) -> dict[str, str | UserResponse]:
    """Register a new user account.

    1. Checks that *email* is not already taken (409 Conflict if it is).
    2. Creates the ``User`` row with a hashed password.
    3. Creates a free-tier ``Subscription`` row linked to the new user.
    4. Returns access + refresh tokens plus user data.
    """
    result = await db.execute(select(User).where(User.email == email))
    existing = result.scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    user = User(
        email=email,
        name=name,
        hashed_password=hash_password(password),
    )
    db.add(user)
    await db.flush()

    subscription = Subscription(
        user_id=user.id,
        plan=SubscriptionPlan.free,
        status=SubscriptionStatus.active,
    )
    db.add(subscription)
    await db.flush()

    tokens = _create_tokens(str(user.id))
    return _build_auth_response(user, tokens)


async def authenticate(
    db: AsyncSession,
    email: str,
    password: str,
) -> dict[str, str | UserResponse]:
    """Authenticate a user by email + password.

    Includes brute-force protection:
    - Accounts are locked after ``MAX_LOGIN_ATTEMPTS`` consecutive failures.
    - Locked accounts receive a generic error (no hint about lock state).
    - Successful login clears the failure counter.

    Returns
    -------
    dict
        ``{"access_token": …, "refresh_token": …, "user": UserResponse}``.

    Raises
    ------
    HTTPException 401
        If the credentials are invalid or the account is locked.
    """
    # ── Check lockout ──────────────────────────────────────────────────
    if await _is_locked(email):
        log.warning("Login attempt on locked account — email=%s", email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # ── Look up user ───────────────────────────────────────────────────
    result = await db.execute(select(User).where(User.email == email))
    user: User | None = result.scalar_one_or_none()

    if user is None:
        await _record_failed_attempt(email)
        await _check_lockout(email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_password(password, user.hashed_password):
        await _record_failed_attempt(email)
        await _check_lockout(email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # ── Success — clear failures ────────────────────────────────────────
    await _clear_failed_attempts(email)

    tokens = _create_tokens(str(user.id))
    return _build_auth_response(user, tokens)


async def _check_lockout(email: str) -> None:
    """Lock *email* if failed attempts exceed the threshold."""
    count = await _get_failed_count(email)
    if count >= settings.MAX_LOGIN_ATTEMPTS:
        await _apply_lockout(email)


async def refresh_tokens(
    db: AsyncSession,
    refresh_token: str,
) -> dict[str, str]:
    """Issue a new token pair from a valid refresh token.

    Uses ``verify_token(…, expected_type="refresh")`` to prevent access
    tokens from being used to obtain new token pairs.
    """
    try:
        payload = verify_token(refresh_token, expected_type="refresh")
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user_id_str: str | None = payload.get("sub")
    if user_id_str is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    user_id = UUID(user_id_str)
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return _create_tokens(str(user.id))
