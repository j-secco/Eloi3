# Eloi3 - UR10 Robot Kiosk System

**A complete, production-ready kiosk system for controlling a UR10 robot in a shared workspace, featuring a touch-first progressive web app (PWA), real-time telemetry, chess gameplay, and comprehensive security designed specifically for Elo i3 touchscreen computers.**

This monorepo contains the entire UR10 Robot Kiosk system, including the robot server, kiosk UI, shared types, deployment configurations, automated installer, and comprehensive documentation. The system is designed for reliability, security, and ease of use in industrial and collaborative environments.

![Kiosk UI Screenshot](https://raw.githubusercontent.com/j-secco/Eloi3/main/docs/screenshots/kiosk-dashboard.png)

## Features

- **Touch-First Kiosk UI**: Responsive and intuitive interface for touch-based control on Elo i3 devices
- **Real-Time Telemetry**: Live updates on robot status, position, and system health
- **Robot Control**: Jogging, home, custom positions, and speed control
- **Chess Gameplay**: Play chess against the robot with physical piece movements
- **Comprehensive Security**: HTTPS/TLS, authentication, authorization, and more
- **Containerized Deployment**: Docker-based deployment for all environments
- **Multi-Environment Support**: Development, staging, and production configurations
- **Automated Installer**: Self-contained installer script for Elo i3 touchscreen computers
- **Monitoring & Logging**: Prometheus, Grafana, and ELK stack integration
- **Automated Testing**: Comprehensive E2E tests with Playwright
- **Extensive Documentation**: Complete setup, deployment, and usage guides

## Project Structure

```
/Eloi3
├── apps/
│   ├── kiosk-ui/         # React PWA for the kiosk interface
│   └── robot-server/     # FastAPI server for robot control
├── packages/
│   ├── types/            # Shared TypeScript types and API definitions
│   └── docs/             # Documentation and analysis
├── deployment/
│   ├── docker/           # Docker configuration and deployment scripts
│   ├── security/         # Security setup and certificate management
│   └── ubuntu-kiosk/     # Ubuntu kiosk setup and systemd services
├── tests/                # E2E tests with Playwright
├── docs/                 # Project documentation and assets
├── installer.sh          # Self-contained installer for Elo i3 touchscreen computers
├── docker-compose.yml    # Main Docker Compose configuration
├── .env.example          # Environment configuration template
└── README.md             # This file
```

## Getting Started

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- Git
- A UR10 robot (or run in mock mode)

### Installation

#### Option 1: Automated Installation (Elo i3 Touchscreen)

1. **Download and run the automated installer**:
   ```bash
   # Download the installer
   wget https://github.com/j-secco/Eloi3/raw/main/installer.sh
   
   # Make it executable
   chmod +x installer.sh
   
   # Run as root
   sudo ./installer.sh
   ```

#### Option 2: Docker Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/j-secco/Eloi3.git
   cd Eloi3
   ```

2. **Create environment file**:
   ```bash
   cp apps/robot-server/.env.example apps/robot-server/.env
   # Edit .env with your configuration
   ```

3. **Start the development environment**:
   ```bash
   ./deployment/docker/scripts/deploy.sh -e development up
   ```

4. **Access the application**:
   - **Kiosk UI**: [https://localhost](https://localhost)
   - **Robot Server API**: [http://localhost:8000](http://localhost:8000)
   - **API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

## Elo i3 Touchscreen Integration

This system is specifically designed and optimized for **Elo i3 touchscreen computers**:

- **Hardware Compatibility**: Full support for Elo i3 touch controllers and display calibration
- **Ubuntu Kiosk Mode**: Automated setup of Ubuntu in kiosk mode for dedicated operation
- **Touch Optimization**: UI components sized and positioned for touch interaction
- **Auto-startup**: System services configured to start the kiosk application on boot
- **Network Configuration**: Automated Wi-Fi and Ethernet setup for industrial environments

## System Requirements

### Minimum Requirements (Elo i3)
- **OS**: Ubuntu 20.04 LTS or later
- **RAM**: 4GB minimum (8GB recommended)
- **Storage**: 20GB free disk space
- **Network**: Ethernet or Wi-Fi connectivity
- **Touch**: Elo touchscreen (automatically detected)

### Development Requirements
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Node.js**: 18.0+ (for local development)
- **Python**: 3.8+ (for robot server development)

## Documentation

- **[Deployment Guide](./deployment/docker/README.md)**: Comprehensive guide for Docker deployment
- **[Security Guide](./deployment/security/README.md)**: Security setup and certificate management
- **[Ubuntu Kiosk Setup](./deployment/ubuntu-kiosk/README.md)**: Guide for setting up a dedicated Ubuntu kiosk
- **[Testing Guide](./tests/README.md)**: E2E testing framework and usage
- **[API Documentation](./packages/docs/api.md)**: Complete API reference
- **[Development Guide](./packages/docs/development.md)**: Development setup and guidelines

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

For support and questions:
- Create an issue in this repository
- Check the [troubleshooting guide](./packages/docs/troubleshooting.md)
- Review the [documentation](./packages/docs/)

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

**Eloi3** - Empowering collaborative robotics through intuitive touch interfaces.


