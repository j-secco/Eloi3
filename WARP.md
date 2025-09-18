# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## System Overview

**Eloi3** is a complete UR10 robot kiosk system designed specifically for Elo i3 touchscreen computers. It provides touch-first control of UR10 robots, real-time telemetry, chess gameplay, and comprehensive security in industrial environments.

### Key Architecture Components

- **React PWA Frontend** (`apps/kiosk-ui/`) - Touch-optimized progressive web app with Vite
- **FastAPI Backend** (`apps/robot-server/`) - Python server for robot control and WebSocket telemetry
- **Shared Types** (`packages/types/`) - TypeScript type definitions for frontend-backend communication
- **Docker Deployment** (`deployment/`) - Multi-environment containerized deployment
- **E2E Testing** (`tests/`) - Comprehensive Playwright test suite
- **Automated Installer** (`installer.sh`) - Self-contained installation for Elo i3 devices

### Communication Architecture

- **WebSocket Channels**: Real-time telemetry (`/ws/telemetry`), alerts (`/ws/alerts`), job updates (`/ws/job`), analysis (`/ws/analysis`)
- **REST API**: Robot control, chess game management, session handling at `/api/v1`
- **HTTPS/TLS**: Required for production, certificates in `deployment/security/`

## Essential Commands

### Development Setup

```bash
# Install all dependencies
npm run install:all

# Start development (both UI and server)
npm run dev

# Start individual services
npm run dev:ui    # React PWA on port 5173
npm run dev:server # FastAPI server on port 8000
```

### Docker Development

```bash
# Start development environment with Docker
./deployment/docker/scripts/deploy.sh -e development up

# Start with specific profiles
./deployment/docker/scripts/deploy.sh -e development -p monitoring up

# View service logs
./deployment/docker/scripts/deploy.sh logs robot-server
./deployment/docker/scripts/deploy.sh logs kiosk-ui
```

### Building

```bash
# Build all services
npm run build

# Build individual services
npm run build:ui      # React PWA build
npm run build:server  # FastAPI validation

# Build Docker images
./deployment/docker/scripts/deploy.sh -b build
```

### Testing

```bash
# Run all tests
npm run test

# Run specific test types
npm run test:ui    # Frontend tests
npm run test:e2e   # End-to-end tests

# Run E2E tests with different configurations
cd tests
./run-tests.sh --suite smoke --headed
./run-tests.sh --suite robot --browser firefox
./run-tests.sh --debug  # Debug mode with inspector
```

### Linting and Code Quality

```bash
# Run linting
npm run lint

# Lint specific services
npm run lint:ui
```

### Robot Operations

```bash
# Start robot server in mock mode (no hardware)
cd apps/robot-server
export MOCK_MODE=true
python -m uvicorn main:app --reload

# Robot server with real UR10 connection
export ROBOT_IP=192.168.1.100
export MOCK_MODE=false
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Production Deployment

```bash
# Deploy to production with monitoring and backup
./deployment/docker/scripts/deploy.sh -e production -p monitoring,backup up

# Check deployment status
./deployment/docker/scripts/deploy.sh status

# Create backup
./deployment/docker/scripts/deploy.sh backup
```

## Development Workflows

### Local Development Setup

1. **Clone and configure environment**:
   ```bash
   git clone <repository-url>
   cd Eloi3
   cp apps/robot-server/.env.example apps/robot-server/.env
   # Edit .env with your robot IP and settings
   ```

2. **Install dependencies**:
   ```bash
   npm run install:all
   ```

3. **Start development servers**:
   ```bash
   npm run dev  # Starts both UI (5173) and server (8000)
   ```

4. **Access services**:
   - Kiosk UI: https://localhost:5173
   - Robot Server API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Docker Development

1. **Start containerized development**:
   ```bash
   ./deployment/docker/scripts/deploy.sh -e development up
   ```

2. **Access services**:
   - Kiosk UI: https://localhost (port 443)
   - Robot Server: http://localhost:8000
   - Prometheus: http://localhost:9090 (with monitoring profile)
   - Grafana: http://localhost:3000 (with monitoring profile)

### Testing Robot Integration

1. **Mock robot development**:
   ```bash
   cd apps/robot-server
   export MOCK_MODE=true
   python -m uvicorn main:app --reload
   ```

2. **Real robot connection**:
   ```bash
   export ROBOT_IP=<your-robot-ip>
   export MOCK_MODE=false
   python -m uvicorn main:app --reload
   ```

3. **Run robot control tests**:
   ```bash
   cd tests
   ./run-tests.sh --suite robot
   ```

### Debugging WebSocket Connections

WebSocket endpoints are available at:
- Telemetry: `ws://localhost:8000/ws/telemetry`
- Alerts: `ws://localhost:8000/ws/alerts`
- Job Updates: `ws://localhost:8000/ws/job`
- Analysis: `ws://localhost:8000/ws/analysis`

## Configuration

### Key Environment Variables

**Robot Server** (apps/robot-server/.env):
```bash
# Robot connection
ROBOT_IP=192.168.1.100
ROBOT_PORT=30002
MOCK_MODE=false

# Server settings
HOST=0.0.0.0
PORT=8000
DEBUG=true

# Security
CORS_ORIGINS=https://localhost:5173,https://localhost
SECRET_KEY=your-secret-key

# Chess engine
STOCKFISH_PATH=/usr/bin/stockfish
STOCKFISH_DEPTH=15

# Safety limits
ENABLE_SAFETY_LIMITS=true
MAX_VELOCITY=0.5
WORKSPACE_LIMITS={"x_min": -0.8, "x_max": 0.8, "y_min": -0.8, "y_max": 0.8, "z_min": 0.0, "z_max": 1.0}
```

**Frontend Build** (apps/kiosk-ui/):
```bash
VITE_API_BASE_URL=https://localhost:8000
VITE_WS_URL=wss://localhost:8000
```

### Service Ports

| Service | Development | Production | Protocol |
|---------|-------------|------------|----------|
| Kiosk UI | 5173 | 443 | HTTPS |
| Robot Server | 8000 | 8000 | HTTP |

**Removed Services (were not actually used):**
- PostgreSQL - Data stored in-memory
- Redis - Sessions stored in-memory  
- Prometheus/Grafana - Production monitoring overkill
- Traefik - Reverse proxy unnecessary

### Docker Profiles

Available profiles for different deployment scenarios:
- `production` - PostgreSQL database, optimized settings
- `monitoring` - Prometheus + Grafana
- `logging` - ELK stack
- `backup` - Automated backup service
- `traefik` - Reverse proxy with automatic HTTPS
- `dev-tools` - pgAdmin, Redis Commander

## Project Structure Deep Dive

### Monorepo Organization

```
/Eloi3
├── apps/
│   ├── kiosk-ui/          # React PWA with Vite, Tailwind, Radix UI
│   └── robot-server/      # FastAPI with WebSocket, chess integration
├── packages/
│   ├── types/            # Shared TypeScript definitions
│   └── docs/             # Technical documentation
├── deployment/
│   ├── docker/           # Multi-environment Docker configs
│   ├── security/         # TLS certificates and security setup
│   └── ubuntu-kiosk/     # Elo i3 touchscreen optimization
├── tests/               # Playwright E2E testing framework
└── installer.sh        # Self-contained Elo i3 installer
```

### Backend Architecture (FastAPI)

**Core Modules**:
- `core/robot_manager.py` - UR10 robot interface and control
- `core/session_manager.py` - User session and state management
- `core/security.py` - Authentication, CORS, rate limiting
- `api/routes.py` - REST API endpoints
- `api/websocket.py` - WebSocket connection management
- `adapters/ur10_adapter.py` - Hardware abstraction layer
- `adapters/mock_adapter.py` - Development simulation

**WebSocket Managers**: Real-time data streaming for telemetry, alerts, job status, and analysis updates.

### Frontend Architecture (React PWA)

**Key Technologies**:
- **Vite** - Build tool and dev server
- **React 19** - UI framework
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component library
- **Zustand** - State management
- **React Router 7** - Client-side routing

**PWA Features**: Service worker, offline support, touch-optimized for Elo i3 screens.

## Troubleshooting

### Common Issues

**Services Won't Start**:
```bash
# Check if ports are available
lsof -i :5173  # Frontend
lsof -i :8000  # Backend

# Clean Docker state
./deployment/docker/scripts/deploy.sh clean
```

**Robot Connection Issues**:
```bash
# Test robot connectivity
ping <robot-ip>
telnet <robot-ip> 30002

# Check robot server logs
./deployment/docker/scripts/deploy.sh logs robot-server

# Enable mock mode for development
export MOCK_MODE=true
```

**WebSocket Connection Failures**:
- Verify CORS_ORIGINS includes your frontend URL
- Check that WebSocket endpoints are accessible
- Ensure certificates are valid for HTTPS/WSS

**Chess Game Issues**:
- Verify Stockfish is installed: `which stockfish`
- Check chess engine configuration in robot server logs
- Ensure robot workspace is properly calibrated

### Performance Issues

**Frontend**:
```bash
# Check bundle size
cd apps/kiosk-ui
npm run build --analyze
```

**Backend**:
```bash
# Enable monitoring
./deployment/docker/scripts/deploy.sh -p monitoring up
# Access Grafana at http://localhost:3000
```

**Database**:
```bash
# Check PostgreSQL performance
./deployment/docker/scripts/deploy.sh logs postgres
```

## Testing Strategy

### Test Suites

**Smoke Tests** (`@smoke`) - Basic functionality, health checks, authentication
**Robot Tests** (`@robot`) - Movement control, safety limits, telemetry
**Chess Tests** (`@chess`) - Game logic, AI moves, physical piece handling
**Security Tests** (`@security`) - HTTPS enforcement, rate limiting, input validation

### Running Specific Tests

```bash
cd tests

# Run by suite
./run-tests.sh --suite smoke
./run-tests.sh --suite robot --browser firefox

# Debug mode
./run-tests.sh --debug

# Generate reports
./run-tests.sh --report-only
```

## Security Considerations

### Production Security

- **HTTPS Enforcement** - All production traffic over TLS
- **CORS Configuration** - Restricted to trusted origins
- **Rate Limiting** - API request throttling
- **Input Validation** - Comprehensive Pydantic schemas
- **Security Headers** - HSTS, CSP, X-Frame-Options
- **Network Isolation** - Docker network segmentation

### Robot Safety

- **Workspace Limits** - Configurable physical boundaries
- **Emergency Stop** - Immediate halt capability
- **Speed Limits** - Maximum velocity constraints
- **Force Control** - Safe interaction parameters

## Elo i3 Touchscreen Optimization

This system is specifically designed for **Elo i3 touchscreen computers**:

- **Ubuntu Kiosk Mode** - Automatic setup via `installer.sh`
- **Touch Optimization** - UI components sized for touch interaction
- **Auto-startup** - System services for boot-time launch
- **Network Configuration** - Automated Wi-Fi and Ethernet setup
- **Hardware Compatibility** - Full Elo touch controller support

### Installation on Elo i3

```bash
# Download and run automated installer
wget https://github.com/j-secco/Eloi3/raw/main/installer.sh
chmod +x installer.sh
sudo ./installer.sh
```

## Quick Reference

### Key Files
- `package.json` - Root workspace configuration
- `docker-compose.yml` - Base Docker services
- `apps/robot-server/.env.example` - Environment template
- `deployment/docker/scripts/deploy.sh` - Deployment automation
- `tests/playwright.config.ts` - Test configuration

### Important URLs
- Frontend Dev: https://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

### Service Dependencies
- Kiosk UI depends on Robot Server
- Robot Server optionally connects to UR10 hardware  
- Chess functionality requires Stockfish engine (optional)
- **Simplified:** No external databases or monitoring needed for development
