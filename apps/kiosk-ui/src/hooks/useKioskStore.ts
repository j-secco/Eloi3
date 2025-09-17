import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { 
  RobotTelemetry, 
  KioskSettings, 
  SessionInfo,
  RobotConnectionState,
  RobotState,
  JogRequest,
  ChessGameState,
  DEFAULT_ROBOT_CONFIG,
  DEFAULT_SECURITY_CONFIG,
  DEFAULT_INTERFACE_CONFIG,
  DEFAULT_SYSTEM_CONFIG,
  DEFAULT_ROBOT_PARAMETERS
} from '@ur10-kiosk/types'

// API base URL - in production this would be configurable
const API_BASE = process.env.NODE_ENV === 'production' 
  ? window.location.origin.replace(/:\d+/, ':8000')
  : 'http://localhost:8000'

interface KioskStore {
  // Session state
  sessionId: string | null
  isLocked: boolean
  isSupervisor: boolean
  
  // Robot state
  robotConnected: boolean
  robotState: RobotState
  telemetry: RobotTelemetry | null
  
  // UI state
  currentScreen: string
  isFullscreen: boolean
  showDebugInfo: boolean
  
  // Chess state
  boardState: ChessGameState | null
  engineStatus: any | null
  
  // Settings
  settings: KioskSettings
  
  // Actions
  initializeSession: () => Promise<string | null>
  unlock: (pin: string) => boolean
  lock: () => void
  authenticateSupervisor: (pin: string) => Promise<boolean>
  
  // Robot control actions
  connectRobot: (hostname?: string, port?: number) => Promise<boolean>
  disconnectRobot: () => Promise<boolean>
  homeRobot: () => Promise<boolean>
  jogRobot: (jogRequest: JogRequest) => Promise<boolean>
  stopRobot: () => Promise<boolean>
  emergencyStop: () => Promise<boolean>
  
  // Chess actions
  chessMove: (fromSquare: string, toSquare: string, promotion?: string) => Promise<boolean>
  
  // State updates
  updateTelemetry: (telemetry: RobotTelemetry) => void
  updateSettings: (newSettings: Partial<KioskSettings>) => void
  setCurrentScreen: (screen: string) => void
  toggleFullscreen: () => void
  toggleDebugInfo: () => void
}

export const useKioskStore = create<KioskStore>()(
  persist(
    (set, get) => ({
      // Session state
      sessionId: null,
      isLocked: true,
      isSupervisor: false,
      
      // Robot state
      robotConnected: false,
      robotState: 'IDLE' as RobotState,
      telemetry: null,
      
      // UI state
      currentScreen: 'dashboard',
      isFullscreen: false,
      showDebugInfo: false,
      
      // Chess state
      boardState: null,
      engineStatus: null,
      
      // Settings with proper defaults from shared types
      settings: {
        robot: DEFAULT_ROBOT_CONFIG,
        security: DEFAULT_SECURITY_CONFIG,
        interface: DEFAULT_INTERFACE_CONFIG,
        system: DEFAULT_SYSTEM_CONFIG,
        robotParameters: DEFAULT_ROBOT_PARAMETERS
      },
      
      // Actions
      initializeSession: async () => {
        try {
          const response = await fetch(`${API_BASE}/api/auth/session`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              client_id: 'kiosk-ui',
              user_agent: navigator.userAgent
            })
          })
          
          if (response.ok) {
            const data = await response.json()
            set({ 
              sessionId: data.sessionId,
              isLocked: false // Auto-unlock for kiosk mode
            })
            return data.sessionId
          } else {
            throw new Error('Failed to initialize session')
          }
        } catch (error) {
          console.error('Session initialization failed:', error)
          // In kiosk mode, we might want to retry or show an error
          set({ isLocked: true })
          return null
        }
      },
      
      unlock: (pin: string) => {
        const { settings } = get()
        if (pin === settings.security.operatorPin) {
          set({ isLocked: false, isSupervisor: false })
          return true
        } else if (pin === settings.security.supervisorPin) {
          set({ isLocked: false, isSupervisor: true })
          return true
        }
        return false
      },
      
      lock: () => {
        set({ isLocked: true, isSupervisor: false })
      },
      
      authenticateSupervisor: async (pin: string) => {
        const { sessionId } = get()
        if (!sessionId) return false
        
        try {
          const response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-ID': sessionId
            },
            body: JSON.stringify({
              pin,
              role: 'supervisor'
            })
          })
          
          if (response.ok) {
            set({ isSupervisor: true })
            return true
          }
          return false
        } catch (error) {
          console.error('Supervisor authentication failed:', error)
          return false
        }
      },
      
      connectRobot: async (hostname?: string, port?: number) => {
        const { sessionId, settings } = get()
        if (!sessionId) return false
        
        try {
          const response = await fetch(`${API_BASE}/api/robot/connect`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-ID': sessionId
            },
            body: JSON.stringify({
              hostname: hostname || settings.robot.hostname,
              port: port || settings.robot.port
            })
          })
          
          if (response.ok) {
            set({ robotConnected: true })
            return true
          }
          return false
        } catch (error) {
          console.error('Robot connection failed:', error)
          return false
        }
      },
      
      disconnectRobot: async () => {
        const { sessionId } = get()
        if (!sessionId) return false
        
        try {
          const response = await fetch(`${API_BASE}/api/robot/disconnect`, {
            method: 'POST',
            headers: {
              'X-Session-ID': sessionId
            }
          })
          
          if (response.ok) {
            set({ robotConnected: false, robotState: 'IDLE' })
            return true
          }
          return false
        } catch (error) {
          console.error('Robot disconnection failed:', error)
          return false
        }
      },
      
      homeRobot: async () => {
        const { sessionId } = get()
        if (!sessionId) return false
        
        try {
          const response = await fetch(`${API_BASE}/api/robot/home`, {
            method: 'POST',
            headers: {
              'X-Session-ID': sessionId
            }
          })
          
          return response.ok
        } catch (error) {
          console.error('Robot homing failed:', error)
          return false
        }
      },
      
      jogRobot: async (jogRequest: JogRequest) => {
        const { sessionId } = get()
        if (!sessionId) return false
        
        try {
          const response = await fetch(`${API_BASE}/api/robot/jog`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-ID': sessionId
            },
            body: JSON.stringify(jogRequest)
          })
          
          return response.ok
        } catch (error) {
          console.error('Robot jog failed:', error)
          return false
        }
      },
      
      stopRobot: async () => {
        const { sessionId } = get()
        if (!sessionId) return false
        
        try {
          const response = await fetch(`${API_BASE}/api/robot/stop`, {
            method: 'POST',
            headers: {
              'X-Session-ID': sessionId
            }
          })
          
          return response.ok
        } catch (error) {
          console.error('Robot stop failed:', error)
          return false
        }
      },
      
      emergencyStop: async () => {
        const { sessionId } = get()
        if (!sessionId) return false
        
        try {
          const response = await fetch(`${API_BASE}/api/robot/stop`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-ID': sessionId
            },
            body: JSON.stringify({ emergency: true })
          })
          
          return response.ok
        } catch (error) {
          console.error('Emergency stop failed:', error)
          return false
        }
      },
      
      chessMove: async (fromSquare: string, toSquare: string, promotion?: string) => {
        const { sessionId } = get()
        if (!sessionId) return false
        
        try {
          const response = await fetch(`${API_BASE}/api/chess/games/current/moves`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-ID': sessionId
            },
            body: JSON.stringify({
              move: `${fromSquare}${toSquare}${promotion || ''}`,
              executeWithRobot: true
            })
          })
          
          return response.ok
        } catch (error) {
          console.error('Chess move failed:', error)
          return false
        }
      },
      
      updateTelemetry: (telemetry: RobotTelemetry) => {
        set({ 
          telemetry,
          robotState: telemetry.robotState,
          robotConnected: telemetry.isRobotConnected
        })
      },
      
      updateSettings: (newSettings: Partial<KioskSettings>) => {
        set({ 
          settings: { ...get().settings, ...newSettings }
        })
      },
      
      setCurrentScreen: (screen: string) => {
        set({ currentScreen: screen })
      },
      
      toggleFullscreen: () => {
        const isFullscreen = !get().isFullscreen
        set({ isFullscreen })
        
        if (isFullscreen) {
          document.documentElement.requestFullscreen?.()
        } else {
          document.exitFullscreen?.()
        }
      },
      
      toggleDebugInfo: () => {
        set({ showDebugInfo: !get().showDebugInfo })
      }
    }),
    {
      name: 'ur10-kiosk-store',
      partialize: (state) => ({
        settings: state.settings,
        isSupervisor: state.isSupervisor,
        sessionId: state.sessionId
      })
    }
  )
)

