# ============================================================================
# UR10 Robot Server - Docker Image
# ============================================================================
# Multi-stage Docker build for the FastAPI robot server
# Optimized for production deployment with security and performance
# ============================================================================

# Build stage
FROM python:3.11-slim as builder

# Set build arguments
ARG BUILD_DATE
ARG VERSION=1.0.0
ARG VCS_REF

# Add metadata
LABEL maintainer="UR10 Kiosk Team" \
      org.label-schema.build-date=$BUILD_DATE \
      org.label-schema.name="ur10-robot-server" \
      org.label-schema.description="FastAPI server for UR10 robot control" \
      org.label-schema.version=$VERSION \
      org.label-schema.vcs-ref=$VCS_REF \
      org.label-schema.schema-version="1.0"

# Install system dependencies for building
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    g++ \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY apps/robot-server/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.11-slim as production

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user for security
RUN groupadd -r ur10robot && \
    useradd -r -g ur10robot -d /app -s /bin/bash ur10robot

# Set working directory
WORKDIR /app

# Copy Python packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY apps/robot-server/ .
COPY packages/types/src/ ./types/

# Create necessary directories
RUN mkdir -p logs static uploads && \
    chown -R ur10robot:ur10robot /app

# Copy certificates if they exist
COPY deployment/security/certificates/*.pem ./certs/ 2>/dev/null || true

# Set proper permissions
RUN chmod +x start.py && \
    chown -R ur10robot:ur10robot /app

# Switch to non-root user
USER ur10robot

# Set environment variables
ENV PYTHONPATH=/app \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    HOST=0.0.0.0 \
    PORT=8000 \
    LOG_LEVEL=INFO \
    WORKERS=1

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Expose port
EXPOSE 8000

# Default command
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]

