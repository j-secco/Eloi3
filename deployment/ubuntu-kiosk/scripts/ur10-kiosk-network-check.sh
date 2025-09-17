#!/bin/bash

# ============================================================================
# UR10 Robot Kiosk - Network Connectivity Check Script
# ============================================================================
# This script ensures network connectivity is available and attempts to
# restore it if connection is lost.
# ============================================================================

set -euo pipefail

# Configuration
LOG_FILE="/var/log/ur10-kiosk/network.log"
MAX_RETRIES=5
RETRY_DELAY=10

# Test hosts (in order of preference)
TEST_HOSTS=(
    "8.8.8.8"           # Google DNS
    "1.1.1.1"           # Cloudflare DNS
    "208.67.222.222"    # OpenDNS
)

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [NETWORK] $1" | tee -a "$LOG_FILE"
}

# Test network connectivity
test_connectivity() {
    local host="$1"
    local timeout="${2:-5}"
    
    if ping -c 1 -W "$timeout" "$host" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Check if any network interface is up
check_interfaces() {
    local interfaces
    interfaces=$(ip link show | grep -E "state UP" | wc -l)
    
    if [[ $interfaces -gt 0 ]]; then
        return 0
    else
        return 1
    fi
}

# Restart network services
restart_network() {
    log "Restarting network services..."
    
    # Restart NetworkManager
    systemctl restart NetworkManager
    sleep 5
    
    # Bring up all interfaces
    for interface in $(ip link show | grep -E "^[0-9]+:" | awk -F': ' '{print $2}' | grep -v lo); do
        log "Bringing up interface: $interface"
        ip link set "$interface" up || true
    done
    
    sleep 10
    log "Network services restarted"
}

# Check DNS resolution
check_dns() {
    if nslookup google.com > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Configure DNS if needed
configure_dns() {
    log "Configuring DNS servers..."
    
    # Backup existing resolv.conf
    cp /etc/resolv.conf /etc/resolv.conf.backup 2>/dev/null || true
    
    # Set reliable DNS servers
    cat > /etc/resolv.conf << EOF
# UR10 Kiosk DNS Configuration
nameserver 8.8.8.8
nameserver 8.8.4.4
nameserver 1.1.1.1
EOF
    
    log "DNS servers configured"
}

# Main network check function
check_network() {
    log "Starting network connectivity check..."
    
    # Create log directory if it doesn't exist
    mkdir -p "$(dirname "$LOG_FILE")"
    
    local retry_count=0
    local connectivity_ok=false
    
    while [[ $retry_count -lt $MAX_RETRIES ]]; do
        log "Network check attempt $((retry_count + 1))/$MAX_RETRIES"
        
        # Check if network interfaces are up
        if ! check_interfaces; then
            log "ERROR: No network interfaces are up"
            restart_network
            ((retry_count++))
            sleep "$RETRY_DELAY"
            continue
        fi
        
        # Test connectivity to multiple hosts
        local host_reachable=false
        for host in "${TEST_HOSTS[@]}"; do
            if test_connectivity "$host"; then
                log "SUCCESS: Can reach $host"
                host_reachable=true
                break
            else
                log "WARNING: Cannot reach $host"
            fi
        done
        
        if ! $host_reachable; then
            log "ERROR: Cannot reach any test hosts"
            restart_network
            ((retry_count++))
            sleep "$RETRY_DELAY"
            continue
        fi
        
        # Check DNS resolution
        if ! check_dns; then
            log "WARNING: DNS resolution failed, reconfiguring..."
            configure_dns
            sleep 5
            
            # Test DNS again
            if ! check_dns; then
                log "ERROR: DNS still not working after reconfiguration"
                ((retry_count++))
                sleep "$RETRY_DELAY"
                continue
            fi
        fi
        
        log "SUCCESS: Network connectivity verified"
        connectivity_ok=true
        break
    done
    
    if ! $connectivity_ok; then
        log "CRITICAL: Failed to establish network connectivity after $MAX_RETRIES attempts"
        exit 1
    fi
    
    log "Network check completed successfully"
}

# Run the network check
check_network

