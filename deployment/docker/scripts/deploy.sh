#!/bin/bash

# ============================================================================
# UR10 Robot Kiosk - Docker Deployment Script
# ============================================================================
# Automated deployment script for the UR10 robot kiosk system
# Supports development, staging, and production environments
# ============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
COMPOSE_PROJECT_NAME="ur10-kiosk"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
ENVIRONMENT="development"
ACTION="up"
BUILD=false
PULL=false
RECREATE=false
PROFILES=""
SERVICES=""

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Show usage information
show_usage() {
    cat << EOF
UR10 Robot Kiosk Docker Deployment Script

Usage: $0 [OPTIONS] [ACTION]

Actions:
    up          Start services (default)
    down        Stop services
    restart     Restart services
    build       Build images
    pull        Pull latest images
    logs        Show service logs
    status      Show service status
    clean       Clean up containers and volumes
    backup      Create backup
    restore     Restore from backup

Options:
    -e, --env ENV       Environment (development|staging|production) [default: development]
    -p, --profiles      Comma-separated list of profiles to enable
    -s, --services      Comma-separated list of services to target
    -b, --build         Force rebuild of images
    -P, --pull          Pull latest images before starting
    -r, --recreate      Recreate containers
    -f, --force         Force action without confirmation
    -v, --verbose       Verbose output
    -h, --help          Show this help message

Profiles:
    production      Enable production services (postgres, monitoring)
    monitoring      Enable Prometheus and Grafana
    logging         Enable ELK stack for log aggregation
    backup          Enable backup service
    traefik         Enable Traefik reverse proxy
    dev-tools       Enable development tools (pgAdmin, Redis Commander)
    testing         Enable test runner

Examples:
    $0                                          # Start development environment
    $0 -e production up                         # Start production environment
    $0 -e production -p monitoring,backup up    # Start production with monitoring and backup
    $0 -s robot-server,kiosk-ui restart         # Restart specific services
    $0 -b build                                 # Build all images
    $0 logs robot-server                        # Show robot server logs
    $0 clean                                    # Clean up everything

EOF
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--env)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -p|--profiles)
                PROFILES="$2"
                shift 2
                ;;
            -s|--services)
                SERVICES="$2"
                shift 2
                ;;
            -b|--build)
                BUILD=true
                shift
                ;;
            -P|--pull)
                PULL=true
                shift
                ;;
            -r|--recreate)
                RECREATE=true
                shift
                ;;
            -f|--force)
                FORCE=true
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            up|down|restart|build|pull|logs|status|clean|backup|restore)
                ACTION="$1"
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker."
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose."
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running. Please start Docker."
        exit 1
    fi
    
    log_success "Prerequisites check completed"
}

# Setup environment
setup_environment() {
    log_info "Setting up environment: $ENVIRONMENT"
    
    cd "$PROJECT_ROOT"
    
    # Create .env file if it doesn't exist
    if [[ ! -f .env ]]; then
        log_info "Creating .env file from template..."
        cp .env.example .env
        log_warning "Please review and customize the .env file before deployment"
    fi
    
    # Set environment-specific variables
    export COMPOSE_PROJECT_NAME="$COMPOSE_PROJECT_NAME"
    export COMPOSE_FILE="docker-compose.yml"
    
    case "$ENVIRONMENT" in
        development)
            export COMPOSE_FILE="$COMPOSE_FILE:docker-compose.dev.yml"
            ;;
        staging)
            export COMPOSE_FILE="$COMPOSE_FILE:docker-compose.staging.yml"
            ;;
        production)
            export COMPOSE_FILE="$COMPOSE_FILE:docker-compose.prod.yml"
            PROFILES="${PROFILES:+$PROFILES,}production"
            ;;
        *)
            log_error "Unknown environment: $ENVIRONMENT"
            exit 1
            ;;
    esac
    
    # Set profiles
    if [[ -n "$PROFILES" ]]; then
        export COMPOSE_PROFILES="$PROFILES"
        log_info "Enabled profiles: $PROFILES"
    fi
    
    log_success "Environment setup completed"
}

# Build Docker command
build_docker_command() {
    local cmd="docker-compose"
    
    # Use docker compose if available (newer versions)
    if docker compose version &> /dev/null; then
        cmd="docker compose"
    fi
    
    # Add project name
    cmd="$cmd -p $COMPOSE_PROJECT_NAME"
    
    # Add services if specified
    if [[ -n "$SERVICES" ]]; then
        cmd="$cmd $SERVICES"
    fi
    
    echo "$cmd"
}

# Execute Docker Compose action
execute_action() {
    local docker_cmd
    docker_cmd=$(build_docker_command)
    
    log_info "Executing action: $ACTION"
    
    case "$ACTION" in
        up)
            local up_cmd="$docker_cmd up -d"
            
            if [[ "$BUILD" == true ]]; then
                up_cmd="$up_cmd --build"
            fi
            
            if [[ "$PULL" == true ]]; then
                up_cmd="$up_cmd --pull always"
            fi
            
            if [[ "$RECREATE" == true ]]; then
                up_cmd="$up_cmd --force-recreate"
            fi
            
            log_info "Starting services..."
            eval "$up_cmd"
            ;;
            
        down)
            log_info "Stopping services..."
            eval "$docker_cmd down"
            ;;
            
        restart)
            log_info "Restarting services..."
            eval "$docker_cmd restart"
            ;;
            
        build)
            log_info "Building images..."
            eval "$docker_cmd build --no-cache"
            ;;
            
        pull)
            log_info "Pulling images..."
            eval "$docker_cmd pull"
            ;;
            
        logs)
            log_info "Showing logs..."
            eval "$docker_cmd logs -f"
            ;;
            
        status)
            log_info "Service status:"
            eval "$docker_cmd ps"
            ;;
            
        clean)
            clean_deployment
            ;;
            
        backup)
            create_backup
            ;;
            
        restore)
            restore_backup
            ;;
            
        *)
            log_error "Unknown action: $ACTION"
            exit 1
            ;;
    esac
}

# Clean deployment
clean_deployment() {
    log_warning "This will remove all containers, networks, and volumes!"
    
    if [[ "${FORCE:-false}" != true ]]; then
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Cleanup cancelled"
            return
        fi
    fi
    
    local docker_cmd
    docker_cmd=$(build_docker_command)
    
    log_info "Stopping and removing containers..."
    eval "$docker_cmd down -v --remove-orphans"
    
    log_info "Removing unused images..."
    docker image prune -f
    
    log_info "Removing unused volumes..."
    docker volume prune -f
    
    log_info "Removing unused networks..."
    docker network prune -f
    
    log_success "Cleanup completed"
}

# Create backup
create_backup() {
    log_info "Creating backup..."
    
    local backup_dir="/tmp/ur10-backup-$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup database
    if docker-compose ps postgres | grep -q "Up"; then
        log_info "Backing up PostgreSQL database..."
        docker-compose exec -T postgres pg_dump -U ur10_user ur10_kiosk > "$backup_dir/postgres.sql"
    fi
    
    # Backup Redis
    if docker-compose ps redis | grep -q "Up"; then
        log_info "Backing up Redis data..."
        docker-compose exec -T redis redis-cli --rdb - > "$backup_dir/redis.rdb"
    fi
    
    # Backup application data
    log_info "Backing up application data..."
    docker run --rm -v ur10-kiosk_robot-data:/data -v "$backup_dir":/backup alpine tar czf /backup/robot-data.tar.gz -C /data .
    
    # Create archive
    local archive_name="ur10-backup-$(date +%Y%m%d_%H%M%S).tar.gz"
    tar czf "$archive_name" -C "$(dirname "$backup_dir")" "$(basename "$backup_dir")"
    
    log_success "Backup created: $archive_name"
    rm -rf "$backup_dir"
}

# Restore backup
restore_backup() {
    log_warning "This will restore from backup and may overwrite existing data!"
    
    if [[ "${FORCE:-false}" != true ]]; then
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Restore cancelled"
            return
        fi
    fi
    
    # Implementation would depend on backup format and requirements
    log_info "Restore functionality not yet implemented"
}

# Show deployment status
show_status() {
    log_info "Deployment Status:"
    echo "===================="
    echo "Environment: $ENVIRONMENT"
    echo "Profiles: ${COMPOSE_PROFILES:-none}"
    echo "Services: ${SERVICES:-all}"
    echo
    
    local docker_cmd
    docker_cmd=$(build_docker_command)
    eval "$docker_cmd ps"
}

# Main function
main() {
    log_info "Starting UR10 Robot Kiosk deployment..."
    
    parse_arguments "$@"
    check_prerequisites
    setup_environment
    
    case "$ACTION" in
        status)
            show_status
            ;;
        *)
            execute_action
            ;;
    esac
    
    log_success "Deployment operation completed successfully!"
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi

