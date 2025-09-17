import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { useKioskStore } from './hooks/useKioskStore-temp'
import { WebSocketProvider } from './hooks/useWebSocket'
import LockScreen from './components/LockScreen'
import Dashboard from './components/Dashboard'
import JogScreen from './components/JogScreen'
import ChessScreen from './components/ChessScreen'
import SettingsScreen from './components/SettingsScreen'
import './App.css'

function App() {
  const { isLocked, sessionId, initializeSession } = useKioskStore()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Initialize session on app start
    const init = async () => {
      await initializeSession()
      setIsInitialized(true)
    }
    init()
  }, [initializeSession])

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center">
        <div className="text-white text-2xl font-semibold animate-pulse">
          Initializing UR10 Robot Kiosk...
        </div>
      </div>
    )
  }

  return (
    <WebSocketProvider sessionId={sessionId}>
      <Router>
        <div className="min-h-screen bg-background text-foreground overflow-hidden">
          {isLocked ? (
            <LockScreen />
          ) : (
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/jog" element={<JogScreen />} />
              <Route path="/chess" element={<ChessScreen />} />
              <Route path="/settings" element={<SettingsScreen />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          )}
          <Toaster />
        </div>
      </Router>
    </WebSocketProvider>
  )
}

export default App

