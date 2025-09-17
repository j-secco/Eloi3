"""
WebSocket Manager for UR10 Robot Server
Handles real-time communication with clients
"""

import asyncio
import logging
import json
import time
from typing import Dict, List, Set, Any, Optional
from fastapi import WebSocket, WebSocketDisconnect
import threading

from models.schemas import (
    Telemetry, TelemetryMessage, AlertMessage, JobMessage, AnalysisMessage,
    WebSocketMessage
)

logger = logging.getLogger(__name__)

class WebSocketManager:
    """Manages WebSocket connections and broadcasting"""
    
    def __init__(self):
        # Connection pools for different message types
        self.telemetry_connections: Set[WebSocket] = set()
        self.alert_connections: Set[WebSocket] = set()
        self.job_connections: Set[WebSocket] = set()
        self.analysis_connections: Set[WebSocket] = set()
        
        # Connection metadata
        self.connection_metadata: Dict[WebSocket, Dict[str, Any]] = {}
        
        # Thread safety
        self.connections_lock = threading.Lock()
        
        # Message queues for reliable delivery
        self.message_queues: Dict[WebSocket, List[Dict[str, Any]]] = {}
        self.max_queue_size = 100
        
        # Statistics
        self.stats = {
            "total_connections": 0,
            "messages_sent": 0,
            "messages_failed": 0,
            "connections_dropped": 0
        }
        
    async def connect_telemetry(self, websocket: WebSocket):
        """Connect client to telemetry stream"""
        try:
            await websocket.accept()
            
            with self.connections_lock:
                self.telemetry_connections.add(websocket)
                self.connection_metadata[websocket] = {
                    "type": "telemetry",
                    "connected_at": time.time(),
                    "last_ping": time.time(),
                    "messages_sent": 0
                }
                self.message_queues[websocket] = []
                self.stats["total_connections"] += 1
                
            logger.info(f"Telemetry WebSocket connected: {websocket.client}")
            
            # Send initial connection confirmation
            await self._send_to_websocket(websocket, {
                "type": "connection",
                "status": "connected",
                "stream": "telemetry",
                "timestamp": time.time()
            })
            
        except Exception as e:
            logger.error(f"Error connecting telemetry WebSocket: {e}")
            await self._cleanup_connection(websocket)
            
    async def connect_alerts(self, websocket: WebSocket):
        """Connect client to alerts stream"""
        try:
            await websocket.accept()
            
            with self.connections_lock:
                self.alert_connections.add(websocket)
                self.connection_metadata[websocket] = {
                    "type": "alerts",
                    "connected_at": time.time(),
                    "last_ping": time.time(),
                    "messages_sent": 0
                }
                self.message_queues[websocket] = []
                self.stats["total_connections"] += 1
                
            logger.info(f"Alerts WebSocket connected: {websocket.client}")
            
            await self._send_to_websocket(websocket, {
                "type": "connection",
                "status": "connected",
                "stream": "alerts",
                "timestamp": time.time()
            })
            
        except Exception as e:
            logger.error(f"Error connecting alerts WebSocket: {e}")
            await self._cleanup_connection(websocket)
            
    async def connect_job(self, websocket: WebSocket):
        """Connect client to job updates stream"""
        try:
            await websocket.accept()
            
            with self.connections_lock:
                self.job_connections.add(websocket)
                self.connection_metadata[websocket] = {
                    "type": "job",
                    "connected_at": time.time(),
                    "last_ping": time.time(),
                    "messages_sent": 0
                }
                self.message_queues[websocket] = []
                self.stats["total_connections"] += 1
                
            logger.info(f"Job WebSocket connected: {websocket.client}")
            
            await self._send_to_websocket(websocket, {
                "type": "connection",
                "status": "connected",
                "stream": "job",
                "timestamp": time.time()
            })
            
        except Exception as e:
            logger.error(f"Error connecting job WebSocket: {e}")
            await self._cleanup_connection(websocket)
            
    async def connect_analysis(self, websocket: WebSocket):
        """Connect client to analysis stream"""
        try:
            await websocket.accept()
            
            with self.connections_lock:
                self.analysis_connections.add(websocket)
                self.connection_metadata[websocket] = {
                    "type": "analysis",
                    "connected_at": time.time(),
                    "last_ping": time.time(),
                    "messages_sent": 0
                }
                self.message_queues[websocket] = []
                self.stats["total_connections"] += 1
                
            logger.info(f"Analysis WebSocket connected: {websocket.client}")
            
            await self._send_to_websocket(websocket, {
                "type": "connection",
                "status": "connected",
                "stream": "analysis",
                "timestamp": time.time()
            })
            
        except Exception as e:
            logger.error(f"Error connecting analysis WebSocket: {e}")
            await self._cleanup_connection(websocket)
            
    def disconnect_telemetry(self, websocket: WebSocket):
        """Disconnect telemetry client"""
        asyncio.create_task(self._cleanup_connection(websocket))
        
    def disconnect_alerts(self, websocket: WebSocket):
        """Disconnect alerts client"""
        asyncio.create_task(self._cleanup_connection(websocket))
        
    def disconnect_job(self, websocket: WebSocket):
        """Disconnect job client"""
        asyncio.create_task(self._cleanup_connection(websocket))
        
    def disconnect_analysis(self, websocket: WebSocket):
        """Disconnect analysis client"""
        asyncio.create_task(self._cleanup_connection(websocket))
        
    async def _cleanup_connection(self, websocket: WebSocket):
        """Clean up WebSocket connection"""
        try:
            with self.connections_lock:
                # Remove from all connection sets
                self.telemetry_connections.discard(websocket)
                self.alert_connections.discard(websocket)
                self.job_connections.discard(websocket)
                self.analysis_connections.discard(websocket)
                
                # Clean up metadata and queues
                if websocket in self.connection_metadata:
                    connection_type = self.connection_metadata[websocket].get("type", "unknown")
                    del self.connection_metadata[websocket]
                    logger.info(f"{connection_type.title()} WebSocket disconnected: {websocket.client}")
                    
                if websocket in self.message_queues:
                    del self.message_queues[websocket]
                    
                self.stats["connections_dropped"] += 1
                
        except Exception as e:
            logger.error(f"Error cleaning up WebSocket connection: {e}")
            
    async def broadcast_telemetry(self, telemetry: Telemetry):
        """Broadcast telemetry data to all connected clients"""
        try:
            message = TelemetryMessage(data=telemetry)
            await self._broadcast_to_connections(self.telemetry_connections, message.dict())
            
        except Exception as e:
            logger.error(f"Error broadcasting telemetry: {e}")
            
    async def broadcast_alert(self, alert_type: str, message: str, severity: str = "info", data: Optional[Dict[str, Any]] = None):
        """Broadcast alert to all connected clients"""
        try:
            alert_data = {
                "alert_type": alert_type,
                "message": message,
                "severity": severity,
                "data": data or {}
            }
            
            message_obj = AlertMessage(data=alert_data)
            await self._broadcast_to_connections(self.alert_connections, message_obj.dict())
            
        except Exception as e:
            logger.error(f"Error broadcasting alert: {e}")
            
    async def broadcast_job_update(self, job_id: str, status: str, progress: Optional[float] = None, data: Optional[Dict[str, Any]] = None):
        """Broadcast job update to all connected clients"""
        try:
            job_data = {
                "job_id": job_id,
                "status": status,
                "progress": progress,
                "data": data or {}
            }
            
            message = JobMessage(data=job_data)
            await self._broadcast_to_connections(self.job_connections, message.dict())
            
        except Exception as e:
            logger.error(f"Error broadcasting job update: {e}")
            
    async def broadcast_analysis(self, analysis_type: str, result: Dict[str, Any]):
        """Broadcast analysis result to all connected clients"""
        try:
            analysis_data = {
                "analysis_type": analysis_type,
                "result": result
            }
            
            message = AnalysisMessage(data=analysis_data)
            await self._broadcast_to_connections(self.analysis_connections, message.dict())
            
        except Exception as e:
            logger.error(f"Error broadcasting analysis: {e}")
            
    async def _broadcast_to_connections(self, connections: Set[WebSocket], message_data: Dict[str, Any]):
        """Broadcast message to a set of connections"""
        if not connections:
            return
            
        # Create list of connections to avoid modification during iteration
        connection_list = list(connections)
        
        # Send to all connections concurrently
        tasks = []
        for websocket in connection_list:
            task = asyncio.create_task(self._send_to_websocket(websocket, message_data))
            tasks.append(task)
            
        # Wait for all sends to complete
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
            
    async def _send_to_websocket(self, websocket: WebSocket, message_data: Dict[str, Any]):
        """Send message to a specific WebSocket connection"""
        try:
            # Add to message queue first
            if websocket in self.message_queues:
                self.message_queues[websocket].append(message_data)
                
                # Limit queue size
                if len(self.message_queues[websocket]) > self.max_queue_size:
                    self.message_queues[websocket] = self.message_queues[websocket][-self.max_queue_size:]
                    
            # Send message
            await websocket.send_text(json.dumps(message_data))
            
            # Update statistics
            with self.connections_lock:
                if websocket in self.connection_metadata:
                    self.connection_metadata[websocket]["messages_sent"] += 1
                    self.connection_metadata[websocket]["last_ping"] = time.time()
                    
                self.stats["messages_sent"] += 1
                
        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected during send: {websocket.client}")
            await self._cleanup_connection(websocket)
            
        except Exception as e:
            logger.error(f"Error sending WebSocket message: {e}")
            self.stats["messages_failed"] += 1
            
            # Clean up problematic connection
            await self._cleanup_connection(websocket)
            
    async def send_to_specific_client(self, websocket: WebSocket, message_type: str, data: Dict[str, Any]):
        """Send message to a specific client"""
        try:
            message = {
                "type": message_type,
                "timestamp": time.time(),
                "data": data
            }
            
            await self._send_to_websocket(websocket, message)
            
        except Exception as e:
            logger.error(f"Error sending message to specific client: {e}")
            
    def get_connection_count(self) -> int:
        """Get total number of active connections"""
        with self.connections_lock:
            return (len(self.telemetry_connections) + 
                   len(self.alert_connections) + 
                   len(self.job_connections) + 
                   len(self.analysis_connections))
                   
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get connection statistics"""
        with self.connections_lock:
            return {
                "telemetry_connections": len(self.telemetry_connections),
                "alert_connections": len(self.alert_connections),
                "job_connections": len(self.job_connections),
                "analysis_connections": len(self.analysis_connections),
                "total_active": self.get_connection_count(),
                "stats": self.stats.copy()
            }
            
    async def ping_all_connections(self):
        """Send ping to all connections to check health"""
        try:
            ping_message = {
                "type": "ping",
                "timestamp": time.time()
            }
            
            all_connections = set()
            with self.connections_lock:
                all_connections.update(self.telemetry_connections)
                all_connections.update(self.alert_connections)
                all_connections.update(self.job_connections)
                all_connections.update(self.analysis_connections)
                
            await self._broadcast_to_connections(all_connections, ping_message)
            
        except Exception as e:
            logger.error(f"Error pinging connections: {e}")
            
    async def get_connection_info(self) -> List[Dict[str, Any]]:
        """Get information about all active connections"""
        try:
            connection_info = []
            
            with self.connections_lock:
                for websocket, metadata in self.connection_metadata.items():
                    info = {
                        "client": str(websocket.client) if websocket.client else "unknown",
                        "type": metadata.get("type", "unknown"),
                        "connected_at": metadata.get("connected_at", 0),
                        "last_ping": metadata.get("last_ping", 0),
                        "messages_sent": metadata.get("messages_sent", 0),
                        "queue_size": len(self.message_queues.get(websocket, []))
                    }
                    connection_info.append(info)
                    
            return connection_info
            
        except Exception as e:
            logger.error(f"Error getting connection info: {e}")
            return []

