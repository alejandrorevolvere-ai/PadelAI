# =============================================================================
# Stage 1: Builder — install dependencies and compile
# =============================================================================
FROM python:3.12-slim AS builder

WORKDIR /build

# Install build tools needed for native extensions (if any)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        gcc \
        libc6-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy only the dependency manifest first for layer caching
COPY requirements.txt .

# Install all dependencies into a virtual env under /build/venv
RUN python -m venv /build/venv && \
    /build/venv/bin/pip install --no-cache-dir --upgrade pip setuptools wheel && \
    /build/venv/bin/pip install --no-cache-dir -r requirements.txt

# Copy the rest of the source code
COPY . .

# Pre-compile .pyc files for faster cold starts
RUN /build/venv/bin/python -m compileall -q . 2>/dev/null || true

# =============================================================================
# Stage 2: Runtime — minimal production image
# =============================================================================
FROM python:3.12-slim AS runtime

# Create a non-root user
RUN addgroup --system --gid 1001 appuser && \
    adduser --system --uid 1001 --gid 1001 --no-create-home appuser

WORKDIR /app

# Copy virtual env and app code from builder stage
COPY --from=builder --chown=appuser:appuser /build/venv /app/venv
COPY --from=builder --chown=appuser:appuser /build/knowledge /app/knowledge
COPY --from=builder --chown=appuser:appuser /build/__init__.py /app/__init__.py
COPY --from=builder --chown=appuser:appuser /build/api /app/api
COPY --from=builder --chown=appuser:appuser /build/core /app/core
COPY --from=builder --chown=appuser:appuser /build/knowledge /app/knowledge
COPY --from=builder --chown=appuser:appuser /build/models /app/models
COPY --from=builder --chown=appuser:appuser /build/schemas /app/schemas
COPY --from=builder --chown=appuser:appuser /build/services /app/services
COPY --from=builder --chown=appuser:appuser /build/main.py /app/main.py

# Expose FastAPI port
EXPOSE 8000

# Switch to non-root user
USER appuser

# Use virtual env python
ENV PATH="/app/venv/bin:$PATH"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
