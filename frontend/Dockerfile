# =============================================================================
# Stage 1: Builder — install deps and build the Next.js app
# =============================================================================
FROM node:22-alpine AS builder

WORKDIR /build

# Copy only the dependency manifest for optimal layer caching
COPY package.json package-lock.json ./

# Install ONLY production dependencies first (layer caching)
RUN npm ci --omit=dev

# Now install dev dependencies for building
RUN npm ci --include=dev

# Copy the rest of the source code
COPY . .

# Build the Next.js app (standalone output — configured in next.config.ts)
RUN npm run build

# =============================================================================
# Stage 2: Runtime — distroless Node.js for production
# =============================================================================
FROM gcr.io/distroless/nodejs22-debian12:nonroot AS runtime

WORKDIR /app

# Copy standalone output from builder
# Next.js "output: standalone" generates:
#   .next/standalone/   — the server and copied dependencies
#   .next/static/       — static assets (referenced from standalone metadata)
COPY --from=builder /build/.next/standalone ./
COPY --from=builder /build/.next/static ./.next/static
COPY --from=builder /build/public ./public

# Expose Next.js default port
EXPOSE 3000

# Distroless images don't have a shell — use the nonroot user implicitly
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# The standalone output creates server.js at the root of standalone/
CMD ["server.js"]
