#!/usr/bin/env bash
set -euo pipefail

# Full deployment script: Build both client and server, then update systemd service
# Usage examples:
#   ./deploy.sh
#   ./deploy.sh --port 4000 
#   ./deploy.sh --service-name thingsgame --workdir /root/ThingsGame
#   ./deploy.sh --skip-build  # Skip build steps, just update service

SERVICE_NAME="thingsgame"
WORKDIR="/root/ThingsGame"
PORT="4000"
NODE_BIN="/usr/bin/node"
SKIP_BUILD=false
ENV_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --service-name) SERVICE_NAME="$2"; shift;;
    --workdir) WORKDIR="$2"; shift;;
    --port) PORT="$2"; shift;;
    --node) NODE_BIN="$2"; shift;;
    --skip-build) SKIP_BUILD=true;;
    *) echo "Unknown arg: $1" >&2; exit 1;;
  esac
  shift
done

echo "🚀 Starting Fluty Things deployment..."
echo "Working directory: $WORKDIR"
echo "Service name: $SERVICE_NAME"
echo "Port: $PORT"
echo

# Change to project directory
cd "$WORKDIR"

if [ "$SKIP_BUILD" = false ]; then
  echo "📦 Building client application..."
  cd client
  echo "  - Installing/updating client dependencies..."
  npm install --silent
  echo "  - Building client app..."
  npm run build
  echo "  ✅ Client build complete"
  echo

  cd ..
  echo "🔨 Building server application..."
  cd server
  echo "  - Installing/updating server dependencies..."
  npm install --silent
  echo "  - Building server app..."
  npm run build
  echo "  ✅ Server build complete"
  echo

  cd ..
else
  echo "⏭️  Skipping build steps (--skip-build specified)"
  echo
fi

# Prepare environment file (for systemd)
ENV_FILE="$WORKDIR/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "🧾 Creating environment file: $ENV_FILE"
  echo "PORT=${PORT}" > "$ENV_FILE"
  chmod 600 "$ENV_FILE"
else
  # Update PORT in existing env file; preserve other keys
  if grep -q '^PORT=' "$ENV_FILE"; then
    sed -i "s/^PORT=.*/PORT=${PORT}/" "$ENV_FILE"
  else
    echo "PORT=${PORT}" >> "$ENV_FILE"
  fi
fi

# Stop service before updating (to prevent conflicts)
echo "🛑 Stopping existing service (if running)..."
sudo systemctl stop "$SERVICE_NAME" >/dev/null 2>&1 || true

UNIT_PATH="/etc/systemd/system/${SERVICE_NAME}.service"

echo "📝 Writing systemd unit: $UNIT_PATH"
sudo tee "$UNIT_PATH" >/dev/null <<EOF
[Unit]
Description=Fluty Things Game Server
After=network.target

[Service]
Type=simple
WorkingDirectory=$WORKDIR
ExecStart=$NODE_BIN server/dist/index.js
Environment=NODE_ENV=production
EnvironmentFile=$ENV_FILE
Restart=on-failure
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
EOF

echo "🔄 Reloading systemd and starting $SERVICE_NAME"
sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME" >/dev/null 2>&1 || true
sudo systemctl start "$SERVICE_NAME"

# Wait a moment for service to start
sleep 2

echo "📊 Service Status:"
systemctl is-enabled "$SERVICE_NAME" | sed 's/^/  Status: /'
echo

if systemctl is-active --quiet "$SERVICE_NAME"; then
  echo "  ✅ Service is running"
else
  echo "  ❌ Service failed to start"
  echo
  echo "📋 Recent logs:"
  sudo journalctl -u "$SERVICE_NAME" --no-pager --lines=10 | sed 's/^/  /'
  exit 1
fi

echo
echo "🎉 Deployment complete!"
echo "🌐 App URL: http://$(hostname -I | awk '{print $1}'):$PORT"
echo

# Show recent logs to verify everything is working
echo "📋 Recent service logs:"
sudo journalctl -u "$SERVICE_NAME" --no-pager --lines=5 | sed 's/^/  /'
echo

echo "💡 Useful commands:"
echo "  View logs: sudo journalctl -u $SERVICE_NAME -f"
echo "  Restart:   sudo systemctl restart $SERVICE_NAME"
echo "  Stop:      sudo systemctl stop $SERVICE_NAME"
echo "  Status:    sudo systemctl status $SERVICE_NAME"
