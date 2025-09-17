"""
Mock Adapter for UR10 Robot Server
Simulates robot behavior for development and testing without hardware
"""

import asyncio
import logging
import time
import random
import math
from typing import Dict, Any, Optional, List
import threading

import chess
import chess.engine

from models.schemas import TCPPose, BoardState, EngineStatus, IOMap

logger = logging.getLogger(__name__)

class MockAdapter:
    """Mock adapter that simulates UR10 robot behavior"""
    
    def __init__(self):
        self.connected = False
        self.config = None
        self.chess_board = chess.Board()
        
        # Simulated robot state
        self.current_pose = TCPPose(x=0.3, y=0.0, z=0.3, rx=0.0, ry=0.0, rz=0.0)
        self.current_joints = [0.0, -1.57, 1.57, -1.57, -1.57, 0.0]  # Realistic home position
        self.current_speed = 0.0
        self.target_pose = None
        self.target_joints = None
        
        # I/O state
        self.io_state = IOMap(
            di=[False] * 8,  # 8 digital inputs
            do=[False] * 8   # 8 digital outputs
        )
        
        # Movement simulation
        self.is_moving = False
        self.move_start_time = 0
        self.move_duration = 0
        self.start_pose = None
        
        # Chess engine simulation
        self.engine_analyzing = False
        self.last_analysis = None
        
        # Thread safety
        self.state_lock = threading.Lock()
        
        # Simulation parameters
        self.max_speed = 0.5  # m/s
        self.max_acceleration = 1.0  # m/s²
        self.position_noise = 0.001  # meters
        self.joint_noise = 0.01  # radians
        
    async def initialize(self, config: Dict[str, Any]):
        """Initialize the mock adapter"""
        try:
            self.config = config
            
            # Initialize chess board to starting position
            self.chess_board = chess.Board()
            
            logger.info("Mock Adapter initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize Mock Adapter: {e}")
            return False
            
    async def cleanup(self):
        """Cleanup mock adapter resources"""
        try:
            self.connected = False
            logger.info("Mock Adapter cleaned up")
            
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")
            
    async def connect(self, hostname: str, port: int) -> bool:
        """Simulate robot connection"""
        try:
            # Simulate connection delay
            await asyncio.sleep(0.5)
            
            # Simulate occasional connection failures
            if random.random() < 0.05:  # 5% failure rate
                logger.error("Mock connection failed (simulated)")
                return False
                
            self.connected = True
            logger.info(f"Mock connected to robot at {hostname}:{port}")
            return True
            
        except Exception as e:
            logger.error(f"Mock connection error: {e}")
            return False
            
    async def disconnect(self):
        """Simulate robot disconnection"""
        try:
            await asyncio.sleep(0.2)
            self.connected = False
            logger.info("Mock disconnected from robot")
            
        except Exception as e:
            logger.error(f"Mock disconnection error: {e}")
            
    def is_connected(self) -> bool:
        """Check mock connection status"""
        return self.connected
        
    async def home(self) -> bool:
        """Simulate robot homing"""
        try:
            logger.info("Mock homing robot...")
            
            # Simulate homing movement
            home_pose = TCPPose(x=0.3, y=0.0, z=0.3, rx=0.0, ry=0.0, rz=0.0)
            home_joints = [0.0, -1.57, 1.57, -1.57, -1.57, 0.0]
            
            await self._simulate_movement(home_pose, home_joints, duration=3.0)
            
            logger.info("Mock robot homed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Mock homing error: {e}")
            return False
            
    async def jog_tcp(self, axis: str, delta: float, speed: float, frame: str) -> bool:
        """Simulate TCP jogging"""
        try:
            with self.state_lock:
                # Calculate target pose
                target_pose = TCPPose(
                    x=self.current_pose.x,
                    y=self.current_pose.y,
                    z=self.current_pose.z,
                    rx=self.current_pose.rx,
                    ry=self.current_pose.ry,
                    rz=self.current_pose.rz
                )
                
                if axis == "x":
                    target_pose.x += delta
                elif axis == "y":
                    target_pose.y += delta
                elif axis == "z":
                    target_pose.z += delta
                elif axis == "rx":
                    target_pose.rx += delta
                elif axis == "ry":
                    target_pose.ry += delta
                elif axis == "rz":
                    target_pose.rz += delta
                else:
                    logger.error(f"Invalid TCP axis: {axis}")
                    return False
                    
                # Calculate movement duration based on speed
                distance = abs(delta)
                duration = distance / speed if speed > 0 else 1.0
                
                # Simulate movement
                await self._simulate_movement(target_pose, None, duration)
                
            logger.info(f"Mock TCP jogged {axis} by {delta}")
            return True
            
        except Exception as e:
            logger.error(f"Mock TCP jog error: {e}")
            return False
            
    async def jog_joint(self, joint: int, delta: float, speed: float) -> bool:
        """Simulate joint jogging"""
        try:
            if joint < 0 or joint >= 6:
                logger.error(f"Invalid joint number: {joint}")
                return False
                
            with self.state_lock:
                target_joints = self.current_joints.copy()
                target_joints[joint] += delta
                
                # Calculate movement duration
                duration = abs(delta) / speed if speed > 0 else 1.0
                
                # Simulate movement
                await self._simulate_movement(None, target_joints, duration)
                
            logger.info(f"Mock joint {joint} jogged by {delta}")
            return True
            
        except Exception as e:
            logger.error(f"Mock joint jog error: {e}")
            return False
            
    async def stop(self) -> bool:
        """Simulate robot stop"""
        try:
            with self.state_lock:
                self.is_moving = False
                self.current_speed = 0.0
                
            logger.info("Mock robot stopped")
            return True
            
        except Exception as e:
            logger.error(f"Mock stop error: {e}")
            return False
            
    async def emergency_stop(self) -> bool:
        """Simulate emergency stop"""
        try:
            with self.state_lock:
                self.is_moving = False
                self.current_speed = 0.0
                
            logger.warning("Mock emergency stop activated")
            return True
            
        except Exception as e:
            logger.error(f"Mock emergency stop error: {e}")
            return False
            
    async def clear_estop(self) -> bool:
        """Simulate emergency stop clear"""
        try:
            await asyncio.sleep(0.5)  # Simulate reset time
            logger.info("Mock emergency stop cleared")
            return True
            
        except Exception as e:
            logger.error(f"Mock E-stop clear error: {e}")
            return False
            
    async def move_to_safe_z(self, safe_z: float) -> bool:
        """Simulate move to safe Z"""
        try:
            with self.state_lock:
                target_pose = TCPPose(
                    x=self.current_pose.x,
                    y=self.current_pose.y,
                    z=safe_z,
                    rx=self.current_pose.rx,
                    ry=self.current_pose.ry,
                    rz=self.current_pose.rz
                )
                
                distance = abs(safe_z - self.current_pose.z)
                duration = distance / 0.2  # 0.2 m/s for Z movements
                
                await self._simulate_movement(target_pose, None, duration)
                
            logger.info(f"Mock moved to safe Z: {safe_z}")
            return True
            
        except Exception as e:
            logger.error(f"Mock safe Z error: {e}")
            return False
            
    async def get_telemetry(self) -> Dict[str, Any]:
        """Get simulated robot telemetry"""
        try:
            # Update movement simulation
            await self._update_movement_simulation()
            
            # Add some realistic noise to positions
            noisy_pose = TCPPose(
                x=self.current_pose.x + random.uniform(-self.position_noise, self.position_noise),
                y=self.current_pose.y + random.uniform(-self.position_noise, self.position_noise),
                z=self.current_pose.z + random.uniform(-self.position_noise, self.position_noise),
                rx=self.current_pose.rx + random.uniform(-self.joint_noise, self.joint_noise),
                ry=self.current_pose.ry + random.uniform(-self.joint_noise, self.joint_noise),
                rz=self.current_pose.rz + random.uniform(-self.joint_noise, self.joint_noise)
            )
            
            noisy_joints = [
                joint + random.uniform(-self.joint_noise, self.joint_noise)
                for joint in self.current_joints
            ]
            
            return {
                "tcp_pose": noisy_pose,
                "joints": noisy_joints,
                "tcp_speed": self.current_speed,
                "iomap": self.io_state
            }
            
        except Exception as e:
            logger.error(f"Mock telemetry error: {e}")
            return {}
            
    async def chess_move(self, from_square: str, to_square: str, promotion: Optional[str] = None) -> bool:
        """Simulate chess move execution"""
        try:
            # Parse and validate move
            move_str = from_square + to_square
            if promotion:
                move_str += promotion
                
            move = chess.Move.from_uci(move_str)
            
            if move in self.chess_board.legal_moves:
                # Simulate robot movement time
                move_duration = random.uniform(3.0, 8.0)  # 3-8 seconds per move
                
                logger.info(f"Mock executing chess move: {move_str} (duration: {move_duration:.1f}s)")
                
                # Simulate piece pickup and placement
                await asyncio.sleep(move_duration * 0.3)  # Move to source
                await asyncio.sleep(move_duration * 0.2)  # Pick up piece
                await asyncio.sleep(move_duration * 0.3)  # Move to destination
                await asyncio.sleep(move_duration * 0.2)  # Place piece
                
                # Update board state
                self.chess_board.push(move)
                
                logger.info(f"Mock chess move completed: {move_str}")
                return True
            else:
                logger.error(f"Mock illegal chess move: {move_str}")
                return False
                
        except Exception as e:
            logger.error(f"Mock chess move error: {e}")
            return False
            
    async def chess_remove_piece(self, square: str) -> bool:
        """Simulate piece removal"""
        try:
            square_index = chess.parse_square(square)
            piece = self.chess_board.piece_at(square_index)
            
            if piece:
                # Simulate removal time
                removal_duration = random.uniform(2.0, 4.0)
                
                logger.info(f"Mock removing piece from {square} (duration: {removal_duration:.1f}s)")
                
                await asyncio.sleep(removal_duration)
                
                # Remove piece from board
                self.chess_board.remove_piece_at(square_index)
                
                logger.info(f"Mock piece removed from {square}")
                return True
            else:
                logger.error(f"Mock no piece at {square}")
                return False
                
        except Exception as e:
            logger.error(f"Mock piece removal error: {e}")
            return False
            
    async def get_board_state(self) -> BoardState:
        """Get simulated chess board state"""
        try:
            return BoardState(
                fen=self.chess_board.fen(),
                turn="w" if self.chess_board.turn else "b",
                move_no=self.chess_board.fullmove_number
            )
            
        except Exception as e:
            logger.error(f"Mock board state error: {e}")
            return BoardState(
                fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
                turn="w",
                move_no=1
            )
            
    async def get_engine_status(self) -> EngineStatus:
        """Get simulated engine status"""
        try:
            return EngineStatus(
                running=self.engine_analyzing,
                eval=self.last_analysis.get("eval") if self.last_analysis else None,
                bestmove=self.last_analysis.get("bestmove") if self.last_analysis else None,
                depth=self.last_analysis.get("depth") if self.last_analysis else None
            )
            
        except Exception as e:
            logger.error(f"Mock engine status error: {e}")
            return EngineStatus(running=False)
            
    async def analyze_position(self, fen: str, depth: Optional[int] = None, time_limit: Optional[float] = None) -> Dict[str, Any]:
        """Simulate position analysis"""
        try:
            self.engine_analyzing = True
            
            # Simulate analysis time
            analysis_time = time_limit if time_limit else (depth * 0.1 if depth else 1.0)
            await asyncio.sleep(min(analysis_time, 5.0))  # Cap at 5 seconds for simulation
            
            # Generate mock analysis results
            board = chess.Board(fen)
            legal_moves = list(board.legal_moves)
            
            if legal_moves:
                best_move = random.choice(legal_moves)
                eval_score = random.randint(-300, 300)  # Centipawns
                
                self.last_analysis = {
                    "bestmove": str(best_move),
                    "eval": eval_score,
                    "depth": depth or 15,
                    "pv": [str(best_move)]
                }
            else:
                self.last_analysis = {
                    "bestmove": None,
                    "eval": 0,
                    "depth": 0,
                    "pv": []
                }
                
            self.engine_analyzing = False
            
            logger.info(f"Mock analysis completed: {self.last_analysis}")
            return self.last_analysis
            
        except Exception as e:
            logger.error(f"Mock analysis error: {e}")
            self.engine_analyzing = False
            return {"error": str(e)}
            
    async def _simulate_movement(self, target_pose: Optional[TCPPose], target_joints: Optional[List[float]], duration: float):
        """Simulate robot movement"""
        try:
            self.is_moving = True
            self.move_start_time = time.time()
            self.move_duration = duration
            
            # Store starting positions
            start_pose = TCPPose(
                x=self.current_pose.x,
                y=self.current_pose.y,
                z=self.current_pose.z,
                rx=self.current_pose.rx,
                ry=self.current_pose.ry,
                rz=self.current_pose.rz
            )
            start_joints = self.current_joints.copy()
            
            # Simulate movement with smooth trajectory
            steps = max(int(duration * 10), 10)  # 10 Hz updates minimum
            
            for i in range(steps + 1):
                if not self.is_moving:  # Check for stop command
                    break
                    
                progress = i / steps
                
                # Use smooth acceleration/deceleration curve
                smooth_progress = 0.5 * (1 - math.cos(progress * math.pi))
                
                # Update pose if target provided
                if target_pose:
                    self.current_pose.x = start_pose.x + (target_pose.x - start_pose.x) * smooth_progress
                    self.current_pose.y = start_pose.y + (target_pose.y - start_pose.y) * smooth_progress
                    self.current_pose.z = start_pose.z + (target_pose.z - start_pose.z) * smooth_progress
                    self.current_pose.rx = start_pose.rx + (target_pose.rx - start_pose.rx) * smooth_progress
                    self.current_pose.ry = start_pose.ry + (target_pose.ry - start_pose.ry) * smooth_progress
                    self.current_pose.rz = start_pose.rz + (target_pose.rz - start_pose.rz) * smooth_progress
                    
                # Update joints if target provided
                if target_joints:
                    for j in range(6):
                        self.current_joints[j] = start_joints[j] + (target_joints[j] - start_joints[j]) * smooth_progress
                        
                # Calculate current speed (simplified)
                if i > 0:
                    self.current_speed = min(self.max_speed, (1.0 - abs(0.5 - progress) * 2) * self.max_speed)
                else:
                    self.current_speed = 0.0
                    
                await asyncio.sleep(duration / steps)
                
            # Ensure final position is exact
            if target_pose:
                self.current_pose = target_pose
            if target_joints:
                self.current_joints = target_joints
                
            self.current_speed = 0.0
            self.is_moving = False
            
        except Exception as e:
            logger.error(f"Movement simulation error: {e}")
            self.is_moving = False
            self.current_speed = 0.0
            
    async def _update_movement_simulation(self):
        """Update ongoing movement simulation"""
        try:
            if self.is_moving:
                elapsed = time.time() - self.move_start_time
                if elapsed >= self.move_duration:
                    self.is_moving = False
                    self.current_speed = 0.0
                    
        except Exception as e:
            logger.error(f"Movement update error: {e}")

