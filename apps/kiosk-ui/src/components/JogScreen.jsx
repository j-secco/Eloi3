import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  RotateCcw,
  RotateCw,
  Move3D,
  Settings2,
  Home,
  Square,
  AlertTriangle
} from 'lucide-react'
import { useKioskStore } from '../hooks/useKioskStore'

export default function JogScreen() {
  const navigate = useNavigate()
  const [jogMode, setJogMode] = useState('tcp') // 'tcp' or 'joint'
  const [jogSpeed, setJogSpeed] = useState([0.1]) // m/s or rad/s
  const [jogDistance, setJogDistance] = useState([0.01]) // m or rad
  const [isJogging, setIsJogging] = useState(false)
  
  const {
    robotConnected,
    robotState,
    telemetry,
    jogRobot,
    homeRobot,
    stopRobot,
    emergencyStop
  } = useKioskStore()
  
  const handleJog = async (axis, direction, joint = null) => {
    if (!robotConnected || robotState !== 'READY') return
    
    setIsJogging(true)
    
    try {
      const delta = jogDistance[0] * direction
      
      const jogRequest = {
        mode: jogMode,
        speed: jogSpeed[0],
        frame: 'base'
      }
      
      if (jogMode === 'tcp') {
        jogRequest.axis = axis
        jogRequest.delta = delta
      } else {
        jogRequest.joint = joint
        jogRequest.delta = delta
      }
      
      await jogRobot(jogRequest)
    } catch (error) {
      console.error('Jog failed:', error)
    } finally {
      setIsJogging(false)
    }
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
  
  const JogButton = ({ children, onClick, disabled, className = "", size = "lg" }) => (
    <Button
      variant="outline"
      size={size}
      className={`h-16 w-16 md:h-20 md:w-20 active:scale-95 transition-all ${className}`}
      onClick={onClick}
      disabled={disabled || isJogging || !robotConnected || robotState !== 'READY'}
      onTouchStart={(e) => e.preventDefault()} // Prevent touch delay
    >
      {children}
    </Button>
  )
  
  const DirectionalPad = ({ axis, positiveIcon, negativeIcon, positiveLabel, negativeLabel, joint = null }) => (
    <div className="flex items-center space-x-4">
      <JogButton
        onClick={() => handleJog(axis, -1, joint)}
        className="bg-red-50 hover:bg-red-100 border-red-200"
      >
        <div className="flex flex-col items-center">
          {negativeIcon}
          <span className="text-xs mt-1">{negativeLabel}</span>
        </div>
      </JogButton>
      
      <div className="text-center min-w-[60px]">
        <div className="font-semibold text-lg">
          {jogMode === 'tcp' ? axis.toUpperCase() : `J${joint + 1}`}
        </div>
        <div className="text-sm text-gray-500">
          {telemetry && jogMode === 'tcp' 
            ? telemetry.tcp_pose[axis]?.toFixed(3) || '0.000'
            : telemetry?.joints[joint]?.toFixed(3) || '0.000'
          }
        </div>
      </div>
      
      <JogButton
        onClick={() => handleJog(axis, 1, joint)}
        className="bg-green-50 hover:bg-green-100 border-green-200"
      >
        <div className="flex flex-col items-center">
          {positiveIcon}
          <span className="text-xs mt-1">{positiveLabel}</span>
        </div>
      </JogButton>
    </div>
  )
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Robot Jog Control</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge className={robotConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
              {robotConnected ? 'Connected' : 'Disconnected'}
            </Badge>
            <Badge className="bg-blue-100 text-blue-800">
              {robotState}
            </Badge>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 p-6 space-y-6">
        {/* Control Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings2 className="w-5 h-5" />
              <span>Jog Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Jog Mode */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Jog Mode</label>
                <Tabs value={jogMode} onValueChange={setJogMode}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="tcp">TCP</TabsTrigger>
                    <TabsTrigger value="joint">Joint</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              
              {/* Jog Speed */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Speed: {jogSpeed[0].toFixed(3)} {jogMode === 'tcp' ? 'm/s' : 'rad/s'}
                </label>
                <Slider
                  value={jogSpeed}
                  onValueChange={setJogSpeed}
                  max={jogMode === 'tcp' ? 0.5 : 1.0}
                  min={0.001}
                  step={0.001}
                  className="w-full"
                />
              </div>
              
              {/* Jog Distance */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Distance: {jogDistance[0].toFixed(3)} {jogMode === 'tcp' ? 'm' : 'rad'}
                </label>
                <Slider
                  value={jogDistance}
                  onValueChange={setJogDistance}
                  max={jogMode === 'tcp' ? 0.1 : 0.5}
                  min={0.001}
                  step={0.001}
                  className="w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Jog Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Move3D className="w-5 h-5" />
              <span>{jogMode === 'tcp' ? 'TCP' : 'Joint'} Control</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={jogMode}>
              {/* TCP Control */}
              <TabsContent value="tcp" className="space-y-8">
                {/* Linear Axes */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">Linear Movement</h3>
                  
                  <DirectionalPad
                    axis="x"
                    negativeIcon={<ArrowLeft className="w-6 h-6" />}
                    positiveIcon={<ArrowRight className="w-6 h-6" />}
                    negativeLabel="X-"
                    positiveLabel="X+"
                  />
                  
                  <DirectionalPad
                    axis="y"
                    negativeIcon={<ArrowDown className="w-6 h-6" />}
                    positiveIcon={<ArrowUp className="w-6 h-6" />}
                    negativeLabel="Y-"
                    positiveLabel="Y+"
                  />
                  
                  <DirectionalPad
                    axis="z"
                    negativeIcon={<ArrowDown className="w-6 h-6" />}
                    positiveIcon={<ArrowUp className="w-6 h-6" />}
                    negativeLabel="Z-"
                    positiveLabel="Z+"
                  />
                </div>
                
                {/* Rotational Axes */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">Rotational Movement</h3>
                  
                  <DirectionalPad
                    axis="rx"
                    negativeIcon={<RotateCcw className="w-6 h-6" />}
                    positiveIcon={<RotateCw className="w-6 h-6" />}
                    negativeLabel="RX-"
                    positiveLabel="RX+"
                  />
                  
                  <DirectionalPad
                    axis="ry"
                    negativeIcon={<RotateCcw className="w-6 h-6" />}
                    positiveIcon={<RotateCw className="w-6 h-6" />}
                    negativeLabel="RY-"
                    positiveLabel="RY+"
                  />
                  
                  <DirectionalPad
                    axis="rz"
                    negativeIcon={<RotateCcw className="w-6 h-6" />}
                    positiveIcon={<RotateCw className="w-6 h-6" />}
                    negativeLabel="RZ-"
                    positiveLabel="RZ+"
                  />
                </div>
              </TabsContent>
              
              {/* Joint Control */}
              <TabsContent value="joint" className="space-y-6">
                <h3 className="text-lg font-semibold">Joint Movement</h3>
                
                {[0, 1, 2, 3, 4, 5].map((joint) => (
                  <DirectionalPad
                    key={joint}
                    axis={`joint_${joint}`}
                    joint={joint}
                    negativeIcon={<RotateCcw className="w-6 h-6" />}
                    positiveIcon={<RotateCw className="w-6 h-6" />}
                    negativeLabel="-"
                    positiveLabel="+"
                  />
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        {/* Emergency Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Emergency Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4">
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
                <span>EMERGENCY STOP</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

