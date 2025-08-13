#!/usr/bin/env bash
set -euo pipefail

# ThingsGame installation script for Debian Bookworm
# - Installs prerequisites (Node.js 20, build tools)
# - Installs project dependencies (server/client)
# - Builds production assets
# - Creates and starts a systemd service

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVICE_NAME="thingsgame"
PORT="4000"

echo "[1/5] Installing prerequisites (apt, Node.js, build tools)"
export DEBIAN_FRONTEND=noninteractive
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg apt-transport-https build-essential git

if ! command -v node >/dev/null 2>&1; then
  echo "Installing Node.js 20 via NodeSource..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "node: $(node -v)"
echo "npm:  $(npm -v)"

echo "[2/5] Installing project dependencies (server/client/root)"
cd "$PROJECT_DIR/server" && npm ci || npm i
cd "$PROJECT_DIR/client" && npm ci || npm i
cd "$PROJECT_DIR" && npm ci || npm i

echo "[3/5] Building client and server"
npm run build --prefix "$PROJECT_DIR/client"
npm run build --prefix "$PROJECT_DIR/server"

echo "[4/5] Creating systemd service ($SERVICE_NAME)"
# Create/update environment file
ENV_FILE="$PROJECT_DIR/.env"
echo "PORT=${PORT}" > "$ENV_FILE"
chmod 600 "$ENV_FILE"

SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
sudo bash -c "cat > $SERVICE_FILE" <<EOF
[Unit]
Description=ThingsGame server
After=network.target

[Service]
Type=simple
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/bin/node server/dist/index.js
EnvironmentFile=$PROJECT_DIR/.env
Restart=on-failure
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
EOF

echo "[5/5] Enabling and starting service"
sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"
sudo systemctl restart "$SERVICE_NAME"

echo "\nInstallation complete."
echo "- Service: systemctl status $SERVICE_NAME --no-pager"
echo "- URL:    http://$(hostname -I | awk '{print $1}'):$PORT"
echo "- Project: $PROJECT_DIR"


