"""
UR10 Robot Server - Main FastAPI Application
============================================

This is the main FastAPI application that provides a REST API and WebSocket interface
for controlling the UR10 robot. It includes:

- Robot control endpoints (move, stop, get status)
- Chess game integration
- Real-time telemetry via WebSocket
- Session management
- Security and CORS configuration
- Comprehensive error handling
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import asyncio
import uvicorn

from core.config import settings
from core.robot_manager import RobotManager
from core.session_manager import SessionManager
from core.security import setup_security, security_exception_handler, APIKeyAuth
from api.routes import router as api_router
from api.websocket import WebSocketManager
from models.schemas import ErrorResponse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global managers
robot_manager = RobotManager()
session_manager = SessionManager()
websocket_manager = WebSocketManager()
api_key_auth = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global api_key_auth
    
    logger.info("Starting UR10 Robot Server...")
    
    # Initialize API key authentication
    api_key_auth = APIKeyAuth()
    
    # Initialize robot manager
    try:
        await robot_manager.initialize()
        logger.info("Robot manager initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize robot manager: {e}")
        if not settings.ALLOW_MOCK_ROBOT:
            raise
    
    # Start telemetry broadcasting
    asyncio.create_task(broadcast_telemetry())
    
    # Store managers in app state
    app.state.robot_manager = robot_manager
    app.state.session_manager = session_manager
    app.state.websocket_manager = websocket_manager
    app.state.api_key_auth = api_key_auth
    
    logger.info("UR10 Robot Server started successfully")
    
    yield
    
    # Cleanup
    logger.info("Shutting down UR10 Robot Server...")
    
    await robot_manager.cleanup()
    await session_manager.cleanup()
    
    logger.info("UR10 Robot Server shutdown complete")

async def broadcast_telemetry():
    """Broadcast telemetry data to all connected WebSocket clients"""
    while True:
        try:
            if robot_manager.is_connected():
                telemetry = await robot_manager.get_telemetry()
                await websocket_manager.broadcast_telemetry(telemetry)
            await asyncio.sleep(0.1)  # 10Hz telemetry
        except Exception as e:
            logger.error(f"Error broadcasting telemetry: {e}")
            await asyncio.sleep(1)

# Create FastAPI application
app = FastAPI(
    title="UR10 Robot Server",
    description="REST API and WebSocket interface for UR10 robot control",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
    lifespan=lifespan
)

# Set up security middleware
setup_security(app)

# Add exception handlers
app.add_exception_handler(HTTPException, security_exception_handler)

# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "ur10-robot-server",
        "version": "1.0.0",
        "robot_connected": robot_manager.is_connected(),
        "active_sessions": session_manager.get_active_session_count(),
        "websocket_connections": websocket_manager.get_connection_count(),
        "timestamp": "2025-09-09T16:00:00Z"
    }

# Ping endpoint
@app.get("/ping", tags=["Health"])
async def ping():
    """Simple ping endpoint"""
    return {"message": "pong"}

# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information"""
    return {
        "message": "UR10 Robot Server API",
        "version": "1.0.0",
        "docs": "/docs" if settings.DEBUG else "Documentation disabled in production",
        "health": "/health",
        "websocket": "/ws"
    }

# Include API routes
app.include_router(api_router, prefix="/api/v1", tags=["API"])

# WebSocket endpoint for telemetry
@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    await websocket_manager.connect_telemetry(websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        websocket_manager.disconnect_telemetry(websocket)

# WebSocket endpoint for alerts
@app.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    await websocket_manager.connect_alerts(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        websocket_manager.disconnect_alerts(websocket)

# WebSocket endpoint for job updates
@app.websocket("/ws/job")
async def websocket_job(websocket: WebSocket):
    await websocket_manager.connect_job(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        websocket_manager.disconnect_job(websocket)

# WebSocket endpoint for analysis updates
@app.websocket("/ws/analysis")
async def websocket_analysis(websocket: WebSocket):
    await websocket_manager.connect_analysis(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        websocket_manager.disconnect_analysis(websocket)

# Serve static files in development
if settings.DEBUG:
    try:
        app.mount("/static", StaticFiles(directory="static"), name="static")
    except RuntimeError:
        # Static directory doesn't exist, which is fine
        pass

# Custom error handler for validation errors
@app.exception_handler(422)
async def validation_exception_handler(request: Request, exc):
    """Handle validation errors"""
    logger.warning(f"Validation error on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=422,
        content={
            "error": "Validation Error",
            "message": "Invalid request data",
            "details": exc.errors() if hasattr(exc, 'errors') else str(exc),
            "timestamp": "2025-09-09T16:00:00Z"
        }
    )

# Custom error handler for general exceptions
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception on {request.url.path}: {exc}", exc_info=True)
    
    # Don't expose internal errors in production
    if settings.DEBUG:
        error_detail = str(exc)
    else:
        error_detail = "Internal server error"
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": error_detail,
            "timestamp": "2025-09-09T16:00:00Z"
        }
    )

# Dependency to get robot manager
async def get_robot_manager(request: Request) -> RobotManager:
    """Dependency to get robot manager from app state"""
    return request.app.state.robot_manager

# Dependency to get session manager
async def get_session_manager(request: Request) -> SessionManager:
    """Dependency to get session manager from app state"""
    return request.app.state.session_manager

# Dependency to get API key auth
async def get_api_key_auth(request: Request) -> APIKeyAuth:
    """Dependency to get API key auth from app state"""
    return request.app.state.api_key_auth

if __name__ == "__main__":
    # Run the server
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        ssl_keyfile=settings.SSL_KEYFILE if settings.SSL_KEYFILE else None,
        ssl_certfile=settings.SSL_CERTFILE if settings.SSL_CERTFILE else None,
        log_level="info" if settings.DEBUG else "warning",
        access_log=settings.DEBUG,
        server_header=False,
        date_header=False
    )

