import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface KioskStore {
  sessionId: string | null
  isLocked: boolean
  isSupervisor: boolean
  unlock: (pin: string) => boolean
  lock: () => void
  initializeSession: () => Promise<string | null>
}

export const useKioskStore = create<KioskStore>()(
  persist(
    (set, get) => ({
      sessionId: null,
      isLocked: true,
      isSupervisor: false,
      
      unlock: (pin: string) => {
        if (pin === '1234') {
          set({ isLocked: false, isSupervisor: false })
          return true
        }
        return false
      },
      
      lock: () => {
        set({ isLocked: true, isSupervisor: false })
      },
      
      initializeSession: async () => {
        // Mock implementation
        const sessionId = `session-${Date.now()}`
        set({ sessionId })
        return sessionId
      }
    }),
    {
      name: 'ur10-kiosk-store-temp'
    }
  )
)

