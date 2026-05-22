"""PadelAI Tutor — FastAPI application entry point."""

from __future__ import annotations

import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel
from sqlalchemy import text

from core.cache import _redis_available
from core.config import settings
from core.database import async_engine, Base
from core.logging import configure_logging, RequestLogMiddleware
from core.security_middleware import add_security_middleware

# ── Uptime ────────────────────────────────────────────────────────────────────

_STARTUP_TIME = time.time()


# ── Routers ───────────────────────────────────────────────────────────────────

from api.v1.auth import router as auth_router
from api.v1.chat import router as chat_router
from api.v1.users import router as users_router
from api.v1.subscriptions import router as subscriptions_router
from api.v1.webhooks import router as webhooks_router
from api.v1.video import router as video_router
from api.v1.vr import router as vr_router


# ── Schemas ───────────────────────────────────────────────────────────────────


class HealthResponse(BaseModel):
    """Response model for the /health endpoint."""

    status: str = "ok"
    version: str = "1.0.0"
    environment: str = settings.ENVIRONMENT
    db_status: str = "unknown"
    redis_status: str = "unknown"
    uptime_seconds: float = 0.0


# ── Lifespan ──────────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup / shutdown."""
    # ── Configure structured logging ──────────────────────────────────────
    configure_logging()

    # ── Startup ───────────────────────────────────────────────────────────
    if settings.ENVIRONMENT == "development":
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    yield

    # ── Shutdown ──────────────────────────────────────────────────────────
    await async_engine.dispose()


# ── Application ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="PadelAI Tutor API",
    version="1.0.0",
    lifespan=lifespan,
)

# ── Security middleware (rate limiting, headers) ─────────────────────────────
add_security_middleware(app)

# ── CORS ──────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Compression (responses > 1 KB) ──────────────────────────────────────────

app.add_middleware(GZipMiddleware, minimum_size=1000)

# ── Request logging ─────────────────────────────────────────────────────────

app.add_middleware(RequestLogMiddleware)

# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(auth_router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(users_router, prefix="/api/v1/users", tags=["Users"])
app.include_router(
    subscriptions_router,
    prefix="/api/v1/subscriptions",
    tags=["Subscriptions"],
)
app.include_router(chat_router, prefix="/api/v1", tags=["Chat"])
app.include_router(
    webhooks_router,
    prefix="/api/v1/webhooks",
    tags=["Webhooks"],
)
app.include_router(video_router, prefix="/api/v1", tags=["Video"])
app.include_router(vr_router, prefix="/api/v1", tags=["VR"])


# ── Endpoints ─────────────────────────────────────────────────────────────────


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health() -> HealthResponse:
    """Return the current health status of the API, including DB & Redis checks."""
    resp = HealthResponse()
    resp.uptime_seconds = time.time() - _STARTUP_TIME

    # ── Database check ────────────────────────────────────────────────────
    try:
        async with async_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        resp.db_status = "connected"
    except Exception as e:  # noqa: BLE001
        resp.db_status = f"disconnected: {type(e).__name__}"
        resp.status = "degraded"

    # ── Redis check ──────────────────────────────────────────────────────
    if _redis_available:
        try:
            from core.cache import _get_client

            client = await _get_client()
            if client is not None:
                await client.ping()
                resp.redis_status = "connected"
            else:
                resp.redis_status = "unavailable"
        except Exception:  # noqa: BLE001
            resp.redis_status = "unavailable"
    else:
        resp.redis_status = "not_installed"

    return resp


# ── Runner ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
