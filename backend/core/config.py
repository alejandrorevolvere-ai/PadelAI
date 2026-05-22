from __future__ import annotations

from typing import Dict

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables / .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── Database ──────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/padel_ai_tutor"

    # ── Redis ─────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── JWT / Auth ────────────────────────────────────────────────────────
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Stripe ────────────────────────────────────────────────────────────
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    # Map of plan slug → Stripe Price ID (created in Stripe Dashboard)
    STRIPE_PRICES: Dict[str, str] = {}

    # ── CORS ──────────────────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
    ]

    # ── Environment ───────────────────────────────────────────────────────
    ENVIRONMENT: str = "development"  # development | staging | production

    # ── Security ──────────────────────────────────────────────────────────
    # Rate limiting
    AUTH_RATE_LIMIT: int = 10          # max requests per window on auth
    GENERAL_RATE_LIMIT: int = 120      # max requests per window on API
    RATE_LIMIT_WINDOW: int = 60        # window in seconds

    # Brute-force / account lockout
    MAX_LOGIN_ATTEMPTS: int = 5        # failed attempts before lockout
    LOGIN_LOCKOUT_MINUTES: int = 15    # how long the account stays locked

    # Request limits
    MAX_REQUEST_BODY_SIZE: int = 1_048_576  # 1 MB max body size

    # ── LLM / AI ──────────────────────────────────────────────────────────
    LLM_API_URL: str = "https://api.openai.com/v1"
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "gpt-4o-mini"


# Singleton instance — import this in the rest of the application.
settings = Settings()  # type: ignore[call-arg]
