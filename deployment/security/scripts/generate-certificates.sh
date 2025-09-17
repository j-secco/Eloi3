#!/bin/bash

# ============================================================================
# UR10 Robot Kiosk - TLS Certificate Generation Script
# ============================================================================
# This script generates self-signed TLS certificates for the UR10 kiosk system
# including certificates for:
# - Robot server (FastAPI backend)
# - Kiosk UI (React frontend)
# - WebSocket connections
# - Local development
# ============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERT_DIR="$(dirname "$SCRIPT_DIR")/certificates"
CONFIG_DIR="$(dirname "$SCRIPT_DIR")/config"

# Certificate settings
COUNTRY="US"
STATE="California"
CITY="San Francisco"
ORGANIZATION="UR10 Robot Kiosk"
ORGANIZATIONAL_UNIT="Engineering"
COMMON_NAME="ur10-kiosk.local"
EMAIL="admin@ur10-kiosk.local"

# Certificate validity (in days)
VALIDITY_DAYS=3650  # 10 years

# Subject Alternative Names
SAN_DOMAINS=(
    "localhost"
    "ur10-kiosk.local"
    "ur10-robot.local"
    "127.0.0.1"
    "::1"
    "192.168.1.100"
    "10.0.0.100"
)

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

# Check if OpenSSL is installed
check_openssl() {
    if ! command -v openssl &> /dev/null; then
        log_error "OpenSSL is not installed. Please install it first:"
        log_error "  Ubuntu/Debian: sudo apt install openssl"
        log_error "  CentOS/RHEL: sudo yum install openssl"
        exit 1
    fi
    
    log_info "OpenSSL version: $(openssl version)"
}

# Create certificate directory
create_cert_directory() {
    log_info "Creating certificate directory: $CERT_DIR"
    mkdir -p "$CERT_DIR"
    chmod 755 "$CERT_DIR"
}

# Generate Subject Alternative Names string
generate_san_string() {
    local san_string=""
    local counter=1
    
    for domain in "${SAN_DOMAINS[@]}"; do
        if [[ $domain =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || [[ $domain == "::1" ]]; then
            # IP address
            san_string="${san_string}IP.${counter}:${domain},"
        else
            # Domain name
            san_string="${san_string}DNS.${counter}:${domain},"
        fi
        ((counter++))
    done
    
    # Remove trailing comma
    echo "${san_string%,}"
}

# Create OpenSSL configuration file
create_openssl_config() {
    local config_file="$CERT_DIR/openssl.conf"
    local san_string
    san_string=$(generate_san_string)
    
    log_info "Creating OpenSSL configuration file"
    
    cat > "$config_file" << EOF
[req]
default_bits = 4096
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=${COUNTRY}
ST=${STATE}
L=${CITY}
O=${ORGANIZATION}
OU=${ORGANIZATIONAL_UNIT}
CN=${COMMON_NAME}
emailAddress=${EMAIL}

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
$(echo "$san_string" | tr ',' '\n' | nl -nln | sed 's/^\s*//')

[v3_ca]
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer
basicConstraints = critical,CA:true
keyUsage = critical, digitalSignature, cRLSign, keyCertSign

[server_cert]
basicConstraints = CA:FALSE
nsCertType = server
nsComment = "UR10 Kiosk Server Certificate"
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid,issuer:always
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names
EOF
    
    log_success "OpenSSL configuration created: $config_file"
}

# Generate Certificate Authority (CA)
generate_ca() {
    local ca_key="$CERT_DIR/ca-key.pem"
    local ca_cert="$CERT_DIR/ca-cert.pem"
    local config_file="$CERT_DIR/openssl.conf"
    
    log_info "Generating Certificate Authority (CA)..."
    
    # Generate CA private key
    openssl genrsa -out "$ca_key" 4096
    chmod 600 "$ca_key"
    
    # Generate CA certificate
    openssl req -new -x509 -days "$VALIDITY_DAYS" -key "$ca_key" -out "$ca_cert" \
        -config "$config_file" -extensions v3_ca
    
    chmod 644 "$ca_cert"
    
    log_success "CA certificate generated: $ca_cert"
    log_success "CA private key generated: $ca_key"
}

# Generate server certificate
generate_server_cert() {
    local server_key="$CERT_DIR/server-key.pem"
    local server_csr="$CERT_DIR/server.csr"
    local server_cert="$CERT_DIR/server-cert.pem"
    local ca_key="$CERT_DIR/ca-key.pem"
    local ca_cert="$CERT_DIR/ca-cert.pem"
    local config_file="$CERT_DIR/openssl.conf"
    
    log_info "Generating server certificate..."
    
    # Generate server private key
    openssl genrsa -out "$server_key" 4096
    chmod 600 "$server_key"
    
    # Generate certificate signing request
    openssl req -new -key "$server_key" -out "$server_csr" \
        -config "$config_file"
    
    # Generate server certificate signed by CA
    openssl x509 -req -in "$server_csr" -CA "$ca_cert" -CAkey "$ca_key" \
        -CAcreateserial -out "$server_cert" -days "$VALIDITY_DAYS" \
        -extensions server_cert -extfile "$config_file"
    
    chmod 644 "$server_cert"
    
    # Clean up CSR
    rm -f "$server_csr"
    
    log_success "Server certificate generated: $server_cert"
    log_success "Server private key generated: $server_key"
}

# Generate client certificate (for mutual TLS if needed)
generate_client_cert() {
    local client_key="$CERT_DIR/client-key.pem"
    local client_csr="$CERT_DIR/client.csr"
    local client_cert="$CERT_DIR/client-cert.pem"
    local ca_key="$CERT_DIR/ca-key.pem"
    local ca_cert="$CERT_DIR/ca-cert.pem"
    local config_file="$CERT_DIR/openssl.conf"
    
    log_info "Generating client certificate..."
    
    # Generate client private key
    openssl genrsa -out "$client_key" 4096
    chmod 600 "$client_key"
    
    # Generate certificate signing request
    openssl req -new -key "$client_key" -out "$client_csr" \
        -config "$config_file"
    
    # Generate client certificate signed by CA
    openssl x509 -req -in "$client_csr" -CA "$ca_cert" -CAkey "$ca_key" \
        -CAcreateserial -out "$client_cert" -days "$VALIDITY_DAYS"
    
    chmod 644 "$client_cert"
    
    # Clean up CSR
    rm -f "$client_csr"
    
    log_success "Client certificate generated: $client_cert"
    log_success "Client private key generated: $client_key"
}

# Create certificate bundles
create_certificate_bundles() {
    local server_cert="$CERT_DIR/server-cert.pem"
    local ca_cert="$CERT_DIR/ca-cert.pem"
    local fullchain="$CERT_DIR/fullchain.pem"
    local bundle="$CERT_DIR/bundle.pem"
    
    log_info "Creating certificate bundles..."
    
    # Create full chain (server cert + CA cert)
    cat "$server_cert" "$ca_cert" > "$fullchain"
    chmod 644 "$fullchain"
    
    # Create bundle for some applications
    cp "$fullchain" "$bundle"
    
    log_success "Certificate bundles created"
}

# Generate DH parameters for enhanced security
generate_dhparam() {
    local dhparam_file="$CERT_DIR/dhparam.pem"
    
    log_info "Generating DH parameters (this may take a while)..."
    openssl dhparam -out "$dhparam_file" 2048
    chmod 644 "$dhparam_file"
    
    log_success "DH parameters generated: $dhparam_file"
}

# Create certificate information file
create_cert_info() {
    local info_file="$CERT_DIR/certificate-info.txt"
    local server_cert="$CERT_DIR/server-cert.pem"
    
    log_info "Creating certificate information file..."
    
    cat > "$info_file" << EOF
UR10 Robot Kiosk - Certificate Information
==========================================

Generated: $(date)
Validity: $VALIDITY_DAYS days
Common Name: $COMMON_NAME
Organization: $ORGANIZATION

Subject Alternative Names:
$(printf '%s\n' "${SAN_DOMAINS[@]}" | sed 's/^/  - /')

Certificate Files:
  - CA Certificate: ca-cert.pem
  - CA Private Key: ca-key.pem (keep secure!)
  - Server Certificate: server-cert.pem
  - Server Private Key: server-key.pem (keep secure!)
  - Client Certificate: client-cert.pem
  - Client Private Key: client-key.pem (keep secure!)
  - Full Chain: fullchain.pem
  - DH Parameters: dhparam.pem

Usage:
  - Use server-cert.pem and server-key.pem for HTTPS servers
  - Use fullchain.pem for applications requiring the full certificate chain
  - Install ca-cert.pem as a trusted root certificate on client systems
  - Use client certificates for mutual TLS authentication

Security Notes:
  - Keep private keys secure and never share them
  - Install the CA certificate on all client systems
  - Consider using a proper CA for production environments
  - Renew certificates before expiration

Certificate Details:
EOF
    
    # Add certificate details
    echo "" >> "$info_file"
    echo "Server Certificate Details:" >> "$info_file"
    openssl x509 -in "$server_cert" -text -noout | head -20 >> "$info_file"
    
    log_success "Certificate information saved: $info_file"
}

# Verify certificates
verify_certificates() {
    local ca_cert="$CERT_DIR/ca-cert.pem"
    local server_cert="$CERT_DIR/server-cert.pem"
    local client_cert="$CERT_DIR/client-cert.pem"
    
    log_info "Verifying certificates..."
    
    # Verify server certificate against CA
    if openssl verify -CAfile "$ca_cert" "$server_cert" > /dev/null 2>&1; then
        log_success "Server certificate verification: PASSED"
    else
        log_error "Server certificate verification: FAILED"
        return 1
    fi
    
    # Verify client certificate against CA
    if openssl verify -CAfile "$ca_cert" "$client_cert" > /dev/null 2>&1; then
        log_success "Client certificate verification: PASSED"
    else
        log_error "Client certificate verification: FAILED"
        return 1
    fi
    
    # Check certificate expiration
    local server_expiry
    server_expiry=$(openssl x509 -in "$server_cert" -noout -enddate | cut -d= -f2)
    log_info "Server certificate expires: $server_expiry"
    
    return 0
}

# Set proper file permissions
set_permissions() {
    log_info "Setting proper file permissions..."
    
    # Private keys should be readable only by owner
    chmod 600 "$CERT_DIR"/*-key.pem 2>/dev/null || true
    
    # Certificates can be world-readable
    chmod 644 "$CERT_DIR"/*.pem 2>/dev/null || true
    chmod 644 "$CERT_DIR"/*.txt 2>/dev/null || true
    chmod 644 "$CERT_DIR"/*.conf 2>/dev/null || true
    
    # Exclude private keys from world-readable
    chmod 600 "$CERT_DIR"/*-key.pem 2>/dev/null || true
    
    log_success "File permissions set"
}

# Create installation script
create_install_script() {
    local install_script="$CERT_DIR/install-certificates.sh"
    
    log_info "Creating certificate installation script..."
    
    cat > "$install_script" << 'EOF'
#!/bin/bash

# UR10 Robot Kiosk - Certificate Installation Script
# This script installs the generated certificates on the system

set -euo pipefail

CERT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CA_CERT="$CERT_DIR/ca-cert.pem"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Install CA certificate system-wide
install_ca_certificate() {
    log_info "Installing CA certificate system-wide..."
    
    if [[ -f /etc/debian_version ]]; then
        # Debian/Ubuntu
        sudo cp "$CA_CERT" /usr/local/share/ca-certificates/ur10-kiosk-ca.crt
        sudo update-ca-certificates
    elif [[ -f /etc/redhat-release ]]; then
        # CentOS/RHEL/Fedora
        sudo cp "$CA_CERT" /etc/pki/ca-trust/source/anchors/ur10-kiosk-ca.crt
        sudo update-ca-trust
    else
        log_info "Unknown distribution. Please manually install the CA certificate:"
        log_info "  CA Certificate: $CA_CERT"
        return 1
    fi
    
    log_success "CA certificate installed system-wide"
}

# Install certificates for robot server
install_robot_server_certs() {
    local server_dir="/etc/ur10-kiosk/certs"
    
    log_info "Installing certificates for robot server..."
    
    sudo mkdir -p "$server_dir"
    sudo cp "$CERT_DIR/server-cert.pem" "$server_dir/"
    sudo cp "$CERT_DIR/server-key.pem" "$server_dir/"
    sudo cp "$CERT_DIR/fullchain.pem" "$server_dir/"
    sudo cp "$CERT_DIR/ca-cert.pem" "$server_dir/"
    
    # Set proper ownership and permissions
    sudo chown -R root:root "$server_dir"
    sudo chmod 755 "$server_dir"
    sudo chmod 644 "$server_dir"/*.pem
    sudo chmod 600 "$server_dir/server-key.pem"
    
    log_success "Robot server certificates installed in $server_dir"
}

# Main installation function
main() {
    log_info "Installing UR10 Kiosk certificates..."
    
    install_ca_certificate
    install_robot_server_certs
    
    log_success "Certificate installation completed!"
    log_info "You may need to restart services to use the new certificates"
}

# Run main function
main "$@"
EOF
    
    chmod +x "$install_script"
    log_success "Certificate installation script created: $install_script"
}

# Main function
main() {
    log_info "Starting UR10 Robot Kiosk certificate generation..."
    
    check_openssl
    create_cert_directory
    create_openssl_config
    generate_ca
    generate_server_cert
    generate_client_cert
    create_certificate_bundles
    generate_dhparam
    create_cert_info
    verify_certificates
    set_permissions
    create_install_script
    
    log_success "Certificate generation completed successfully!"
    log_info ""
    log_info "Generated certificates in: $CERT_DIR"
    log_info "To install certificates system-wide, run:"
    log_info "  sudo $CERT_DIR/install-certificates.sh"
    log_info ""
    log_info "Certificate files:"
    log_info "  - CA Certificate: $CERT_DIR/ca-cert.pem"
    log_info "  - Server Certificate: $CERT_DIR/server-cert.pem"
    log_info "  - Server Private Key: $CERT_DIR/server-key.pem"
    log_info "  - Full Chain: $CERT_DIR/fullchain.pem"
    log_info ""
    log_info "Next steps:"
    log_info "  1. Install certificates: sudo $CERT_DIR/install-certificates.sh"
    log_info "  2. Configure your applications to use HTTPS"
    log_info "  3. Import CA certificate in browsers/clients"
    log_info "  4. Test HTTPS connectivity"
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi

