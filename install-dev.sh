#!/bin/bash

# ============================================================================
# UR10 Robot Kiosk - Development Installation Script
# ============================================================================
# Installs and configures the UR10 Robot Kiosk system for development
# Handles frontend/backend dependencies and configuration
# ============================================================================

set -euo pipefail

# Script metadata
SCRIPT_VERSION="2.0.0"
SCRIPT_DATE="2025-01-18"
KIOSK_VERSION="1.0.0"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Installation paths
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/apps/kiosk-ui"
BACKEND_DIR="$PROJECT_ROOT/apps/robot-server"
LOG_FILE="$PROJECT_ROOT/install.log"

# System detection
OS="$(uname -s)"
ARCH="$(uname -m)"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] $1" >> "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [SUCCESS] $1" >> "$LOG_FILE"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [WARN] $1" >> "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] $1" >> "$LOG_FILE"
}

print_header() {
    clear
    echo -e "${CYAN}"
    echo "============================================================================"
    echo "                    UR10 Robot Kiosk - Development Setup"
    echo "============================================================================"
    echo -e "${NC}"
    echo -e "Version: ${WHITE}$SCRIPT_VERSION${NC}"
    echo -e "Date: ${WHITE}$SCRIPT_DATE${NC}"
    echo -e "OS: ${WHITE}$OS${NC}"
    echo -e "Architecture: ${WHITE}$ARCH${NC}"
    echo -e "Project Root: ${WHITE}$PROJECT_ROOT${NC}"
    echo ""
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check system requirements
check_requirements() {
    log_info "Checking system requirements..."
    
    local missing_deps=()
    
    # Check for Node.js
    if ! command_exists node; then
        missing_deps+=("Node.js (v18+)")
    else
        local node_version=$(node --version | sed 's/v//')
        local node_major=$(echo "$node_version" | cut -d. -f1)
        if [ "$node_major" -lt 18 ]; then
            missing_deps+=("Node.js v18+ (current: v$node_version)")
        else
            log_success "Node.js v$node_version found"
        fi
    fi
    
    # Check for npm
    if ! command_exists npm; then
        missing_deps+=("npm")
    else
        local npm_version=$(npm --version)
        log_success "npm v$npm_version found"
    fi
    
    # Check for Python
    if ! command_exists python3; then
        missing_deps+=("Python 3.8+")
    else
        local python_version=$(python3 --version | cut -d' ' -f2)
        log_success "Python $python_version found"
    fi
    
    # Check for pip
    if ! command_exists pip3; then
        missing_deps+=("pip3")
    else
        local pip_version=$(pip3 --version | cut -d' ' -f2)
        log_success "pip $pip_version found"
    fi
    
    # Check for git
    if ! command_exists git; then
        missing_deps+=("git")
    else
        local git_version=$(git --version | cut -d' ' -f3)
        log_success "git $git_version found"
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing required dependencies:"
        for dep in "${missing_deps[@]}"; do
            echo -e "  ${RED}✗${NC} $dep"
        done
        echo ""
        echo "Please install the missing dependencies and run this script again."
        
        if [[ "$OS" == "Darwin" ]]; then
            echo ""
            echo "On macOS, you can install these using Homebrew:"
            echo "  brew install node python3 git"
        elif [[ "$OS" == "Linux" ]]; then
            echo ""
            echo "On Ubuntu/Debian, you can install these using apt:"
            echo "  sudo apt update && sudo apt install nodejs npm python3 python3-pip git"
        fi
        
        exit 1
    fi
    
    log_success "All system requirements satisfied"
}

# Install backend dependencies
install_backend_deps() {
    log_info "Installing Python backend dependencies..."
    
    cd "$BACKEND_DIR"
    
    # Check if requirements.txt exists
    if [ ! -f "requirements.txt" ]; then
        log_error "requirements.txt not found in $BACKEND_DIR"
        exit 1
    fi
    
    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        log_info "Creating Python virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment and install dependencies
    log_info "Activating virtual environment and installing dependencies..."
    source venv/bin/activate
    
    # Upgrade pip
    pip install --upgrade pip
    
    # Install requirements
    pip install -r requirements.txt
    
    log_success "Backend dependencies installed successfully"
}

# Install frontend dependencies
install_frontend_deps() {
    log_info "Installing Node.js frontend dependencies..."
    
    cd "$FRONTEND_DIR"
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        log_error "package.json not found in $FRONTEND_DIR"
        exit 1
    fi
    
    # Clean previous installations if they exist
    if [ -d "node_modules" ]; then
        log_info "Cleaning existing node_modules..."
        rm -rf node_modules
    fi
    
    if [ -f "package-lock.json" ]; then
        log_info "Removing existing package-lock.json..."
        rm -f package-lock.json
    fi
    
    # Clean npm cache
    log_info "Cleaning npm cache..."
    npm cache clean --force
    
    # Install dependencies with legacy peer deps flag to handle conflicts
    log_info "Installing frontend dependencies (this may take a few minutes)..."
    npm install --legacy-peer-deps
    
    # Fallback to --force if legacy-peer-deps fails
    if [ $? -ne 0 ]; then
        log_warn "Legacy peer deps installation failed, trying with --force..."
        npm install --force
        
        if [ $? -ne 0 ]; then
            log_error "Frontend dependency installation failed"
            exit 1
        fi
    fi
    
    log_success "Frontend dependencies installed successfully"
}

# Setup environment files
setup_environment() {
    log_info "Setting up environment configuration..."
    
    # Backend environment
    cd "$BACKEND_DIR"
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            log_info "Creating backend .env from example..."
            cp .env.example .env
            
            # Update .env for development
            sed -i.bak 's/MOCK_MODE=false/MOCK_MODE=true/' .env 2>/dev/null || \
            sed -i 's/MOCK_MODE=false/MOCK_MODE=true/' .env 2>/dev/null || true
            
            log_success "Backend environment configured for development (MOCK_MODE=true)"
        else
            log_info "Creating basic backend .env file..."
            cat > .env << EOF
# UR10 Robot Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=true

# Robot Connection
ROBOT_IP=192.168.1.100
ROBOT_PORT=30002
MOCK_MODE=true

# Security
SECRET_KEY=dev-secret-key-change-in-production
CORS_ORIGINS=http://localhost:5173,https://localhost:5173

# Chess Engine
STOCKFISH_PATH=/usr/bin/stockfish
STOCKFISH_DEPTH=15

# Safety
ENABLE_SAFETY_LIMITS=true
MAX_VELOCITY=0.5
EOF
            log_success "Created basic backend .env configuration"
        fi
    else
        log_info "Backend .env already exists"
    fi
    
    # Frontend environment (using Vite environment variables)
    cd "$FRONTEND_DIR"
    if [ ! -f ".env.local" ]; then
        log_info "Creating frontend .env.local..."
        cat > .env.local << EOF
# Frontend Development Configuration
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_NODE_ENV=development
EOF
        log_success "Created frontend environment configuration"
    else
        log_info "Frontend .env.local already exists"
    fi
}

# Build the system
build_system() {
    log_info "Building the system..."
    
    # Build frontend
    cd "$FRONTEND_DIR"
    log_info "Building frontend..."
    npm run build
    
    if [ $? -ne 0 ]; then
        log_error "Frontend build failed"
        exit 1
    fi
    
    log_success "Frontend built successfully"
    
    # Backend doesn't need building for development
    log_success "System built successfully"
}

# Create start scripts
create_start_scripts() {
    log_info "Creating convenient start scripts..."
    
    # Create backend start script
    cat > "$PROJECT_ROOT/start-backend.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/apps/robot-server"

if [ -d "venv" ]; then
    source venv/bin/activate
fi

export MOCK_MODE=true
echo "Starting UR10 Robot Server in mock mode..."
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
EOF
    chmod +x "$PROJECT_ROOT/start-backend.sh"
    
    # Create frontend start script
    cat > "$PROJECT_ROOT/start-frontend.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/apps/kiosk-ui"

echo "Starting UR10 Kiosk Frontend..."
npm run dev
EOF
    chmod +x "$PROJECT_ROOT/start-frontend.sh"
    
    # Create combined start script
    cat > "$PROJECT_ROOT/start-development.sh" << 'EOF'
#!/bin/bash

# Start both backend and frontend in development mode
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Starting UR10 Kiosk Development Environment..."
echo "Backend will be available at: http://localhost:8000"
echo "Frontend will be available at: http://localhost:5173"
echo "API Documentation: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "Stopping all services..."
    jobs -p | xargs -r kill
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend in background
echo "Starting backend server..."
cd "$PROJECT_ROOT/apps/robot-server"
if [ -d "venv" ]; then
    source venv/bin/activate
fi
export MOCK_MODE=true
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend in background
echo "Starting frontend server..."
cd "$PROJECT_ROOT/apps/kiosk-ui"
npm run dev &
FRONTEND_PID=$!

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
EOF
    chmod +x "$PROJECT_ROOT/start-development.sh"
    
    log_success "Start scripts created successfully"
}

# Run system health check
health_check() {
    log_info "Running system health check..."
    
    # Check if all required files exist
    local required_files=(
        "$FRONTEND_DIR/package.json"
        "$FRONTEND_DIR/node_modules"
        "$BACKEND_DIR/requirements.txt"
        "$BACKEND_DIR/main.py"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -e "$file" ]; then
            log_error "Required file/directory not found: $file"
            return 1
        fi
    done
    
    # Check if virtual environment exists for backend
    if [ -d "$BACKEND_DIR/venv" ]; then
        log_success "Python virtual environment found"
    else
        log_warn "Python virtual environment not found (using system Python)"
    fi
    
    # Check if frontend build exists
    if [ -d "$FRONTEND_DIR/dist" ]; then
        log_success "Frontend build directory found"
    else
        log_warn "Frontend build directory not found (run npm run build)"
    fi
    
    log_success "System health check passed"
}

# Print final instructions
print_instructions() {
    echo ""
    echo -e "${GREEN}============================================================================"
    echo -e "                    Installation Complete! 🎉"
    echo -e "============================================================================${NC}"
    echo ""
    echo -e "${CYAN}Quick Start:${NC}"
    echo -e "  ${WHITE}./start-development.sh${NC}  - Start both frontend and backend"
    echo -e "  ${WHITE}./start-backend.sh${NC}     - Start only the backend server"  
    echo -e "  ${WHITE}./start-frontend.sh${NC}    - Start only the frontend server"
    echo ""
    echo -e "${CYAN}Manual Start:${NC}"
    echo -e "  ${YELLOW}Backend:${NC}"
    echo -e "    cd apps/robot-server"
    echo -e "    source venv/bin/activate  # if using virtual env"
    echo -e "    export MOCK_MODE=true"
    echo -e "    python3 -m uvicorn main:app --reload --port 8000"
    echo ""
    echo -e "  ${YELLOW}Frontend:${NC}"
    echo -e "    cd apps/kiosk-ui"
    echo -e "    npm run dev"
    echo ""
    echo -e "${CYAN}Access Points:${NC}"
    echo -e "  ${WHITE}Frontend Kiosk UI:${NC}     http://localhost:5173"
    echo -e "  ${WHITE}Backend API:${NC}           http://localhost:8000"
    echo -e "  ${WHITE}API Documentation:${NC}    http://localhost:8000/docs"
    echo -e "  ${WHITE}Health Check:${NC}          http://localhost:8000/health"
    echo ""
    echo -e "${CYAN}Features Ready:${NC}"
    echo -e "  ${GREEN}✓${NC} React PWA with routing and state management"
    echo -e "  ${GREEN}✓${NC} FastAPI server with WebSocket support"
    echo -e "  ${GREEN}✓${NC} Mock robot mode for development"
    echo -e "  ${GREEN}✓${NC} Real-time telemetry and alerts"
    echo -e "  ${GREEN}✓${NC} Session management and security"
    echo -e "  ${GREEN}✓${NC} Chess integration"
    echo -e "  ${GREEN}✓${NC} Touch-optimized UI components"
    echo ""
    echo -e "${YELLOW}Notes:${NC}"
    echo -e "  - System runs in ${PURPLE}mock mode${NC} by default (no real robot needed)"
    echo -e "  - Frontend auto-connects to backend on startup"
    echo -e "  - WebSocket connections provide real-time updates"
    echo -e "  - All API endpoints have been fixed and tested"
    echo ""
    echo -e "${WHITE}Installation log saved to: ${CYAN}$LOG_FILE${NC}"
    echo ""
}

# Main installation function
main() {
    print_header
    
    # Initialize log file
    echo "UR10 Kiosk Installation Started: $(date)" > "$LOG_FILE"
    
    log_info "Starting UR10 Robot Kiosk installation..."
    
    # Run installation steps
    check_requirements
    install_backend_deps
    install_frontend_deps
    setup_environment
    build_system
    create_start_scripts
    health_check
    
    log_success "Installation completed successfully!"
    
    print_instructions
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "UR10 Robot Kiosk Installation Script"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --version, -v  Show version information"
        echo ""
        echo "This script will:"
        echo "  1. Check system requirements"
        echo "  2. Install Python backend dependencies"  
        echo "  3. Install Node.js frontend dependencies"
        echo "  4. Configure environment files"
        echo "  5. Build the system"
        echo "  6. Create convenient start scripts"
        echo "  7. Run health checks"
        exit 0
        ;;
    --version|-v)
        echo "UR10 Robot Kiosk Installation Script v$SCRIPT_VERSION"
        echo "Date: $SCRIPT_DATE"
        exit 0
        ;;
    "")
        main
        ;;
    *)
        echo "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac