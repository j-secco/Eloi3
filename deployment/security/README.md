# UR10 Robot Kiosk - Security Configuration

This directory contains comprehensive security configurations for the UR10 Robot Kiosk system, including TLS certificates, HTTPS enforcement, CORS configuration, and security monitoring.

## Overview

The security configuration provides:

- **TLS/SSL Certificates**: Self-signed certificates for HTTPS communication
- **HTTPS Enforcement**: Automatic HTTP to HTTPS redirects
- **CORS Configuration**: Cross-Origin Resource Sharing with Private Network Access
- **Security Headers**: CSP, HSTS, X-Frame-Options, and other security headers
- **Rate Limiting**: Protection against abuse and DoS attacks
- **Intrusion Detection**: Fail2ban configuration for automated blocking
- **Security Monitoring**: Automated monitoring and alerting
- **Certificate Management**: Automatic certificate renewal

## Directory Structure

```
security/
├── scripts/                    # Security setup and management scripts
│   ├── setup-security.sh      # Main security setup script
│   ├── generate-certificates.sh # TLS certificate generation
│   └── install-certificates.sh # Certificate installation (auto-generated)
├── certificates/              # Generated TLS certificates (created by scripts)
│   ├── ca-cert.pem           # Certificate Authority certificate
│   ├── ca-key.pem            # CA private key
│   ├── server-cert.pem       # Server certificate
│   ├── server-key.pem        # Server private key
│   ├── fullchain.pem         # Full certificate chain
│   └── dhparam.pem           # DH parameters
├── config/                    # Security configuration files
│   └── security-headers.conf  # Security headers configuration
├── nginx/                     # Nginx configuration
│   └── ur10-kiosk.conf       # Main nginx configuration with security
└── README.md                  # This file
```

## Quick Setup

### Prerequisites

- Ubuntu 22.04 LTS with root/sudo access
- Network connectivity
- Nginx (will be installed by setup script)

### Installation

1. **Run the security setup script**:
   ```bash
   sudo ./scripts/setup-security.sh
   ```

2. **Verify the installation**:
   ```bash
   # Check nginx status
   sudo systemctl status nginx
   
   # Check firewall status
   sudo ufw status
   
   # Test HTTPS connectivity
   curl -k https://localhost/health
   ```

3. **Configure your applications** to use HTTPS and the generated certificates

## Manual Setup

If you prefer to set up security manually:

### 1. Generate TLS Certificates

```bash
sudo ./scripts/generate-certificates.sh
```

This creates self-signed certificates in the `certificates/` directory.

### 2. Install Certificates

```bash
sudo ./certificates/install-certificates.sh
```

This installs certificates system-wide and in `/etc/ur10-kiosk/certs/`.

### 3. Configure Nginx

```bash
# Install nginx
sudo apt install nginx

# Copy configuration
sudo cp nginx/ur10-kiosk.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/ur10-kiosk.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Configure Firewall

```bash
sudo ufw enable
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow ssh
```

### 5. Set Up Security Monitoring

```bash
# Install fail2ban
sudo apt install fail2ban

# Configure monitoring (done by setup script)
sudo ./scripts/setup-security.sh
```

## Configuration

### TLS Certificates

The system uses self-signed certificates by default. For production, consider:

- **Let's Encrypt**: Free certificates with automatic renewal
- **Commercial CA**: Certificates from a trusted Certificate Authority
- **Internal CA**: Your organization's internal Certificate Authority

#### Certificate Configuration

Edit `scripts/generate-certificates.sh` to customize:

```bash
# Certificate settings
COUNTRY="US"
STATE="California"
CITY="San Francisco"
ORGANIZATION="UR10 Robot Kiosk"
COMMON_NAME="ur10-kiosk.local"

# Subject Alternative Names
SAN_DOMAINS=(
    "localhost"
    "ur10-kiosk.local"
    "ur10-robot.local"
    "127.0.0.1"
    "192.168.1.100"
)
```

### CORS Configuration

CORS is configured in both nginx and the FastAPI application:

#### Nginx CORS (nginx/ur10-kiosk.conf)
```nginx
add_header Access-Control-Allow-Origin "https://localhost:5173" always;
add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With" always;
add_header Access-Control-Allow-Credentials true always;
add_header Access-Control-Allow-Private-Network true always;
```

#### FastAPI CORS (apps/robot-server/core/security.py)
```python
allowed_origins = [
    "https://localhost:5173",
    "https://127.0.0.1:5173",
    "https://ur10-kiosk.local:5173",
]
```

### Security Headers

Security headers are configured in `config/security-headers.conf`:

- **Content Security Policy (CSP)**: Prevents XSS attacks
- **HTTP Strict Transport Security (HSTS)**: Enforces HTTPS
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME sniffing
- **Referrer Policy**: Controls referrer information

### Rate Limiting

Rate limiting is configured at multiple levels:

#### Nginx Rate Limiting
```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=websocket:10m rate=5r/s;
```

#### FastAPI Rate Limiting
```python
rate_limiter = RateLimiter(
    requests_per_minute=60,
    burst_size=10
)
```

## Security Features

### HTTPS Enforcement

- All HTTP traffic is redirected to HTTPS
- Strong TLS configuration (TLS 1.2+)
- Perfect Forward Secrecy
- HSTS headers for browser enforcement

### Cross-Origin Resource Sharing (CORS)

- Configured for kiosk UI origins
- Private Network Access support for local network resources
- Credentials support for authenticated requests
- Preflight request handling

### Security Headers

- **Content Security Policy**: Restricts resource loading
- **X-Frame-Options**: Prevents embedding in frames
- **X-XSS-Protection**: Enables XSS filtering
- **X-Content-Type-Options**: Prevents MIME sniffing
- **Referrer Policy**: Controls referrer information

### Rate Limiting

- Per-IP rate limiting
- Burst protection
- Different limits for different endpoints
- Automatic blocking of abusive clients

### Intrusion Detection

- Fail2ban monitoring of nginx logs
- Automatic IP blocking for suspicious activity
- SSH brute force protection
- Customizable ban times and thresholds

### Security Monitoring

- Automated security checks every 6 hours
- Certificate expiration monitoring
- Failed login attempt tracking
- Nginx error monitoring
- Firewall status verification

## Management Commands

### Certificate Management

```bash
# Generate new certificates
sudo ./scripts/generate-certificates.sh

# Install certificates
sudo ./certificates/install-certificates.sh

# Check certificate expiration
sudo openssl x509 -in /etc/ur10-kiosk/certs/server-cert.pem -noout -enddate

# Renew certificates (automatic)
sudo /usr/local/bin/ur10-renew-certs
```

### Security Monitoring

```bash
# Run security check
sudo /usr/local/bin/ur10-security-monitor

# View security logs
sudo tail -f /var/log/ur10-kiosk/security-monitor.log

# Check fail2ban status
sudo fail2ban-client status

# Check banned IPs
sudo fail2ban-client status nginx-limit-req
```

### Firewall Management

```bash
# Check firewall status
sudo ufw status verbose

# Allow new port
sudo ufw allow 9000/tcp

# Remove rule
sudo ufw delete allow 9000/tcp

# Reset firewall
sudo ufw --force reset
```

### Nginx Management

```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx

# View access logs
sudo tail -f /var/log/nginx/ur10-kiosk-access.log

# View error logs
sudo tail -f /var/log/nginx/ur10-kiosk-error.log
```

## Troubleshooting

### Common Issues

#### Certificate Errors

**Problem**: Browser shows certificate warnings
**Solution**: 
1. Install the CA certificate in your browser
2. Add the CA certificate to system trust store
3. Use the correct hostname (ur10-kiosk.local)

```bash
# Install CA certificate system-wide
sudo cp /etc/ur10-kiosk/certs/ca-cert.pem /usr/local/share/ca-certificates/ur10-kiosk-ca.crt
sudo update-ca-certificates
```

#### CORS Errors

**Problem**: Browser blocks requests due to CORS
**Solution**:
1. Check that origins are correctly configured
2. Verify Private Network Access headers
3. Ensure preflight requests are handled

```bash
# Test CORS with curl
curl -H "Origin: https://localhost:5173" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://localhost/api/v1/robot/status
```

#### Rate Limiting Issues

**Problem**: Legitimate requests are being blocked
**Solution**:
1. Adjust rate limits in nginx configuration
2. Modify FastAPI rate limiter settings
3. Whitelist specific IPs if needed

```bash
# Check nginx rate limiting logs
sudo grep "limiting requests" /var/log/nginx/ur10-kiosk-error.log
```

#### Firewall Blocking Connections

**Problem**: Services are not accessible
**Solution**:
1. Check firewall rules
2. Ensure required ports are open
3. Verify service is listening on correct interface

```bash
# Check open ports
sudo netstat -tlnp

# Check firewall rules
sudo ufw status numbered
```

### Security Logs

Monitor these log files for security events:

- `/var/log/nginx/ur10-kiosk-access.log` - HTTP access logs
- `/var/log/nginx/ur10-kiosk-error.log` - HTTP error logs
- `/var/log/ur10-kiosk/security-monitor.log` - Security monitoring
- `/var/log/fail2ban.log` - Intrusion detection
- `/var/log/auth.log` - Authentication attempts

### Performance Impact

The security configuration has minimal performance impact:

- TLS overhead: ~1-2% CPU usage
- Rate limiting: Negligible
- Security headers: Minimal bandwidth increase
- Monitoring: Low resource usage

## Production Considerations

### Certificate Management

For production deployment:

1. **Use Let's Encrypt** for free, trusted certificates
2. **Set up automatic renewal** with certbot
3. **Monitor certificate expiration** proactively
4. **Use proper DNS names** instead of IP addresses

### Security Hardening

Additional security measures for production:

1. **Change default ports** for services
2. **Implement IP whitelisting** for admin access
3. **Set up VPN access** for remote management
4. **Enable audit logging** for compliance
5. **Regular security updates** and patches

### Monitoring and Alerting

Set up comprehensive monitoring:

1. **Log aggregation** (ELK stack, Splunk)
2. **Security incident response** procedures
3. **Automated alerting** for security events
4. **Regular security assessments**

### Backup and Recovery

Ensure security configuration is backed up:

1. **Certificate backups** in secure location
2. **Configuration backups** with version control
3. **Recovery procedures** documented and tested
4. **Disaster recovery plan** for security incidents

## Support

For security-related issues:

1. Check the troubleshooting section above
2. Review security logs for error messages
3. Verify configuration against this documentation
4. Test with minimal configuration to isolate issues

## Security Best Practices

1. **Keep certificates up to date** - Monitor expiration dates
2. **Regular security updates** - Apply OS and package updates
3. **Monitor security logs** - Review logs regularly for anomalies
4. **Principle of least privilege** - Limit access to minimum required
5. **Defense in depth** - Use multiple security layers
6. **Regular security assessments** - Periodic security reviews
7. **Incident response plan** - Prepare for security incidents
8. **Backup security configurations** - Ensure recoverability

