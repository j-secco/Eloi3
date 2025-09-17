"""
UR10 Robot Server - Security Configuration
==========================================

This module provides security configurations for the FastAPI robot server including:
- CORS (Cross-Origin Resource Sharing) settings
- HTTPS enforcement
- Security headers
- Rate limiting
- Authentication and authorization
- Private Network Access handling
"""

from typing import List, Optional
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
import time
import logging
from collections import defaultdict, deque
from datetime import datetime, timedelta
import hashlib
import secrets

from .config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Rate limiting storage
rate_limit_storage = defaultdict(deque)

class SecurityHeaders:
    """Security headers middleware for FastAPI"""
    
    def __init__(self, app: FastAPI):
        self.app = app
    
    async def __call__(self, request: Request, call_next):
        response = await call_next(request)
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=(), payment=(), "
            "usb=(), magnetometer=(), gyroscope=(), accelerometer=()"
        )
        
        # HTTPS enforcement
        if settings.ENFORCE_HTTPS and request.url.scheme != "https":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )
        
        # Content Security Policy
        csp_policy = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: blob:; "
            "font-src 'self' data:; "
            "connect-src 'self' ws: wss:; "
            "media-src 'self'; "
            "object-src 'none'; "
            "frame-src 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
        response.headers["Content-Security-Policy"] = csp_policy
        
        # Private Network Access
        if request.headers.get("Access-Control-Request-Private-Network"):
            response.headers["Access-Control-Allow-Private-Network"] = "true"
        
        return response

class RateLimiter:
    """Rate limiting middleware"""
    
    def __init__(
        self,
        requests_per_minute: int = 60,
        burst_size: int = 10,
        cleanup_interval: int = 300  # 5 minutes
    ):
        self.requests_per_minute = requests_per_minute
        self.burst_size = burst_size
        self.cleanup_interval = cleanup_interval
        self.last_cleanup = time.time()
    
    def _get_client_id(self, request: Request) -> str:
        """Get client identifier for rate limiting"""
        # Use X-Forwarded-For if behind proxy, otherwise use client IP
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "unknown"
        
        # Include user agent for additional uniqueness
        user_agent = request.headers.get("User-Agent", "")
        client_id = hashlib.sha256(f"{client_ip}:{user_agent}".encode()).hexdigest()[:16]
        
        return client_id
    
    def _cleanup_old_requests(self):
        """Clean up old request records"""
        current_time = time.time()
        if current_time - self.last_cleanup < self.cleanup_interval:
            return
        
        cutoff_time = current_time - 60  # Remove requests older than 1 minute
        
        for client_id in list(rate_limit_storage.keys()):
            requests = rate_limit_storage[client_id]
            while requests and requests[0] < cutoff_time:
                requests.popleft()
            
            # Remove empty entries
            if not requests:
                del rate_limit_storage[client_id]
        
        self.last_cleanup = current_time
    
    async def __call__(self, request: Request, call_next):
        # Skip rate limiting for health checks
        if request.url.path in ["/health", "/ping"]:
            return await call_next(request)
        
        client_id = self._get_client_id(request)
        current_time = time.time()
        
        # Clean up old requests periodically
        self._cleanup_old_requests()
        
        # Get client's request history
        requests = rate_limit_storage[client_id]
        
        # Remove requests older than 1 minute
        while requests and requests[0] < current_time - 60:
            requests.popleft()
        
        # Check rate limits
        if len(requests) >= self.requests_per_minute:
            logger.warning(f"Rate limit exceeded for client {client_id}")
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": "Rate limit exceeded",
                    "message": f"Maximum {self.requests_per_minute} requests per minute allowed",
                    "retry_after": 60
                },
                headers={"Retry-After": "60"}
            )
        
        # Check burst limit (requests in last 10 seconds)
        recent_requests = sum(1 for req_time in requests if req_time > current_time - 10)
        if recent_requests >= self.burst_size:
            logger.warning(f"Burst limit exceeded for client {client_id}")
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": "Burst limit exceeded",
                    "message": f"Maximum {self.burst_size} requests per 10 seconds allowed",
                    "retry_after": 10
                },
                headers={"Retry-After": "10"}
            )
        
        # Record this request
        requests.append(current_time)
        
        # Add rate limit headers to response
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(self.requests_per_minute - len(requests))
        response.headers["X-RateLimit-Reset"] = str(int(current_time + 60))
        
        return response

class APIKeyAuth:
    """API Key authentication"""
    
    def __init__(self):
        self.security = HTTPBearer(auto_error=False)
        self.api_keys = set(settings.API_KEYS) if settings.API_KEYS else set()
        
        # Generate a default API key if none configured
        if not self.api_keys:
            default_key = secrets.token_urlsafe(32)
            self.api_keys.add(default_key)
            logger.warning(f"No API keys configured. Generated default key: {default_key}")
    
    async def __call__(self, request: Request) -> Optional[str]:
        """Validate API key from request"""
        # Skip authentication for health checks and public endpoints
        if request.url.path in ["/health", "/ping", "/docs", "/openapi.json"]:
            return None
        
        # Check for API key in header
        authorization = await self.security(request)
        if authorization:
            if authorization.credentials in self.api_keys:
                return authorization.credentials
        
        # Check for API key in query parameter
        api_key = request.query_params.get("api_key")
        if api_key and api_key in self.api_keys:
            return api_key
        
        # Check for API key in custom header
        api_key = request.headers.get("X-API-Key")
        if api_key and api_key in self.api_keys:
            return api_key
        
        # No valid API key found
        if settings.REQUIRE_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or missing API key",
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        return None

def configure_cors(app: FastAPI) -> None:
    """Configure CORS middleware for the FastAPI app"""
    
    # Allowed origins for CORS
    allowed_origins = [
        "https://localhost:5173",
        "https://127.0.0.1:5173",
        "https://ur10-kiosk.local:5173",
        "https://ur10-robot.local:5173",
    ]
    
    # Add custom origins from settings
    if settings.CORS_ORIGINS:
        allowed_origins.extend(settings.CORS_ORIGINS)
    
    # Development mode: allow HTTP origins
    if settings.DEBUG:
        dev_origins = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://ur10-kiosk.local:5173",
        ]
        allowed_origins.extend(dev_origins)
        logger.warning("Debug mode: allowing HTTP origins for CORS")
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=[
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "X-API-Key",
            "Accept",
            "Origin",
            "Access-Control-Request-Method",
            "Access-Control-Request-Headers",
            "Access-Control-Request-Private-Network",
        ],
        expose_headers=[
            "X-RateLimit-Limit",
            "X-RateLimit-Remaining",
            "X-RateLimit-Reset",
            "Access-Control-Allow-Private-Network",
        ],
        max_age=86400,  # 24 hours
    )

def configure_trusted_hosts(app: FastAPI) -> None:
    """Configure trusted host middleware"""
    
    allowed_hosts = [
        "localhost",
        "127.0.0.1",
        "ur10-kiosk.local",
        "ur10-robot.local",
        "*.ur10-kiosk.local",
    ]
    
    # Add custom hosts from settings
    if settings.ALLOWED_HOSTS:
        allowed_hosts.extend(settings.ALLOWED_HOSTS)
    
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=allowed_hosts
    )

def setup_security(app: FastAPI) -> None:
    """Set up all security middleware and configurations"""
    
    logger.info("Configuring security middleware...")
    
    # Configure CORS
    configure_cors(app)
    
    # Configure trusted hosts
    configure_trusted_hosts(app)
    
    # Add security headers middleware
    app.middleware("http")(SecurityHeaders(app))
    
    # Add rate limiting middleware
    if settings.ENABLE_RATE_LIMITING:
        rate_limiter = RateLimiter(
            requests_per_minute=settings.RATE_LIMIT_PER_MINUTE,
            burst_size=settings.RATE_LIMIT_BURST
        )
        app.middleware("http")(rate_limiter)
    
    logger.info("Security middleware configured successfully")

# Exception handlers for security-related errors
async def security_exception_handler(request: Request, exc: HTTPException):
    """Handle security-related HTTP exceptions"""
    
    # Log security violations
    if exc.status_code in [401, 403, 429]:
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("User-Agent", "unknown")
        logger.warning(
            f"Security violation: {exc.status_code} - {exc.detail} "
            f"from {client_ip} ({user_agent}) accessing {request.url.path}"
        )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "Security Error",
            "message": exc.detail,
            "timestamp": datetime.utcnow().isoformat(),
            "path": str(request.url.path)
        }
    )

# Security utilities
def generate_session_token() -> str:
    """Generate a secure session token"""
    return secrets.token_urlsafe(32)

def hash_password(password: str) -> str:
    """Hash a password using a secure algorithm"""
    import bcrypt
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    import bcrypt
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def is_safe_url(url: str, allowed_hosts: List[str]) -> bool:
    """Check if a URL is safe for redirects"""
    from urllib.parse import urlparse
    
    parsed = urlparse(url)
    
    # Must be HTTPS in production
    if not settings.DEBUG and parsed.scheme != 'https':
        return False
    
    # Must be from allowed hosts
    if parsed.netloc and parsed.netloc not in allowed_hosts:
        return False
    
    return True

