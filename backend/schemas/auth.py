"""Authentication schemas.

Pydantic v2 models for auth-related request/response payloads.

Includes:
- Password complexity validation (uppercase, lowercase, digit, special char)
- Email validation via ``EmailStr`` (email-validator)
- Name sanitization (reject HTML/script-like content)
"""

from __future__ import annotations

import re

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    """Request schema for user registration."""

    email: EmailStr
    name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=8, max_length=128)

    # ── Validators ──────────────────────────────────────────────────────

    @field_validator("name")
    @classmethod
    def sanitize_name(cls, v: str) -> str:
        """Strip HTML tags and dangerous characters from the display name."""
        # Remove anything that looks like HTML/script injection
        cleaned = re.sub(r"<[^>]*>", "", v)
        # Strip leading/trailing whitespace
        cleaned = cleaned.strip()
        if not cleaned:
            raise ValueError("Name cannot be empty or contain only HTML tags")
        return cleaned

    @field_validator("password")
    @classmethod
    def validate_password_complexity(cls, v: str) -> str:
        """Enforce password complexity rules.

        Requirements
        ------------
        - At least 8 characters (enforced by ``min_length``)
        - At least one uppercase letter (``[A-Z]``)
        - At least one lowercase letter (``[a-z]``)
        - At least one digit (``[0-9]``)
        - At least one special character (``[!@#$%^&*(),.?\":{}|<>_~`-]``)
        """
        errors: list[str] = []

        if not re.search(r"[A-Z]", v):
            errors.append("uppercase letter")
        if not re.search(r"[a-z]", v):
            errors.append("lowercase letter")
        if not re.search(r"[0-9]", v):
            errors.append("digit")
        if not re.search(r"[!@#$%^&*(),.?\:\{\}\|\<\>_~`\-]", v):
            errors.append("special character")

        if errors:
            raise ValueError(
                f"Password must contain at least one {', '.join(errors)}"
            )

        return v


class LoginRequest(BaseModel):
    """Request schema for user login."""

    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Response schema containing JWT tokens."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    """Request schema for token refresh."""

    refresh_token: str
