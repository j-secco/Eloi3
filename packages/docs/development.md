# Development Guide

This guide provides instructions for setting up a development environment, coding standards, and contribution guidelines for the UR10 Robot Kiosk project.

## Prerequisites

- Node.js 18+
- Python 3.11+
- Docker and Docker Compose
- Git

## Local Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/ur10-kiosk-pwa.git
   cd ur10-kiosk-pwa
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Set up Python virtual environment**:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r apps/robot-server/requirements.txt
   ```

4. **Start development servers**:
   ```bash
   pnpm run dev
   ```

   This will start the kiosk UI and robot server with hot reloading.

## Docker-based Development

For a more isolated development environment, use the Docker Compose setup:

1. **Build and start containers**:
   ```bash
   ./deployment/docker/scripts/deploy.sh -e development up
   ```

2. **Access services**:
   - Kiosk UI: [https://localhost](https://localhost)
   - Robot Server API: [http://localhost:8000](http://localhost:8000)

## Coding Standards

- **TypeScript/JavaScript**: Follow the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript).
- **Python**: Follow [PEP 8](https://www.python.org/dev/peps/pep-0008/) and use Black for code formatting.
- **Git**: Use conventional commits for commit messages.

## Contribution Guidelines

1. Create a new branch for your feature or bug fix.
2. Make your changes and ensure all tests pass.
3. Submit a pull request with a clear description of your changes.


