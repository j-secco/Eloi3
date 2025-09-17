import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { 
  ArrowLeft,
  Settings,
  Bot,
  Shield,
  Palette,
  Info,
  Save,
  RotateCcw,
  Key,
  Wifi,
  Monitor
} from 'lucide-react'
import { useKioskStore } from '../hooks/useKioskStore'
import { useWebSocket } from '../hooks/useWebSocket'

export default function SettingsScreen() {
  const navigate = useNavigate()
  const [tempSettings, setTempSettings] = useState({})
  const [supervisorPin, setSupervisorPin] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  const {
    settings,
    isSupervisor,
    robotConnected,
    robotState,
    updateSettings,
    authenticateSupervisor,
    connectRobot,
    disconnectRobot
  } = useKioskStore()
  
  const { connectionStatus, reconnectAll } = useWebSocket()
  
  const handleSettingChange = (key, value) => {
    setTempSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }
  
  const handleSaveSettings = () => {
    updateSettings(tempSettings)
    setTempSettings({})
  }
  
  const handleResetSettings = () => {
    setTempSettings({})
  }
  
  const handleSupervisorAuth = async () => {
    if (supervisorPin) {
      const success = await authenticateSupervisor(supervisorPin)
      if (success) {
        setSupervisorPin('')
      }
    }
  }
  
  const handleReconnectWebSockets = () => {
    reconnectAll()
  }
  
  const getCurrentValue = (key) => {
    return tempSettings[key] !== undefined ? tempSettings[key] : settings[key]
  }
  
  const hasChanges = Object.keys(tempSettings).length > 0
  
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
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            {isSupervisor && (
              <Badge variant="outline" className="text-green-600 border-green-300">
                SUPERVISOR
              </Badge>
            )}
            <Badge className={robotConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
              {robotConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Save/Reset Controls */}
          {hasChanges && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Info className="w-5 h-5 text-orange-600" />
                    <span className="text-orange-800">You have unsaved changes</span>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetSettings}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveSettings}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          <Tabs defaultValue="robot" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="robot" className="flex items-center space-x-2">
                <Bot className="w-4 h-4" />
                <span>Robot</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center space-x-2">
                <Shield className="w-4 h-4" />
                <span>Security</span>
              </TabsTrigger>
              <TabsTrigger value="interface" className="flex items-center space-x-2">
                <Monitor className="w-4 h-4" />
                <span>Interface</span>
              </TabsTrigger>
              <TabsTrigger value="system" className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>System</span>
              </TabsTrigger>
            </TabsList>
            
            {/* Robot Settings */}
            <TabsContent value="robot" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Robot Connection</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="hostname">Robot Hostname/IP</Label>
                      <Input
                        id="hostname"
                        value={getCurrentValue('robotHostname')}
                        onChange={(e) => handleSettingChange('robotHostname', e.target.value)}
                        placeholder="192.168.1.100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="port">Robot Port</Label>
                      <Input
                        id="port"
                        type="number"
                        value={getCurrentValue('robotPort')}
                        onChange={(e) => handleSettingChange('robotPort', parseInt(e.target.value))}
                        placeholder="30004"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="mockMode"
                      checked={getCurrentValue('mockMode')}
                      onCheckedChange={(checked) => handleSettingChange('mockMode', checked)}
                    />
                    <Label htmlFor="mockMode">Mock Mode (Development)</Label>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex space-x-2">
                    {!robotConnected ? (
                      <Button onClick={() => connectRobot()}>
                        Connect Robot
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={() => disconnectRobot()}>
                        Disconnect Robot
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Robot Parameters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="moveSpeed">Move Speed (m/s)</Label>
                      <Input
                        id="moveSpeed"
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="1.0"
                        value={getCurrentValue('moveSpeed')}
                        onChange={(e) => handleSettingChange('moveSpeed', parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="moveAcceleration">Move Acceleration (m/s²)</Label>
                      <Input
                        id="moveAcceleration"
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="2.0"
                        value={getCurrentValue('moveAcceleration')}
                        onChange={(e) => handleSettingChange('moveAcceleration', parseFloat(e.target.value))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Security Settings */}
            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Supervisor Access</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!isSupervisor ? (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600">
                        Enter supervisor PIN to access advanced settings and safety controls.
                      </p>
                      <div className="flex space-x-2">
                        <Input
                          type="password"
                          placeholder="Enter supervisor PIN"
                          value={supervisorPin}
                          onChange={(e) => setSupervisorPin(e.target.value)}
                        />
                        <Button onClick={handleSupervisorAuth}>
                          <Key className="w-4 h-4 mr-2" />
                          Authenticate
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Shield className="w-5 h-5 text-green-600" />
                        <span className="text-green-600 font-semibold">Supervisor access granted</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        You have access to all system settings and safety controls.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Auto-Lock Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="autoLock"
                      checked={getCurrentValue('autoLock')}
                      onCheckedChange={(checked) => handleSettingChange('autoLock', checked)}
                    />
                    <Label htmlFor="autoLock">Enable Auto-Lock</Label>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="lockTimeout">Lock Timeout (minutes)</Label>
                    <Input
                      id="lockTimeout"
                      type="number"
                      min="1"
                      max="60"
                      value={getCurrentValue('lockTimeout') / 60000}
                      onChange={(e) => handleSettingChange('lockTimeout', parseInt(e.target.value) * 60000)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Interface Settings */}
            <TabsContent value="interface" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Display Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="theme">Theme</Label>
                    <select
                      id="theme"
                      className="w-full p-2 border rounded-md"
                      value={getCurrentValue('theme')}
                      onChange={(e) => handleSettingChange('theme', e.target.value)}
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="auto">Auto</option>
                    </select>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Kiosk Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="showDebugInfo"
                      checked={showAdvanced}
                      onCheckedChange={setShowAdvanced}
                    />
                    <Label htmlFor="showDebugInfo">Show Advanced Information</Label>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* System Settings */}
            <TabsContent value="system" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Network Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-sm text-gray-600">Telemetry</div>
                      <Badge className={connectionStatus.telemetry === 'connected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {connectionStatus.telemetry}
                      </Badge>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-600">Alerts</div>
                      <Badge className={connectionStatus.alerts === 'connected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {connectionStatus.alerts}
                      </Badge>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-600">Jobs</div>
                      <Badge className={connectionStatus.job === 'connected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {connectionStatus.job}
                      </Badge>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-600">Analysis</div>
                      <Badge className={connectionStatus.analysis === 'connected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {connectionStatus.analysis}
                      </Badge>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={handleReconnectWebSockets}
                    className="w-full"
                  >
                    <Wifi className="w-4 h-4 mr-2" />
                    Reconnect WebSockets
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>System Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-semibold">Application Version</div>
                      <div className="text-gray-600">v1.0.0</div>
                    </div>
                    <div>
                      <div className="font-semibold">Build Date</div>
                      <div className="text-gray-600">{new Date().toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="font-semibold">Robot State</div>
                      <div className="text-gray-600">{robotState}</div>
                    </div>
                    <div>
                      <div className="font-semibold">Mock Mode</div>
                      <div className="text-gray-600">{settings.mockMode ? 'Enabled' : 'Disabled'}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

