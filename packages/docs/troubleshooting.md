# Troubleshooting Guide

This guide provides solutions to common problems you may encounter when using the UR10 Robot Kiosk system.

## Common Issues

### Services Won't Start

- **Check logs**: `docker-compose logs -f`
- **Check system resources**: `docker system df`
- **Rebuild images**: `./deployment/docker/scripts/deploy.sh -b build`

### Database Connection Issues

- **Check PostgreSQL status**: `./deployment/docker/scripts/deploy.sh logs postgres`
- **Reset database**: `docker-compose down -v` and then `./deployment/docker/scripts/deploy.sh up`

### SSL/TLS Certificate Issues

- **Generate self-signed certificates**: `cd deployment/security/scripts && sudo ./generate-certificates.sh`
- **Check certificate validity**: `openssl x509 -in server.crt -text -noout`

### Performance Issues

- **Check resource usage**: `docker stats`
- **Scale services**: `docker-compose up -d --scale robot-server=2`
- **Enable monitoring**: `./deployment/docker/scripts/deploy.sh -p monitoring up`


