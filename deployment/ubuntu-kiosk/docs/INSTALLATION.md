# UR10 Robot Kiosk - Ubuntu Installation Guide

This guide provides step-by-step instructions for setting up Ubuntu as a dedicated kiosk system for the UR10 Robot interface.

## Prerequisites

- Fresh Ubuntu 22.04 LTS installation
- Root/sudo access
- Network connectivity
- Minimum 4GB RAM, 32GB storage
- Display connected (touchscreen recommended)

## Quick Installation

For a standard kiosk setup, run the automated installation script:

```bash
# Download and run the setup script
sudo bash setup-kiosk.sh
```

The system will automatically reboot after installation and start in kiosk mode.

## Manual Installation Steps

If you prefer to install manually or need to customize the setup:

### 1. System Preparation

Update the system and install required packages:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y \
    chromium-browser \
    unclutter \
    onboard \
    xdotool \
    x11-xserver-utils \
    lightdm \
    openbox \
    pulseaudio \
    alsa-utils \
    network-manager \
    openssh-server \
    curl \
    wget \
    git \
    htop \
    nano \
    rsync
```

### 2. Create Kiosk User

Create a dedicated user for the kiosk:

```bash
# Create kiosk user
sudo useradd -m -s /bin/bash ur10kiosk

# Add to necessary groups
sudo usermod -a -G audio,video,input,plugdev ur10kiosk

# Set password (optional)
sudo passwd ur10kiosk
```

### 3. Configure Autologin

Configure LightDM for automatic login:

```bash
# Edit LightDM configuration
sudo nano /etc/lightdm/lightdm.conf
```

Add the following configuration:

```ini
[Seat:*]
autologin-user=ur10kiosk
autologin-user-timeout=0
user-session=openbox
greeter-session=lightdm-gtk-greeter
```

Enable LightDM:

```bash
sudo systemctl enable lightdm
```

### 4. Configure Openbox

Set up the window manager for the kiosk user:

```bash
# Switch to kiosk user
sudo su - ur10kiosk

# Create Openbox configuration directory
mkdir -p ~/.config/openbox

# Create autostart script
cat > ~/.config/openbox/autostart << 'EOF'
#!/bin/bash

# Disable screen blanking and power management
xset s off
xset -dpms
xset s noblank

# Hide cursor after 1 second of inactivity
unclutter -idle 1 &

# Start on-screen keyboard (hidden by default)
onboard --startup-delay=3 &

# Wait for network connectivity
while ! ping -c 1 google.com &> /dev/null; do
    sleep 1
done

# Start Chromium in kiosk mode
chromium-browser \
    --kiosk \
    --no-first-run \
    --disable-infobars \
    --disable-session-crashed-bubble \
    --disable-translate \
    --disable-features=TranslateUI \
    --disable-ipc-flooding-protection \
    --disable-background-timer-throttling \
    --disable-backgrounding-occluded-windows \
    --disable-renderer-backgrounding \
    --disable-field-trial-config \
    --disable-back-forward-cache \
    --start-maximized \
    --window-position=0,0 \
    --window-size=1920,1080 \
    --user-data-dir=/home/ur10kiosk/.chromium-kiosk \
    --app="https://localhost:5173"
EOF

# Make autostart script executable
chmod +x ~/.config/openbox/autostart

# Exit back to root user
exit
```

### 5. Install System Services

Copy and enable the kiosk system services:

```bash
# Copy service files
sudo cp systemd/*.service /etc/systemd/system/

# Copy scripts
sudo cp scripts/*.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/*.sh

# Reload systemd and enable services
sudo systemctl daemon-reload
sudo systemctl enable ur10-kiosk-watchdog.service
sudo systemctl enable ur10-kiosk-network-check.service
```

### 6. Configure Security

Set up firewall and security settings:

```bash
# Enable firewall
sudo ufw --force enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 8000/tcp  # Robot server
sudo ufw allow 5173/tcp  # Development server

# Disable root SSH login
sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

# Configure automatic updates
sudo cat > /etc/apt/apt.conf.d/20auto-upgrades << EOF
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF
```

### 7. Configure Display Settings

Create X11 configuration for optimal display:

```bash
sudo mkdir -p /etc/X11/xorg.conf.d

sudo cat > /etc/X11/xorg.conf.d/99-kiosk.conf << EOF
Section "ServerLayout"
    Identifier "Kiosk Layout"
    Screen 0 "Kiosk Screen" 0 0
EndSection

Section "Screen"
    Identifier "Kiosk Screen"
    Monitor "Kiosk Monitor"
    DefaultDepth 24
    SubSection "Display"
        Depth 24
        Modes "1920x1080" "1680x1050" "1280x1024" "1024x768"
    EndSubSection
EndSection

Section "Monitor"
    Identifier "Kiosk Monitor"
    Option "DPMS" "false"
EndSection
EOF
```

### 8. Create Maintenance Scripts

Install system maintenance utilities:

```bash
# Kiosk restart script
sudo cat > /usr/local/bin/restart-kiosk << 'EOF'
#!/bin/bash
systemctl restart lightdm
EOF
sudo chmod +x /usr/local/bin/restart-kiosk

# Kiosk status script
sudo cat > /usr/local/bin/kiosk-status << 'EOF'
#!/bin/bash
echo "=== UR10 Kiosk System Status ==="
echo "Date: $(date)"
echo "Uptime: $(uptime -p)"
echo "Kiosk User: $(who | grep ur10kiosk || echo 'Not logged in')"
echo "Display Manager: $(systemctl is-active lightdm)"
echo "Network: $(ping -c 1 8.8.8.8 &>/dev/null && echo 'Connected' || echo 'Disconnected')"
echo "Disk Usage: $(df -h / | tail -1 | awk '{print $5}')"
echo "Memory Usage: $(free -h | grep Mem | awk '{print $3"/"$2}')"
echo "Load Average: $(uptime | awk -F'load average:' '{print $2}')"
EOF
sudo chmod +x /usr/local/bin/kiosk-status
```

### 9. Configure Logging

Set up log rotation for kiosk logs:

```bash
sudo cat > /etc/logrotate.d/ur10-kiosk << EOF
/var/log/ur10-kiosk/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 ur10kiosk ur10kiosk
    postrotate
        systemctl reload-or-restart ur10-kiosk-watchdog || true
    endscript
}
EOF

# Create log directory
sudo mkdir -p /var/log/ur10-kiosk
sudo chown ur10kiosk:ur10kiosk /var/log/ur10-kiosk
```

### 10. Final Steps

Complete the installation:

```bash
# Reboot to start kiosk mode
sudo reboot
```

## Post-Installation

After the system reboots, it should automatically:

1. Login as the kiosk user
2. Start the Openbox window manager
3. Launch Chromium in kiosk mode
4. Connect to the UR10 Robot interface

## Troubleshooting

### Check System Status

```bash
# Check overall kiosk status
sudo kiosk-status

# Check service status
sudo systemctl status ur10-kiosk-watchdog
sudo systemctl status ur10-kiosk-network-check

# Check logs
sudo journalctl -u ur10-kiosk-watchdog -f
sudo tail -f /var/log/ur10-kiosk/watchdog.log
```

### Common Issues

#### Kiosk Not Starting

1. Check if LightDM is running:
   ```bash
   sudo systemctl status lightdm
   ```

2. Check Openbox autostart script:
   ```bash
   sudo su - ur10kiosk
   cat ~/.config/openbox/autostart
   ```

#### Network Issues

1. Check network connectivity:
   ```bash
   ping -c 3 8.8.8.8
   ```

2. Restart network services:
   ```bash
   sudo systemctl restart NetworkManager
   ```

#### Display Issues

1. Check X11 configuration:
   ```bash
   sudo cat /etc/X11/xorg.conf.d/99-kiosk.conf
   ```

2. Check display resolution:
   ```bash
   xrandr
   ```

### Manual Recovery

If the kiosk interface becomes unresponsive:

```bash
# Restart the kiosk interface
sudo restart-kiosk

# Or restart the entire display manager
sudo systemctl restart lightdm

# Access via SSH for remote troubleshooting
ssh ur10kiosk@<kiosk-ip>
```

## Customization

### Changing the Kiosk URL

Edit the Openbox autostart script:

```bash
sudo su - ur10kiosk
nano ~/.config/openbox/autostart
```

Change the `--app` parameter to your desired URL.

### Adjusting Screen Settings

Modify the X11 configuration:

```bash
sudo nano /etc/X11/xorg.conf.d/99-kiosk.conf
```

### Configuring Static IP

Edit the network configuration:

```bash
sudo nano /etc/netplan/01-kiosk-static.yaml
```

Add your network settings and apply:

```bash
sudo netplan apply
```

## Security Considerations

- Change default passwords
- Configure firewall rules appropriately
- Keep system updated
- Monitor system logs regularly
- Restrict physical access to the kiosk

## Maintenance

### Regular Tasks

- Check system status weekly
- Review logs for errors
- Update system monthly
- Test backup/restore procedures

### Automated Maintenance

The system includes automated:
- Log rotation
- System updates
- Service monitoring
- Network connectivity checks

## Support

For additional support:

1. Check the troubleshooting section
2. Review system logs
3. Consult the UR10 Robot Kiosk documentation
4. Contact system administrator

