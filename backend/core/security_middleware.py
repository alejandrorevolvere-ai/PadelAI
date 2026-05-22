"""Security middleware — rate limiting, security headers, request validation.

Provides:

1. **Security headers** (CSP, HSTS, X-Frame-Options, etc.) on every response.
2. **Rate limiting** — Redis sliding-window with in-memory fallback to prevent
   brute force and DDoS of auth endpoints.
3. **Request body size validation** — rejects oversized payloads early.
4. **Rate limit response headers** (X-RateLimit-*) on every API response.
5. **HTTPS redirect** — production only, redirects HTTP → HTTPS.
6. **Security logging** — logs rate limit hits and security events.
"""

from __future__ import annotations

import logging
import time
from collections import defaultdict
from collections.abc import Awaitable, Callable
from typing import Any

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse, RedirectResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from core.config import settings

log = logging.getLogger("padelai.security")

# ─── Security Headers ─────────────────────────────────────────────────────────

_SECURITY_HEADERS: dict[str, str] = {
    # CSP — only allow same-origin scripts & styles; block everything else
    "Content-Security-Policy": (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: blob:; "
        "font-src 'self'; "
        "connect-src 'self' https://api.stripe.com; "
        "frame-src 'self' https://js.stripe.com https://hooks.stripe.com; "
        "object-src 'none'; "
        "base-uri 'self'; "
        "form-action 'self' https://checkout.stripe.com; "
    ),
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": (
        "camera=(), microphone=(), geolocation=(), "
        "accelerometer=(), gyroscope=(), magnetometer=(), "
        "payment=(self), usb=(), interest-cohort=()"
    ),
}

if settings.ENVIRONMENT != "development":
    _SECURITY_HEADERS["Strict-Transport-Security"] = (
        "max-age=63072000; includeSubDomains; preload"
    )


# ─── Redis-backed rate limiter with in-memory fallback ───────────────────────

try:
    import redis.asyncio as aioredis
    from core.cache import _get_client as _get_redis

    _redis_available = True
except ImportError:
    _redis_available = False


class RateLimiter:
    """Sliding-window rate limiter — Redis primary, with in-memory fallback.

    Each IP gets a window of *window_seconds* during which it may make
    at most *max_requests* requests. Returns remaining count and reset time
    for the ``X-RateLimit-*`` response headers.
    """

    def __init__(self, max_requests: int = 20, window_seconds: int = 60) -> None:
        self._max = max_requests
        self._window = window_seconds
        # In-memory fallback buckets
        self._buckets: dict[str, list[float]] = {}

    # ── Public API ──────────────────────────────────────────────────────

    def redis_key(self, client_ip: str) -> str:
        """Redis key for this limiter + IP."""
        return f"ratelimit:{self._max}:{self._window}:{client_ip}"

    async def check(
        self, request: Request
    ) -> tuple[bool, int, int]:
        """Check if *request* is within the rate limit.

        Returns
        -------
        (allowed, remaining, reset_after_seconds)
            *allowed* is ``True`` if the request may proceed.
            *remaining* is how many requests are left in the window.
            *reset_after_seconds* is seconds until the window resets.
        """
        client_ip = request.client.host if request.client else "unknown"

        if _redis_available:
            return await self._check_redis(client_ip)
        return self._check_memory(client_ip)

    # ── Redis backend ───────────────────────────────────────────────────

    async def _check_redis(
        self, client_ip: str
    ) -> tuple[bool, int, int]:
        client = await _get_redis()
        if client is None:
            # Redis not connected — fall back to in-memory
            return self._check_memory(client_ip)

        key = self.redis_key(client_ip)
        now = int(time.time())
        window_start = now - self._window

        try:
            pipe = client.pipeline()
            # Remove timestamps outside the window
            pipe.zremrangebyscore(key, 0, window_start)
            # Count remaining
            pipe.zcard(key)
            # Add current timestamp
            pipe.zadd(key, {str(now): now})
            # Set TTL (twice the window for safety)
            pipe.expire(key, self._window * 2)
            results = await pipe.execute()

            count = int(results[1])  # zcard result
            remaining = max(0, self._max - count)

            if count >= self._max:
                log.warning(
                    "Rate limit hit [redis] — ip=%s key=%s count=%d limit=%d",
                    client_ip,
                    key,
                    count,
                    self._max,
                )
                return False, 0, self._window

            return True, remaining, self._window
        except Exception:
            # Redis error — fall back to in-memory
            return self._check_memory(client_ip)

    # ── In-memory fallback ──────────────────────────────────────────────

    def _check_memory(
        self, client_ip: str
    ) -> tuple[bool, int, int]:
        now = time.monotonic()
        bucket = self._buckets.setdefault(client_ip, [])
        cutoff = now - self._window

        # Prune expired timestamps
        self._buckets[client_ip] = [t for t in bucket if t > cutoff]
        count = len(self._buckets[client_ip])
        remaining = max(0, self._max - count)

        if count >= self._max:
            log.warning(
                "Rate limit hit [memory] — ip=%s count=%d limit=%d",
                client_ip,
                count,
                self._max,
            )
            return False, 0, self._window

        self._buckets[client_ip].append(now)
        return True, remaining, self._window


# Singleton limiters — configurable via settings
_auth_limiter = RateLimiter(
    max_requests=settings.AUTH_RATE_LIMIT,
    window_seconds=settings.RATE_LIMIT_WINDOW,
)
_general_limiter = RateLimiter(
    max_requests=settings.GENERAL_RATE_LIMIT,
    window_seconds=settings.RATE_LIMIT_WINDOW,
)


# ─── Security Middleware ──────────────────────────────────────────────────────


class SecurityMiddleware(BaseHTTPMiddleware):  # type: ignore[misc]
    """Middleware that enforces security policies on every request."""

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        # ── HTTPS redirect (production only) ──────────────────────────────
        if settings.ENVIRONMENT == "production":
            scheme = request.headers.get("x-forwarded-proto", request.url.scheme)
            if scheme != "https":
                https_url = str(request.url).replace("http://", "https://", 1)
                return RedirectResponse(url=https_url, status_code=301)

        # ── Request body size check ───────────────────────────────────────
        content_length_str = request.headers.get("content-length", "0")
        try:
            content_length = int(content_length_str)
        except ValueError:
            content_length = 0

        if content_length > settings.MAX_REQUEST_BODY_SIZE:
            log.warning(
                "Oversized request rejected — size=%d max=%d path=%s",
                content_length,
                settings.MAX_REQUEST_BODY_SIZE,
                request.url.path,
            )
            return JSONResponse(
                status_code=413,
                content={"detail": "Request body too large"},
            )

        # ── Rate limiting ────────────────────────────────────────────────
        path = request.url.path
        ratelimit_headers: dict[str, str] = {}

        if path.startswith("/api/v1/auth/"):
            allowed, remaining, reset_after = await _auth_limiter.check(request)
            ratelimit_headers = {
                "X-RateLimit-Limit": str(settings.AUTH_RATE_LIMIT),
                "X-RateLimit-Remaining": str(remaining),
                "X-RateLimit-Reset": str(int(time.time()) + reset_after),
            }
        elif path.startswith("/api/v1/"):
            allowed, remaining, reset_after = await _general_limiter.check(request)
            ratelimit_headers = {
                "X-RateLimit-Limit": str(settings.GENERAL_RATE_LIMIT),
                "X-RateLimit-Remaining": str(remaining),
                "X-RateLimit-Reset": str(int(time.time()) + reset_after),
            }
        else:
            allowed = True  # Static / health routes — no limit

        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Too many requests. Please slow down.",
                },
                headers={
                    "Retry-After": str(settings.RATE_LIMIT_WINDOW),
                    **ratelimit_headers,
                    **{k: v for k, v in _SECURITY_HEADERS.items()},
                },
            )

        # ── Process request ──────────────────────────────────────────────
        try:
            response: Response = await call_next(request)
        except Exception:
            raise

        # ── Attach rate-limit headers to every API response ─────────────
        for header, value in ratelimit_headers.items():
            response.headers[header] = value

        # ── Inject security headers into every response ──────────────────
        for header, value in _SECURITY_HEADERS.items():
            response.headers[header] = value

        # ── Remove Server header (information disclosure) ────────────────
        if "server" in response.headers:
            del response.headers["server"]

        return response


# ─── Applier ──────────────────────────────────────────────────────────────────


def add_security_middleware(app: FastAPI) -> None:
    """Add security middleware to *app*."""
    app.add_middleware(SecurityMiddleware)  # type: ignore[arg-type]

