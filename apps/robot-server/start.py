#!/usr/bin/env python3
"""
Startup script for UR10 Robot Server
"""

import os
import sys
import logging
import uvicorn
from pathlib import Path

# Add current directory to Python path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('robot_server.log')
    ]
)

logger = logging.getLogger(__name__)

def main():
    """Main startup function"""
    try:
        logger.info("Starting UR10 Robot Server...")
        
        # Load environment variables
        env_file = current_dir / ".env"
        if env_file.exists():
            logger.info(f"Loading environment from {env_file}")
        else:
            logger.info("No .env file found, using defaults")
            
        # Import after path setup
        from core.config import settings
        
        # Log configuration
        logger.info(f"Mock mode: {settings.mock_mode}")
        logger.info(f"Robot hostname: {settings.robot_hostname}")
        logger.info(f"Robot port: {settings.robot_port}")
        logger.info(f"Debug mode: {settings.debug}")
        
        # Start server
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8000,
            reload=settings.debug,
            log_level=settings.log_level.lower(),
            access_log=True,
            ssl_keyfile=settings.tls_key_file if settings.tls_key_file else None,
            ssl_certfile=settings.tls_cert_file if settings.tls_cert_file else None
        )
        
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

