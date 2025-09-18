import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useKioskStore } from './hooks/useKioskStore'
import { useWebSocket } from './hooks/useWebSocket'
import LockScreen from './components/LockScreen'
import Dashboard from './components/Dashboard'
import JogScreen from './components/JogScreen'
import ChessScreen from './components/ChessScreen'
import SettingsScreen from './components/SettingsScreen'
import { Toaster } from './components/ui/toaster'

function App() {
  const { isLocked, initializeSession } = useKioskStore()
  const { connect } = useWebSocket()
  
  // Initialize the kiosk session on app start
  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('Initializing kiosk session...')
        await initializeSession()
        console.log('Connecting WebSocket...')
        connect()
      } catch (error) {
        console.error('Failed to initialize kiosk:', error)
      }
    }
    
    initialize()
  }, [])
  
  // Show lock screen if locked, otherwise show main app
  if (isLocked) {
    return (
      <div className="app">
        <LockScreen />
        <Toaster />
      </div>
    )
  }
  
  return (
    <div className="app">
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/jog" element={<JogScreen />} />
          <Route path="/chess" element={<ChessScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
      <Toaster />
    </div>
  )
}

export default App

