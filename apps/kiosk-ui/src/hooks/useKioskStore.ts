import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Temporary simplified types while we fix the @ur10-kiosk/types import
const DEFAULT_ROBOT_CONFIG = {
  hostname: '192.168.1.100',
  port: 30004,
  timeout: 5000,
  retryAttempts: 3,
  retryDelay: 1000,
}

const DEFAULT_SECURITY_CONFIG = {
  operatorPin: '1234',
  supervisorPin: '5678',
  adminPin: '9999',
  autoLockEnabled: true,
  autoLockTimeout: 5,
  maxFailedAttempts: 3,
  lockoutDuration: 15,
}

const DEFAULT_INTERFACE_CONFIG = {
  theme: 'light',
  language: 'en',
  touchSensitivity: 1.0,
  screenTimeout: 30,
  showAdvancedControls: false,
  enableSounds: true,
  enableHapticFeedback: true,
}

const DEFAULT_SYSTEM_CONFIG = {
  mockMode: true,
  debugMode: false,
  logLevel: 'info',
  telemetryInterval: 100,
  heartbeatInterval: 1000,
  maxLogSize: 100,
  backupEnabled: true,
  backupInterval: 24,
}

const DEFAULT_ROBOT_PARAMETERS = {
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
}

// API base URL - in production this would be configurable
const API_BASE = process.env.NODE_ENV === 'production' 
  ? window.location.origin.replace(/:\d+/, ':8000')
  : 'http://localhost:8000'

// Simplified interface for JavaScript compatibility
const createKioskStore = () => ({

export const useKioskStore = create(
  persist(
    (set, get) => ({
      // Session state
      sessionId: null,
      isLocked: true,
      isSupervisor: false,
      
      // Robot state
      robotConnected: false,
      robotState: 'IDLE',
      telemetry: null,
      
      // UI state
      currentScreen: 'dashboard',
      isFullscreen: false,
      showDebugInfo: false,
      
      // Chess state
      boardState: null,
      engineStatus: null,
      
      // Settings with defaults
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
          const response = await fetch(`${API_BASE}/api/v1/session/start`, {
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
              sessionId: data.session_id,
              isLocked: false // Auto-unlock for kiosk mode
            })
            return data.session_id
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
          const response = await fetch(`${API_BASE}/api/v1/session/supervisor?pin=${encodeURIComponent(pin)}`, {
            method: 'POST',
            headers: {
              'X-Session-ID': sessionId
            }
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
          const response = await fetch(`${API_BASE}/api/v1/robot/connect`, {
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
          const response = await fetch(`${API_BASE}/api/v1/robot/disconnect`, {
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
          const response = await fetch(`${API_BASE}/api/v1/robot/home`, {
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
          const response = await fetch(`${API_BASE}/api/v1/robot/jog`, {
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
          const response = await fetch(`${API_BASE}/api/v1/robot/stop`, {
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
          const response = await fetch(`${API_BASE}/api/v1/robot/estop`, {
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
      
      updateTelemetry: (telemetry) => {
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

