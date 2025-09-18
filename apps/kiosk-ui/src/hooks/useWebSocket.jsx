import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useKioskStore } from './useKioskStore'
// import { toast } from '@/hooks/use-toast' // Disabled for now

const WebSocketContext = createContext()

// WebSocket base URL
const WS_BASE = process.env.NODE_ENV === 'production'
  ? `wss://${window.location.hostname}:8000`
  : 'ws://localhost:8000'

export function WebSocketProvider({ children, sessionId }) {
  const [connections, setConnections] = useState({
    telemetry: null,
    alerts: null,
    job: null,
    analysis: null
  })
  
  const [connectionStatus, setConnectionStatus] = useState({
    telemetry: 'disconnected',
    alerts: 'disconnected',
    job: 'disconnected',
    analysis: 'disconnected'
  })
  
  const reconnectTimeouts = useRef({})
  const reconnectAttempts = useRef({})
  const maxReconnectAttempts = 5
  const reconnectDelay = 1000 // Start with 1 second
  
  const { updateTelemetry } = useKioskStore()
  
  const createWebSocketConnection = (endpoint, onMessage, onError) => {
    const ws = new WebSocket(`${WS_BASE}/ws/${endpoint}`)
    
    ws.onopen = () => {
      console.log(`WebSocket connected: ${endpoint}`)
      setConnectionStatus(prev => ({ ...prev, [endpoint]: 'connected' }))
      reconnectAttempts.current[endpoint] = 0
      
      // Clear any existing reconnect timeout
      if (reconnectTimeouts.current[endpoint]) {
        clearTimeout(reconnectTimeouts.current[endpoint])
        delete reconnectTimeouts.current[endpoint]
      }
    }
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessage(data)
      } catch (error) {
        console.error(`Error parsing WebSocket message from ${endpoint}:`, error)
      }
    }
    
    ws.onclose = (event) => {
      console.log(`WebSocket disconnected: ${endpoint}`, event.code, event.reason)
      setConnectionStatus(prev => ({ ...prev, [endpoint]: 'disconnected' }))
      
      // Attempt to reconnect if not a normal closure
      if (event.code !== 1000 && sessionId) {
        scheduleReconnect(endpoint, onMessage, onError)
      }
    }
    
    ws.onerror = (error) => {
      console.error(`WebSocket error on ${endpoint}:`, error)
      setConnectionStatus(prev => ({ ...prev, [endpoint]: 'error' }))
      if (onError) onError(error)
    }
    
    return ws
  }
  
  const scheduleReconnect = (endpoint, onMessage, onError) => {
    const attempts = reconnectAttempts.current[endpoint] || 0
    
    if (attempts >= maxReconnectAttempts) {
      console.error(`Max reconnection attempts reached for ${endpoint}`)
      setConnectionStatus(prev => ({ ...prev, [endpoint]: 'failed' }))
      return
    }
    
    const delay = reconnectDelay * Math.pow(2, attempts) // Exponential backoff
    
    console.log(`Scheduling reconnect for ${endpoint} in ${delay}ms (attempt ${attempts + 1})`)
    setConnectionStatus(prev => ({ ...prev, [endpoint]: 'reconnecting' }))
    
    reconnectTimeouts.current[endpoint] = setTimeout(() => {
      reconnectAttempts.current[endpoint] = attempts + 1
      const ws = createWebSocketConnection(endpoint, onMessage, onError)
      setConnections(prev => ({ ...prev, [endpoint]: ws }))
    }, delay)
  }
  
  const handleTelemetryMessage = (data) => {
    if (data.type === 'telemetry') {
      updateTelemetry(data.data)
    } else if (data.type === 'ping') {
      // Handle ping/pong for connection health
      console.log('Received ping from server')
    }
  }
  
  const handleAlertMessage = (data) => {
    if (data.type === 'alert') {
      const { alert_type, message, severity } = data.data
      
      // Show toast notification (disabled for now)
      console.log('Alert:', alert_type, message, severity)
      // toast({
      //   title: alert_type.replace('_', ' ').toUpperCase(),
      //   description: message,
      //   variant: severity === 'critical' ? 'destructive' : 
      //            severity === 'warning' ? 'default' : 'default'
      // })
    }
  }
  
  const handleJobMessage = (data) => {
    if (data.type === 'job') {
      const { job_id, status, progress } = data.data
      
      // Show job status updates (disabled for now)
      console.log('Job update:', job_id, status, progress)
      // if (status === 'completed') {
      //   toast({
      //     title: 'Job Completed',
      //     description: `${job_id} finished successfully`,
      //     variant: 'default'
      //   })
      // } else if (status === 'failed') {
      //   toast({
      //     title: 'Job Failed',
      //     description: `${job_id} encountered an error`,
      //     variant: 'destructive'
      //   })
      // }
    }
  }
  
  const handleAnalysisMessage = (data) => {
    if (data.type === 'analysis') {
      console.log('Analysis update:', data.data)
      // Handle chess analysis updates
    }
  }
  
  useEffect(() => {
    if (!sessionId) return
    
    // Create WebSocket connections
    const telemetryWs = createWebSocketConnection('telemetry', handleTelemetryMessage)
    const alertsWs = createWebSocketConnection('alerts', handleAlertMessage)
    const jobWs = createWebSocketConnection('job', handleJobMessage)
    const analysisWs = createWebSocketConnection('analysis', handleAnalysisMessage)
    
    setConnections({
      telemetry: telemetryWs,
      alerts: alertsWs,
      job: jobWs,
      analysis: analysisWs
    })
    
    return () => {
      // Clean up connections
      Object.values(connections).forEach(ws => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.close(1000, 'Component unmounting')
        }
      })
      
      // Clear reconnect timeouts
      Object.values(reconnectTimeouts.current).forEach(timeout => {
        clearTimeout(timeout)
      })
      reconnectTimeouts.current = {}
    }
  }, [sessionId])
  
  const sendMessage = (endpoint, message) => {
    const ws = connections[endpoint]
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
      return true
    }
    return false
  }
  
  const reconnect = (endpoint) => {
    const ws = connections[endpoint]
    if (ws) {
      ws.close()
    }
    
    // Reset reconnect attempts
    reconnectAttempts.current[endpoint] = 0
    
    // Create new connection
    let onMessage
    switch (endpoint) {
      case 'telemetry':
        onMessage = handleTelemetryMessage
        break
      case 'alerts':
        onMessage = handleAlertMessage
        break
      case 'job':
        onMessage = handleJobMessage
        break
      case 'analysis':
        onMessage = handleAnalysisMessage
        break
      default:
        return
    }
    
    const newWs = createWebSocketConnection(endpoint, onMessage)
    setConnections(prev => ({ ...prev, [endpoint]: newWs }))
  }
  
  const reconnectAll = () => {
    Object.keys(connections).forEach(endpoint => {
      reconnect(endpoint)
    })
  }
  
  const value = {
    connections,
    connectionStatus,
    sendMessage,
    reconnect,
    reconnectAll
  }
  
  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (context) {
    return context
  }
  
  // Fallback simple WebSocket hook for direct use
  return {
    connectionStatus: {
      telemetry: 'disconnected',
      alerts: 'disconnected',
      job: 'disconnected',
      analysis: 'disconnected'
    },
    connect: () => {
      console.log('WebSocket connection requested (simple mode)')
    },
    disconnect: () => {
      console.log('WebSocket disconnection requested (simple mode)')
    },
    reconnectAll: () => {
      console.log('WebSocket reconnect requested (simple mode)')
    }
  }
}

