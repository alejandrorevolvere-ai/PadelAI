"""Authentication API routes — register, login, refresh tokens.

Uses httpOnly cookies for token delivery (XSS-safe) while still
returning them in the JSON body for mobile/CLI clients.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db
from core.auth import clear_auth_cookies, set_auth_cookies
from schemas.auth import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
)
from services.auth_service import (
    authenticate,
    refresh_tokens,
    register,
)

router = APIRouter(tags=["auth"])


@router.post("/register")
async def register_endpoint(
    body: RegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Register a new user account.

    Returns tokens in the JSON body AND sets them as httpOnly cookies.
    """
    result = await register(db=db, email=body.email, name=body.name, password=body.password)
    set_auth_cookies(
        response,
        access_token=result["access_token"],
        refresh_token=result["refresh_token"],
    )
    return result


@router.post("/login")
async def login_endpoint(
    body: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Authenticate an existing user.

    Returns tokens in the JSON body AND sets them as httpOnly cookies.
    """
    result = await authenticate(db=db, email=body.email, password=body.password)
    set_auth_cookies(
        response,
        access_token=result["access_token"],
        refresh_token=result["refresh_token"],
    )
    return result


@router.post("/refresh")
async def refresh_endpoint(
    body: RefreshRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Issue a new token pair from a valid refresh token.

    Updates both the JSON body and httpOnly cookies.
    """
    result = await refresh_tokens(db=db, refresh_token=body.refresh_token)
    set_auth_cookies(
        response,
        access_token=result["access_token"],
        refresh_token=result["refresh_token"],
    )
    return result


@router.post("/logout")
async def logout_endpoint(
    response: Response,
) -> dict:
    """Clear auth httpOnly cookies (logout).

    The frontend should call this and then navigate to /login.
    """
    clear_auth_cookies(response)
    return {"status": "ok", "message": "Logged out"}
