# UR10_Workspace Repository Analysis

## Repository Structure

Based on examination of https://github.com/FH-EngineeringClub/UR10_Workspace

### Key Directories:
- `/src/` - Main source code directory
- `/src/robot_api/` - Robot control API
- `/src/vision/` - Vision processing components
- `/examples/` - Example code
- `/docs/` - Documentation
- `/assets/` - Assets and images

### Key Files in /src/:
- `main.py` - Main entry point
- `config.yaml` - Configuration file
- `chess.svg` - Chess board visualization
- `button_input.py` - Input handling
- `lastgame.txt` - Game state persistence
- `setup.json` - Setup configuration

### Robot API Structure (/src/robot_api/):
- `api.py` - Main robot control API

## Dependencies Identified:
From the code examination:
- `ur_rtde` - Universal Robots Real-Time Data Exchange
  - `rtde_io` - I/O operations
  - `rtde_receive` - Data receiving
  - `rtde_control` - Robot control
- `python-chess` - Chess game logic
- `stockfish` - Chess engine
- `socket` - Network communication
- `math` - Mathematical operations
- `yaml` - Configuration parsing
- `colorama` - Terminal colors
- `time` - Time operations

## Configuration Parameters (from api.py):
- `HOSTNAME` - Robot IP address
- `HOST_PORT` - Command port
- `RTDE_FREQUENCY` - Real-time data frequency (4 Hz)
- Robot parameters:
  - `ANGLE` - Joint angles
  - `DX`, `DY` - Position deltas
  - `BOARD_HEIGHT`, `BOARD_LIFT_HEIGHT` - Board positioning
  - `LIFT_HEIGHT` - Piece lifting height
  - `TCP_RX`, `TCP_RY` - Tool center point rotation

## Key Functions to Wrap (Initial Analysis):
Based on the specification requirements, these functions need FastAPI wrappers:
- `move_to_square` - Move robot to chess square
- `lift_piece` - Lift chess piece
- `lower_piece` - Lower chess piece
- `forcemode_lower` - Force-controlled lowering
- `direct_move_piece` - Direct piece movement
- `remove_piece` - Remove piece from board

## Next Steps:
1. Continue examining api.py for complete function list
2. Examine main.py for usage patterns
3. Check vision/ directory for camera integration
4. Review config.yaml for configuration structure



## Complete Function Analysis from api.py

### Core Robot Control Functions (to be wrapped with FastAPI):

1. **translate(x, y)** - Rotate a point by a given angle in a 2d space
2. **move_to_square(pos=BIN_POSITION, height=LIFT_HEIGHT)** - Move the TCP to a given position on the chess board
3. **forcemode_lower()** - Lower the TCP to make contact with the piece using force control
4. **lift_piece(pos)** - Lift the piece from the board
5. **lower_piece(move_instance, removing_piece)** - Lower the piece to the board
6. **send_command_to_robot(command)** - Send a command to the robot directly using a socket connection
7. **disconnect_from_robot()** - Disconnect from the robot
8. **direct_move_piece(move, removing_piece)** - Complete piece movement operation
9. **remove_piece(move, board, origin_square)** - Remove piece from board

### Key Configuration Variables:
- `HOSTNAME` - Robot IP address from config["robot"]["hostname"]
- `HOST_PORT` - Robot port from config["robot"]["host_port"]
- `RTDE_FREQUENCY` - Real-time data frequency (4 Hz)
- `ANGLE` - Joint angles configuration
- `DX`, `DY` - Position deltas
- `BOARD_HEIGHT`, `BOARD_LIFT_HEIGHT` - Board positioning
- `LIFT_HEIGHT` - Piece lifting height
- `TCP_RX`, `TCP_RY`, `TCP_RZ` - Tool center point rotation
- `BIN_POSITION` - Bin position configuration
- `MOVE_SPEED`, `MOVE_ACCEL` - Movement parameters
- Force control parameters: `FORCE_SECONDS`, `task_frame`, `selection_vector`, `tcp_down`, `FORCE_TYPE`, `limits`

### RTDE Interface Objects:
- `rtde_io` - I/O operations interface
- `rtde_receive` - Data receiving interface  
- `control_interface` - Robot control interface

### Key Operations Identified:
1. **Robot Connection**: Uses RTDE interfaces for real-time communication
2. **Movement Control**: TCP and joint space movements with speed/acceleration control
3. **Force Control**: Force-controlled operations for piece contact
4. **I/O Control**: Digital output control for electromagnet (OUTPUT_24, OUTPUT_0)
5. **Position Calculation**: Chess square to robot coordinate translation
6. **Safety**: Force limits and collision detection

### Chess-Specific Operations:
- Board coordinate system with configurable height levels
- Electromagnet control for piece pickup/release
- Force-controlled lowering for safe piece placement
- Side position (BIN_POSITION) for captured pieces


## Main.py Analysis

### ChessGame Class Structure:
- **Initialization**: Loads config, sets up stockfish, initializes board, sets up vision
- **Configuration**: Uses config.yaml for robot parameters and settings
- **Game Loop**: Handles user input, processes moves, manages robot operations
- **Vision Integration**: Optional chess vision for board state detection
- **Stockfish Integration**: Chess engine for AI moves

### Key Methods in ChessGame:
1. **load_config(config_path)** - Load YAML configuration
2. **get_stockfish_path()** - Get stockfish executable path
3. **initialize_board()** - Set up chess board state
4. **initialize_stockfish()** - Configure chess engine
5. **setup_vision()** - Initialize vision system (optional)
6. **process_move(move_str)** - Validate and process chess moves
7. **handle_stockfish_move()** - Get and execute AI moves
8. **update_board_with_vision(chess_array)** - Update board from vision
9. **display_board()** - Show current board state
10. **save_last_play()** - Persist game state
11. **run()** - Main game loop

### Robot Integration Functions:
- **main_direct_move_piece(self)** - Main wrapper for direct_move_piece()
- **main_remove_piece(self)** - Main wrapper for remove_piece()

### Move Class:
- Represents chess moves with position data
- Handles piece type detection and move validation
- Integrates with chess.py library for move parsing

### Key Integration Points for FastAPI Wrapper:
1. **Robot Control**: All robot functions are in robot_api.api module
2. **Chess Logic**: Uses python-chess library for game state
3. **Configuration**: YAML-based configuration system
4. **Vision System**: Optional computer vision integration
5. **Stockfish Engine**: Chess AI integration
6. **State Persistence**: Game state saving/loading

### Dependencies Confirmed:
- `ur_rtde` - Robot communication
- `python-chess` - Chess game logic
- `stockfish` - Chess engine
- `yaml` - Configuration parsing
- `threading` - Vision system threading
- `json` - Data serialization
- `platform` - OS detection
- `subprocess` - External process management

## Recommendations for FastAPI Wrapper:
1. **Preserve Existing Logic**: Wrap existing functions without modification
2. **State Management**: Implement server-side game state management
3. **WebSocket Integration**: Real-time updates for robot status and game state
4. **Mock Mode**: Implement mock versions of robot functions for development
5. **Configuration API**: Expose configuration management via REST endpoints
6. **Safety Interlocks**: Implement safety checks at API level
7. **Session Management**: Track multiple concurrent games/sessions

