"""Cookie helpers for JWT-based auth.

Sets ``access_token`` and ``refresh_token`` as httpOnly, Secure, SameSite=Strict
cookies so JavaScript cannot read them (mitigates XSS token theft).

In development (no HTTPS) the ``Secure`` flag is omitted.
"""

from __future__ import annotations

from datetime import timedelta
from typing import Any

from fastapi import Response
from starlette.datastructures import MutableHeaders

from core.config import settings

# ── Cookie names ──────────────────────────────────────────────────────────────

ACCESS_TOKEN_COOKIE = "access_token"
REFRESH_TOKEN_COOKIE = "refresh_token"


# ── Helpers ───────────────────────────────────────────────────────────────────


def _is_secure() -> bool:
    """Return ``True`` when Secure flag should be set on cookies.

    Secure is only applied in non-development environments so that local
    HTTP dev servers work without friction.
    """
    return settings.ENVIRONMENT != "development"


def _cookie_kwargs(max_age_seconds: int) -> dict[str, Any]:
    """Common cookie attributes shared by access and refresh cookies."""
    return {
        "httponly": True,
        "secure": _is_secure(),
        "samesite": "strict",  # type: ignore[arg-type]
        "max_age": max_age_seconds,
        "path": "/",
    }


def set_auth_cookies(
    response: Response,
    access_token: str,
    refresh_token: str,
) -> None:
    """Set httpOnly cookies on *response* with the given token pair."""
    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE,
        value=access_token,
        **(_cookie_kwargs(settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)),
    )
    response.set_cookie(
        key=REFRESH_TOKEN_COOKIE,
        value=refresh_token,
        **(_cookie_kwargs(settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400)),
    )


def clear_auth_cookies(response: Response) -> None:
    """Expire auth cookies immediately (logout)."""
    for name in (ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE):
        response.delete_cookie(
            key=name,
            path="/",
            secure=_is_secure(),
            httponly=True,
            samesite="strict",  # type: ignore[arg-type]
        )


def get_token_from_cookies(headers: MutableHeaders) -> str | None:
    """Extract the access token from the Cookie header.

    Returns ``None`` when no access_token cookie is present.
    """
    cookie_header = headers.get("cookie", "")
    for part in cookie_header.split(";"):
        part = part.strip()
        if part.startswith(f"{ACCESS_TOKEN_COOKIE}="):
            return part.split("=", 1)[1]
    return None
