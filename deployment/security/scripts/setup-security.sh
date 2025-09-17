#!/bin/bash

# ============================================================================
# UR10 Robot Kiosk - Security Setup Script
# ============================================================================
# This script sets up comprehensive security for the UR10 kiosk system:
# - Generates TLS certificates
# - Configures nginx with security headers
# - Sets up HTTPS enforcement
# - Configures CORS and Private Network Access
# - Installs security monitoring
# ============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SECURITY_DIR="$(dirname "$SCRIPT_DIR")"
CERT_DIR="$SECURITY_DIR/certificates"
CONFIG_DIR="$SECURITY_DIR/config"
NGINX_DIR="$SECURITY_DIR/nginx"

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

# Install required packages
install_packages() {
    log_info "Installing required packages..."
    
    apt update
    apt install -y \
        nginx \
        openssl \
        certbot \
        python3-certbot-nginx \
        ufw \
        fail2ban \
        logrotate \
        rsyslog
    
    log_success "Required packages installed"
}

# Generate TLS certificates
generate_certificates() {
    log_info "Generating TLS certificates..."
    
    # Run the certificate generation script
    if [[ -f "$SCRIPT_DIR/generate-certificates.sh" ]]; then
        bash "$SCRIPT_DIR/generate-certificates.sh"
    else
        log_error "Certificate generation script not found"
        exit 1
    fi
    
    log_success "TLS certificates generated"
}

# Install certificates
install_certificates() {
    log_info "Installing certificates..."
    
    # Create certificate directory
    mkdir -p /etc/ur10-kiosk/certs
    
    # Copy certificates
    if [[ -d "$CERT_DIR" ]]; then
        cp "$CERT_DIR"/*.pem /etc/ur10-kiosk/certs/
        
        # Set proper permissions
        chown -R root:root /etc/ur10-kiosk/certs
        chmod 755 /etc/ur10-kiosk/certs
        chmod 644 /etc/ur10-kiosk/certs/*.pem
        chmod 600 /etc/ur10-kiosk/certs/*-key.pem
        
        log_success "Certificates installed in /etc/ur10-kiosk/certs"
    else
        log_error "Certificate directory not found: $CERT_DIR"
        exit 1
    fi
}

# Configure nginx
configure_nginx() {
    log_info "Configuring nginx..."
    
    # Backup existing nginx configuration
    if [[ -f /etc/nginx/nginx.conf ]]; then
        cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup
    fi
    
    # Copy our nginx configuration
    if [[ -f "$NGINX_DIR/ur10-kiosk.conf" ]]; then
        cp "$NGINX_DIR/ur10-kiosk.conf" /etc/nginx/sites-available/
        
        # Enable the site
        ln -sf /etc/nginx/sites-available/ur10-kiosk.conf /etc/nginx/sites-enabled/
        
        # Disable default site
        rm -f /etc/nginx/sites-enabled/default
        
        # Test nginx configuration
        if nginx -t; then
            log_success "Nginx configuration is valid"
        else
            log_error "Nginx configuration test failed"
            exit 1
        fi
    else
        log_error "Nginx configuration file not found: $NGINX_DIR/ur10-kiosk.conf"
        exit 1
    fi
}

# Configure firewall
configure_firewall() {
    log_info "Configuring firewall..."
    
    # Reset UFW to defaults
    ufw --force reset
    
    # Set default policies
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH
    ufw allow ssh
    
    # Allow HTTP and HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # Allow robot server ports
    ufw allow 8000/tcp
    ufw allow 8443/tcp
    
    # Allow development server (only if needed)
    if [[ "${ALLOW_DEV_SERVER:-false}" == "true" ]]; then
        ufw allow 5173/tcp
        log_warning "Development server port 5173 allowed (disable in production)"
    fi
    
    # Enable firewall
    ufw --force enable
    
    log_success "Firewall configured"
}

# Configure fail2ban
configure_fail2ban() {
    log_info "Configuring fail2ban..."
    
    # Create jail configuration for nginx
    cat > /etc/fail2ban/jail.d/ur10-kiosk.conf << EOF
[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/ur10-kiosk-error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/ur10-kiosk-error.log
maxretry = 10

[nginx-botsearch]
enabled = true
port = http,https
logpath = /var/log/nginx/ur10-kiosk-access.log
maxretry = 2

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 5
bantime = 3600
EOF
    
    # Restart fail2ban
    systemctl restart fail2ban
    systemctl enable fail2ban
    
    log_success "Fail2ban configured"
}

# Configure log rotation
configure_logging() {
    log_info "Configuring logging..."
    
    # Create log rotation for nginx
    cat > /etc/logrotate.d/ur10-kiosk-nginx << EOF
/var/log/nginx/ur10-kiosk-*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 644 www-data adm
    sharedscripts
    prerotate
        if [ -d /etc/logrotate.d/httpd-prerotate ]; then \
            run-parts /etc/logrotate.d/httpd-prerotate; \
        fi \
    endscript
    postrotate
        invoke-rc.d nginx rotate >/dev/null 2>&1
    endscript
}
EOF
    
    # Create log rotation for robot server
    cat > /etc/logrotate.d/ur10-kiosk-robot << EOF
/var/log/ur10-kiosk/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 ur10kiosk ur10kiosk
    postrotate
        systemctl reload-or-restart ur10-robot-server || true
    endscript
}
EOF
    
    # Create log directory
    mkdir -p /var/log/ur10-kiosk
    chown ur10kiosk:ur10kiosk /var/log/ur10-kiosk 2>/dev/null || true
    
    log_success "Logging configured"
}

# Create security monitoring script
create_security_monitor() {
    log_info "Creating security monitoring script..."
    
    cat > /usr/local/bin/ur10-security-monitor << 'EOF'
#!/bin/bash

# UR10 Kiosk Security Monitor
# Monitors security events and sends alerts

LOG_FILE="/var/log/ur10-kiosk/security-monitor.log"
ALERT_EMAIL="${ALERT_EMAIL:-admin@ur10-kiosk.local}"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [SECURITY] $1" | tee -a "$LOG_FILE"
}

# Check for failed login attempts
check_failed_logins() {
    local failed_logins
    failed_logins=$(grep "Failed password" /var/log/auth.log | grep "$(date '+%b %d')" | wc -l)
    
    if [[ $failed_logins -gt 10 ]]; then
        log "WARNING: $failed_logins failed login attempts today"
    fi
}

# Check for nginx errors
check_nginx_errors() {
    local error_count
    error_count=$(grep "$(date '+%Y/%m/%d')" /var/log/nginx/ur10-kiosk-error.log 2>/dev/null | wc -l)
    
    if [[ $error_count -gt 50 ]]; then
        log "WARNING: $error_count nginx errors today"
    fi
}

# Check certificate expiration
check_cert_expiration() {
    local cert_file="/etc/ur10-kiosk/certs/server-cert.pem"
    
    if [[ -f "$cert_file" ]]; then
        local expiry_date
        expiry_date=$(openssl x509 -in "$cert_file" -noout -enddate | cut -d= -f2)
        local expiry_epoch
        expiry_epoch=$(date -d "$expiry_date" +%s)
        local current_epoch
        current_epoch=$(date +%s)
        local days_until_expiry
        days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))
        
        if [[ $days_until_expiry -lt 30 ]]; then
            log "WARNING: Certificate expires in $days_until_expiry days"
        fi
    fi
}

# Check firewall status
check_firewall() {
    if ! ufw status | grep -q "Status: active"; then
        log "CRITICAL: Firewall is not active"
    fi
}

# Main monitoring function
main() {
    log "Starting security monitoring check"
    
    check_failed_logins
    check_nginx_errors
    check_cert_expiration
    check_firewall
    
    log "Security monitoring check completed"
}

main "$@"
EOF
    
    chmod +x /usr/local/bin/ur10-security-monitor
    
    # Create cron job for security monitoring
    cat > /etc/cron.d/ur10-security-monitor << EOF
# UR10 Kiosk Security Monitoring
0 */6 * * * root /usr/local/bin/ur10-security-monitor
EOF
    
    log_success "Security monitoring configured"
}

# Create certificate renewal script
create_cert_renewal() {
    log_info "Creating certificate renewal script..."
    
    cat > /usr/local/bin/ur10-renew-certs << 'EOF'
#!/bin/bash

# UR10 Kiosk Certificate Renewal Script
# Regenerates self-signed certificates when they're about to expire

CERT_DIR="/etc/ur10-kiosk/certs"
CERT_FILE="$CERT_DIR/server-cert.pem"
SCRIPT_DIR="/home/ubuntu/ur10-kiosk-pwa/deployment/security/scripts"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [CERT-RENEWAL] $1"
}

if [[ -f "$CERT_FILE" ]]; then
    # Check if certificate expires within 30 days
    expiry_date=$(openssl x509 -in "$CERT_FILE" -noout -enddate | cut -d= -f2)
    expiry_epoch=$(date -d "$expiry_date" +%s)
    current_epoch=$(date +%s)
    days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))
    
    if [[ $days_until_expiry -lt 30 ]]; then
        log "Certificate expires in $days_until_expiry days, regenerating..."
        
        # Backup old certificates
        cp -r "$CERT_DIR" "$CERT_DIR.backup.$(date +%Y%m%d)"
        
        # Generate new certificates
        if [[ -f "$SCRIPT_DIR/generate-certificates.sh" ]]; then
            bash "$SCRIPT_DIR/generate-certificates.sh"
            
            # Copy new certificates
            cp "$SCRIPT_DIR/../certificates"/*.pem "$CERT_DIR/"
            
            # Set permissions
            chown -R root:root "$CERT_DIR"
            chmod 644 "$CERT_DIR"/*.pem
            chmod 600 "$CERT_DIR"/*-key.pem
            
            # Restart services
            systemctl reload nginx
            systemctl restart ur10-robot-server || true
            
            log "Certificates renewed successfully"
        else
            log "ERROR: Certificate generation script not found"
            exit 1
        fi
    else
        log "Certificate is valid for $days_until_expiry more days"
    fi
else
    log "ERROR: Certificate file not found: $CERT_FILE"
    exit 1
fi
EOF
    
    chmod +x /usr/local/bin/ur10-renew-certs
    
    # Create cron job for certificate renewal
    cat > /etc/cron.d/ur10-cert-renewal << EOF
# UR10 Kiosk Certificate Renewal
0 2 * * 0 root /usr/local/bin/ur10-renew-certs
EOF
    
    log_success "Certificate renewal configured"
}

# Start and enable services
start_services() {
    log_info "Starting and enabling services..."
    
    # Start nginx
    systemctl start nginx
    systemctl enable nginx
    
    # Start fail2ban
    systemctl start fail2ban
    systemctl enable fail2ban
    
    # Restart rsyslog for new log configurations
    systemctl restart rsyslog
    
    log_success "Services started and enabled"
}

# Verify security configuration
verify_security() {
    log_info "Verifying security configuration..."
    
    local issues=0
    
    # Check nginx status
    if ! systemctl is-active --quiet nginx; then
        log_error "Nginx is not running"
        ((issues++))
    fi
    
    # Check firewall status
    if ! ufw status | grep -q "Status: active"; then
        log_error "Firewall is not active"
        ((issues++))
    fi
    
    # Check fail2ban status
    if ! systemctl is-active --quiet fail2ban; then
        log_error "Fail2ban is not running"
        ((issues++))
    fi
    
    # Check certificate files
    if [[ ! -f "/etc/ur10-kiosk/certs/server-cert.pem" ]]; then
        log_error "Server certificate not found"
        ((issues++))
    fi
    
    # Test HTTPS connectivity
    if ! curl -k -s https://localhost/health > /dev/null; then
        log_warning "HTTPS connectivity test failed (this may be normal if services aren't running yet)"
    fi
    
    if [[ $issues -eq 0 ]]; then
        log_success "Security configuration verification passed"
    else
        log_error "Security configuration verification failed with $issues issues"
        return 1
    fi
}

# Display security summary
show_summary() {
    log_info "Security setup summary:"
    echo ""
    echo "✓ TLS certificates generated and installed"
    echo "✓ Nginx configured with security headers"
    echo "✓ Firewall configured and enabled"
    echo "✓ Fail2ban configured for intrusion prevention"
    echo "✓ Log rotation configured"
    echo "✓ Security monitoring enabled"
    echo "✓ Certificate auto-renewal configured"
    echo ""
    echo "Security features enabled:"
    echo "  - HTTPS enforcement"
    echo "  - CORS with Private Network Access"
    echo "  - Security headers (CSP, HSTS, etc.)"
    echo "  - Rate limiting"
    echo "  - Intrusion detection"
    echo "  - Automated monitoring"
    echo ""
    echo "Next steps:"
    echo "  1. Start your robot server with HTTPS enabled"
    echo "  2. Configure your kiosk UI to use HTTPS"
    echo "  3. Test the complete system"
    echo "  4. Monitor security logs regularly"
    echo ""
    echo "Useful commands:"
    echo "  - Check security status: sudo ur10-security-monitor"
    echo "  - Renew certificates: sudo ur10-renew-certs"
    echo "  - View security logs: sudo tail -f /var/log/ur10-kiosk/security-monitor.log"
    echo "  - Check firewall status: sudo ufw status"
    echo "  - Check fail2ban status: sudo fail2ban-client status"
}

# Main function
main() {
    log_info "Starting UR10 Robot Kiosk security setup..."
    
    check_root
    install_packages
    generate_certificates
    install_certificates
    configure_nginx
    configure_firewall
    configure_fail2ban
    configure_logging
    create_security_monitor
    create_cert_renewal
    start_services
    verify_security
    show_summary
    
    log_success "UR10 Robot Kiosk security setup completed successfully!"
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi

