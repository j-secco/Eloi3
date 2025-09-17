// ============================================================================
// UR10 Kiosk PWA - Shared TypeScript Types
// ============================================================================

// Robot Connection and State Types
// ============================================================================

export type RobotConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export type RobotState = 
  | 'IDLE' 
  | 'RUNNING' 
  | 'PAUSED' 
  | 'STOPPED' 
  | 'ERROR' 
  | 'EMERGENCY_STOP' 
  | 'PROTECTIVE_STOP'
  | 'SAFEGUARD_STOP'
  | 'VIOLATION'
  | 'FAULT'
  | 'BOOTING'
  | 'POWER_OFF'
  | 'POWER_ON'
  | 'BACKDRIVE'
  | 'UPDATING_FIRMWARE';

export type SafetyMode = 
  | 'NORMAL'
  | 'REDUCED'
  | 'PROTECTIVE_STOP'
  | 'RECOVERY'
  | 'SAFEGUARD_STOP'
  | 'SYSTEM_EMERGENCY_STOP'
  | 'ROBOT_EMERGENCY_STOP'
  | 'VIOLATION'
  | 'FAULT'
  | 'VALIDATE_JOINT_ID'
  | 'UNDEFINED_SAFETY_MODE';

// Robot Telemetry and Position Types
// ============================================================================

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Rotation3D {
  rx: number;
  ry: number;
  rz: number;
}

export interface Pose6D extends Vector3D, Rotation3D {}

export interface JointPositions {
  base: number;
  shoulder: number;
  elbow: number;
  wrist1: number;
  wrist2: number;
  wrist3: number;
}

export interface RobotTelemetry {
  timestamp: number;
  connectionState: RobotConnectionState;
  robotState: RobotState;
  safetyMode: SafetyMode;
  
  // Position data
  tcpPosition: Pose6D;
  jointPositions: JointPositions;
  jointVelocities: JointPositions;
  jointCurrents: JointPositions;
  jointTemperatures: JointPositions;
  
  // Status flags
  isEmergencyStop: boolean;
  isProtectiveStop: boolean;
  isProgramRunning: boolean;
  isRobotConnected: boolean;
  
  // Program info
  currentProgram?: string;
  programState?: string;
  
  // Error information
  lastError?: string;
  errorCode?: number;
}

// Robot Control and Movement Types
// ============================================================================

export type JogMode = 'tcp' | 'joint';

export interface JogRequest {
  mode: JogMode;
  axis: 'x' | 'y' | 'z' | 'rx' | 'ry' | 'rz' | 'base' | 'shoulder' | 'elbow' | 'wrist1' | 'wrist2' | 'wrist3';
  direction: 'positive' | 'negative';
  distance: number;
  speed: number;
  acceleration?: number;
}

export interface MoveRequest {
  target: Pose6D | JointPositions;
  speed: number;
  acceleration: number;
  blend?: number;
  moveType: 'linear' | 'joint' | 'circular';
}

export interface RobotParameters {
  maxSpeed: number;
  maxAcceleration: number;
  defaultSpeed: number;
  defaultAcceleration: number;
  jogDistance: number;
  jogSpeed: number;
  safetyLimits: {
    workspace: {
      min: Vector3D;
      max: Vector3D;
    };
    jointLimits: {
      min: JointPositions;
      max: JointPositions;
    };
  };
}

// Chess Game Types
// ============================================================================

export type ChessPiece = 
  | 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';

export type ChessColor = 'white' | 'black';

export type ChessSquare = string; // e.g., 'e4', 'a1'

export interface ChessPieceInfo {
  piece: ChessPiece;
  color: ChessColor;
  square: ChessSquare;
}

export interface ChessMove {
  from: ChessSquare;
  to: ChessSquare;
  piece: ChessPiece;
  captured?: ChessPiece;
  promotion?: ChessPiece;
  castling?: 'kingside' | 'queenside';
  enPassant?: boolean;
  check?: boolean;
  checkmate?: boolean;
  stalemate?: boolean;
  san: string; // Standard Algebraic Notation
  uci: string; // Universal Chess Interface notation
}

export type GameMode = 'human' | 'engine';

export type GameStatus = 
  | 'waiting' 
  | 'active' 
  | 'paused' 
  | 'finished' 
  | 'aborted';

export interface ChessGameState {
  gameId: string;
  mode: GameMode;
  status: GameStatus;
  currentPlayer: ChessColor;
  board: (ChessPieceInfo | null)[][];
  moves: ChessMove[];
  fen: string; // Forsyth-Edwards Notation
  pgn: string; // Portable Game Notation
  
  // Game result
  winner?: ChessColor | 'draw';
  result?: '1-0' | '0-1' | '1/2-1/2' | '*';
  termination?: 'checkmate' | 'stalemate' | 'resignation' | 'timeout' | 'draw' | 'aborted';
  
  // Engine info
  engineDepth?: number;
  engineEvaluation?: number;
  engineBestMove?: string;
  engineThinking?: boolean;
  
  // Robot execution
  robotExecuting?: boolean;
  lastRobotMove?: ChessMove;
  robotMoveQueue: ChessMove[];
}

// Session and Authentication Types
// ============================================================================

export type UserRole = 'operator' | 'supervisor' | 'admin';

export interface SessionInfo {
  sessionId: string;
  userId?: string;
  role: UserRole;
  isLocked: boolean;
  isSupervisor: boolean;
  loginTime: number;
  lastActivity: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthRequest {
  pin: string;
  role?: UserRole;
  sessionId?: string;
}

export interface AuthResponse {
  success: boolean;
  sessionId?: string;
  role?: UserRole;
  message?: string;
  expiresAt?: number;
}

// System Configuration Types
// ============================================================================

export interface RobotConnectionConfig {
  hostname: string;
  port: number;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface SecurityConfig {
  operatorPin: string;
  supervisorPin: string;
  adminPin: string;
  autoLockEnabled: boolean;
  autoLockTimeout: number; // minutes
  maxFailedAttempts: number;
  lockoutDuration: number; // minutes
}

export interface InterfaceConfig {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  touchSensitivity: number;
  screenTimeout: number; // minutes
  showAdvancedControls: boolean;
  enableSounds: boolean;
  enableHapticFeedback: boolean;
}

export interface SystemConfig {
  mockMode: boolean;
  debugMode: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  telemetryInterval: number; // milliseconds
  heartbeatInterval: number; // milliseconds
  maxLogSize: number; // MB
  backupEnabled: boolean;
  backupInterval: number; // hours
}

export interface KioskSettings {
  robot: RobotConnectionConfig;
  security: SecurityConfig;
  interface: InterfaceConfig;
  system: SystemConfig;
  robotParameters: RobotParameters;
}

// API Request/Response Types
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
}

// Robot Control API
export interface ConnectRobotRequest {
  hostname?: string;
  port?: number;
  timeout?: number;
}

export interface HomeRobotRequest {
  speed?: number;
  acceleration?: number;
}

export interface StopRobotRequest {
  emergency?: boolean;
}

// Chess API
export interface NewGameRequest {
  mode: GameMode;
  playerColor?: ChessColor;
  engineLevel?: number;
}

export interface MakeMoveRequest {
  gameId: string;
  move: string; // UCI or SAN notation
  executeWithRobot?: boolean;
}

export interface AnalyzePositionRequest {
  gameId: string;
  depth?: number;
  timeLimit?: number; // seconds
}

// Settings API
export interface UpdateSettingsRequest {
  section: keyof KioskSettings;
  settings: Partial<KioskSettings[keyof KioskSettings]>;
}

export interface BackupSettingsRequest {
  includeSecrets?: boolean;
}

export interface RestoreSettingsRequest {
  backup: string; // base64 encoded backup data
  overwriteExisting?: boolean;
}

// WebSocket Message Types
// ============================================================================

export type WebSocketMessageType = 
  | 'telemetry'
  | 'robot_status'
  | 'chess_update'
  | 'session_update'
  | 'system_alert'
  | 'error'
  | 'ping'
  | 'pong';

export interface WebSocketMessage<T = any> {
  type: WebSocketMessageType;
  data: T;
  timestamp: number;
  sessionId?: string;
}

export interface TelemetryMessage extends WebSocketMessage<RobotTelemetry> {
  type: 'telemetry';
}

export interface ChessUpdateMessage extends WebSocketMessage<Partial<ChessGameState>> {
  type: 'chess_update';
}

export interface SystemAlertMessage extends WebSocketMessage<{
  level: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  code?: string;
}> {
  type: 'system_alert';
}

// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Constants
// ============================================================================

export const DEFAULT_ROBOT_CONFIG: RobotConnectionConfig = {
  hostname: '192.168.1.100',
  port: 30004,
  timeout: 5000,
  retryAttempts: 3,
  retryDelay: 1000,
};

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  operatorPin: '1234',
  supervisorPin: '5678',
  adminPin: '9999',
  autoLockEnabled: true,
  autoLockTimeout: 5,
  maxFailedAttempts: 3,
  lockoutDuration: 15,
};

export const DEFAULT_INTERFACE_CONFIG: InterfaceConfig = {
  theme: 'light',
  language: 'en',
  touchSensitivity: 1.0,
  screenTimeout: 30,
  showAdvancedControls: false,
  enableSounds: true,
  enableHapticFeedback: true,
};

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  mockMode: true,
  debugMode: false,
  logLevel: 'info',
  telemetryInterval: 100,
  heartbeatInterval: 1000,
  maxLogSize: 100,
  backupEnabled: true,
  backupInterval: 24,
};

export const DEFAULT_ROBOT_PARAMETERS: RobotParameters = {
  maxSpeed: 1.0,
  maxAcceleration: 1.0,
  defaultSpeed: 0.1,
  defaultAcceleration: 0.5,
  jogDistance: 0.01,
  jogSpeed: 0.1,
  safetyLimits: {
    workspace: {
      min: { x: -1.0, y: -1.0, z: 0.0 },
      max: { x: 1.0, y: 1.0, z: 1.0 },
    },
    jointLimits: {
      min: { base: -360, shoulder: -360, elbow: -360, wrist1: -360, wrist2: -360, wrist3: -360 },
      max: { base: 360, shoulder: 360, elbow: 360, wrist1: 360, wrist2: 360, wrist3: 360 },
    },
  },
};

// Export all types as a namespace for easier importing
export * as UR10Types from './index';

