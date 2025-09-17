"""
Session Manager for UR10 Robot Server
Handles client sessions, authentication, and session-based logging
"""

import asyncio
import logging
import time
import uuid
from typing import Dict, Optional, List, Any
from dataclasses import dataclass, field
import threading

from core.config import settings

logger = logging.getLogger(__name__)

@dataclass
class Session:
    """Client session data"""
    session_id: str
    client_id: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: float = field(default_factory=time.time)
    last_activity: float = field(default_factory=time.time)
    expires_at: float = field(default_factory=lambda: time.time() + settings.session_timeout)
    is_supervisor: bool = False
    permissions: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

class SessionManager:
    """Manages client sessions and authentication"""
    
    def __init__(self):
        self.sessions: Dict[str, Session] = {}
        self.session_lock = threading.Lock()
        self.cleanup_task: Optional[asyncio.Task] = None
        
        # Session logs (in-memory for now, could be persisted)
        self.session_logs: Dict[str, List[Dict[str, Any]]] = {}
        self.max_logs_per_session = 1000
        
    async def start(self):
        """Start session manager"""
        logger.info("Starting Session Manager...")
        
        # Start cleanup task
        self.cleanup_task = asyncio.create_task(self._cleanup_expired_sessions())
        
    async def stop(self):
        """Stop session manager"""
        logger.info("Stopping Session Manager...")
        
        if self.cleanup_task:
            self.cleanup_task.cancel()
            try:
                await self.cleanup_task
            except asyncio.CancelledError:
                pass
                
    async def create_session(self, client_id: Optional[str] = None, user_agent: Optional[str] = None) -> Session:
        """Create a new session"""
        try:
            with self.session_lock:
                # Check session limit
                if len(self.sessions) >= settings.max_concurrent_sessions:
                    # Remove oldest session
                    oldest_session_id = min(self.sessions.keys(), key=lambda k: self.sessions[k].created_at)
                    await self._remove_session(oldest_session_id)
                    
                # Generate unique session ID
                session_id = str(uuid.uuid4())
                
                # Create session
                session = Session(
                    session_id=session_id,
                    client_id=client_id,
                    user_agent=user_agent
                )
                
                self.sessions[session_id] = session
                self.session_logs[session_id] = []
                
                logger.info(f"Created session {session_id} for client {client_id}")
                
                # Log session creation
                await self.log_session_event(session_id, "session_created", {
                    "client_id": client_id,
                    "user_agent": user_agent
                })
                
                return session
                
        except Exception as e:
            logger.error(f"Error creating session: {e}")
            raise
            
    async def get_session(self, session_id: str) -> Optional[Session]:
        """Get session by ID"""
        try:
            with self.session_lock:
                session = self.sessions.get(session_id)
                
                if session:
                    # Check if session is expired
                    if time.time() > session.expires_at:
                        await self._remove_session(session_id)
                        return None
                        
                    # Update last activity
                    session.last_activity = time.time()
                    
                return session
                
        except Exception as e:
            logger.error(f"Error getting session {session_id}: {e}")
            return None
            
    async def update_session_activity(self, session_id: str):
        """Update session last activity timestamp"""
        try:
            with self.session_lock:
                session = self.sessions.get(session_id)
                if session:
                    session.last_activity = time.time()
                    
        except Exception as e:
            logger.error(f"Error updating session activity {session_id}: {e}")
            
    async def authenticate_supervisor(self, session_id: str, pin: str) -> bool:
        """Authenticate supervisor access"""
        try:
            # In production, use secure PIN storage and hashing
            supervisor_pin = "1234"  # This should be configurable and secure
            
            if pin != supervisor_pin:
                await self.log_session_event(session_id, "supervisor_auth_failed", {"pin_attempt": "***"})
                return False
                
            with self.session_lock:
                session = self.sessions.get(session_id)
                if session:
                    session.is_supervisor = True
                    session.permissions.extend(["teach_points", "clear_estop", "update_limits"])
                    
                    await self.log_session_event(session_id, "supervisor_auth_success", {})
                    logger.info(f"Supervisor access granted to session {session_id}")
                    return True
                    
            return False
            
        except Exception as e:
            logger.error(f"Error authenticating supervisor for session {session_id}: {e}")
            return False
            
    async def revoke_supervisor(self, session_id: str):
        """Revoke supervisor access"""
        try:
            with self.session_lock:
                session = self.sessions.get(session_id)
                if session:
                    session.is_supervisor = False
                    session.permissions = [p for p in session.permissions if p not in ["teach_points", "clear_estop", "update_limits"]]
                    
                    await self.log_session_event(session_id, "supervisor_revoked", {})
                    logger.info(f"Supervisor access revoked for session {session_id}")
                    
        except Exception as e:
            logger.error(f"Error revoking supervisor for session {session_id}: {e}")
            
    async def has_permission(self, session_id: str, permission: str) -> bool:
        """Check if session has specific permission"""
        try:
            session = await self.get_session(session_id)
            if not session:
                return False
                
            return permission in session.permissions or session.is_supervisor
            
        except Exception as e:
            logger.error(f"Error checking permission {permission} for session {session_id}: {e}")
            return False
            
    async def remove_session(self, session_id: str):
        """Remove session"""
        try:
            with self.session_lock:
                await self._remove_session(session_id)
                
        except Exception as e:
            logger.error(f"Error removing session {session_id}: {e}")
            
    async def _remove_session(self, session_id: str):
        """Internal method to remove session (assumes lock is held)"""
        try:
            if session_id in self.sessions:
                session = self.sessions[session_id]
                
                # Log session removal
                await self.log_session_event(session_id, "session_removed", {
                    "duration": time.time() - session.created_at
                })
                
                # Remove session and logs
                del self.sessions[session_id]
                if session_id in self.session_logs:
                    del self.session_logs[session_id]
                    
                logger.info(f"Removed session {session_id}")
                
        except Exception as e:
            logger.error(f"Error in _remove_session {session_id}: {e}")
            
    async def get_active_sessions(self) -> List[Session]:
        """Get all active sessions"""
        try:
            with self.session_lock:
                return list(self.sessions.values())
                
        except Exception as e:
            logger.error(f"Error getting active sessions: {e}")
            return []
            
    def get_active_session_count(self) -> int:
        """Get count of active sessions"""
        try:
            with self.session_lock:
                return len(self.sessions)
                
        except Exception as e:
            logger.error(f"Error getting session count: {e}")
            return 0
            
    async def log_session_event(self, session_id: str, event_type: str, data: Dict[str, Any]):
        """Log session event"""
        try:
            log_entry = {
                "timestamp": time.time(),
                "session_id": session_id,
                "event_type": event_type,
                "data": data
            }
            
            # Add to session logs
            if session_id in self.session_logs:
                self.session_logs[session_id].append(log_entry)
                
                # Limit log size
                if len(self.session_logs[session_id]) > self.max_logs_per_session:
                    self.session_logs[session_id] = self.session_logs[session_id][-self.max_logs_per_session:]
                    
            # Also log to main logger
            logger.info(f"Session {session_id}: {event_type} - {data}")
            
        except Exception as e:
            logger.error(f"Error logging session event: {e}")
            
    async def get_session_logs(self, session_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get session logs"""
        try:
            if session_id in self.session_logs:
                logs = self.session_logs[session_id]
                return logs[-limit:] if limit > 0 else logs
            return []
            
        except Exception as e:
            logger.error(f"Error getting session logs for {session_id}: {e}")
            return []
            
    async def get_all_logs(self, limit: int = 1000) -> List[Dict[str, Any]]:
        """Get all session logs across all sessions"""
        try:
            all_logs = []
            
            for session_id, logs in self.session_logs.items():
                all_logs.extend(logs)
                
            # Sort by timestamp
            all_logs.sort(key=lambda x: x["timestamp"], reverse=True)
            
            return all_logs[:limit] if limit > 0 else all_logs
            
        except Exception as e:
            logger.error(f"Error getting all logs: {e}")
            return []
            
    async def _cleanup_expired_sessions(self):
        """Background task to cleanup expired sessions"""
        try:
            while True:
                try:
                    current_time = time.time()
                    expired_sessions = []
                    
                    with self.session_lock:
                        for session_id, session in self.sessions.items():
                            if current_time > session.expires_at:
                                expired_sessions.append(session_id)
                                
                    # Remove expired sessions
                    for session_id in expired_sessions:
                        with self.session_lock:
                            await self._remove_session(session_id)
                            
                    if expired_sessions:
                        logger.info(f"Cleaned up {len(expired_sessions)} expired sessions")
                        
                    # Sleep for cleanup interval
                    await asyncio.sleep(60)  # Check every minute
                    
                except Exception as e:
                    logger.error(f"Error in session cleanup: {e}")
                    await asyncio.sleep(60)
                    
        except asyncio.CancelledError:
            logger.info("Session cleanup task cancelled")
            raise
        except Exception as e:
            logger.error(f"Fatal error in session cleanup: {e}")
            
    async def extend_session(self, session_id: str, additional_time: int = None) -> bool:
        """Extend session expiration time"""
        try:
            with self.session_lock:
                session = self.sessions.get(session_id)
                if session:
                    extension = additional_time or settings.session_timeout
                    session.expires_at = time.time() + extension
                    
                    await self.log_session_event(session_id, "session_extended", {
                        "extension_seconds": extension
                    })
                    
                    return True
                    
            return False
            
        except Exception as e:
            logger.error(f"Error extending session {session_id}: {e}")
            return False

