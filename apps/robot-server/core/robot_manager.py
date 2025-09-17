"""
Robot Manager for UR10 Robot Server
Handles robot communication, state management, and safety interlocks
"""

import asyncio
import logging
import time
from typing import Optional, Dict, Any, List
from enum import Enum
import json

from models.schemas import (
    RobotState, Telemetry, TCPPose, EStopStatus, SafetyLimits,
    IOMap, ProgramStatus, NetworkStatus, JointPositions
)
from core.config import settings, ROBOT_CONFIG_TEMPLATE
from adapters.ur10_adapter import UR10Adapter
from adapters.mock_adapter import MockAdapter

logger = logging.getLogger(__name__)

class RobotManager:
    """Manages robot connection, state, and operations"""
    
    def __init__(self):
        self.state = RobotState.IDLE
        self.adapter: Optional[UR10Adapter] = None
        self.last_telemetry_time = 0
        self.telemetry_stale_threshold = 1.5  # seconds
        self.errors: List[str] = []
        self.estop_latched = False
        self.supervisor_pin = "1234"  # In production, use secure storage
        
        # State tracking
        self.current_pose = TCPPose(x=0, y=0, z=0, rx=0, ry=0, rz=0)
        self.current_joints = [0.0] * 6
        self.current_speed = 0.0
        self.io_state = IOMap()
        self.safety_limits = SafetyLimits(
            speed_max=settings.speed_max,
            z_min=settings.z_min,
            z_max=settings.z_max,
            keepout=[]
        )
        
        # Program execution state
        self.current_program: Optional[ProgramStatus] = None
        self.job_queue: List[Dict[str, Any]] = []
        
        # Network monitoring
        self.last_ping_time = time.time()
        self.rtt_ms = 0.0
        
    async def initialize(self):
        """Initialize robot manager"""
        logger.info("Initializing Robot Manager...")
        
        if settings.mock_mode:
            logger.info("Running in MOCK MODE - no hardware required")
            self.adapter = MockAdapter()
        else:
            logger.info(f"Connecting to robot at {settings.robot_hostname}:{settings.robot_port}")
            self.adapter = UR10Adapter()
        
        await self.adapter.initialize(ROBOT_CONFIG_TEMPLATE)
        self.state = RobotState.CONNECTING
        
    async def cleanup(self):
        """Cleanup robot manager"""
        logger.info("Cleaning up Robot Manager...")
        if self.adapter:
            await self.adapter.cleanup()
        self.state = RobotState.IDLE
        
    def is_connected(self) -> bool:
        """Check if robot is connected"""
        return self.adapter is not None and self.adapter.is_connected()
        
    async def connect_robot(self, hostname: Optional[str] = None, port: Optional[int] = None) -> bool:
        """Connect to robot"""
        try:
            self.state = RobotState.CONNECTING
            self.clear_errors()
            
            if hostname:
                settings.robot_hostname = hostname
            if port:
                settings.robot_port = port
                
            success = await self.adapter.connect(settings.robot_hostname, settings.robot_port)
            
            if success:
                self.state = RobotState.IDLE
                logger.info("Robot connected successfully")
                return True
            else:
                self.state = RobotState.FAULT
                self.add_error("Failed to connect to robot")
                return False
                
        except Exception as e:
            logger.error(f"Error connecting to robot: {e}")
            self.state = RobotState.FAULT
            self.add_error(f"Connection error: {str(e)}")
            return False
            
    async def disconnect_robot(self):
        """Disconnect from robot"""
        try:
            if self.adapter:
                await self.adapter.disconnect()
            self.state = RobotState.IDLE
            logger.info("Robot disconnected")
        except Exception as e:
            logger.error(f"Error disconnecting robot: {e}")
            
    async def home_robot(self) -> bool:
        """Home the robot"""
        try:
            if not self.is_connected():
                self.add_error("Robot not connected")
                return False
                
            if self.estop_latched:
                self.add_error("Cannot home while E-stop is latched")
                return False
                
            self.state = RobotState.EXECUTING
            success = await self.adapter.home()
            
            if success:
                self.state = RobotState.READY
                logger.info("Robot homed successfully")
                return True
            else:
                self.state = RobotState.FAULT
                self.add_error("Failed to home robot")
                return False
                
        except Exception as e:
            logger.error(f"Error homing robot: {e}")
            self.state = RobotState.FAULT
            self.add_error(f"Homing error: {str(e)}")
            return False
            
    async def jog_robot(self, mode: str, axis: Optional[str] = None, joint: Optional[int] = None,
                       delta: Optional[float] = None, duration: Optional[float] = None,
                       speed: float = 0.1, frame: str = "base") -> bool:
        """Jog the robot"""
        try:
            if not self.is_ready_for_movement():
                return False
                
            # Validate speed limits
            if speed > self.safety_limits.speed_max:
                self.add_error(f"Speed {speed} exceeds limit {self.safety_limits.speed_max}")
                return False
                
            self.state = RobotState.EXECUTING
            
            if mode == "tcp":
                success = await self.adapter.jog_tcp(axis, delta, speed, frame)
            elif mode == "joint":
                success = await self.adapter.jog_joint(joint, delta, speed)
            else:
                self.add_error(f"Invalid jog mode: {mode}")
                return False
                
            if success:
                self.state = RobotState.READY
                return True
            else:
                self.state = RobotState.FAULT
                self.add_error("Jog operation failed")
                return False
                
        except Exception as e:
            logger.error(f"Error jogging robot: {e}")
            self.state = RobotState.FAULT
            self.add_error(f"Jog error: {str(e)}")
            return False
            
    async def stop_robot(self) -> bool:
        """Stop robot movement (graceful)"""
        try:
            if self.adapter:
                success = await self.adapter.stop()
                if success:
                    self.state = RobotState.READY if self.is_connected() else RobotState.IDLE
                    logger.info("Robot stopped")
                    return True
            return False
        except Exception as e:
            logger.error(f"Error stopping robot: {e}")
            return False
            
    async def emergency_stop(self) -> bool:
        """Emergency stop robot (immediate)"""
        try:
            if self.adapter:
                success = await self.adapter.emergency_stop()
                if success:
                    self.state = RobotState.ESTOP
                    self.estop_latched = True
                    logger.warning("Emergency stop activated")
                    return True
            return False
        except Exception as e:
            logger.error(f"Error activating emergency stop: {e}")
            return False
            
    async def clear_estop(self, supervisor_pin: str) -> bool:
        """Clear emergency stop (requires supervisor PIN)"""
        try:
            if supervisor_pin != self.supervisor_pin:
                self.add_error("Invalid supervisor PIN")
                return False
                
            if not self.estop_latched:
                self.add_error("E-stop is not latched")
                return False
                
            # Reset hardware E-stop (requires manual reset)
            # Then clear software E-stop
            success = await self.adapter.clear_estop()
            
            if success:
                self.estop_latched = False
                self.state = RobotState.IDLE
                logger.info("E-stop cleared")
                return True
            else:
                self.add_error("Failed to clear E-stop")
                return False
                
        except Exception as e:
            logger.error(f"Error clearing E-stop: {e}")
            self.add_error(f"E-stop clear error: {str(e)}")
            return False
            
    async def move_to_safe_z(self) -> bool:
        """Move to safe Z position"""
        try:
            if not self.is_ready_for_movement():
                return False
                
            safe_z = self.safety_limits.z_max * 0.8  # 80% of max height
            self.state = RobotState.EXECUTING
            
            success = await self.adapter.move_to_safe_z(safe_z)
            
            if success:
                self.state = RobotState.READY
                logger.info(f"Moved to safe Z position: {safe_z}")
                return True
            else:
                self.state = RobotState.FAULT
                self.add_error("Failed to move to safe Z")
                return False
                
        except Exception as e:
            logger.error(f"Error moving to safe Z: {e}")
            self.state = RobotState.FAULT
            self.add_error(f"Safe Z error: {str(e)}")
            return False
            
    async def get_telemetry(self) -> Telemetry:
        """Get current robot telemetry"""
        try:
            if self.adapter and self.is_connected():
                # Get fresh data from adapter
                telemetry_data = await self.adapter.get_telemetry()
                
                # Update internal state
                self.current_pose = telemetry_data.get("tcp_pose", self.current_pose)
                self.current_joints = telemetry_data.get("joints", self.current_joints)
                self.current_speed = telemetry_data.get("tcp_speed", self.current_speed)
                self.io_state = telemetry_data.get("iomap", self.io_state)
                
                self.last_telemetry_time = time.time()
                
                # Check for stale telemetry
                if time.time() - self.last_telemetry_time > self.telemetry_stale_threshold:
                    if self.state == RobotState.EXECUTING:
                        self.state = RobotState.PAUSED
                        self.add_error("Telemetry stale - auto-paused")
                        
            # Calculate RTT
            current_time = time.time()
            self.rtt_ms = (current_time - self.last_ping_time) * 1000
            self.last_ping_time = current_time
            
            # Build telemetry response
            return Telemetry(
                state=self.state,
                program=self.current_program or ProgramStatus(),
                joints=self.current_joints,
                tcp_pose=self.current_pose,
                tcp_speed=self.current_speed,
                iomap=self.io_state,
                estop=EStopStatus(hw=self.estop_latched, sw=False),
                limits=self.safety_limits,
                board=await self.get_board_state(),
                queue=await self.get_queue_status(),
                engine=await self.get_engine_status(),
                net=NetworkStatus(rtt_ms=self.rtt_ms),
                errors=self.errors.copy()
            )
            
        except Exception as e:
            logger.error(f"Error getting telemetry: {e}")
            return self.get_default_telemetry()
            
    def get_default_telemetry(self) -> Telemetry:
        """Get default telemetry when robot is not available"""
        from models.schemas import BoardState, QueueStatus, EngineStatus
        
        return Telemetry(
            state=self.state,
            program=ProgramStatus(),
            joints=[0.0] * 6,
            tcp_pose=TCPPose(x=0, y=0, z=0, rx=0, ry=0, rz=0),
            tcp_speed=0.0,
            iomap=IOMap(),
            estop=EStopStatus(hw=self.estop_latched, sw=False),
            limits=self.safety_limits,
            board=BoardState(fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", turn="w", move_no=1),
            queue=QueueStatus(pending=len(self.job_queue), active=None),
            engine=EngineStatus(running=False),
            net=NetworkStatus(rtt_ms=self.rtt_ms),
            errors=self.errors.copy()
        )
        
    async def get_board_state(self):
        """Get current chess board state"""
        if self.adapter:
            return await self.adapter.get_board_state()
        from models.schemas import BoardState
        return BoardState(fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", turn="w", move_no=1)
        
    async def get_queue_status(self):
        """Get job queue status"""
        from models.schemas import QueueStatus
        return QueueStatus(pending=len(self.job_queue), active=None)
        
    async def get_engine_status(self):
        """Get chess engine status"""
        if self.adapter:
            return await self.adapter.get_engine_status()
        from models.schemas import EngineStatus
        return EngineStatus(running=False)
        
    def is_ready_for_movement(self) -> bool:
        """Check if robot is ready for movement"""
        if not self.is_connected():
            self.add_error("Robot not connected")
            return False
            
        if self.estop_latched:
            self.add_error("E-stop is latched")
            return False
            
        if self.state not in [RobotState.READY, RobotState.PAUSED]:
            self.add_error(f"Robot not ready for movement (state: {self.state})")
            return False
            
        return True
        
    def add_error(self, error: str):
        """Add error to error list"""
        self.errors.append(error)
        logger.error(error)
        
        # Keep only last 10 errors
        if len(self.errors) > 10:
            self.errors = self.errors[-10:]
            
    def clear_errors(self):
        """Clear all errors"""
        self.errors.clear()
        
    async def update_safety_limits(self, limits: SafetyLimits, supervisor_pin: str) -> bool:
        """Update safety limits (requires supervisor PIN)"""
        try:
            if supervisor_pin != self.supervisor_pin:
                self.add_error("Invalid supervisor PIN")
                return False
                
            self.safety_limits = limits
            logger.info("Safety limits updated")
            return True
            
        except Exception as e:
            logger.error(f"Error updating safety limits: {e}")
            self.add_error(f"Limits update error: {str(e)}")
            return False

