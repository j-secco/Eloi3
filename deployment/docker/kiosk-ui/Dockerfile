# ============================================================================
# UR10 Kiosk UI - Docker Image
# ============================================================================
# Multi-stage Docker build for the React/Vite kiosk UI
# Optimized for production deployment with nginx serving
# ============================================================================

# Build stage
FROM node:18-alpine as builder

# Set build arguments
ARG BUILD_DATE
ARG VERSION=1.0.0
ARG VCS_REF
ARG VITE_API_BASE_URL=https://localhost:8000
ARG VITE_WS_URL=wss://localhost:8000

# Add metadata
LABEL maintainer="UR10 Kiosk Team" \
      org.label-schema.build-date=$BUILD_DATE \
      org.label-schema.name="ur10-kiosk-ui" \
      org.label-schema.description="React PWA for UR10 robot kiosk interface" \
      org.label-schema.version=$VERSION \
      org.label-schema.vcs-ref=$VCS_REF \
      org.label-schema.schema-version="1.0"

# Install build dependencies
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++

# Set working directory
WORKDIR /app

# Copy package files
COPY apps/kiosk-ui/package*.json ./
COPY apps/kiosk-ui/pnpm-lock.yaml* ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy shared types
COPY packages/types/ ../packages/types/

# Copy source code
COPY apps/kiosk-ui/ .

# Set build environment variables
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_WS_URL=$VITE_WS_URL \
    NODE_ENV=production

# Build the application
RUN pnpm run build

# Production stage
FROM nginx:alpine as production

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    ca-certificates

# Create nginx user and directories
RUN addgroup -g 1001 -S nginx-kiosk && \
    adduser -S -D -H -u 1001 -h /var/cache/nginx -s /sbin/nologin -G nginx-kiosk -g nginx-kiosk nginx-kiosk

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY deployment/docker/nginx/nginx.conf /etc/nginx/nginx.conf
COPY deployment/docker/nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy SSL certificates if they exist
COPY deployment/security/certificates/*.pem /etc/nginx/ssl/ 2>/dev/null || true

# Create necessary directories
RUN mkdir -p /var/cache/nginx /var/log/nginx /var/run/nginx && \
    chown -R nginx-kiosk:nginx-kiosk /var/cache/nginx /var/log/nginx /var/run/nginx /usr/share/nginx/html

# Set proper permissions
RUN chmod -R 755 /usr/share/nginx/html && \
    chmod 644 /etc/nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/health || exit 1

# Expose ports
EXPOSE 80 443

# Switch to non-root user
USER nginx-kiosk

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

