# UR10 Robot Kiosk - Documentation

This directory contains comprehensive documentation for the UR10 Robot Kiosk system, including architecture diagrams, API specifications, setup guides, and development best practices.

## Table of Contents

- [Architecture](#architecture)
- [API Documentation](#api-documentation)
- [Development Guide](./development.md)
- [Kiosk Setup Guide](./kiosk-setup.md)
- [Security & TLS Guide](./security.md)
- [Troubleshooting Guide](./troubleshooting.md)

## Architecture

The system is designed with a microservices architecture, separating the kiosk UI, robot server, and other components into independent services. This allows for scalability, maintainability, and independent development.

### System Diagram

![System Architecture Diagram](./diagrams/system-architecture.png)

### Component Overview

- **Kiosk UI**: A touch-first Progressive Web App (PWA) built with React and Vite, served by Nginx. It provides the user interface for robot control, chess gameplay, and system settings.
- **Robot Server**: A FastAPI application that wraps the original UR10_Workspace library, providing a modern RESTful API and WebSocket interface for real-time communication.
- **Database**: PostgreSQL for persistent data storage, including user sessions, game history, and system logs.
- **Cache**: Redis for caching, session management, and message queuing.
- **Monitoring**: Prometheus for metrics collection and Grafana for visualization.
- **Logging**: ELK stack (Elasticsearch, Logstash, Kibana) for centralized log management.

## API Documentation

The robot server exposes a comprehensive RESTful API and WebSocket interface for controlling the robot and managing the system.

- **[OpenAPI Specification](./openapi.yaml)**: Complete OpenAPI 3.0 specification for the REST API.
- **[API Guide](./api.md)**: Detailed guide to using the API, including authentication, rate limiting, and error handling.
- **[WebSocket Guide](./websocket.md)**: Documentation for the WebSocket interface, including message formats and real-time telemetry.

## Development

For information on setting up a development environment, coding standards, and contribution guidelines, please see the [Development Guide](./development.md).

## Deployment

For instructions on deploying the system using Docker, please see the [Deployment Guide](../../deployment/docker/README.md).

## Security

For details on security features, certificate management, and best practices, please see the [Security & TLS Guide](./security.md).


