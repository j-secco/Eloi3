# UR10 Robot Kiosk - Development Setup

This document provides instructions for setting up the UR10 Robot Kiosk system for development.

## Quick Start

### Automated Installation (Recommended)

The easiest way to get started is using our automated installation script:

```bash
# Run the development installer
./install-dev.sh

# Or using npm
npm run install:dev
```

This script will:
1. Check system requirements
2. Install Python backend dependencies (with virtual environment)
3. Install Node.js frontend dependencies (handling conflicts)
4. Configure environment files
5. Build the system
6. Create convenient start scripts
7. Run health checks

### Manual Installation

If you prefer manual installation:

```bash
# Install backend dependencies
cd apps/robot-server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Install frontend dependencies
cd ../kiosk-ui
npm install --legacy-peer-deps

# Create environment files
cp apps/robot-server/.env.example apps/robot-server/.env
# Edit .env to set MOCK_MODE=true for development
```

## Running the System

### Quick Start Scripts

After installation, you have several convenient start scripts:

```bash
# Start both frontend and backend
./start-development.sh

# Start only backend
./start-backend.sh

# Start only frontend  
./start-frontend.sh
```

### Manual Start

**Backend (Terminal 1):**
```bash
cd apps/robot-server
source venv/bin/activate  # if using virtual env
export MOCK_MODE=true
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend (Terminal 2):**
```bash
cd apps/kiosk-ui
npm run dev
```

## Access Points

Once running, you can access:

- **Frontend Kiosk UI**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## System Requirements

- **Node.js**: v18+ (for frontend)
- **Python**: 3.8+ (for backend)
- **npm**: Latest version
- **pip3**: Latest version
- **git**: For version control

### macOS Installation
```bash
# Using Homebrew
brew install node python3 git
```

### Linux Installation
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install nodejs npm python3 python3-pip git
```

## Architecture Overview

### Frontend (`apps/kiosk-ui`)
- **React 19** PWA with Vite
- **Tailwind CSS** for styling
- **Radix UI** components
- **Zustand** for state management
- **React Router** for navigation
- **WebSocket** for real-time updates

### Backend (`apps/robot-server`)
- **FastAPI** with uvicorn
- **WebSocket** support for real-time data
- **Mock robot** adapter for development
- **Session management** with PIN authentication
- **Chess integration** with Stockfish

### Key Features

✅ **Real-time Communication**: WebSocket channels for telemetry, alerts, job updates, and analysis  
✅ **Mock Mode**: No physical robot needed for development  
✅ **Session Management**: PIN-based authentication with operator/supervisor roles  
✅ **Touch Optimized**: Designed for Elo i3 touchscreen computers  
✅ **Chess Integration**: Play chess with the robot arm  
✅ **Safety Systems**: Emergency stops, workspace limits, speed controls  
✅ **Progressive Web App**: Offline support, mobile-friendly  

## Development Workflow

1. **Install**: Run `./install-dev.sh` to set up everything
2. **Develop**: Use `./start-development.sh` to run both services
3. **Test**: Frontend at http://localhost:5173, API docs at http://localhost:8000/docs
4. **Code**: Edit files in `apps/kiosk-ui/src/` (frontend) or `apps/robot-server/` (backend)
5. **Auto-reload**: Both services support hot reloading during development

## Troubleshooting

### Dependencies Won't Install

**Frontend dependency conflicts:**
```bash
cd apps/kiosk-ui
rm -rf node_modules package-lock.json
npm cache clean --force
npm install --legacy-peer-deps
```

**Backend dependency issues:**
```bash
cd apps/robot-server
python3 -m venv venv --clear
source venv/bin/activate  
pip install --upgrade pip
pip install -r requirements.txt
```

### Services Won't Start

**Check ports are available:**
```bash
lsof -i :5173  # Frontend
lsof -i :8000  # Backend
```

**Check environment variables:**
```bash
# Backend should have MOCK_MODE=true in .env
cat apps/robot-server/.env

# Frontend should have proper API URLs
cat apps/kiosk-ui/.env.local
```

### WebSocket Connection Issues

- Ensure backend is running on port 8000
- Check browser console for WebSocket errors
- Verify CORS settings in backend .env file

## Project Structure

```
/Eloi3
├── apps/
│   ├── kiosk-ui/          # React PWA Frontend
│   │   ├── src/
│   │   │   ├── components/    # UI Components
│   │   │   ├── hooks/         # React Hooks & State
│   │   │   └── ...
│   │   ├── package.json
│   │   └── vite.config.js
│   │
│   └── robot-server/      # FastAPI Backend
│       ├── api/               # REST & WebSocket APIs
│       ├── core/              # Business Logic
│       ├── models/            # Data Models
│       ├── adapters/          # Robot Adapters
│       ├── requirements.txt
│       └── main.py
│
├── deployment/            # Docker & Production
├── tests/                 # E2E Tests
├── install-dev.sh         # Development Installer
├── start-development.sh   # Combined Start Script
├── start-backend.sh       # Backend Only
├── start-frontend.sh      # Frontend Only
└── package.json           # Root Package Config
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Run `./install-dev.sh` to set up your environment
4. Make your changes
5. Test with `./start-development.sh`
6. Submit a pull request

## Documentation

- **API Documentation**: http://localhost:8000/docs (when backend is running)
- **WARP.md**: Detailed system documentation and commands
- **README.md**: Project overview and production setup
- **This file**: Development setup instructions

## Support

For development issues:
1. Check the installation log: `install.log`
2. Verify system requirements are met
3. Try the troubleshooting steps above
4. Check existing GitHub issues
5. Create a new issue with detailed error information