# UR10 Robot Kiosk - Ubuntu Deployment

This directory contains all the necessary files and scripts to deploy the UR10 Robot Kiosk on Ubuntu 22.04 LTS in a dedicated kiosk mode.

## Overview

The Ubuntu kiosk deployment provides:

- **Dedicated Kiosk User**: Isolated user environment for security
- **Automatic Login**: Seamless startup without user interaction
- **Chromium Kiosk Mode**: Full-screen browser interface
- **System Monitoring**: Watchdog services for reliability
- **Network Management**: Automatic connectivity recovery
- **Security Hardening**: Firewall, SSH configuration, and access controls
- **Maintenance Tools**: Scripts for system management and troubleshooting

## Directory Structure

```
ubuntu-kiosk/
├── scripts/                    # Installation and maintenance scripts
│   ├── setup-kiosk.sh         # Main installation script
│   ├── ur10-kiosk-watchdog.sh # System monitoring watchdog
│   └── ur10-kiosk-network-check.sh # Network connectivity check
├── systemd/                   # SystemD service files
│   ├── ur10-kiosk-watchdog.service
│   └── ur10-kiosk-network-check.service
├── config/                    # Configuration files
│   └── kiosk.conf            # Main kiosk configuration
├── docs/                      # Documentation
│   └── INSTALLATION.md       # Detailed installation guide
└── README.md                  # This file
```

## Quick Start

### Prerequisites

- Ubuntu 22.04 LTS (fresh installation recommended)
- Root/sudo access
- Network connectivity
- Minimum 4GB RAM, 32GB storage
- Display connected (touchscreen recommended)

### Installation

1. **Download the deployment files** to your Ubuntu system
2. **Run the setup script** as root:
   ```bash
   sudo ./scripts/setup-kiosk.sh
   ```
3. **Wait for automatic reboot** - the system will restart and launch in kiosk mode
4. **Verify operation** - the UR10 Robot interface should load automatically

### Post-Installation

After installation, the system will:
- Automatically login as the `ur10kiosk` user
- Start Chromium in full-screen kiosk mode
- Load the UR10 Robot interface at `https://localhost:5173`
- Monitor system health and network connectivity
- Automatically recover from common failures

## Configuration

### Kiosk URL

To change the URL that loads in kiosk mode, edit:
```bash
sudo nano /home/ur10kiosk/.config/openbox/autostart
```

Modify the `--app` parameter in the Chromium command.

### Network Settings

For static IP configuration, edit the setup script variables:
```bash
CONFIGURE_STATIC_IP="true"
STATIC_IP="192.168.1.100"
GATEWAY="192.168.1.1"
DNS1="8.8.8.8"
DNS2="8.8.4.4"
```

### Display Settings

Display resolution and settings can be configured in:
```bash
/etc/X11/xorg.conf.d/99-kiosk.conf
```

## Management Commands

### System Status
```bash
sudo kiosk-status
```

### Restart Kiosk Interface
```bash
sudo restart-kiosk
```

### Update System
```bash
sudo update-kiosk
```

### Check Service Status
```bash
sudo systemctl status ur10-kiosk-watchdog
sudo systemctl status ur10-kiosk-network-check
```

### View Logs
```bash
sudo journalctl -u ur10-kiosk-watchdog -f
sudo tail -f /var/log/ur10-kiosk/watchdog.log
sudo tail -f /var/log/ur10-kiosk/network.log
```

## Features

### Automatic Recovery

The system includes several automatic recovery mechanisms:

- **Browser Monitoring**: Restarts Chromium if it crashes or becomes unresponsive
- **Network Recovery**: Automatically restores network connectivity
- **Resource Monitoring**: Monitors CPU, memory, and disk usage
- **Display Manager Recovery**: Restarts the entire display system if needed

### Security Features

- Dedicated kiosk user with limited privileges
- Firewall configuration with minimal open ports
- SSH access control and root login disabled
- Automatic security updates
- System hardening and service minimization

### Maintenance Features

- Automatic log rotation
- System health monitoring
- Scheduled maintenance tasks
- Remote SSH access for troubleshooting
- Backup and restore capabilities

## Troubleshooting

### Common Issues

#### Kiosk Not Starting
1. Check LightDM status: `sudo systemctl status lightdm`
2. Check user session: `who`
3. Restart display manager: `sudo systemctl restart lightdm`

#### Network Issues
1. Test connectivity: `ping -c 3 8.8.8.8`
2. Check interfaces: `ip addr show`
3. Restart network: `sudo systemctl restart NetworkManager`

#### Browser Issues
1. Check Chromium process: `pgrep -f chromium`
2. Check browser logs: `sudo journalctl -u ur10-kiosk-watchdog`
3. Restart watchdog: `sudo systemctl restart ur10-kiosk-watchdog`

### Remote Access

For remote troubleshooting, SSH is enabled by default:
```bash
ssh ur10kiosk@<kiosk-ip-address>
```

### Recovery Mode

If the kiosk becomes completely unresponsive:
1. Connect keyboard and press `Ctrl+Alt+F2` to access console
2. Login as `ur10kiosk` or use SSH
3. Run diagnostic commands or restart services

## Customization

### Adding Custom Scripts

Place custom scripts in `/usr/local/bin/` and make them executable:
```bash
sudo cp my-script.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/my-script.sh
```

### Modifying Services

Edit service files in `/etc/systemd/system/` and reload:
```bash
sudo systemctl daemon-reload
sudo systemctl restart <service-name>
```

### Environment Variables

Add environment variables to the kiosk user's profile:
```bash
sudo su - ur10kiosk
echo 'export MY_VAR="value"' >> ~/.bashrc
```

## Hardware Compatibility

### Tested Hardware

- Standard PC/laptop with Ubuntu 22.04 LTS
- Industrial touch panel PCs
- Raspberry Pi 4 (with modifications)
- Intel NUC systems

### Display Requirements

- Minimum resolution: 1024x768
- Recommended: 1920x1080 or higher
- Touch screen support (optional but recommended)
- HDMI, DisplayPort, or VGA connection

### Network Requirements

- Ethernet connection (recommended)
- Wi-Fi support available
- Static IP configuration supported
- Minimum 10 Mbps bandwidth for optimal performance

## Performance Optimization

### System Resources

- Minimum 4GB RAM (8GB recommended)
- 32GB storage minimum (SSD recommended)
- Dual-core CPU minimum (quad-core recommended)

### Browser Optimization

The Chromium configuration includes optimizations for:
- Reduced memory usage
- Disabled unnecessary features
- Optimized rendering for kiosk use
- Automatic cache management

## Security Considerations

### Network Security

- Firewall enabled with minimal open ports
- SSH access restricted to key-based authentication (optional)
- Network traffic monitoring available
- VPN support for secure remote access

### Physical Security

- Kiosk user has limited system privileges
- No access to system settings from browser
- Automatic screen lock after inactivity (configurable)
- USB port access can be restricted

### Data Security

- No persistent user data storage in browser
- Automatic cache clearing
- Secure communication with robot server
- Audit logging for system access

## Maintenance Schedule

### Daily
- Automatic system health checks
- Log rotation
- Network connectivity verification

### Weekly
- System status review
- Log analysis
- Performance monitoring

### Monthly
- System updates
- Security patch installation
- Backup verification
- Hardware health check

## Support and Documentation

### Additional Resources

- [Installation Guide](docs/INSTALLATION.md) - Detailed setup instructions
- [Configuration Reference](config/kiosk.conf) - All configuration options
- System logs in `/var/log/ur10-kiosk/`
- Service documentation in systemd files

### Getting Help

1. Check system status with `sudo kiosk-status`
2. Review logs for error messages
3. Consult the troubleshooting section
4. Use SSH for remote diagnosis
5. Contact system administrator

## License

This deployment configuration is part of the UR10 Robot Kiosk project and follows the same licensing terms.

