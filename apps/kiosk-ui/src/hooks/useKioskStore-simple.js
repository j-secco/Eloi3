import { create } from 'zustand'

export const useKioskStore = create((set, get) => ({
  // Session state
  sessionId: null,
  isLocked: true,
  isSupervisor: false,
  
  // Robot state
  robotConnected: false,
  robotState: 'IDLE',
  telemetry: null,
  
  // Settings
  settings: {
    robotHostname: '192.168.1.100',
    robotPort: 30004,
    mockMode: true,
    autoLock: true,
    lockTimeout: 300000,
    theme: 'light'
  },
  
  // Actions
  initializeSession: async () => {
    // Simulate session initialization
    set({ 
      sessionId: 'test-session-123',
      isLocked: false // Auto-unlock for testing
    })
    return 'test-session-123'
  },
  
  unlock: (pin) => {
    if (pin === '1234') {
      set({ isLocked: false })
      return true
    }
    return false
  },
  
  lock: () => {
    set({ isLocked: true, isSupervisor: false })
  },
  
  updateTelemetry: (telemetry) => {
    set({ telemetry })
  },
  
  updateSettings: (newSettings) => {
    set({ 
      settings: { ...get().settings, ...newSettings }
    })
  }
}))

