#!/bin/bash

# ============================================================================
# UR10 Robot Kiosk - Ubuntu Kiosk Setup Script
# ============================================================================
# This script configures Ubuntu for kiosk mode with:
# - Dedicated kiosk user with autologin
# - Chromium in kiosk mode
# - Screen blanking and power management
# - On-screen keyboard support
# - Cursor hiding
# - System hardening for kiosk environment
# ============================================================================

set -euo pipefail

# Configuration variables
KIOSK_USER="ur10kiosk"
KIOSK_URL="https://localhost:5173"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$(dirname "$SCRIPT_DIR")/config"
SYSTEMD_DIR="$(dirname "$SCRIPT_DIR")/systemd"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Update system packages
update_system() {
    log_info "Updating system packages..."
    apt update && apt upgrade -y
    log_success "System packages updated"
}

# Install required packages
install_packages() {
    log_info "Installing required packages..."
    
    local packages=(
        "chromium-browser"          # Web browser for kiosk
        "unclutter"                 # Hide cursor when idle
        "onboard"                   # On-screen keyboard
        "xdotool"                   # X11 automation tool
        "x11-xserver-utils"         # X server utilities
        "lightdm"                   # Display manager
        "openbox"                   # Lightweight window manager
        "pulseaudio"                # Audio system
        "alsa-utils"                # Audio utilities
        "network-manager"           # Network management
        "openssh-server"            # SSH server for remote access
        "curl"                      # HTTP client
        "wget"                      # File downloader
        "git"                       # Version control
        "htop"                      # System monitor
        "nano"                      # Text editor
        "rsync"                     # File synchronization
    )
    
    apt install -y "${packages[@]}"
    log_success "Required packages installed"
}

# Create kiosk user
create_kiosk_user() {
    log_info "Creating kiosk user: $KIOSK_USER"
    
    if id "$KIOSK_USER" &>/dev/null; then
        log_warning "User $KIOSK_USER already exists"
    else
        # Create user with home directory
        useradd -m -s /bin/bash "$KIOSK_USER"
        
        # Add user to necessary groups
        usermod -a -G audio,video,input,plugdev "$KIOSK_USER"
        
        # Set password (optional - can be disabled for security)
        echo "$KIOSK_USER:kiosk123" | chpasswd
        
        log_success "Kiosk user created: $KIOSK_USER"
    fi
}

# Configure autologin
configure_autologin() {
    log_info "Configuring autologin for $KIOSK_USER"
    
    # Configure LightDM for autologin
    cat > /etc/lightdm/lightdm.conf << EOF
[Seat:*]
autologin-user=$KIOSK_USER
autologin-user-timeout=0
user-session=openbox
greeter-session=lightdm-gtk-greeter
EOF
    
    # Enable LightDM service
    systemctl enable lightdm
    
    log_success "Autologin configured"
}

# Configure Openbox window manager
configure_openbox() {
    log_info "Configuring Openbox for kiosk user"
    
    local openbox_dir="/home/$KIOSK_USER/.config/openbox"
    mkdir -p "$openbox_dir"
    
    # Openbox autostart script
    cat > "$openbox_dir/autostart" << EOF
#!/bin/bash

# Disable screen blanking and power management
xset s off
xset -dpms
xset s noblank

# Hide cursor after 1 second of inactivity
unclutter -idle 1 &

# Start on-screen keyboard (hidden by default)
onboard --startup-delay=3 &

# Wait for network connectivity
while ! ping -c 1 google.com &> /dev/null; do
    sleep 1
done

# Start Chromium in kiosk mode
chromium-browser \\
    --kiosk \\
    --no-first-run \\
    --disable-infobars \\
    --disable-session-crashed-bubble \\
    --disable-translate \\
    --disable-features=TranslateUI \\
    --disable-ipc-flooding-protection \\
    --disable-background-timer-throttling \\
    --disable-backgrounding-occluded-windows \\
    --disable-renderer-backgrounding \\
    --disable-field-trial-config \\
    --disable-back-forward-cache \\
    --disable-backgrounding-occluded-windows \\
    --disable-features=VizDisplayCompositor \\
    --start-maximized \\
    --window-position=0,0 \\
    --window-size=1920,1080 \\
    --user-data-dir=/home/$KIOSK_USER/.chromium-kiosk \\
    --app="$KIOSK_URL"
EOF
    
    chmod +x "$openbox_dir/autostart"
    chown -R "$KIOSK_USER:$KIOSK_USER" "/home/$KIOSK_USER/.config"
    
    log_success "Openbox configured"
}

# Configure system services
configure_services() {
    log_info "Configuring system services"
    
    # Copy systemd service files
    cp "$SYSTEMD_DIR"/*.service /etc/systemd/system/
    
    # Reload systemd
    systemctl daemon-reload
    
    # Enable kiosk services
    systemctl enable ur10-kiosk-watchdog.service
    systemctl enable ur10-kiosk-network-check.service
    
    log_success "System services configured"
}

# Configure network settings
configure_network() {
    log_info "Configuring network settings"
    
    # Enable NetworkManager
    systemctl enable NetworkManager
    
    # Configure static IP (optional)
    if [[ "${CONFIGURE_STATIC_IP:-false}" == "true" ]]; then
        cat > /etc/netplan/01-kiosk-static.yaml << EOF
network:
  version: 2
  renderer: NetworkManager
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - ${STATIC_IP:-192.168.1.100}/24
      gateway4: ${GATEWAY:-192.168.1.1}
      nameservers:
        addresses:
          - ${DNS1:-8.8.8.8}
          - ${DNS2:-8.8.4.4}
EOF
        netplan apply
        log_success "Static IP configured"
    fi
}

# Configure security settings
configure_security() {
    log_info "Configuring security settings"
    
    # Disable unnecessary services
    local services_to_disable=(
        "bluetooth"
        "cups"
        "avahi-daemon"
        "whoopsie"
        "apport"
    )
    
    for service in "${services_to_disable[@]}"; do
        if systemctl is-enabled "$service" &>/dev/null; then
            systemctl disable "$service"
            log_info "Disabled service: $service"
        fi
    done
    
    # Configure firewall
    ufw --force enable
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow 8000/tcp  # Robot server
    ufw allow 5173/tcp  # Development server
    
    # Disable root login via SSH
    sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
    sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
    
    # Configure automatic updates
    cat > /etc/apt/apt.conf.d/20auto-upgrades << EOF
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF
    
    log_success "Security settings configured"
}

# Configure display settings
configure_display() {
    log_info "Configuring display settings"
    
    # Create X11 configuration for kiosk display
    cat > /etc/X11/xorg.conf.d/99-kiosk.conf << EOF
Section "ServerLayout"
    Identifier "Kiosk Layout"
    Screen 0 "Kiosk Screen" 0 0
EndSection

Section "Screen"
    Identifier "Kiosk Screen"
    Monitor "Kiosk Monitor"
    DefaultDepth 24
    SubSection "Display"
        Depth 24
        Modes "1920x1080" "1680x1050" "1280x1024" "1024x768"
    EndSubSection
EndSection

Section "Monitor"
    Identifier "Kiosk Monitor"
    Option "DPMS" "false"
EndSection
EOF
    
    log_success "Display settings configured"
}

# Create maintenance scripts
create_maintenance_scripts() {
    log_info "Creating maintenance scripts"
    
    # Kiosk restart script
    cat > /usr/local/bin/restart-kiosk << 'EOF'
#!/bin/bash
# Restart the kiosk interface
systemctl restart lightdm
EOF
    chmod +x /usr/local/bin/restart-kiosk
    
    # Kiosk status script
    cat > /usr/local/bin/kiosk-status << 'EOF'
#!/bin/bash
# Check kiosk system status
echo "=== UR10 Kiosk System Status ==="
echo "Date: $(date)"
echo "Uptime: $(uptime -p)"
echo "Kiosk User: $(who | grep ur10kiosk || echo 'Not logged in')"
echo "Display Manager: $(systemctl is-active lightdm)"
echo "Network: $(ping -c 1 8.8.8.8 &>/dev/null && echo 'Connected' || echo 'Disconnected')"
echo "Disk Usage: $(df -h / | tail -1 | awk '{print $5}')"
echo "Memory Usage: $(free -h | grep Mem | awk '{print $3"/"$2}')"
echo "Load Average: $(uptime | awk -F'load average:' '{print $2}')"
EOF
    chmod +x /usr/local/bin/kiosk-status
    
    # Kiosk update script
    cat > /usr/local/bin/update-kiosk << 'EOF'
#!/bin/bash
# Update kiosk system
set -e
echo "Updating UR10 Kiosk system..."
apt update && apt upgrade -y
echo "Restarting kiosk interface..."
systemctl restart lightdm
echo "Update complete!"
EOF
    chmod +x /usr/local/bin/update-kiosk
    
    log_success "Maintenance scripts created"
}

# Configure log rotation
configure_logging() {
    log_info "Configuring log rotation"
    
    cat > /etc/logrotate.d/ur10-kiosk << EOF
/var/log/ur10-kiosk/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 $KIOSK_USER $KIOSK_USER
    postrotate
        systemctl reload-or-restart ur10-kiosk-watchdog || true
    endscript
}
EOF
    
    # Create log directory
    mkdir -p /var/log/ur10-kiosk
    chown "$KIOSK_USER:$KIOSK_USER" /var/log/ur10-kiosk
    
    log_success "Log rotation configured"
}

# Main installation function
main() {
    log_info "Starting UR10 Robot Kiosk setup..."
    
    check_root
    update_system
    install_packages
    create_kiosk_user
    configure_autologin
    configure_openbox
    configure_services
    configure_network
    configure_security
    configure_display
    create_maintenance_scripts
    configure_logging
    
    log_success "UR10 Robot Kiosk setup completed!"
    log_info "System will reboot in 10 seconds..."
    log_info "After reboot, the kiosk will automatically start"
    log_info "Use 'sudo kiosk-status' to check system status"
    log_info "Use 'sudo restart-kiosk' to restart the interface"
    
    sleep 10
    reboot
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi

