#!/bin/bash

# ============================================================================
# UR10 Robot Kiosk - Watchdog Script
# ============================================================================
# This script monitors the kiosk system and ensures:
# - Chromium browser is running
# - Network connectivity is available
# - System resources are within limits
# - Automatic recovery from failures
# ============================================================================

set -euo pipefail

# Configuration
KIOSK_URL="https://localhost:5173"
CHECK_INTERVAL=30
LOG_FILE="/var/log/ur10-kiosk/watchdog.log"
PID_FILE="/var/run/ur10-kiosk-watchdog.pid"
MAX_MEMORY_MB=2048
MAX_CPU_PERCENT=80

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [WATCHDOG] $1" | tee -a "$LOG_FILE"
}

# Check if process is running
is_process_running() {
    local process_name="$1"
    pgrep -f "$process_name" > /dev/null 2>&1
}

# Check network connectivity
check_network() {
    if ping -c 1 -W 5 8.8.8.8 > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Check if Chromium is running and responsive
check_chromium() {
    if is_process_running "chromium.*kiosk"; then
        # Check if Chromium window is visible
        if xdotool search --name "Chromium" > /dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

# Restart Chromium browser
restart_chromium() {
    log "Restarting Chromium browser..."
    
    # Kill existing Chromium processes
    pkill -f "chromium" || true
    sleep 3
    
    # Start Chromium in kiosk mode
    DISPLAY=:0 chromium-browser \
        --kiosk \
        --no-first-run \
        --disable-infobars \
        --disable-session-crashed-bubble \
        --disable-translate \
        --disable-features=TranslateUI \
        --disable-ipc-flooding-protection \
        --disable-background-timer-throttling \
        --disable-backgrounding-occluded-windows \
        --disable-renderer-backgrounding \
        --disable-field-trial-config \
        --disable-back-forward-cache \
        --start-maximized \
        --window-position=0,0 \
        --window-size=1920,1080 \
        --user-data-dir=/home/ur10kiosk/.chromium-kiosk \
        --app="$KIOSK_URL" &
    
    sleep 5
    log "Chromium restarted"
}

# Check system resources
check_resources() {
    # Check memory usage
    local memory_usage
    memory_usage=$(free -m | awk 'NR==2{printf "%.0f", $3}')
    
    if [[ $memory_usage -gt $MAX_MEMORY_MB ]]; then
        log "WARNING: High memory usage: ${memory_usage}MB"
        return 1
    fi
    
    # Check CPU usage
    local cpu_usage
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    
    if (( $(echo "$cpu_usage > $MAX_CPU_PERCENT" | bc -l) )); then
        log "WARNING: High CPU usage: ${cpu_usage}%"
        return 1
    fi
    
    return 0
}

# Check disk space
check_disk_space() {
    local disk_usage
    disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [[ $disk_usage -gt 90 ]]; then
        log "WARNING: Low disk space: ${disk_usage}% used"
        
        # Clean up old logs
        find /var/log/ur10-kiosk -name "*.log" -mtime +7 -delete
        
        # Clean up Chromium cache
        rm -rf /home/ur10kiosk/.chromium-kiosk/Default/Cache/* 2>/dev/null || true
        
        return 1
    fi
    
    return 0
}

# Check if kiosk URL is accessible
check_kiosk_url() {
    if curl -s --connect-timeout 10 --max-time 30 "$KIOSK_URL" > /dev/null; then
        return 0
    else
        return 1
    fi
}

# Main monitoring loop
monitor_system() {
    log "Starting UR10 Kiosk Watchdog (PID: $$)"
    echo $$ > "$PID_FILE"
    
    local failure_count=0
    local max_failures=3
    
    while true; do
        local issues=0
        
        # Check network connectivity
        if ! check_network; then
            log "ERROR: Network connectivity lost"
            ((issues++))
        fi
        
        # Check if kiosk URL is accessible
        if ! check_kiosk_url; then
            log "ERROR: Kiosk URL not accessible: $KIOSK_URL"
            ((issues++))
        fi
        
        # Check Chromium browser
        if ! check_chromium; then
            log "ERROR: Chromium not running or not responsive"
            restart_chromium
            ((issues++))
        fi
        
        # Check system resources
        if ! check_resources; then
            ((issues++))
        fi
        
        # Check disk space
        if ! check_disk_space; then
            ((issues++))
        fi
        
        # Handle failures
        if [[ $issues -gt 0 ]]; then
            ((failure_count++))
            log "System check failed ($issues issues). Failure count: $failure_count"
            
            if [[ $failure_count -ge $max_failures ]]; then
                log "CRITICAL: Maximum failures reached. Restarting display manager..."
                systemctl restart lightdm
                failure_count=0
                sleep 60  # Wait longer after restart
            fi
        else
            failure_count=0
            log "System check passed"
        fi
        
        sleep "$CHECK_INTERVAL"
    done
}

# Signal handlers
cleanup() {
    log "Watchdog shutting down..."
    rm -f "$PID_FILE"
    exit 0
}

reload_config() {
    log "Reloading configuration..."
    # Add configuration reload logic here if needed
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT
trap reload_config SIGHUP

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Start monitoring
monitor_system

