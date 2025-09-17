"""
API Routes for UR10 Robot Server
Handles all REST endpoints for robot control, chess operations, and system management
"""

from fastapi import APIRouter, HTTPException, Depends, Header, Query
from fastapi.responses import JSONResponse
from typing import Optional, List, Dict, Any
import logging
import time
import asyncio

from models.schemas import (
    SessionStartRequest, SessionStartResponse, RobotConnectRequest,
    JogRequest, ChessMoveRequest, ChessRemoveRequest, EngineAnalyzeRequest,
    TeachPointRequest, TeachPointResponse, LimitsUpdateRequest,
    HealthResponse, LogsResponse, LogEntry, Telemetry
)
from core.config import settings

logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

# Dependency to get robot manager (will be injected by main.py)
async def get_robot_manager():
    from main import robot_manager
    return robot_manager

# Dependency to get session manager
async def get_session_manager():
    from main import session_manager
    return session_manager

# Dependency to get websocket manager
async def get_websocket_manager():
    from main import websocket_manager
    return websocket_manager

# Dependency to validate session
async def validate_session(
    session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    session_manager = Depends(get_session_manager)
):
    if not session_id:
        raise HTTPException(status_code=401, detail="Session ID required")
        
    session = await session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
        
    await session_manager.update_session_activity(session_id)
    return session

# Dependency to validate supervisor access
async def validate_supervisor(
    session = Depends(validate_session),
    session_manager = Depends(get_session_manager)
):
    if not session.is_supervisor:
        raise HTTPException(status_code=403, detail="Supervisor access required")
    return session

# Session Management Routes
@router.post("/session/start", response_model=SessionStartResponse)
async def start_session(
    request: SessionStartRequest,
    session_manager = Depends(get_session_manager)
):
    """Start a new client session"""
    try:
        session = await session_manager.create_session(
            client_id=request.client_id,
            user_agent=request.user_agent
        )
        
        return SessionStartResponse(
            session_id=session.session_id,
            expires_at=session.expires_at
        )
        
    except Exception as e:
        logger.error(f"Error starting session: {e}")
        raise HTTPException(status_code=500, detail="Failed to start session")

@router.post("/session/extend")
async def extend_session(
    additional_time: Optional[int] = Query(None, description="Additional time in seconds"),
    session = Depends(validate_session),
    session_manager = Depends(get_session_manager)
):
    """Extend current session"""
    try:
        success = await session_manager.extend_session(session.session_id, additional_time)
        
        if success:
            return {"status": "extended", "session_id": session.session_id}
        else:
            raise HTTPException(status_code=400, detail="Failed to extend session")
            
    except Exception as e:
        logger.error(f"Error extending session: {e}")
        raise HTTPException(status_code=500, detail="Failed to extend session")

@router.post("/session/supervisor")
async def authenticate_supervisor(
    pin: str = Query(..., description="Supervisor PIN"),
    session = Depends(validate_session),
    session_manager = Depends(get_session_manager)
):
    """Authenticate supervisor access"""
    try:
        success = await session_manager.authenticate_supervisor(session.session_id, pin)
        
        if success:
            return {"status": "authenticated", "is_supervisor": True}
        else:
            raise HTTPException(status_code=401, detail="Invalid supervisor PIN")
            
    except Exception as e:
        logger.error(f"Error authenticating supervisor: {e}")
        raise HTTPException(status_code=500, detail="Authentication failed")

# Robot Control Routes
@router.post("/robot/connect")
async def connect_robot(
    request: RobotConnectRequest,
    session = Depends(validate_session),
    robot_manager = Depends(get_robot_manager),
    websocket_manager = Depends(get_websocket_manager)
):
    """Connect to robot"""
    try:
        success = await robot_manager.connect_robot(request.hostname, request.port)
        
        if success:
            await websocket_manager.broadcast_alert(
                "robot_connected", 
                f"Robot connected successfully",
                "success"
            )
            return {"status": "connected"}
        else:
            raise HTTPException(status_code=400, detail="Failed to connect to robot")
            
    except Exception as e:
        logger.error(f"Error connecting to robot: {e}")
        raise HTTPException(status_code=500, detail="Connection failed")

@router.post("/robot/disconnect")
async def disconnect_robot(
    session = Depends(validate_session),
    robot_manager = Depends(get_robot_manager),
    websocket_manager = Depends(get_websocket_manager)
):
    """Disconnect from robot"""
    try:
        await robot_manager.disconnect_robot()
        
        await websocket_manager.broadcast_alert(
            "robot_disconnected",
            "Robot disconnected",
            "info"
        )
        
        return {"status": "disconnected"}
        
    except Exception as e:
        logger.error(f"Error disconnecting robot: {e}")
        raise HTTPException(status_code=500, detail="Disconnection failed")

@router.post("/robot/home")
async def home_robot(
    session = Depends(validate_session),
    robot_manager = Depends(get_robot_manager),
    websocket_manager = Depends(get_websocket_manager)
):
    """Home the robot"""
    try:
        await websocket_manager.broadcast_job_update("home", "started")
        
        success = await robot_manager.home_robot()
        
        if success:
            await websocket_manager.broadcast_job_update("home", "completed")
            await websocket_manager.broadcast_alert(
                "robot_homed",
                "Robot homed successfully",
                "success"
            )
            return {"status": "homed"}
        else:
            await websocket_manager.broadcast_job_update("home", "failed")
            raise HTTPException(status_code=400, detail="Failed to home robot")
            
    except Exception as e:
        logger.error(f"Error homing robot: {e}")
        await websocket_manager.broadcast_job_update("home", "failed")
        raise HTTPException(status_code=500, detail="Homing failed")

@router.post("/robot/jog")
async def jog_robot(
    request: JogRequest,
    session = Depends(validate_session),
    robot_manager = Depends(get_robot_manager)
):
    """Jog the robot"""
    try:
        success = await robot_manager.jog_robot(
            mode=request.mode,
            axis=request.axis,
            joint=request.joint,
            delta=request.delta,
            duration=request.duration,
            speed=request.speed,
            frame=request.frame
        )
        
        if success:
            return {"status": "jogged"}
        else:
            raise HTTPException(status_code=400, detail="Jog operation failed")
            
    except Exception as e:
        logger.error(f"Error jogging robot: {e}")
        raise HTTPException(status_code=500, detail="Jog failed")

@router.post("/robot/stop")
async def stop_robot(
    session = Depends(validate_session),
    robot_manager = Depends(get_robot_manager),
    websocket_manager = Depends(get_websocket_manager)
):
    """Stop robot movement"""
    try:
        success = await robot_manager.stop_robot()
        
        if success:
            await websocket_manager.broadcast_alert(
                "robot_stopped",
                "Robot stopped",
                "warning"
            )
            return {"status": "stopped"}
        else:
            raise HTTPException(status_code=400, detail="Failed to stop robot")
            
    except Exception as e:
        logger.error(f"Error stopping robot: {e}")
        raise HTTPException(status_code=500, detail="Stop failed")

@router.post("/robot/estop")
async def emergency_stop(
    session = Depends(validate_session),
    robot_manager = Depends(get_robot_manager),
    websocket_manager = Depends(get_websocket_manager)
):
    """Emergency stop robot"""
    try:
        success = await robot_manager.emergency_stop()
        
        if success:
            await websocket_manager.broadcast_alert(
                "emergency_stop",
                "EMERGENCY STOP ACTIVATED",
                "critical"
            )
            return {"status": "emergency_stopped"}
        else:
            raise HTTPException(status_code=400, detail="Failed to activate emergency stop")
            
    except Exception as e:
        logger.error(f"Error activating emergency stop: {e}")
        raise HTTPException(status_code=500, detail="Emergency stop failed")

@router.post("/robot/clear-estop")
async def clear_emergency_stop(
    pin: str = Query(..., description="Supervisor PIN"),
    session = Depends(validate_supervisor),
    robot_manager = Depends(get_robot_manager),
    websocket_manager = Depends(get_websocket_manager)
):
    """Clear emergency stop (requires supervisor access)"""
    try:
        success = await robot_manager.clear_estop(pin)
        
        if success:
            await websocket_manager.broadcast_alert(
                "estop_cleared",
                "Emergency stop cleared",
                "success"
            )
            return {"status": "estop_cleared"}
        else:
            raise HTTPException(status_code=400, detail="Failed to clear emergency stop")
            
    except Exception as e:
        logger.error(f"Error clearing emergency stop: {e}")
        raise HTTPException(status_code=500, detail="E-stop clear failed")

@router.post("/robot/safe-z")
async def move_to_safe_z(
    session = Depends(validate_session),
    robot_manager = Depends(get_robot_manager)
):
    """Move robot to safe Z position"""
    try:
        success = await robot_manager.move_to_safe_z()
        
        if success:
            return {"status": "moved_to_safe_z"}
        else:
            raise HTTPException(status_code=400, detail="Failed to move to safe Z")
            
    except Exception as e:
        logger.error(f"Error moving to safe Z: {e}")
        raise HTTPException(status_code=500, detail="Safe Z movement failed")

# Chess Operations Routes
@router.post("/chess/move")
async def chess_move(
    request: ChessMoveRequest,
    session = Depends(validate_session),
    robot_manager = Depends(get_robot_manager),
    websocket_manager = Depends(get_websocket_manager)
):
    """Execute a chess move"""
    try:
        move_id = f"move_{int(time.time())}"
        
        await websocket_manager.broadcast_job_update(
            move_id, "started", 0.0,
            {"from": request.from_square, "to": request.to_square}
        )
        
        # Execute move through adapter
        if robot_manager.adapter:
            success = await robot_manager.adapter.chess_move(
                request.from_square,
                request.to_square,
                request.promotion
            )
        else:
            success = False
            
        if success:
            await websocket_manager.broadcast_job_update(move_id, "completed", 100.0)
            await websocket_manager.broadcast_alert(
                "chess_move",
                f"Move {request.from_square}-{request.to_square} completed",
                "success"
            )
            return {"status": "move_completed", "move": f"{request.from_square}{request.to_square}"}
        else:
            await websocket_manager.broadcast_job_update(move_id, "failed")
            raise HTTPException(status_code=400, detail="Chess move failed")
            
    except Exception as e:
        logger.error(f"Error executing chess move: {e}")
        raise HTTPException(status_code=500, detail="Chess move failed")

@router.post("/chess/remove")
async def remove_piece(
    request: ChessRemoveRequest,
    session = Depends(validate_session),
    robot_manager = Depends(get_robot_manager),
    websocket_manager = Depends(get_websocket_manager)
):
    """Remove a piece from the chess board"""
    try:
        remove_id = f"remove_{int(time.time())}"
        
        await websocket_manager.broadcast_job_update(
            remove_id, "started", 0.0,
            {"square": request.square}
        )
        
        # Execute removal through adapter
        if robot_manager.adapter:
            success = await robot_manager.adapter.chess_remove_piece(request.square)
        else:
            success = False
            
        if success:
            await websocket_manager.broadcast_job_update(remove_id, "completed", 100.0)
            await websocket_manager.broadcast_alert(
                "piece_removed",
                f"Piece removed from {request.square}",
                "success"
            )
            return {"status": "piece_removed", "square": request.square}
        else:
            await websocket_manager.broadcast_job_update(remove_id, "failed")
            raise HTTPException(status_code=400, detail="Piece removal failed")
            
    except Exception as e:
        logger.error(f"Error removing piece: {e}")
        raise HTTPException(status_code=500, detail="Piece removal failed")

@router.get("/chess/board")
async def get_board_state(
    session = Depends(validate_session),
    robot_manager = Depends(get_robot_manager)
):
    """Get current chess board state"""
    try:
        if robot_manager.adapter:
            board_state = await robot_manager.adapter.get_board_state()
            return board_state
        else:
            raise HTTPException(status_code=503, detail="Robot adapter not available")
            
    except Exception as e:
        logger.error(f"Error getting board state: {e}")
        raise HTTPException(status_code=500, detail="Failed to get board state")

@router.post("/chess/analyze")
async def analyze_position(
    request: EngineAnalyzeRequest,
    session = Depends(validate_session),
    robot_manager = Depends(get_robot_manager),
    websocket_manager = Depends(get_websocket_manager)
):
    """Analyze chess position"""
    try:
        if robot_manager.adapter:
            # Start analysis
            await websocket_manager.broadcast_analysis("position_analysis", {"status": "started"})
            
            result = await robot_manager.adapter.analyze_position(
                request.fen,
                request.depth,
                request.time
            )
            
            # Broadcast result
            await websocket_manager.broadcast_analysis("position_analysis", {
                "status": "completed",
                "result": result
            })
            
            return result
        else:
            raise HTTPException(status_code=503, detail="Chess engine not available")
            
    except Exception as e:
        logger.error(f"Error analyzing position: {e}")
        raise HTTPException(status_code=500, detail="Analysis failed")

# System Management Routes
@router.get("/system/health", response_model=HealthResponse)
async def health_check(
    robot_manager = Depends(get_robot_manager),
    session_manager = Depends(get_session_manager),
    websocket_manager = Depends(get_websocket_manager)
):
    """System health check"""
    try:
        return HealthResponse(
            status="healthy",
            robot_connected=robot_manager.is_connected(),
            rtde_connected=robot_manager.is_connected(),  # Simplified
            engine_available=robot_manager.adapter is not None,
            camera_available=False,  # Not implemented yet
            uptime=time.time() - robot_manager.last_telemetry_time if robot_manager.last_telemetry_time else 0
        )
        
    except Exception as e:
        logger.error(f"Error in health check: {e}")
        raise HTTPException(status_code=500, detail="Health check failed")

@router.get("/system/telemetry", response_model=Telemetry)
async def get_telemetry(
    session = Depends(validate_session),
    robot_manager = Depends(get_robot_manager)
):
    """Get current system telemetry"""
    try:
        telemetry = await robot_manager.get_telemetry()
        return telemetry
        
    except Exception as e:
        logger.error(f"Error getting telemetry: {e}")
        raise HTTPException(status_code=500, detail="Failed to get telemetry")

@router.get("/system/logs", response_model=LogsResponse)
async def get_logs(
    limit: int = Query(100, description="Maximum number of log entries"),
    session_id: Optional[str] = Query(None, description="Filter by session ID"),
    session = Depends(validate_session),
    session_manager = Depends(get_session_manager)
):
    """Get system logs"""
    try:
        if session_id:
            logs_data = await session_manager.get_session_logs(session_id, limit)
        else:
            logs_data = await session_manager.get_all_logs(limit)
            
        # Convert to LogEntry format
        logs = [
            LogEntry(
                timestamp=log["timestamp"],
                level="INFO",  # Simplified
                message=f"{log['event_type']}: {log.get('data', {})}",
                session_id=log.get("session_id")
            )
            for log in logs_data
        ]
        
        return LogsResponse(
            logs=logs,
            total=len(logs_data),
            limit=limit
        )
        
    except Exception as e:
        logger.error(f"Error getting logs: {e}")
        raise HTTPException(status_code=500, detail="Failed to get logs")

@router.get("/system/connections")
async def get_connections(
    session = Depends(validate_supervisor),
    websocket_manager = Depends(get_websocket_manager)
):
    """Get WebSocket connection information (supervisor only)"""
    try:
        stats = websocket_manager.get_connection_stats()
        connections = await websocket_manager.get_connection_info()
        
        return {
            "stats": stats,
            "connections": connections
        }
        
    except Exception as e:
        logger.error(f"Error getting connections: {e}")
        raise HTTPException(status_code=500, detail="Failed to get connections")

# Configuration Routes
@router.post("/config/limits")
async def update_safety_limits(
    request: LimitsUpdateRequest,
    session = Depends(validate_supervisor),
    robot_manager = Depends(get_robot_manager),
    websocket_manager = Depends(get_websocket_manager)
):
    """Update safety limits (supervisor only)"""
    try:
        success = await robot_manager.update_safety_limits(request.limits, request.pin)
        
        if success:
            await websocket_manager.broadcast_alert(
                "limits_updated",
                "Safety limits updated",
                "info"
            )
            return {"status": "limits_updated"}
        else:
            raise HTTPException(status_code=400, detail="Failed to update limits")
            
    except Exception as e:
        logger.error(f"Error updating limits: {e}")
        raise HTTPException(status_code=500, detail="Limits update failed")

@router.get("/config/current")
async def get_current_config(
    session = Depends(validate_session)
):
    """Get current configuration"""
    try:
        return {
            "robot_hostname": settings.robot_hostname,
            "robot_port": settings.robot_port,
            "mock_mode": settings.mock_mode,
            "rtde_frequency": settings.rtde_frequency,
            "move_speed": settings.move_speed,
            "move_acceleration": settings.move_acceleration
        }
        
    except Exception as e:
        logger.error(f"Error getting config: {e}")
        raise HTTPException(status_code=500, detail="Failed to get config")

