# =============================================================================
# Dockerfile for Snackbar API Server
# =============================================================================
# Multi-stage build for optimized production image
# Based on C4 Architecture Section 4.3
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Builder
# -----------------------------------------------------------------------------
FROM node:24.11-alpine AS builder

WORKDIR /app

# Copy package files first (for better cache utilization)
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# -----------------------------------------------------------------------------
# Stage 2: Production
# -----------------------------------------------------------------------------
FROM node:24.11-alpine

WORKDIR /app

# Install PM2 globally and curl for healthcheck
RUN npm install -g pm2 && \
    apk add --no-cache curl

# Copy node_modules and source from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app .

# Create directories for uploads and logs
RUN mkdir -p uploads logs

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose API port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start with PM2 runtime
CMD ["pm2-runtime", "ecosystem.config.js"]
