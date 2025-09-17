"""
UR10 Kiosk PWA - Python Type Definitions

This module provides Python type definitions that correspond to the TypeScript
types defined in packages/types. These ensure type safety and consistency
between the FastAPI backend and the React frontend.
"""

from typing import Dict, List, Optional, Union, Literal, Any
from enum import Enum
from pydantic import BaseModel, Field
from datetime import datetime

# ============================================================================
# Robot Connection and State Types
# ============================================================================

class RobotConnectionState(str, Enum):
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    ERROR = "error"

class RobotState(str, Enum):
    IDLE = "IDLE"
    RUNNING = "RUNNING"
    PAUSED = "PAUSED"
    STOPPED = "STOPPED"
    ERROR = "ERROR"
    EMERGENCY_STOP = "EMERGENCY_STOP"
    PROTECTIVE_STOP = "PROTECTIVE_STOP"
    SAFEGUARD_STOP = "SAFEGUARD_STOP"
    VIOLATION = "VIOLATION"
    FAULT = "FAULT"
    BOOTING = "BOOTING"
    POWER_OFF = "POWER_OFF"
    POWER_ON = "POWER_ON"
    BACKDRIVE = "BACKDRIVE"
    UPDATING_FIRMWARE = "UPDATING_FIRMWARE"

class SafetyMode(str, Enum):
    NORMAL = "NORMAL"
    REDUCED = "REDUCED"
    PROTECTIVE_STOP = "PROTECTIVE_STOP"
    RECOVERY = "RECOVERY"
    SAFEGUARD_STOP = "SAFEGUARD_STOP"
    SYSTEM_EMERGENCY_STOP = "SYSTEM_EMERGENCY_STOP"
    ROBOT_EMERGENCY_STOP = "ROBOT_EMERGENCY_STOP"
    VIOLATION = "VIOLATION"
    FAULT = "FAULT"
    VALIDATE_JOINT_ID = "VALIDATE_JOINT_ID"
    UNDEFINED_SAFETY_MODE = "UNDEFINED_SAFETY_MODE"

# ============================================================================
# Robot Telemetry and Position Types
# ============================================================================

class Vector3D(BaseModel):
    x: float
    y: float
    z: float

class Rotation3D(BaseModel):
    rx: float
    ry: float
    rz: float

class Pose6D(BaseModel):
    x: float
    y: float
    z: float
    rx: float
    ry: float
    rz: float

class JointPositions(BaseModel):
    base: float
    shoulder: float
    elbow: float
    wrist1: float
    wrist2: float
    wrist3: float

class RobotTelemetry(BaseModel):
    timestamp: int
    connectionState: RobotConnectionState
    robotState: RobotState
    safetyMode: SafetyMode
    
    # Position data
    tcpPosition: Pose6D
    jointPositions: JointPositions
    jointVelocities: JointPositions
    jointCurrents: JointPositions
    jointTemperatures: JointPositions
    
    # Status flags
    isEmergencyStop: bool
    isProtectiveStop: bool
    isProgramRunning: bool
    isRobotConnected: bool
    
    # Program info
    currentProgram: Optional[str] = None
    programState: Optional[str] = None
    
    # Error information
    lastError: Optional[str] = None
    errorCode: Optional[int] = None

# ============================================================================
# Robot Control and Movement Types
# ============================================================================

class JogMode(str, Enum):
    TCP = "tcp"
    JOINT = "joint"

class JogAxis(str, Enum):
    X = "x"
    Y = "y"
    Z = "z"
    RX = "rx"
    RY = "ry"
    RZ = "rz"
    BASE = "base"
    SHOULDER = "shoulder"
    ELBOW = "elbow"
    WRIST1 = "wrist1"
    WRIST2 = "wrist2"
    WRIST3 = "wrist3"

class JogDirection(str, Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"

class JogRequest(BaseModel):
    mode: JogMode
    axis: JogAxis
    direction: JogDirection
    distance: float = Field(gt=0)
    speed: float = Field(gt=0)
    acceleration: Optional[float] = Field(default=None, gt=0)

class MoveType(str, Enum):
    LINEAR = "linear"
    JOINT = "joint"
    CIRCULAR = "circular"

class MoveRequest(BaseModel):
    target: Union[Pose6D, JointPositions]
    speed: float = Field(gt=0)
    acceleration: float = Field(gt=0)
    blend: Optional[float] = Field(default=None, ge=0)
    moveType: MoveType

class WorkspaceLimits(BaseModel):
    min: Vector3D
    max: Vector3D

class JointLimits(BaseModel):
    min: JointPositions
    max: JointPositions

class SafetyLimits(BaseModel):
    workspace: WorkspaceLimits
    jointLimits: JointLimits

class RobotParameters(BaseModel):
    maxSpeed: float = Field(gt=0)
    maxAcceleration: float = Field(gt=0)
    defaultSpeed: float = Field(gt=0)
    defaultAcceleration: float = Field(gt=0)
    jogDistance: float = Field(gt=0)
    jogSpeed: float = Field(gt=0)
    safetyLimits: SafetyLimits

# ============================================================================
# Chess Game Types
# ============================================================================

class ChessPiece(str, Enum):
    PAWN = "pawn"
    ROOK = "rook"
    KNIGHT = "knight"
    BISHOP = "bishop"
    QUEEN = "queen"
    KING = "king"

class ChessColor(str, Enum):
    WHITE = "white"
    BLACK = "black"

class ChessPieceInfo(BaseModel):
    piece: ChessPiece
    color: ChessColor
    square: str = Field(regex=r'^[a-h][1-8]$')

class ChessMove(BaseModel):
    from_square: str = Field(alias="from", regex=r'^[a-h][1-8]$')
    to_square: str = Field(alias="to", regex=r'^[a-h][1-8]$')
    piece: ChessPiece
    captured: Optional[ChessPiece] = None
    promotion: Optional[ChessPiece] = None
    castling: Optional[Literal["kingside", "queenside"]] = None
    enPassant: Optional[bool] = None
    check: Optional[bool] = None
    checkmate: Optional[bool] = None
    stalemate: Optional[bool] = None
    san: str  # Standard Algebraic Notation
    uci: str  # Universal Chess Interface notation

    class Config:
        allow_population_by_field_name = True

class GameMode(str, Enum):
    HUMAN = "human"
    ENGINE = "engine"

class GameStatus(str, Enum):
    WAITING = "waiting"
    ACTIVE = "active"
    PAUSED = "paused"
    FINISHED = "finished"
    ABORTED = "aborted"

class GameResult(str, Enum):
    WHITE_WINS = "1-0"
    BLACK_WINS = "0-1"
    DRAW = "1/2-1/2"
    ONGOING = "*"

class GameTermination(str, Enum):
    CHECKMATE = "checkmate"
    STALEMATE = "stalemate"
    RESIGNATION = "resignation"
    TIMEOUT = "timeout"
    DRAW = "draw"
    ABORTED = "aborted"

class ChessGameState(BaseModel):
    gameId: str
    mode: GameMode
    status: GameStatus
    currentPlayer: ChessColor
    board: List[List[Optional[ChessPieceInfo]]]
    moves: List[ChessMove]
    fen: str  # Forsyth-Edwards Notation
    pgn: str  # Portable Game Notation
    
    # Game result
    winner: Optional[Union[ChessColor, Literal["draw"]]] = None
    result: Optional[GameResult] = None
    termination: Optional[GameTermination] = None
    
    # Engine info
    engineDepth: Optional[int] = None
    engineEvaluation: Optional[float] = None
    engineBestMove: Optional[str] = None
    engineThinking: Optional[bool] = None
    
    # Robot execution
    robotExecuting: Optional[bool] = None
    lastRobotMove: Optional[ChessMove] = None
    robotMoveQueue: List[ChessMove] = Field(default_factory=list)

# ============================================================================
# Session and Authentication Types
# ============================================================================

class UserRole(str, Enum):
    OPERATOR = "operator"
    SUPERVISOR = "supervisor"
    ADMIN = "admin"

class SessionInfo(BaseModel):
    sessionId: str
    userId: Optional[str] = None
    role: UserRole
    isLocked: bool
    isSupervisor: bool
    loginTime: int
    lastActivity: int
    ipAddress: Optional[str] = None
    userAgent: Optional[str] = None

class AuthRequest(BaseModel):
    pin: str = Field(min_length=4, max_length=8)
    role: Optional[UserRole] = None
    sessionId: Optional[str] = None

class AuthResponse(BaseModel):
    success: bool
    sessionId: Optional[str] = None
    role: Optional[UserRole] = None
    message: Optional[str] = None
    expiresAt: Optional[int] = None

# ============================================================================
# System Configuration Types
# ============================================================================

class RobotConnectionConfig(BaseModel):
    hostname: str = Field(default="192.168.1.100")
    port: int = Field(default=30004, ge=1, le=65535)
    timeout: int = Field(default=5000, gt=0)
    retryAttempts: int = Field(default=3, ge=0)
    retryDelay: int = Field(default=1000, gt=0)

class SecurityConfig(BaseModel):
    operatorPin: str = Field(default="1234", min_length=4, max_length=8)
    supervisorPin: str = Field(default="5678", min_length=4, max_length=8)
    adminPin: str = Field(default="9999", min_length=4, max_length=8)
    autoLockEnabled: bool = Field(default=True)
    autoLockTimeout: int = Field(default=5, gt=0)  # minutes
    maxFailedAttempts: int = Field(default=3, gt=0)
    lockoutDuration: int = Field(default=15, gt=0)  # minutes

class Theme(str, Enum):
    LIGHT = "light"
    DARK = "dark"
    AUTO = "auto"

class InterfaceConfig(BaseModel):
    theme: Theme = Field(default=Theme.LIGHT)
    language: str = Field(default="en")
    touchSensitivity: float = Field(default=1.0, gt=0)
    screenTimeout: int = Field(default=30, gt=0)  # minutes
    showAdvancedControls: bool = Field(default=False)
    enableSounds: bool = Field(default=True)
    enableHapticFeedback: bool = Field(default=True)

class LogLevel(str, Enum):
    DEBUG = "debug"
    INFO = "info"
    WARN = "warn"
    ERROR = "error"

class SystemConfig(BaseModel):
    mockMode: bool = Field(default=True)
    debugMode: bool = Field(default=False)
    logLevel: LogLevel = Field(default=LogLevel.INFO)
    telemetryInterval: int = Field(default=100, gt=0)  # milliseconds
    heartbeatInterval: int = Field(default=1000, gt=0)  # milliseconds
    maxLogSize: int = Field(default=100, gt=0)  # MB
    backupEnabled: bool = Field(default=True)
    backupInterval: int = Field(default=24, gt=0)  # hours

class KioskSettings(BaseModel):
    robot: RobotConnectionConfig = Field(default_factory=RobotConnectionConfig)
    security: SecurityConfig = Field(default_factory=SecurityConfig)
    interface: InterfaceConfig = Field(default_factory=InterfaceConfig)
    system: SystemConfig = Field(default_factory=SystemConfig)
    robotParameters: RobotParameters

# ============================================================================
# API Request/Response Types
# ============================================================================

class ApiResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    message: Optional[str] = None
    timestamp: int

class ApiError(BaseModel):
    code: str
    message: str
    details: Optional[Any] = None
    timestamp: int

# Robot Control API
class ConnectRobotRequest(BaseModel):
    hostname: Optional[str] = None
    port: Optional[int] = Field(default=None, ge=1, le=65535)
    timeout: Optional[int] = Field(default=None, gt=0)

class HomeRobotRequest(BaseModel):
    speed: Optional[float] = Field(default=None, gt=0)
    acceleration: Optional[float] = Field(default=None, gt=0)

class StopRobotRequest(BaseModel):
    emergency: Optional[bool] = Field(default=False)

# Chess API
class NewGameRequest(BaseModel):
    mode: GameMode
    playerColor: Optional[ChessColor] = None
    engineLevel: Optional[int] = Field(default=None, ge=1, le=20)

class MakeMoveRequest(BaseModel):
    gameId: str
    move: str  # UCI or SAN notation
    executeWithRobot: Optional[bool] = Field(default=False)

class AnalyzePositionRequest(BaseModel):
    gameId: str
    depth: Optional[int] = Field(default=None, ge=1, le=30)
    timeLimit: Optional[int] = Field(default=None, gt=0)  # seconds

# Settings API
class UpdateSettingsRequest(BaseModel):
    section: Literal["robot", "security", "interface", "system", "robotParameters"]
    settings: Dict[str, Any]

class BackupSettingsRequest(BaseModel):
    includeSecrets: Optional[bool] = Field(default=False)

class RestoreSettingsRequest(BaseModel):
    backup: str  # base64 encoded backup data
    overwriteExisting: Optional[bool] = Field(default=False)

# ============================================================================
# WebSocket Message Types
# ============================================================================

class WebSocketMessageType(str, Enum):
    TELEMETRY = "telemetry"
    ROBOT_STATUS = "robot_status"
    CHESS_UPDATE = "chess_update"
    SESSION_UPDATE = "session_update"
    SYSTEM_ALERT = "system_alert"
    ERROR = "error"
    PING = "ping"
    PONG = "pong"

class WebSocketMessage(BaseModel):
    type: WebSocketMessageType
    data: Any
    timestamp: int
    sessionId: Optional[str] = None

class TelemetryMessage(WebSocketMessage):
    type: Literal[WebSocketMessageType.TELEMETRY] = WebSocketMessageType.TELEMETRY
    data: RobotTelemetry

class ChessUpdateMessage(WebSocketMessage):
    type: Literal[WebSocketMessageType.CHESS_UPDATE] = WebSocketMessageType.CHESS_UPDATE
    data: Dict[str, Any]  # Partial ChessGameState

class SystemAlertLevel(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class SystemAlert(BaseModel):
    level: SystemAlertLevel
    title: str
    message: str
    code: Optional[str] = None

class SystemAlertMessage(WebSocketMessage):
    type: Literal[WebSocketMessageType.SYSTEM_ALERT] = WebSocketMessageType.SYSTEM_ALERT
    data: SystemAlert

# ============================================================================
# Default Configurations
# ============================================================================

DEFAULT_ROBOT_CONFIG = RobotConnectionConfig()
DEFAULT_SECURITY_CONFIG = SecurityConfig()
DEFAULT_INTERFACE_CONFIG = InterfaceConfig()
DEFAULT_SYSTEM_CONFIG = SystemConfig()

DEFAULT_ROBOT_PARAMETERS = RobotParameters(
    maxSpeed=1.0,
    maxAcceleration=1.0,
    defaultSpeed=0.1,
    defaultAcceleration=0.5,
    jogDistance=0.01,
    jogSpeed=0.1,
    safetyLimits=SafetyLimits(
        workspace=WorkspaceLimits(
            min=Vector3D(x=-1.0, y=-1.0, z=0.0),
            max=Vector3D(x=1.0, y=1.0, z=1.0)
        ),
        jointLimits=JointLimits(
            min=JointPositions(base=-360, shoulder=-360, elbow=-360, wrist1=-360, wrist2=-360, wrist3=-360),
            max=JointPositions(base=360, shoulder=360, elbow=360, wrist1=360, wrist2=360, wrist3=360)
        )
    )
)

