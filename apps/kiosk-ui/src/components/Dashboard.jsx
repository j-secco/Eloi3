import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  Activity, 
  Gamepad2, 
  Crown, 
  Settings, 
  Power, 
  Home, 
  Square,
  AlertTriangle,
  Wifi,
  WifiOff,
  Lock,
  Maximize,
  Info
} from 'lucide-react'
import { useKioskStore } from '../hooks/useKioskStore'
import { useWebSocket } from '../hooks/useWebSocket'

export default function Dashboard() {
  const navigate = useNavigate()
  const [currentTime, setCurrentTime] = useState(new Date())
  
  const {
    robotConnected,
    robotState,
    telemetry,
    isSupervisor,
    settings,
    lock,
    connectRobot,
    disconnectRobot,
    homeRobot,
    stopRobot,
    emergencyStop,
    toggleFullscreen,
    toggleDebugInfo,
    showDebugInfo
  } = useKioskStore()
  
  const { connectionStatus, reconnectAll } = useWebSocket()
  
  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    
    return () => clearInterval(timer)
  }, [])
  
  const handleConnect = async () => {
    await connectRobot()
  }
  
  const handleDisconnect = async () => {
    await disconnectRobot()
  }
  
  const handleHome = async () => {
    await homeRobot()
  }
  
  const handleStop = async () => {
    await stopRobot()
  }
  
  const handleEmergencyStop = async () => {
    await emergencyStop()
  }
  
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }
  
  const getRobotStateColor = (state) => {
    switch (state) {
      case 'READY': return 'text-green-600 bg-green-100'
      case 'EXECUTING': return 'text-blue-600 bg-blue-100'
      case 'PAUSED': return 'text-yellow-600 bg-yellow-100'
      case 'FAULT': return 'text-red-600 bg-red-100'
      case 'ESTOP': return 'text-red-800 bg-red-200'
      default: return 'text-gray-600 bg-gray-100'
    }
  }
  
  const getConnectionStatusIcon = (status) => {
    return status === 'connected' ? (
      <Wifi className="w-4 h-4 text-green-600" />
    ) : (
      <WifiOff className="w-4 h-4 text-red-600" />
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">UR10 Robot Dashboard</h1>
            <Badge variant="outline" className="text-sm">
              {formatTime(currentTime)}
            </Badge>
            {settings.mockMode && (
              <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                MOCK MODE
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Connection Status */}
            <div className="flex items-center space-x-1">
              {getConnectionStatusIcon(connectionStatus.telemetry)}
              <span className="text-sm text-gray-600">
                {connectionStatus.telemetry}
              </span>
            </div>
            
            {/* Action Buttons */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
            >
              <Maximize className="w-4 h-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={toggleDebugInfo}
            >
              <Info className="w-4 h-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={lock}
            >
              <Lock className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 p-6 space-y-6">
        {/* Robot Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>Robot Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Connection Status */}
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-700">Connection</h3>
                <Badge className={robotConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {robotConnected ? 'Connected' : 'Disconnected'}
                </Badge>
                <div className="flex space-x-2 mt-2">
                  {!robotConnected ? (
                    <Button size="sm" onClick={handleConnect}>
                      Connect
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={handleDisconnect}>
                      Disconnect
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Robot State */}
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-700">State</h3>
                <Badge className={getRobotStateColor(robotState)}>
                  {robotState}
                </Badge>
                <div className="text-sm text-gray-600">
                  {telemetry?.program?.name || 'No active program'}
                </div>
              </div>
              
              {/* TCP Position */}
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-700">TCP Position</h3>
                {telemetry?.tcp_pose ? (
                  <div className="text-sm space-y-1">
                    <div>X: {telemetry.tcp_pose.x.toFixed(3)}m</div>
                    <div>Y: {telemetry.tcp_pose.y.toFixed(3)}m</div>
                    <div>Z: {telemetry.tcp_pose.z.toFixed(3)}m</div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No data</div>
                )}
              </div>
            </div>
            
            {/* Control Buttons */}
            <Separator className="my-4" />
            <div className="flex space-x-2">
              <Button
                onClick={handleHome}
                disabled={!robotConnected || robotState === 'EXECUTING'}
                className="flex items-center space-x-2"
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={handleStop}
                disabled={!robotConnected}
                className="flex items-center space-x-2"
              >
                <Square className="w-4 h-4" />
                <span>Stop</span>
              </Button>
              
              <Button
                variant="destructive"
                onClick={handleEmergencyStop}
                disabled={!robotConnected}
                className="flex items-center space-x-2"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>E-STOP</span>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Jog Control */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/jog')}>
            <CardContent className="p-6 text-center">
              <Gamepad2 className="w-12 h-12 mx-auto mb-4 text-blue-600" />
              <h3 className="text-lg font-semibold mb-2">Jog Control</h3>
              <p className="text-gray-600 text-sm">Manual robot movement and positioning</p>
            </CardContent>
          </Card>
          
          {/* Chess Interface */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/chess')}>
            <CardContent className="p-6 text-center">
              <Crown className="w-12 h-12 mx-auto mb-4 text-purple-600" />
              <h3 className="text-lg font-semibold mb-2">Chess Game</h3>
              <p className="text-gray-600 text-sm">Play chess with the robot</p>
            </CardContent>
          </Card>
          
          {/* Settings */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/settings')}>
            <CardContent className="p-6 text-center">
              <Settings className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <h3 className="text-lg font-semibold mb-2">Settings</h3>
              <p className="text-gray-600 text-sm">System configuration and preferences</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Telemetry Data (Debug Info) */}
        {showDebugInfo && telemetry && (
          <Card>
            <CardHeader>
              <CardTitle>Debug Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Joint Positions */}
                <div>
                  <h4 className="font-semibold mb-2">Joint Positions (rad)</h4>
                  <div className="space-y-1 text-sm">
                    {telemetry.joints.map((joint, index) => (
                      <div key={index} className="flex justify-between">
                        <span>J{index + 1}:</span>
                        <span>{joint.toFixed(3)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* TCP Speed */}
                <div>
                  <h4 className="font-semibold mb-2">TCP Speed</h4>
                  <div className="text-sm">
                    <div className="flex justify-between">
                      <span>Speed:</span>
                      <span>{telemetry.tcp_speed.toFixed(3)} m/s</span>
                    </div>
                    <Progress value={(telemetry.tcp_speed / 0.5) * 100} className="mt-2" />
                  </div>
                </div>
                
                {/* Network Status */}
                <div>
                  <h4 className="font-semibold mb-2">Network</h4>
                  <div className="text-sm">
                    <div className="flex justify-between">
                      <span>RTT:</span>
                      <span>{telemetry.net.rtt_ms.toFixed(1)} ms</span>
                    </div>
                  </div>
                </div>
                
                {/* Errors */}
                <div>
                  <h4 className="font-semibold mb-2">Errors</h4>
                  <div className="text-sm">
                    {telemetry.errors.length > 0 ? (
                      <div className="space-y-1">
                        {telemetry.errors.slice(-3).map((error, index) => (
                          <div key={index} className="text-red-600">
                            {error}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-green-600">No errors</div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Footer */}
      <div className="bg-white border-t p-4 text-center text-sm text-gray-500">
        <div className="flex justify-center items-center space-x-4">
          <span>UR10 Robot Workspace</span>
          <span>•</span>
          <span>Kiosk Mode</span>
          <span>•</span>
          <span>v1.0.0</span>
          {isSupervisor && (
            <>
              <span>•</span>
              <Badge variant="outline" className="text-xs">
                SUPERVISOR
              </Badge>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

