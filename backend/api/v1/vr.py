"""VR Practice API routes — session management.

Stub implementation. In production, integrate with Three.js / WebXR backend.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from api.deps import get_current_user
from models.user import User

router = APIRouter(prefix="/vr", tags=["VR"])


@router.get("/sessions")
async def get_vr_sessions(
    current_user: User = Depends(get_current_user),
) -> list:
    """Get VR sessions for the current user. (stub)"""
    return []


@router.post("/sessions")
async def save_vr_session(
    current_user: User = Depends(get_current_user),
) -> dict:
    """Save a completed VR session. (stub)"""
    return {
        "id": "stub-vr-id",
        "status": "saved",
        "message": "VR session endpoint — not yet implemented",
    }
