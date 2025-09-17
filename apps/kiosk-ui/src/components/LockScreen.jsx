import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Lock, Unlock, Wifi, WifiOff, Activity, AlertTriangle } from 'lucide-react'
import { useKioskStore } from '../hooks/useKioskStore'
import { useWebSocket } from '../hooks/useWebSocket'

export default function LockScreen() {
  const [pin, setPin] = useState('')
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [error, setError] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())
  
  const { unlock, robotConnected, robotState, settings } = useKioskStore()
  const { connectionStatus } = useWebSocket()
  
  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    
    return () => clearInterval(timer)
  }, [])
  
  const handleNumberClick = (number) => {
    if (pin.length < 6) {
      setPin(prev => prev + number)
      setError('')
    }
  }
  
  const handleClear = () => {
    setPin('')
    setError('')
  }
  
  const handleUnlock = async () => {
    if (pin.length === 0) return
    
    setIsUnlocking(true)
    setError('')
    
    try {
      const success = unlock(pin)
      
      if (!success) {
        setError('Invalid PIN')
        setPin('')
      }
    } catch (error) {
      setError('Unlock failed')
      setPin('')
    } finally {
      setIsUnlocking(false)
    }
  }
  
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }
  
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
  
  const getConnectionStatusColor = (status) => {
    switch (status) {
      case 'connected': return 'bg-green-500'
      case 'connecting': return 'bg-yellow-500'
      case 'reconnecting': return 'bg-orange-500'
      case 'error': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }
  
  const getRobotStateColor = (state) => {
    switch (state) {
      case 'READY': return 'bg-green-500'
      case 'EXECUTING': return 'bg-blue-500'
      case 'PAUSED': return 'bg-yellow-500'
      case 'FAULT': return 'bg-red-500'
      case 'ESTOP': return 'bg-red-600'
      default: return 'bg-gray-500'
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex flex-col">
      {/* Header with status indicators */}
      <div className="p-6 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="text-white">
            <h1 className="text-2xl font-bold">UR10 Robot Kiosk</h1>
            <p className="text-blue-200">Industrial Automation System</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            {connectionStatus.telemetry === 'connected' ? (
              <Wifi className="w-5 h-5 text-green-400" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-400" />
            )}
            <Badge variant="outline" className="text-white border-white/30">
              {connectionStatus.telemetry}
            </Badge>
          </div>
          
          {/* Robot Status */}
          <div className="flex items-center space-x-2">
            {robotConnected ? (
              <Activity className="w-5 h-5 text-green-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
            )}
            <Badge 
              variant="outline" 
              className={`text-white border-white/30 ${getRobotStateColor(robotState)}`}
            >
              {robotState}
            </Badge>
          </div>
          
          {/* Mock Mode Indicator */}
          {settings.mockMode && (
            <Badge variant="outline" className="text-yellow-300 border-yellow-300/50">
              MOCK MODE
            </Badge>
          )}
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Time and Date Display */}
          <div className="text-center mb-8">
            <div className="text-6xl font-light text-white mb-2">
              {formatTime(currentTime)}
            </div>
            <div className="text-xl text-blue-200">
              {formatDate(currentTime)}
            </div>
          </div>
          
          {/* Lock Screen Card */}
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center space-x-2 text-white">
                <Lock className="w-6 h-6" />
                <span>Enter PIN to Continue</span>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* PIN Display */}
              <div className="flex justify-center space-x-2">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full border-2 border-white/50 ${
                      i < pin.length ? 'bg-white' : 'bg-transparent'
                    }`}
                  />
                ))}
              </div>
              
              {/* Error Message */}
              {error && (
                <div className="text-center text-red-300 text-sm">
                  {error}
                </div>
              )}
              
              {/* Number Pad */}
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
                  <Button
                    key={number}
                    variant="outline"
                    size="lg"
                    className="h-16 text-2xl font-semibold bg-white/10 border-white/30 text-white hover:bg-white/20 active:scale-95 transition-all"
                    onClick={() => handleNumberClick(number.toString())}
                    disabled={isUnlocking}
                  >
                    {number}
                  </Button>
                ))}
                
                {/* Bottom row */}
                <Button
                  variant="outline"
                  size="lg"
                  className="h-16 text-lg bg-white/10 border-white/30 text-white hover:bg-white/20 active:scale-95 transition-all"
                  onClick={handleClear}
                  disabled={isUnlocking}
                >
                  Clear
                </Button>
                
                <Button
                  variant="outline"
                  size="lg"
                  className="h-16 text-2xl font-semibold bg-white/10 border-white/30 text-white hover:bg-white/20 active:scale-95 transition-all"
                  onClick={() => handleNumberClick('0')}
                  disabled={isUnlocking}
                >
                  0
                </Button>
                
                <Button
                  variant="default"
                  size="lg"
                  className="h-16 bg-green-600 hover:bg-green-700 text-white active:scale-95 transition-all"
                  onClick={handleUnlock}
                  disabled={isUnlocking || pin.length === 0}
                >
                  {isUnlocking ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
                  ) : (
                    <Unlock className="w-6 h-6" />
                  )}
                </Button>
              </div>
              
              {/* Instructions */}
              <div className="text-center text-sm text-blue-200">
                <p>Default PIN: 1234</p>
                <p className="mt-1">Touch numbers to enter PIN</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Footer */}
      <div className="p-4 text-center text-blue-300 text-sm">
        <p>UR10 Robot Workspace • Kiosk Mode • v1.0.0</p>
      </div>
    </div>
  )
}

