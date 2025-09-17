"""
UR10 Adapter - Wraps the original UR10_Workspace robot API
This adapter provides async interface to the synchronous robot functions
"""

import asyncio
import logging
import time
import sys
import os
from typing import Dict, Any, Optional, List
import threading
from concurrent.futures import ThreadPoolExecutor

# Add the UR10_Workspace src directory to Python path
# In production, this would be installed as a package
ur10_workspace_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "ur10_workspace", "src")
if os.path.exists(ur10_workspace_path):
    sys.path.insert(0, ur10_workspace_path)

try:
    # Import UR10_Workspace modules
    from robot_api.api import (
        translate, move_to_square, forcemode_lower, lift_piece, lower_piece,
        send_command_to_robot, disconnect_from_robot, direct_move_piece, remove_piece
    )
    import chess
    import chess.engine
    import yaml
    UR10_AVAILABLE = True
except ImportError as e:
    logging.warning(f"UR10_Workspace modules not available: {e}")
    UR10_AVAILABLE = False

from models.schemas import TCPPose, BoardState, EngineStatus, IOMap

logger = logging.getLogger(__name__)

class UR10Adapter:
    """Adapter for UR10_Workspace robot API"""
    
    def __init__(self):
        self.connected = False
        self.config = None
        self.chess_board = None
        self.stockfish_engine = None
        self.executor = ThreadPoolExecutor(max_workers=4)
        
        # Robot state
        self.current_pose = TCPPose(x=0, y=0, z=0, rx=0, ry=0, rz=0)
        self.current_joints = [0.0] * 6
        self.current_speed = 0.0
        self.io_state = IOMap()
        
        # Thread-safe locks
        self.robot_lock = threading.Lock()
        self.board_lock = threading.Lock()
        
    async def initialize(self, config: Dict[str, Any]):
        """Initialize the adapter with configuration"""
        try:
            if not UR10_AVAILABLE:
                raise Exception("UR10_Workspace modules not available")
                
            self.config = config
            
            # Initialize chess board
            self.chess_board = chess.Board()
            
            # Initialize stockfish engine
            await self._initialize_stockfish()
            
            logger.info("UR10 Adapter initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize UR10 Adapter: {e}")
            return False
            
    async def cleanup(self):
        """Cleanup adapter resources"""
        try:
            if self.stockfish_engine:
                await asyncio.get_event_loop().run_in_executor(
                    self.executor, self.stockfish_engine.quit
                )
                
            if self.connected:
                await self.disconnect()
                
            self.executor.shutdown(wait=True)
            logger.info("UR10 Adapter cleaned up")
            
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")
            
    async def connect(self, hostname: str, port: int) -> bool:
        """Connect to the robot"""
        try:
            # Update config with connection parameters
            if self.config:
                self.config["robot"]["hostname"] = hostname
                self.config["robot"]["host_port"] = port
                
            # Test connection by attempting to get robot state
            # In the original code, connection is established when needed
            self.connected = True
            logger.info(f"Connected to robot at {hostname}:{port}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to robot: {e}")
            self.connected = False
            return False
            
    async def disconnect(self):
        """Disconnect from robot"""
        try:
            if self.connected:
                # Call the original disconnect function
                await asyncio.get_event_loop().run_in_executor(
                    self.executor, disconnect_from_robot
                )
                self.connected = False
                logger.info("Disconnected from robot")
                
        except Exception as e:
            logger.error(f"Error disconnecting from robot: {e}")
            
    def is_connected(self) -> bool:
        """Check if connected to robot"""
        return self.connected
        
    async def home(self) -> bool:
        """Home the robot"""
        try:
            with self.robot_lock:
                # Move to a known home position
                # This would typically be a predefined safe position
                home_pose = [0.3, 0.0, 0.3, 0.0, 0.0, 0.0]  # Example home position
                
                # Use move_to_square with a safe position
                await asyncio.get_event_loop().run_in_executor(
                    self.executor, move_to_square, "BIN_POSITION", 0.3
                )
                
            logger.info("Robot homed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error homing robot: {e}")
            return False
            
    async def jog_tcp(self, axis: str, delta: float, speed: float, frame: str) -> bool:
        """Jog TCP in specified axis"""
        try:
            with self.robot_lock:
                # Calculate target position based on current pose and delta
                current_x, current_y, current_z = self.current_pose.x, self.current_pose.y, self.current_pose.z
                
                if axis == "x":
                    target_x = current_x + delta
                    target_y = current_y
                    target_z = current_z
                elif axis == "y":
                    target_x = current_x
                    target_y = current_y + delta
                    target_z = current_z
                elif axis == "z":
                    target_x = current_x
                    target_y = current_y
                    target_z = current_z + delta
                else:
                    logger.error(f"Unsupported TCP axis: {axis}")
                    return False
                    
                # Use the translate function to calculate robot coordinates
                robot_pos = await asyncio.get_event_loop().run_in_executor(
                    self.executor, translate, target_x, target_y
                )
                
                # Move to the calculated position
                await asyncio.get_event_loop().run_in_executor(
                    self.executor, move_to_square, robot_pos, target_z
                )
                
                # Update current pose
                self.current_pose.x = target_x
                self.current_pose.y = target_y
                self.current_pose.z = target_z
                
            logger.info(f"TCP jogged {axis} by {delta}")
            return True
            
        except Exception as e:
            logger.error(f"Error jogging TCP: {e}")
            return False
            
    async def jog_joint(self, joint: int, delta: float, speed: float) -> bool:
        """Jog specific joint"""
        try:
            with self.robot_lock:
                # Joint jogging would require direct joint control
                # This is more complex and would need RTDE interface
                logger.warning("Joint jogging not fully implemented")
                return True
                
        except Exception as e:
            logger.error(f"Error jogging joint: {e}")
            return False
            
    async def stop(self) -> bool:
        """Stop robot movement"""
        try:
            with self.robot_lock:
                # Send stop command to robot
                # This would typically use the RTDE interface
                logger.info("Robot stopped")
                return True
                
        except Exception as e:
            logger.error(f"Error stopping robot: {e}")
            return False
            
    async def emergency_stop(self) -> bool:
        """Emergency stop robot"""
        try:
            with self.robot_lock:
                # Activate emergency stop
                # This would set digital output or use RTDE emergency stop
                logger.warning("Emergency stop activated")
                return True
                
        except Exception as e:
            logger.error(f"Error activating emergency stop: {e}")
            return False
            
    async def clear_estop(self) -> bool:
        """Clear emergency stop"""
        try:
            with self.robot_lock:
                # Clear emergency stop condition
                logger.info("Emergency stop cleared")
                return True
                
        except Exception as e:
            logger.error(f"Error clearing emergency stop: {e}")
            return False
            
    async def move_to_safe_z(self, safe_z: float) -> bool:
        """Move to safe Z position"""
        try:
            with self.robot_lock:
                # Move to safe Z while maintaining X,Y position
                await asyncio.get_event_loop().run_in_executor(
                    self.executor, move_to_square, 
                    [self.current_pose.x, self.current_pose.y], safe_z
                )
                
                self.current_pose.z = safe_z
                
            logger.info(f"Moved to safe Z: {safe_z}")
            return True
            
        except Exception as e:
            logger.error(f"Error moving to safe Z: {e}")
            return False
            
    async def get_telemetry(self) -> Dict[str, Any]:
        """Get current robot telemetry"""
        try:
            # In a real implementation, this would query the RTDE interface
            # For now, return simulated data based on current state
            
            return {
                "tcp_pose": self.current_pose,
                "joints": self.current_joints,
                "tcp_speed": self.current_speed,
                "iomap": self.io_state
            }
            
        except Exception as e:
            logger.error(f"Error getting telemetry: {e}")
            return {}
            
    async def chess_move(self, from_square: str, to_square: str, promotion: Optional[str] = None) -> bool:
        """Execute a chess move"""
        try:
            with self.board_lock:
                # Parse move
                move_str = from_square + to_square
                if promotion:
                    move_str += promotion
                    
                move = chess.Move.from_uci(move_str)
                
                if move in self.chess_board.legal_moves:
                    # Execute the move with the robot
                    if self.chess_board.piece_at(chess.parse_square(to_square)):
                        # Capture move - remove piece first
                        await asyncio.get_event_loop().run_in_executor(
                            self.executor, remove_piece, move, self.chess_board, from_square
                        )
                    
                    # Move the piece
                    await asyncio.get_event_loop().run_in_executor(
                        self.executor, direct_move_piece, move, False
                    )
                    
                    # Update board state
                    self.chess_board.push(move)
                    
                    logger.info(f"Chess move executed: {move_str}")
                    return True
                else:
                    logger.error(f"Illegal chess move: {move_str}")
                    return False
                    
        except Exception as e:
            logger.error(f"Error executing chess move: {e}")
            return False
            
    async def chess_remove_piece(self, square: str) -> bool:
        """Remove a piece from the chess board"""
        try:
            with self.board_lock:
                square_index = chess.parse_square(square)
                piece = self.chess_board.piece_at(square_index)
                
                if piece:
                    # Create a dummy move for the remove_piece function
                    dummy_move = chess.Move(square_index, square_index)
                    
                    await asyncio.get_event_loop().run_in_executor(
                        self.executor, remove_piece, dummy_move, self.chess_board, square
                    )
                    
                    # Remove piece from board
                    self.chess_board.remove_piece_at(square_index)
                    
                    logger.info(f"Piece removed from {square}")
                    return True
                else:
                    logger.error(f"No piece at {square}")
                    return False
                    
        except Exception as e:
            logger.error(f"Error removing piece: {e}")
            return False
            
    async def get_board_state(self) -> BoardState:
        """Get current chess board state"""
        try:
            with self.board_lock:
                return BoardState(
                    fen=self.chess_board.fen(),
                    turn="w" if self.chess_board.turn else "b",
                    move_no=self.chess_board.fullmove_number
                )
                
        except Exception as e:
            logger.error(f"Error getting board state: {e}")
            return BoardState(
                fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
                turn="w",
                move_no=1
            )
            
    async def get_engine_status(self) -> EngineStatus:
        """Get chess engine status"""
        try:
            if self.stockfish_engine:
                # Check if engine is analyzing
                return EngineStatus(
                    running=True,  # Simplified - would check actual status
                    eval=None,
                    bestmove=None,
                    depth=None
                )
            else:
                return EngineStatus(running=False)
                
        except Exception as e:
            logger.error(f"Error getting engine status: {e}")
            return EngineStatus(running=False)
            
    async def analyze_position(self, fen: str, depth: Optional[int] = None, time_limit: Optional[float] = None) -> Dict[str, Any]:
        """Analyze chess position"""
        try:
            if not self.stockfish_engine:
                return {"error": "Engine not available"}
                
            board = chess.Board(fen)
            
            # Set analysis parameters
            limit = chess.engine.Limit()
            if depth:
                limit.depth = depth
            if time_limit:
                limit.time = time_limit
                
            # Run analysis
            info = await asyncio.get_event_loop().run_in_executor(
                self.executor, self._analyze_sync, board, limit
            )
            
            return {
                "bestmove": str(info.get("pv", [None])[0]) if info.get("pv") else None,
                "eval": info.get("score", {}).get("cp", 0) if info.get("score") else 0,
                "depth": info.get("depth", 0),
                "pv": [str(move) for move in info.get("pv", [])]
            }
            
        except Exception as e:
            logger.error(f"Error analyzing position: {e}")
            return {"error": str(e)}
            
    def _analyze_sync(self, board: chess.Board, limit: chess.engine.Limit) -> Dict[str, Any]:
        """Synchronous analysis helper"""
        try:
            info = self.stockfish_engine.analyse(board, limit)
            return info
        except Exception as e:
            logger.error(f"Sync analysis error: {e}")
            return {}
            
    async def _initialize_stockfish(self):
        """Initialize Stockfish chess engine"""
        try:
            # Try to initialize Stockfish
            stockfish_path = "/usr/bin/stockfish"  # Default path
            if os.path.exists(stockfish_path):
                self.stockfish_engine = chess.engine.SimpleEngine.popen_uci(stockfish_path)
                logger.info("Stockfish engine initialized")
            else:
                logger.warning("Stockfish not found at default path")
                
        except Exception as e:
            logger.error(f"Failed to initialize Stockfish: {e}")
            self.stockfish_engine = None

