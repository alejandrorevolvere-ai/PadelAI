"""API dependencies.

Re-exports the database session dependency and provides
authentication / authorization helpers that support both:

- **httpOnly cookies** (primary) — secure against XSS
- **Authorization: Bearer** header (fallback) — for mobile / CLI clients
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Any
from uuid import UUID as _UUID

from fastapi import Depends, HTTPException, Request, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.auth import get_token_from_cookies
from core.database import get_db  # noqa: F401 — re-exported for convenience
from core.security import oauth2_scheme, verify_token
from models.user import User


async def get_token(request: Request) -> str:
    """Extract the JWT from the request — cookies take priority.

    1. Try ``access_token`` httpOnly cookie.
    2. Fall back to the ``Authorization: Bearer`` header.
    3. Raise 401 if neither is present.
    """
    # Try cookie first
    token = get_token_from_cookies(request.headers)
    if token:
        return token

    # Fall back to Authorization header
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[len("Bearer "):]

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
    )


async def get_current_user(
    token: str = Depends(get_token),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Decode the bearer token and return the authenticated user.

    Steps
    -----
    1. Decode the JWT with :func:`core.security.verify_token`.
    2. Extract the ``sub`` claim (user UUID).
    3. Query the database for a matching user.
    4. Raise ``401 UNAUTHORIZED`` if the user does not exist or is inactive.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload: dict[str, Any] = verify_token(token)
        user_id_raw: str | Any = payload.get("sub")
        if user_id_raw is None:
            raise credentials_exception
        user_id = _UUID(user_id_raw)  # JWT stores str, DB expects UUID
    except JWTError:
        raise credentials_exception from None

    result = await db.execute(select(User).where(User.id == user_id))
    user: User | None = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user account",
        )

    return user
