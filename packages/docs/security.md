# Security & TLS Guide

This guide provides an overview of the security features of the UR10 Robot Kiosk system and instructions for setting up TLS certificates.

## Security Features

- **HTTPS/WSS**: All communication is encrypted with TLS.
- **Authentication**: Token-based authentication for API access.
- **Authorization**: Role-based access control for different user levels.
- **CORS**: Cross-Origin Resource Sharing to prevent unauthorized access.
- **Security Headers**: HTTP security headers to protect against common attacks.
- **Container Security**: Non-root users, resource limits, and network isolation.

## TLS Certificate Setup

### Self-Signed Certificates (for development)

1. **Generate certificates**:
   ```bash
   cd deployment/security/scripts
   sudo ./generate-certificates.sh
   ```

2. **Configure services**:
   Update your `.env` file with the paths to the generated certificates.

### Let's Encrypt Certificates (for production)

1. **Configure Traefik**:
   Enable the Traefik service in your `docker-compose.prod.yml` file and set your email address in the `.env` file.

2. **Deploy with Traefik**:
   ```bash
   ./deployment/docker/scripts/deploy.sh -e production -p traefik up
   ```

   Traefik will automatically obtain and renew Let's Encrypt certificates for your domain.


