"""
Configuration management for UR10 Robot Server
"""

from pydantic import BaseSettings, Field
from typing import List, Optional
import os

class Settings(BaseSettings):
    """Application settings"""
    
    # Server settings
    app_name: str = "UR10 Robot Server"
    app_version: str = "1.0.0"
    debug: bool = Field(default=False, env="DEBUG")
    HOST: str = Field(default="0.0.0.0", env="HOST")
    PORT: int = Field(default=8000, env="PORT")
    
    # Robot connection settings
    robot_hostname: str = Field(default="192.168.1.100", env="ROBOT_HOSTNAME")
    robot_port: int = Field(default=30004, env="ROBOT_PORT")
    rtde_frequency: int = Field(default=10, env="RTDE_FREQUENCY")  # Hz
    ROBOT_IP: str = Field(default="192.168.1.100", env="ROBOT_IP")
    ROBOT_PORT: int = Field(default=30004, env="ROBOT_PORT")
    ROBOT_TIMEOUT: float = Field(default=5.0, env="ROBOT_TIMEOUT")
    ALLOW_MOCK_ROBOT: bool = Field(default=True, env="ALLOW_MOCK_ROBOT")
    
    # Chess engine settings
    stockfish_path: str = Field(default="/usr/bin/stockfish", env="STOCKFISH_PATH")
    stockfish_depth: int = Field(default=15, env="STOCKFISH_DEPTH")
    stockfish_time: float = Field(default=1.0, env="STOCKFISH_TIME")  # seconds
    
    # Robot parameters
    move_speed: float = Field(default=0.3, env="MOVE_SPEED")  # m/s
    move_acceleration: float = Field(default=0.5, env="MOVE_ACCELERATION")  # m/s²
    lift_height: float = Field(default=0.05, env="LIFT_HEIGHT")  # meters
    board_height: float = Field(default=0.0, env="BOARD_HEIGHT")  # meters
    board_lift_height: float = Field(default=0.02, env="BOARD_LIFT_HEIGHT")  # meters
    
    # Safety limits
    speed_max: float = Field(default=0.5, env="SPEED_MAX")  # m/s
    z_min: float = Field(default=-0.1, env="Z_MIN")  # meters
    z_max: float = Field(default=0.5, env="Z_MAX")  # meters
    ENABLE_SAFETY_LIMITS: bool = Field(default=True, env="ENABLE_SAFETY_LIMITS")
    MAX_VELOCITY: float = Field(default=0.5, env="MAX_VELOCITY")
    MAX_ACCELERATION: float = Field(default=1.0, env="MAX_ACCELERATION")
    
    # Force control parameters
    force_seconds: int = Field(default=2, env="FORCE_SECONDS")
    force_type: int = Field(default=2, env="FORCE_TYPE")
    tcp_down: float = Field(default=-10.0, env="TCP_DOWN")  # N
    
    # WebSocket settings
    websocket_ping_interval: int = Field(default=20, env="WS_PING_INTERVAL")  # seconds
    websocket_ping_timeout: int = Field(default=10, env="WS_PING_TIMEOUT")  # seconds
    WS_HEARTBEAT_INTERVAL: float = Field(default=30.0, env="WS_HEARTBEAT_INTERVAL")
    WS_TIMEOUT: float = Field(default=60.0, env="WS_TIMEOUT")
    
    # Session settings
    session_timeout: int = Field(default=3600, env="SESSION_TIMEOUT")  # seconds
    max_concurrent_sessions: int = Field(default=10, env="MAX_CONCURRENT_SESSIONS")
    SESSION_TIMEOUT: int = Field(default=3600, env="SESSION_TIMEOUT")
    MAX_SESSIONS: int = Field(default=10, env="MAX_SESSIONS")
    
    # Mock mode (for development without hardware)
    mock_mode: bool = Field(default=False, env="MOCK_MODE")
    
    # Security Configuration
    ENFORCE_HTTPS: bool = Field(default=True, env="ENFORCE_HTTPS")
    SSL_KEYFILE: Optional[str] = Field(default=None, env="SSL_KEYFILE")
    SSL_CERTFILE: Optional[str] = Field(default=None, env="SSL_CERTFILE")
    
    # CORS settings
    cors_origins: List[str] = Field(
        default=["http://localhost:3000", "https://localhost:3000"],
        env="CORS_ORIGINS"
    )
    CORS_ORIGINS: List[str] = Field(
        default=[
            "https://localhost:5173",
            "https://127.0.0.1:5173",
            "https://ur10-kiosk.local:5173"
        ],
        env="CORS_ORIGINS"
    )
    ALLOWED_HOSTS: List[str] = Field(
        default=[
            "localhost",
            "127.0.0.1",
            "ur10-kiosk.local",
            "ur10-robot.local"
        ],
        env="ALLOWED_HOSTS"
    )
    
    # Authentication Configuration
    REQUIRE_API_KEY: bool = Field(default=False, env="REQUIRE_API_KEY")
    API_KEYS: List[str] = Field(default=[], env="API_KEYS")
    
    # Rate Limiting Configuration
    ENABLE_RATE_LIMITING: bool = Field(default=True, env="ENABLE_RATE_LIMITING")
    RATE_LIMIT_PER_MINUTE: int = Field(default=60, env="RATE_LIMIT_PER_MINUTE")
    RATE_LIMIT_BURST: int = Field(default=10, env="RATE_LIMIT_BURST")
    
    # Telemetry Configuration
    TELEMETRY_RATE: float = Field(default=10.0, env="TELEMETRY_RATE")
    TELEMETRY_BUFFER_SIZE: int = Field(default=100, env="TELEMETRY_BUFFER_SIZE")
    
    # Logging settings
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    log_file: Optional[str] = Field(default=None, env="LOG_FILE")
    LOG_LEVEL: str = Field(default="INFO", env="LOG_LEVEL")
    LOG_FILE: Optional[str] = Field(default=None, env="LOG_FILE")
    ACCESS_LOG: bool = Field(default=True, env="ACCESS_LOG")
    
    # TLS settings (legacy)
    tls_cert_file: Optional[str] = Field(default=None, env="TLS_CERT_FILE")
    tls_key_file: Optional[str] = Field(default=None, env="TLS_KEY_FILE")
    
    # Database Configuration
    DATABASE_URL: Optional[str] = Field(default=None, env="DATABASE_URL")
    
    # Chess Game Configuration
    CHESS_ENGINE_DEPTH: int = Field(default=5, env="CHESS_ENGINE_DEPTH")
    CHESS_TIME_LIMIT: float = Field(default=30.0, env="CHESS_TIME_LIMIT")
    
    # Development Configuration
    DEBUG: bool = Field(default=False, env="DEBUG")
    ENABLE_DOCS: bool = Field(default=True, env="ENABLE_DOCS")
    ENABLE_METRICS: bool = Field(default=False, env="ENABLE_METRICS")
    
    # Workspace limits
    WORKSPACE_LIMITS: dict = Field(
        default={
            "x_min": -0.8, "x_max": 0.8,
            "y_min": -0.8, "y_max": 0.8,
            "z_min": 0.0, "z_max": 1.0
        },
        env="WORKSPACE_LIMITS"
    )
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

# Global settings instance
settings = Settings()

def get_settings() -> Settings:
    """Get application settings"""
    return settings

# Robot configuration template (matches UR10_Workspace config.yaml structure)
ROBOT_CONFIG_TEMPLATE = {
    "robot": {
        "hostname": settings.robot_hostname,
        "host_port": settings.robot_port,
        "rtde_frequency": settings.rtde_frequency
    },
    "robot_parameters": {
        "angle": 0.0,
        "dx": 0.0,
        "dy": 0.0,
        "board_height": settings.board_height,
        "board_lift_height": settings.board_lift_height,
        "tcp_rx": 0.0,
        "tcp_ry": 0.0,
        "tcp_rz": 0.0,
        "bin_position": [0.3, -0.3, 0.1],
        "move_speed": settings.move_speed,
        "move_accel": settings.move_acceleration
    },
    "force_control": {
        "force_seconds": settings.force_seconds,
        "task_frame": [0, 0, 0, 0, 0, 0],
        "selection_vector": [0, 0, 1, 0, 0, 0],
        "tcp_down": settings.tcp_down,
        "force_type": settings.force_type,
        "limits": [10, 10, 10, 1, 1, 1]
    },
    "piece_heights": {
        "p": 0.032,  # pawn
        "r": 0.041,  # rook
        "n": 0.041,  # knight
        "b": 0.041,  # bishop
        "q": 0.048,  # queen
        "k": 0.048   # king
    },
    "vision": {
        "board_corners": [[0, 0], [1, 1]],
        "cam_index": 0,
        "sample_size": 10
    }
}

