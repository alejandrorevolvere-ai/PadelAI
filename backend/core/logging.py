"""Structured logging configuration for the PadelAI Tutor backend.

Logs are written to *stderr* with a structured JSON-like format that includes:
request method, path, status code, and duration for every HTTP request.
"""

from __future__ import annotations

import logging
import sys
import time
from typing import Any

# ── Root logger setup ─────────────────────────────────────────────────────────

_log_format = (
    "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
)

_date_format = "%Y-%m-%d %H:%M:%S"


def configure_logging(*, level: str | int = logging.INFO) -> None:
    """Configure the root logger to write structured logs to stderr.

    Args:
        level: Logging level (default: ``INFO``). Accepts strings like
            ``"DEBUG"`` or ``logging.DEBUG``.
    """
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(logging.Formatter(fmt=_log_format, datefmt=_date_format))

    root = logging.getLogger()
    root.setLevel(level)
    # Avoid duplicate handlers on re-configuration
    root.handlers.clear()
    root.addHandler(handler)

    # Quiet noisy third-party loggers
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("aiosqlite").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Return a child logger for the given *name* (typically ``__name__``).

    Args:
        name: Logger name, e.g. ``"core.cache"`` or ``"api.v1.auth"``.

    Returns:
        A configured :class:`logging.Logger` instance.
    """
    return logging.getLogger(name)


# ── ASGI middleware for request logging ────────────────────────────────────────


class RequestLogMiddleware:
    """ASGI middleware that logs every request with method, path, status & duration."""

    def __init__(self, app: Any) -> None:
        self.app = app
        self.logger = get_logger("api.request")

    async def __call__(self, scope: Any, receive: Any, send: Any) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start = time.perf_counter()
        method = scope.get("method", "?")
        path = scope.get("path", "/?")
        query = scope.get("query_string", b"")
        full_path = path
        if query:
            full_path = f"{path}?{query.decode('utf-8', errors='replace')}"

        # Wrap send to capture the status code
        status_code: int = 0

        async def _send_wrapper(message: Any) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message.get("status", 0)
            await send(message)

        try:
            await self.app(scope, receive, _send_wrapper)
        except Exception:
            duration = time.perf_counter() - start
            self.logger.warning(
                "%s %s -> 500 (%.3fs)",
                method,
                full_path,
                duration,
            )
            raise

        duration = time.perf_counter() - start
        self.logger.info(
            "%s %s -> %d (%.3fs)",
            method,
            full_path,
            status_code,
            duration,
        )
