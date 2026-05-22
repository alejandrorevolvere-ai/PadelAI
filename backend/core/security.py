"""Security primitives — JWT management, password hashing, token helpers.

Features
--------
- bcrypt password hashing (direct, no passlib wrapper)
- JWT creation with ``iat``, ``jti``, and ``type`` claims
- Access token (short-lived) vs refresh token (long-lived)
- Token verification with proper claim validation
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import bcrypt as _bcrypt

from core.config import settings

# ── OAuth2 scheme ────────────────────────────────────────────────────────────

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# ── Token type constants ────────────────────────────────────────────────────

TOKEN_TYPE_ACCESS = "access"
TOKEN_TYPE_REFRESH = "refresh"

# ── Password hashing (bcrypt directly — passlib is no longer maintained) ───


def hash_password(password: str) -> str:
    """Return a bcrypt hash of *password*."""
    return _bcrypt.hashpw(password.encode("utf-8"), _bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Return ``True`` if *plain* matches the bcrypt *hashed* value."""
    return _bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


# ── JWT helpers ──────────────────────────────────────────────────────────────


def _encode_jwt(
    data: dict[str, Any],
    expires_delta: timedelta,
    token_type: str,
) -> str:
    """Encode *data* as a JWT with security claims.

    Automatically adds:
    - ``exp`` — expiration timestamp
    - ``iat`` — issued-at timestamp
    - ``jti`` — unique token ID (UUID v4) for revocation tracking
    - ``type`` — ``"access"`` or ``"refresh"`` to prevent type confusion
    """
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    to_encode.update(
        {
            "exp": now + expires_delta,
            "iat": now,
            "jti": str(uuid.uuid4()),
            "type": token_type,
        }
    )
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_access_token(data: dict[str, Any]) -> str:
    """Create a short-lived access JWT.

    The token expires after ``settings.ACCESS_TOKEN_EXPIRE_MINUTES``.
    """
    delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return _encode_jwt(data, delta, token_type=TOKEN_TYPE_ACCESS)


def create_refresh_token(data: dict[str, Any]) -> str:
    """Create a long-lived refresh JWT.

    The token expires after ``settings.REFRESH_TOKEN_EXPIRE_DAYS``.
    """
    delta = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    return _encode_jwt(data, delta, token_type=TOKEN_TYPE_REFRESH)


def verify_token(token: str, expected_type: str | None = None) -> dict[str, Any]:
    """Decode and validate *token*.

    Parameters
    ----------
    token
        The JWT string to decode.
    expected_type
        If provided (``"access"`` or ``"refresh"``), verifies the token's
        ``type`` claim matches. This prevents access tokens from being used
        as refresh tokens and vice versa.

    Returns
    -------
    dict[str, Any]
        The decoded payload on success.

    Raises
    ------
    JWTError
        If the token is expired, malformed, signature is invalid,
        or the type claim does not match *expected_type*.
    """
    try:
        payload: dict[str, Any] = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
    except JWTError:
        raise

    if expected_type is not None:
        token_type = payload.get("type")
        if token_type != expected_type:
            raise JWTError(
                f"Token type mismatch: expected '{expected_type}', got '{token_type}'"
            )

    return payload
