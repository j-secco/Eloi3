# UR10 Robot Kiosk - Docker Deployment

This directory contains Docker configuration and deployment scripts for the UR10 Robot Kiosk system. The deployment supports multiple environments (development, staging, production) with comprehensive containerization, monitoring, and management capabilities.

## Overview

The Docker deployment provides:

- **Multi-Environment Support**: Development, staging, and production configurations
- **Microservices Architecture**: Separate containers for UI, API, database, and supporting services
- **Security**: HTTPS/TLS, security headers, network isolation
- **Monitoring**: Prometheus, Grafana, health checks, and logging
- **Scalability**: Load balancing, horizontal scaling, resource management
- **Backup & Recovery**: Automated backups and restore capabilities
- **Development Tools**: Hot reloading, debugging, database admin tools

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Kiosk UI      │    │  Robot Server   │    │   PostgreSQL    │
│   (React PWA)   │    │   (FastAPI)     │    │   (Database)    │
│   Port: 443     │    │   Port: 8000    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
         ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
         │     Redis       │    │   Prometheus    │    │    Grafana      │
         │   (Cache)       │    │  (Monitoring)   │    │ (Visualization) │
         │   Port: 6379    │    │   Port: 9090    │    │   Port: 3000    │
         └─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Quick Start

### Prerequisites

- Docker 20.10 or later
- Docker Compose 2.0 or later
- 4GB+ RAM available
- 10GB+ disk space

### Development Environment

1. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd ur10-kiosk-pwa
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Start development environment**:
   ```bash
   ./deployment/docker/scripts/deploy.sh -e development up
   ```

3. **Access services**:
   - Kiosk UI: https://localhost
   - Robot Server API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Production Environment

1. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with production settings
   ```

2. **Deploy production**:
   ```bash
   ./deployment/docker/scripts/deploy.sh -e production -p monitoring,backup up
   ```

3. **Verify deployment**:
   ```bash
   ./deployment/docker/scripts/deploy.sh status
   ```

## Configuration Files

### Docker Compose Files

- **`docker-compose.yml`**: Base configuration with core services
- **`docker-compose.dev.yml`**: Development overrides (hot reload, debugging)
- **`docker-compose.prod.yml`**: Production overrides (scaling, monitoring)

### Environment Configuration

- **`.env.example`**: Template for environment variables
- **`.env`**: Your customized environment configuration (create from template)

### Service Configurations

- **`nginx/nginx.conf`**: Nginx main configuration
- **`nginx/default.conf`**: Nginx server configuration with security headers
- **`robot-server/Dockerfile`**: FastAPI robot server container
- **`kiosk-ui/Dockerfile`**: React PWA container with Nginx

## Services

### Core Services

#### Kiosk UI (React PWA)
- **Container**: `ur10-kiosk-ui`
- **Ports**: 80 (HTTP), 443 (HTTPS)
- **Technology**: React, Vite, Nginx
- **Features**: PWA, touch-first UI, offline support

#### Robot Server (FastAPI)
- **Container**: `ur10-robot-server`
- **Port**: 8000
- **Technology**: Python, FastAPI, WebSockets
- **Features**: Robot control, chess engine, real-time telemetry

#### PostgreSQL Database
- **Container**: `ur10-postgres`
- **Port**: 5432
- **Features**: Persistent data storage, optimized for production

#### Redis Cache
- **Container**: `ur10-redis`
- **Port**: 6379
- **Features**: Session storage, caching, pub/sub

### Optional Services (Profiles)

#### Monitoring Stack
- **Prometheus**: Metrics collection (Port: 9090)
- **Grafana**: Visualization dashboard (Port: 3000)
- **Health Check**: Automated health monitoring

#### Logging Stack
- **Fluentd**: Log aggregation
- **Elasticsearch**: Log storage and indexing
- **Kibana**: Log visualization (Port: 5601)

#### Development Tools
- **pgAdmin**: PostgreSQL admin interface (Port: 5050)
- **Redis Commander**: Redis GUI (Port: 8081)
- **Test Runner**: Automated E2E testing

#### Production Services
- **Nginx Load Balancer**: Multiple robot server instances
- **Backup Service**: Automated database and data backups
- **Traefik**: Reverse proxy with automatic HTTPS

## Deployment Script

The `deploy.sh` script provides comprehensive deployment management:

### Basic Usage

```bash
./deployment/docker/scripts/deploy.sh [OPTIONS] [ACTION]
```

### Actions

- **`up`**: Start services (default)
- **`down`**: Stop services
- **`restart`**: Restart services
- **`build`**: Build images
- **`pull`**: Pull latest images
- **`logs`**: Show service logs
- **`status`**: Show service status
- **`clean`**: Clean up containers and volumes
- **`backup`**: Create backup
- **`restore`**: Restore from backup

### Options

- **`-e, --env ENV`**: Environment (development|staging|production)
- **`-p, --profiles`**: Comma-separated profiles to enable
- **`-s, --services`**: Comma-separated services to target
- **`-b, --build`**: Force rebuild of images
- **`-P, --pull`**: Pull latest images before starting
- **`-r, --recreate`**: Recreate containers
- **`-f, --force`**: Force action without confirmation
- **`-v, --verbose`**: Verbose output

### Examples

```bash
# Start development environment
./deploy.sh

# Start production with monitoring and backup
./deploy.sh -e production -p monitoring,backup up

# Restart specific services
./deploy.sh -s robot-server,kiosk-ui restart

# Build all images
./deploy.sh -b build

# Show robot server logs
./deploy.sh logs robot-server

# Clean up everything
./deploy.sh clean
```

## Environment Variables

### Core Configuration

```bash
# Build Information
BUILD_DATE=2024-01-01T00:00:00Z
VERSION=1.0.0
VCS_REF=main

# Network Configuration
KIOSK_HTTP_PORT=80
KIOSK_HTTPS_PORT=443
ROBOT_SERVER_PORT=8000

# Robot Configuration
ROBOT_IP=192.168.1.100
ROBOT_PORT=30002
MOCK_MODE=false

# Security
SECRET_KEY=your-very-secure-secret-key
CORS_ORIGINS=https://localhost,https://your-domain.com

# Database
POSTGRES_DB=ur10_kiosk
POSTGRES_USER=ur10_user
POSTGRES_PASSWORD=secure_password

# Redis
REDIS_PASSWORD=secure_redis_password
```

### Development Settings

```bash
# Development ports (exposed to host)
DEV_ROBOT_SERVER_PORT=8000
DEV_KIOSK_UI_PORT=5173
DEV_POSTGRES_PORT=5432
DEV_REDIS_PORT=6379
```

### Production Settings

```bash
# Monitoring
GRAFANA_PASSWORD=secure_grafana_password
PROMETHEUS_RETENTION=200h

# Backup
BACKUP_SCHEDULE=0 2 * * *
BACKUP_PATH=/opt/ur10-backups

# Health Checks
HEALTH_CHECK_INTERVAL=60
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# SSL/TLS
ACME_EMAIL=admin@your-domain.com
```

## Profiles

Profiles allow you to enable optional services based on your needs:

### Available Profiles

- **`production`**: PostgreSQL, optimized settings
- **`monitoring`**: Prometheus, Grafana
- **`logging`**: ELK stack (Elasticsearch, Logstash, Kibana)
- **`backup`**: Automated backup service
- **`traefik`**: Traefik reverse proxy
- **`dev-tools`**: pgAdmin, Redis Commander
- **`testing`**: Test runner container

### Using Profiles

```bash
# Enable monitoring
./deploy.sh -p monitoring up

# Enable multiple profiles
./deploy.sh -p monitoring,backup,logging up

# Production with all optional services
./deploy.sh -e production -p monitoring,backup,logging,traefik up
```

## Networking

### Network Architecture

- **`ur10-network`**: Bridge network (172.20.0.0/16)
- **Service Discovery**: Automatic DNS resolution between containers
- **Port Mapping**: Selective port exposure to host
- **Security**: Network isolation and firewall rules

### Port Mapping

| Service | Internal Port | External Port | Protocol |
|---------|---------------|---------------|----------|
| Kiosk UI | 80/443 | 80/443 | HTTP/HTTPS |
| Robot Server | 8000 | 8000* | HTTP |
| PostgreSQL | 5432 | 5432* | TCP |
| Redis | 6379 | 6379* | TCP |
| Prometheus | 9090 | 9090 | HTTP |
| Grafana | 3000 | 3000 | HTTP |
| pgAdmin | 80 | 5050* | HTTP |

*Only exposed in development environment

## Security

### Container Security

- **Non-root users**: All services run as non-root users
- **Read-only filesystems**: Where applicable
- **Resource limits**: CPU and memory constraints
- **Health checks**: Automated health monitoring
- **Security scanning**: Regular vulnerability scans

### Network Security

- **TLS/HTTPS**: End-to-end encryption
- **Security headers**: HSTS, CSP, X-Frame-Options
- **CORS configuration**: Restricted cross-origin requests
- **Rate limiting**: API request throttling
- **Network isolation**: Container network segmentation

### Data Security

- **Encrypted volumes**: Database and sensitive data encryption
- **Secret management**: Environment-based secrets
- **Backup encryption**: Encrypted backup storage
- **Access controls**: Role-based access control

## Monitoring and Logging

### Metrics Collection

- **Prometheus**: System and application metrics
- **Grafana**: Visualization dashboards
- **Health checks**: Service availability monitoring
- **Alerting**: Slack/email notifications

### Log Management

- **Fluentd**: Log aggregation and forwarding
- **Elasticsearch**: Log storage and indexing
- **Kibana**: Log search and visualization
- **Log rotation**: Automatic log cleanup

### Available Dashboards

- **System Overview**: CPU, memory, disk usage
- **Application Metrics**: API response times, error rates
- **Robot Telemetry**: Position, status, movements
- **Chess Game Analytics**: Game statistics, performance

## Backup and Recovery

### Automated Backups

- **Schedule**: Configurable cron schedule (default: daily at 2 AM)
- **Components**: PostgreSQL, Redis, application data
- **Storage**: Local or remote storage options
- **Retention**: Configurable retention policies

### Backup Types

- **Database Backup**: PostgreSQL dump
- **Redis Backup**: RDB snapshot
- **Application Data**: Volume snapshots
- **Configuration**: Environment and config files

### Recovery Process

```bash
# Create backup
./deploy.sh backup

# Restore from backup
./deploy.sh restore

# Manual database restore
docker-compose exec postgres psql -U ur10_user -d ur10_kiosk < backup.sql
```

## Scaling

### Horizontal Scaling

```yaml
# Scale robot server
docker-compose up -d --scale robot-server=3

# Load balancer configuration
nginx-lb:
  image: nginx:alpine
  volumes:
    - ./nginx-lb.conf:/etc/nginx/nginx.conf
```

### Resource Management

```yaml
# Resource limits
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 1G
    reservations:
      cpus: '0.5'
      memory: 512M
```

## Development Workflow

### Hot Reloading

Development environment supports hot reloading:

```bash
# Start development with hot reload
./deploy.sh -e development up

# Changes to source code automatically reload services
```

### Debugging

```bash
# View logs
./deploy.sh logs robot-server

# Access container shell
docker-compose exec robot-server bash

# Debug with IDE
# Expose debug ports in docker-compose.dev.yml
```

### Testing

```bash
# Run E2E tests
./deploy.sh -p testing up
docker-compose exec test-runner ./run-tests.sh

# Run specific test suite
docker-compose exec test-runner ./run-tests.sh --suite smoke
```

## Troubleshooting

### Common Issues

#### Services Won't Start

```bash
# Check logs
./deploy.sh logs

# Check system resources
docker system df
docker system prune

# Rebuild images
./deploy.sh -b build
```

#### Database Connection Issues

```bash
# Check PostgreSQL status
./deploy.sh logs postgres

# Reset database
docker-compose down -v
./deploy.sh up
```

#### SSL/TLS Certificate Issues

```bash
# Generate self-signed certificates
cd deployment/security/scripts
sudo ./generate-certificates.sh

# Check certificate validity
openssl x509 -in server.crt -text -noout
```

#### Performance Issues

```bash
# Check resource usage
docker stats

# Scale services
docker-compose up -d --scale robot-server=2

# Enable monitoring
./deploy.sh -p monitoring up
```

### Health Checks

```bash
# Check service health
curl -f http://localhost/health
curl -f http://localhost:8000/health

# View health check logs
docker inspect ur10-kiosk-ui | jq '.[0].State.Health'
```

### Log Analysis

```bash
# View aggregated logs
./deploy.sh logs

# Filter logs by service
./deploy.sh logs robot-server

# Follow logs in real-time
./deploy.sh logs -f
```

## Production Deployment

### Pre-deployment Checklist

- [ ] Environment variables configured
- [ ] SSL certificates generated/obtained
- [ ] Database credentials secured
- [ ] Backup storage configured
- [ ] Monitoring alerts configured
- [ ] Firewall rules configured
- [ ] DNS records configured

### Deployment Steps

1. **Prepare environment**:
   ```bash
   cp .env.example .env
   # Edit .env with production settings
   ```

2. **Generate certificates**:
   ```bash
   cd deployment/security/scripts
   sudo ./generate-certificates.sh
   ```

3. **Deploy services**:
   ```bash
   ./deploy.sh -e production -p monitoring,backup up
   ```

4. **Verify deployment**:
   ```bash
   ./deploy.sh status
   curl -f https://your-domain.com/health
   ```

5. **Configure monitoring**:
   - Access Grafana at https://your-domain.com:3000
   - Import dashboards from `deployment/docker/grafana/dashboards/`
   - Configure alert notifications

### Maintenance

```bash
# Update images
./deploy.sh pull
./deploy.sh -r up

# Create backup
./deploy.sh backup

# View system status
./deploy.sh status
docker system df
```

## Support

### Getting Help

1. **Check logs**: `./deploy.sh logs`
2. **Review documentation**: This README and inline comments
3. **Check health status**: `./deploy.sh status`
4. **Verify configuration**: Review `.env` and compose files

### Contributing

1. **Follow conventions**: Use existing patterns and naming
2. **Test changes**: Verify in development environment
3. **Update documentation**: Keep README and comments current
4. **Security review**: Consider security implications

### Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Production Deployment Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Container Security](https://docs.docker.com/engine/security/)

## Changelog

### Version 1.0.0
- Initial Docker deployment configuration
- Multi-environment support (dev/staging/prod)
- Comprehensive service stack
- Monitoring and logging integration
- Automated deployment scripts
- Security hardening
- Backup and recovery capabilities

