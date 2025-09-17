"""
Pydantic models for UR10 Robot Server API
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
from enum import Enum
import time

# Enums
class RobotState(str, Enum):
    IDLE = "IDLE"
    CONNECTING = "CONNECTING"
    READY = "READY"
    EXECUTING = "EXECUTING"
    PAUSED = "PAUSED"
    FAULT = "FAULT"
    ESTOP = "ESTOP"

class JogMode(str, Enum):
    TCP = "tcp"
    JOINT = "joint"

class ChessTurn(str, Enum):
    WHITE = "w"
    BLACK = "b"

# Base models
class TCPPose(BaseModel):
    """Tool Center Point pose"""
    x: float = Field(..., description="X position in meters")
    y: float = Field(..., description="Y position in meters")
    z: float = Field(..., description="Z position in meters")
    rx: float = Field(..., description="RX rotation in radians")
    ry: float = Field(..., description="RY rotation in radians")
    rz: float = Field(..., description="RZ rotation in radians")

class JointPositions(BaseModel):
    """Joint positions"""
    joints: List[float] = Field(..., description="Joint positions in radians", min_items=6, max_items=6)

class IOMap(BaseModel):
    """Digital I/O mapping"""
    di: List[bool] = Field(default_factory=list, description="Digital inputs")
    do: List[bool] = Field(default_factory=list, description="Digital outputs")

class EStopStatus(BaseModel):
    """Emergency stop status"""
    hw: bool = Field(..., description="Hardware E-stop status")
    sw: bool = Field(..., description="Software E-stop status")

class SafetyLimits(BaseModel):
    """Safety limits configuration"""
    speed_max: float = Field(..., description="Maximum speed in m/s")
    z_min: float = Field(..., description="Minimum Z position in meters")
    z_max: float = Field(..., description="Maximum Z position in meters")
    keepout: List[Dict[str, Any]] = Field(default_factory=list, description="Keep-out volumes")

class ProgramStatus(BaseModel):
    """Program execution status"""
    name: Optional[str] = Field(None, description="Program name")
    step: Optional[str] = Field(None, description="Current step")
    progress: Optional[float] = Field(None, description="Progress percentage (0-100)")

class BoardState(BaseModel):
    """Chess board state"""
    fen: str = Field(..., description="FEN notation of board state")
    turn: ChessTurn = Field(..., description="Whose turn it is")
    move_no: int = Field(..., description="Move number")

class QueueStatus(BaseModel):
    """Job queue status"""
    pending: int = Field(..., description="Number of pending jobs")
    active: Optional[str] = Field(None, description="Currently active job")

class EngineStatus(BaseModel):
    """Chess engine status"""
    running: bool = Field(..., description="Whether engine is running")
    eval: Optional[float] = Field(None, description="Current evaluation")
    bestmove: Optional[str] = Field(None, description="Best move in UCI format")
    depth: Optional[int] = Field(None, description="Search depth")

class NetworkStatus(BaseModel):
    """Network status"""
    rtt_ms: float = Field(..., description="Round-trip time in milliseconds")
    server_time: float = Field(default_factory=time.time, description="Server timestamp")

# Main telemetry model
class Telemetry(BaseModel):
    """Main telemetry data structure"""
    state: RobotState = Field(..., description="Robot state")
    program: ProgramStatus = Field(default_factory=ProgramStatus, description="Program status")
    joints: List[float] = Field(..., description="Joint positions", min_items=6, max_items=6)
    tcp_pose: TCPPose = Field(..., description="TCP pose")
    tcp_speed: float = Field(..., description="TCP speed in m/s")
    iomap: IOMap = Field(default_factory=IOMap, description="I/O mapping")
    estop: EStopStatus = Field(..., description="E-stop status")
    limits: SafetyLimits = Field(..., description="Safety limits")
    board: BoardState = Field(..., description="Chess board state")
    queue: QueueStatus = Field(..., description="Job queue status")
    engine: EngineStatus = Field(default_factory=EngineStatus, description="Chess engine status")
    net: NetworkStatus = Field(default_factory=NetworkStatus, description="Network status")
    errors: List[str] = Field(default_factory=list, description="Error messages")

# Request models
class SessionStartRequest(BaseModel):
    """Session start request"""
    client_id: Optional[str] = Field(None, description="Client identifier")
    user_agent: Optional[str] = Field(None, description="User agent string")

class RobotConnectRequest(BaseModel):
    """Robot connection request"""
    hostname: Optional[str] = Field(None, description="Robot hostname/IP")
    port: Optional[int] = Field(None, description="Robot port")

class JogRequest(BaseModel):
    """Robot jog request"""
    mode: JogMode = Field(..., description="Jog mode (tcp or joint)")
    axis: Optional[str] = Field(None, description="TCP axis (x, y, z, rx, ry, rz)")
    joint: Optional[int] = Field(None, description="Joint number (0-5)")
    delta: Optional[float] = Field(None, description="Delta movement")
    duration: Optional[float] = Field(None, description="Movement duration")
    speed: float = Field(..., description="Movement speed")
    frame: Optional[str] = Field("base", description="Reference frame")

class ChessMoveRequest(BaseModel):
    """Chess move request"""
    from_square: str = Field(..., description="From square (e.g., 'e2')", regex=r"^[a-h][1-8]$")
    to_square: str = Field(..., description="To square (e.g., 'e4')", regex=r"^[a-h][1-8]$")
    promotion: Optional[str] = Field(None, description="Promotion piece (q, r, b, n)")

class ChessRemoveRequest(BaseModel):
    """Chess piece removal request"""
    square: str = Field(..., description="Square to remove piece from", regex=r"^[a-h][1-8]$")

class EngineAnalyzeRequest(BaseModel):
    """Engine analysis request"""
    fen: str = Field(..., description="FEN position to analyze")
    depth: Optional[int] = Field(None, description="Analysis depth")
    time: Optional[float] = Field(None, description="Analysis time in seconds")

class TeachPointRequest(BaseModel):
    """Teach point request"""
    name: str = Field(..., description="Point name")
    pose: TCPPose = Field(..., description="TCP pose")
    pin: str = Field(..., description="Supervisor PIN")

class LimitsUpdateRequest(BaseModel):
    """Safety limits update request"""
    limits: SafetyLimits = Field(..., description="New safety limits")
    pin: str = Field(..., description="Supervisor PIN")

# Response models
class SessionStartResponse(BaseModel):
    """Session start response"""
    session_id: str = Field(..., description="Session identifier")
    expires_at: float = Field(..., description="Session expiration timestamp")

class HealthResponse(BaseModel):
    """Health check response"""
    status: str = Field(..., description="Health status")
    robot_connected: bool = Field(..., description="Robot connection status")
    rtde_connected: bool = Field(..., description="RTDE connection status")
    engine_available: bool = Field(..., description="Chess engine availability")
    camera_available: bool = Field(..., description="Camera availability")
    uptime: float = Field(..., description="Server uptime in seconds")

class TeachPointResponse(BaseModel):
    """Teach point response"""
    name: str = Field(..., description="Point name")
    pose: TCPPose = Field(..., description="TCP pose")
    created_at: float = Field(..., description="Creation timestamp")

class LogEntry(BaseModel):
    """Log entry"""
    timestamp: float = Field(..., description="Log timestamp")
    level: str = Field(..., description="Log level")
    message: str = Field(..., description="Log message")
    session_id: Optional[str] = Field(None, description="Session ID")

class LogsResponse(BaseModel):
    """Logs response"""
    logs: List[LogEntry] = Field(..., description="Log entries")
    total: int = Field(..., description="Total log entries")
    limit: int = Field(..., description="Response limit")

# WebSocket message models
class WebSocketMessage(BaseModel):
    """Base WebSocket message"""
    type: str = Field(..., description="Message type")
    timestamp: float = Field(default_factory=time.time, description="Message timestamp")
    data: Dict[str, Any] = Field(..., description="Message data")

class TelemetryMessage(WebSocketMessage):
    """Telemetry WebSocket message"""
    type: Literal["telemetry"] = "telemetry"
    data: Telemetry = Field(..., description="Telemetry data")

class AlertMessage(WebSocketMessage):
    """Alert WebSocket message"""
    type: Literal["alert"] = "alert"
    data: Dict[str, Any] = Field(..., description="Alert data")

class JobMessage(WebSocketMessage):
    """Job WebSocket message"""
    type: Literal["job"] = "job"
    data: Dict[str, Any] = Field(..., description="Job data")

class AnalysisMessage(WebSocketMessage):
    """Analysis WebSocket message"""
    type: Literal["analysis"] = "analysis"
    data: Dict[str, Any] = Field(..., description="Analysis data")

