"""User schemas.

Pydantic v2 models for user-related request/response payloads.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class UserResponse(BaseModel):
    """Response schema for user profile data."""

    id: UUID
    email: str
    name: str
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    """Request schema for partial user profile update."""

    name: Optional[str] = None
    email: Optional[EmailStr] = None
