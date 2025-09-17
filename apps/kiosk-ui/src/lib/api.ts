/**
 * UR10 Kiosk PWA - API Client
 * 
 * This module provides a typed API client for communicating with the FastAPI backend.
 * It uses the shared types to ensure type safety across the frontend and backend.
 */

import type {
  ApiResponse,
  AuthRequest,
  AuthResponse,
  SessionInfo,
  RobotTelemetry,
  ConnectRobotRequest,
  HomeRobotRequest,
  StopRobotRequest,
  JogRequest,
  MoveRequest,
  ChessGameState,
  NewGameRequest,
  MakeMoveRequest,
  AnalyzePositionRequest,
  KioskSettings,
  UpdateSettingsRequest,
  BackupSettingsRequest,
  RestoreSettingsRequest
} from '@ur10-kiosk/types'

// API Configuration
const API_BASE = process.env.NODE_ENV === 'production' 
  ? window.location.origin.replace(/:\d+/, ':8000')
  : 'http://localhost:8000'

const API_VERSION = 'v1'
const API_URL = `${API_BASE}/api`

// API Client Class
class UR10ApiClient {
  private sessionId: string | null = null

  constructor() {
    // Try to restore session from localStorage
    this.sessionId = localStorage.getItem('ur10-session-id')
  }

  // Set session ID for authenticated requests
  setSessionId(sessionId: string | null) {
    this.sessionId = sessionId
    if (sessionId) {
      localStorage.setItem('ur10-session-id', sessionId)
    } else {
      localStorage.removeItem('ur10-session-id')
    }
  }

  // Generic request method with error handling
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_URL}${endpoint}`
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers
    }

    // Add session ID if available
    if (this.sessionId) {
      headers['X-Session-ID'] = this.sessionId
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      return data
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error)
      throw error
    }
  }

  // Authentication Methods
  async login(request: AuthRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(request)
    })
    
    if (response.success && response.data?.sessionId) {
      this.setSessionId(response.data.sessionId)
    }
    
    return response.data!
  }

  async logout(): Promise<void> {
    await this.request('/auth/logout', {
      method: 'POST'
    })
    this.setSessionId(null)
  }

  async getSession(): Promise<SessionInfo> {
    const response = await this.request<SessionInfo>('/auth/session')
    return response.data!
  }

  // Robot Control Methods
  async connectRobot(request?: ConnectRobotRequest): Promise<void> {
    await this.request('/robot/connect', {
      method: 'POST',
      body: request ? JSON.stringify(request) : undefined
    })
  }

  async disconnectRobot(): Promise<void> {
    await this.request('/robot/disconnect', {
      method: 'POST'
    })
  }

  async homeRobot(request?: HomeRobotRequest): Promise<void> {
    await this.request('/robot/home', {
      method: 'POST',
      body: request ? JSON.stringify(request) : undefined
    })
  }

  async stopRobot(request?: StopRobotRequest): Promise<void> {
    await this.request('/robot/stop', {
      method: 'POST',
      body: request ? JSON.stringify(request) : undefined
    })
  }

  async jogRobot(request: JogRequest): Promise<void> {
    await this.request('/robot/jog', {
      method: 'POST',
      body: JSON.stringify(request)
    })
  }

  async moveRobot(request: MoveRequest): Promise<void> {
    await this.request('/robot/move', {
      method: 'POST',
      body: JSON.stringify(request)
    })
  }

  // Robot Status Methods
  async getRobotStatus(): Promise<RobotTelemetry> {
    const response = await this.request<RobotTelemetry>('/robot/status')
    return response.data!
  }

  async getTelemetryHistory(
    start?: number, 
    end?: number, 
    limit?: number
  ): Promise<RobotTelemetry[]> {
    const params = new URLSearchParams()
    if (start) params.append('start', start.toString())
    if (end) params.append('end', end.toString())
    if (limit) params.append('limit', limit.toString())
    
    const query = params.toString() ? `?${params.toString()}` : ''
    const response = await this.request<RobotTelemetry[]>(`/robot/telemetry${query}`)
    return response.data!
  }

  // Chess Game Methods
  async getChessGames(): Promise<ChessGameState[]> {
    const response = await this.request<ChessGameState[]>('/chess/games')
    return response.data!
  }

  async createChessGame(request: NewGameRequest): Promise<ChessGameState> {
    const response = await this.request<ChessGameState>('/chess/games', {
      method: 'POST',
      body: JSON.stringify(request)
    })
    return response.data!
  }

  async getChessGame(gameId: string): Promise<ChessGameState> {
    const response = await this.request<ChessGameState>(`/chess/games/${gameId}`)
    return response.data!
  }

  async deleteChessGame(gameId: string): Promise<void> {
    await this.request(`/chess/games/${gameId}`, {
      method: 'DELETE'
    })
  }

  async makeChessMove(request: MakeMoveRequest): Promise<ChessGameState> {
    const response = await this.request<ChessGameState>(
      `/chess/games/${request.gameId}/moves`, 
      {
        method: 'POST',
        body: JSON.stringify({
          move: request.move,
          executeWithRobot: request.executeWithRobot
        })
      }
    )
    return response.data!
  }

  async analyzePosition(request: AnalyzePositionRequest): Promise<{
    bestMove: string
    evaluation: number
    depth: number
    principalVariation: string[]
  }> {
    const response = await this.request<{
      bestMove: string
      evaluation: number
      depth: number
      principalVariation: string[]
    }>(`/chess/games/${request.gameId}/analyze`, {
      method: 'POST',
      body: JSON.stringify({
        depth: request.depth,
        timeLimit: request.timeLimit
      })
    })
    return response.data!
  }

  // Settings Methods
  async getSettings(): Promise<KioskSettings> {
    const response = await this.request<KioskSettings>('/settings')
    return response.data!
  }

  async updateSettings(request: UpdateSettingsRequest): Promise<void> {
    await this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(request)
    })
  }

  async backupSettings(request?: BackupSettingsRequest): Promise<{
    backup: string
    timestamp: number
  }> {
    const response = await this.request<{
      backup: string
      timestamp: number
    }>('/settings/backup', {
      method: 'POST',
      body: request ? JSON.stringify(request) : undefined
    })
    return response.data!
  }

  async restoreSettings(request: RestoreSettingsRequest): Promise<void> {
    await this.request('/settings/restore', {
      method: 'POST',
      body: JSON.stringify(request)
    })
  }

  // System Methods
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    timestamp: number
    uptime: number
    version: string
    components: {
      database: 'healthy' | 'unhealthy'
      robot: 'connected' | 'disconnected' | 'error'
      chess_engine: 'available' | 'unavailable'
    }
  }> {
    const response = await this.request<{
      status: 'healthy' | 'degraded' | 'unhealthy'
      timestamp: number
      uptime: number
      version: string
      components: {
        database: 'healthy' | 'unhealthy'
        robot: 'connected' | 'disconnected' | 'error'
        chess_engine: 'available' | 'unavailable'
      }
    }>('/system/health')
    return response.data!
  }

  async getSystemLogs(
    level?: 'debug' | 'info' | 'warn' | 'error',
    limit?: number,
    start?: number
  ): Promise<Array<{
    timestamp: number
    level: string
    message: string
    component: string
    details?: any
  }>> {
    const params = new URLSearchParams()
    if (level) params.append('level', level)
    if (limit) params.append('limit', limit.toString())
    if (start) params.append('start', start.toString())
    
    const query = params.toString() ? `?${params.toString()}` : ''
    const response = await this.request<Array<{
      timestamp: number
      level: string
      message: string
      component: string
      details?: any
    }>>(`/system/logs${query}`)
    return response.data!
  }
}

// Create and export a singleton instance
export const apiClient = new UR10ApiClient()

// Export the class for testing or custom instances
export { UR10ApiClient }

// Export convenience functions for common operations
export const api = {
  // Auth
  login: (request: AuthRequest) => apiClient.login(request),
  logout: () => apiClient.logout(),
  getSession: () => apiClient.getSession(),

  // Robot Control
  robot: {
    connect: (request?: ConnectRobotRequest) => apiClient.connectRobot(request),
    disconnect: () => apiClient.disconnectRobot(),
    home: (request?: HomeRobotRequest) => apiClient.homeRobot(request),
    stop: (request?: StopRobotRequest) => apiClient.stopRobot(request),
    jog: (request: JogRequest) => apiClient.jogRobot(request),
    move: (request: MoveRequest) => apiClient.moveRobot(request),
    getStatus: () => apiClient.getRobotStatus(),
    getTelemetry: (start?: number, end?: number, limit?: number) => 
      apiClient.getTelemetryHistory(start, end, limit)
  },

  // Chess
  chess: {
    getGames: () => apiClient.getChessGames(),
    createGame: (request: NewGameRequest) => apiClient.createChessGame(request),
    getGame: (gameId: string) => apiClient.getChessGame(gameId),
    deleteGame: (gameId: string) => apiClient.deleteChessGame(gameId),
    makeMove: (request: MakeMoveRequest) => apiClient.makeChessMove(request),
    analyze: (request: AnalyzePositionRequest) => apiClient.analyzePosition(request)
  },

  // Settings
  settings: {
    get: () => apiClient.getSettings(),
    update: (request: UpdateSettingsRequest) => apiClient.updateSettings(request),
    backup: (request?: BackupSettingsRequest) => apiClient.backupSettings(request),
    restore: (request: RestoreSettingsRequest) => apiClient.restoreSettings(request)
  },

  // System
  system: {
    getHealth: () => apiClient.getSystemHealth(),
    getLogs: (level?: 'debug' | 'info' | 'warn' | 'error', limit?: number, start?: number) =>
      apiClient.getSystemLogs(level, limit, start)
  }
}

