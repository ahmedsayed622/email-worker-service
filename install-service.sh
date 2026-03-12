#!/bin/bash
# ========================================
# Email Worker Service Installation Script
# ========================================

set -e  # Exit on error

echo "🚀 Installing Email Worker Service..."
echo ""

# Check if running with sufficient privileges
if [ "$EUID" -ne 0 ]; then 
   echo "⚠️  This script requires sudo privileges"
   echo "Run: sudo bash install-service.sh"
   exit 1
fi

# Check if service file exists
if [ ! -f "email-worker.service" ]; then
    echo "❌ Error: email-worker.service not found"
    exit 1
fi

# Copy service file to systemd directory
echo "📋 Step 1: Copying service file..."
cp email-worker.service /etc/systemd/system/email-worker.service
chown root:root /etc/systemd/system/email-worker.service
chmod 644 /etc/systemd/system/email-worker.service
echo "✅ Service file installed: /etc/systemd/system/email-worker.service"
echo ""

# Reload systemd daemon
echo "🔄 Step 2: Reloading systemd..."
systemctl daemon-reload
echo "✅ Systemd reloaded"
echo ""

# Enable auto-start on boot
echo "⚡ Step 3: Enabling auto-start..."
systemctl enable email-worker.service
echo "✅ Service enabled (will start on boot)"
echo ""

# Start the service
echo "▶️  Step 4: Starting service..."
systemctl start email-worker.service
echo "✅ Service started"
echo ""

# Show status
echo "📊 Service Status:"
echo "─────────────────────────────────────────"
systemctl status email-worker.service --no-pager -l
echo "─────────────────────────────────────────"
echo ""

echo "✅ Installation Complete!"
echo ""
echo "📝 Useful Commands:"
echo "   Check status:  sudo systemctl status email-worker"
echo "   View logs:     sudo journalctl -u email-worker -f"
echo "   Stop service:  sudo systemctl stop email-worker"
echo "   Start service: sudo systemctl start email-worker"
echo "   Restart:       sudo systemctl restart email-worker"
echo "   Disable:       sudo systemctl disable email-worker"
echo ""
