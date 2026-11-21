#!/usr/bin/env bash
# DevForge Remote MCP Server Management Script

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load environment
if [[ -f .env ]]; then
  export $(grep -v '^#' .env | xargs)
fi

SERVER_NAME="devforge-remote"
PID_FILE="/tmp/${SERVER_NAME}.pid"
LOG_FILE="${SCRIPT_DIR}/logs/server.log"
PORT="${PORT:-8787}"

# Ensure logs directory exists
mkdir -p logs

function start() {
  if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "Server already running (PID: $(cat "$PID_FILE"))"
    return 0
  fi

  echo "Starting $SERVER_NAME on port $PORT..."
  
  # Check required env vars
  if [[ -z "${DEVFORGE_API_KEY:-}" ]] || [[ ${#DEVFORGE_API_KEY} -lt 32 ]]; then
    echo "ERROR: DEVFORGE_API_KEY must be set to at least 32 characters"
    exit 1
  fi
  
  if [[ -z "${DEVFORGE_WORKSPACES:-}" ]]; then
    echo "ERROR: DEVFORGE_WORKSPACES must be set"
    exit 1
  fi

  nohup node src/server.js >> "$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"
  
  # Wait for server to be ready
  for i in {1..10}; do
    if curl -sf "http://${HOST:-0.0.0.0}:$PORT/health" >/dev/null 2>&1; then
      echo "Server started successfully (PID: $!)"
      echo "Logs: $LOG_FILE"
      echo "Health: http://${HOST:-0.0.0.0}:$PORT/health"
      echo "MCP: http://${HOST:-0.0.0.0}:$PORT/mcp"
      return 0
    fi
    sleep 1
  done
  
  echo "Server failed to start. Check logs: $LOG_FILE"
  exit 1
}

function stop() {
  if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "Stopping $SERVER_NAME (PID: $(cat "$PID_FILE"))..."
    kill "$(cat "$PID_FILE")"
    rm -f "$PID_FILE"
    echo "Stopped"
  else
    echo "Server not running"
  fi
}

function restart() {
  stop
  sleep 2
  start
}

function status() {
  if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "Server RUNNING (PID: $(cat "$PID_FILE"))"
    curl -sf "http://${HOST:-0.0.0.0}:$PORT/health" | jq . 2>/dev/null || curl -sf "http://${HOST:-0.0.0.0}:$PORT/health"
  else
    echo "Server STOPPED"
  fi
}

function logs() {
  tail -f "$LOG_FILE"
}

function test_mcp() {
  echo "Testing MCP endpoint..."
  local api_key="${DEVFORGE_API_KEY}"
  
  # Initialize
  echo "1. Initialize..."
  curl -s -X POST "http://${HOST:-0.0.0.0}:$PORT/mcp" \
    -H "Authorization: Bearer $api_key" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
  
  echo -e "\n\n2. List tools..."
  curl -s -X POST "http://${HOST:-0.0.0.0}:$PORT/mcp" \
    -H "Authorization: Bearer $api_key" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
  
  echo -e "\n\n3. List workspaces..."
  curl -s -X POST "http://${HOST:-0.0.0.0}:$PORT/mcp" \
    -H "Authorization: Bearer $api_key" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"workspace_list","arguments":{}}}'
}

function install_pm2() {
  if ! command -v pm2 &>/dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
  fi
  
  # Create PM2 ecosystem config
  cat > ecosystem.config.cjs <<'EOF'
module.exports = {
  apps: [
    {
      name: 'devforge-remote',
      script: 'src/server.js',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: 8787,
        HOST: '0.0.0.0'
      },
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      log_file: 'logs/pm2-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
};
EOF
  
  echo "PM2 ecosystem config created: ecosystem.config.cjs"
  echo "Start with: pm2 start ecosystem.config.cjs"
}

function setup_tunnel() {
  local token="${1:-eyJhIjoiNDAwNmMxYTcwNmVhM2Y4NTFiMzViMWMyYTg1MDU5OGEiLCJ0IjoiZmMxODFjNjctODkxZC00N2I2LWE4ZTEtOGU1YTExNzQwYzBlIiwicyI6Ik1qRTFaV0U1WXpRdFpqTXdOUzAwWkRBM0xUbGpaR010TldKa05qWXpZamRsTnpjeCJ9}"
  
  if ! command -v cloudflared &>/dev/null; then
    echo "Installing cloudflared..."
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
      curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
      sudo dpkg -i cloudflared.deb
      rm cloudflared.deb
    elif [[ "$OSTYPE" == "darwin"* ]]; then
      brew install cloudflared
    fi
  fi
  
  # Create PM2 config for tunnel
  cat > ecosystem.tunnel.config.cjs <<EOF
module.exports = {
  apps: [
    {
      name: 'devforge-tunnel',
      script: 'cloudflared',
      args: 'tunnel run --token ${token}',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production'
      },
      error_file: 'logs/tunnel-error.log',
      out_file: 'logs/tunnel-out.log',
      log_file: 'logs/tunnel-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
};
EOF
  
  echo "Tunnel PM2 config created: ecosystem.tunnel.config.cjs"
  echo "Start tunnel with: pm2 start ecosystem.tunnel.config.cjs"
}

function start_all() {
  install_pm2
  setup_tunnel
  pm2 start ecosystem.config.cjs
  pm2 start ecosystem.tunnel.config.cjs
  pm2 save
  echo "Both services started. Check status with: pm2 status"
}

function stop_all() {
  pm2 stop devforge-remote devforge-tunnel 2>/dev/null || true
  pm2 delete devforge-remote devforge-tunnel 2>/dev/null || true
  echo "All services stopped"
}

case "${1:-}" in
  start) start ;;
  stop) stop ;;
  restart) restart ;;
  status) status ;;
  logs) logs ;;
  test) test_mcp ;;
  pm2-install) install_pm2 ;;
  pm2-tunnel) setup_tunnel "${2:-}" ;;
  pm2-start) start_all ;;
  pm2-stop) stop_all ;;
  *)
    echo "Usage: $0 {start|stop|restart|status|logs|test|pm2-install|pm2-tunnel|pm2-start|pm2-stop}"
    echo ""
    echo "Direct management:"
    echo "  start      - Start server directly (nohup)"
    echo "  stop       - Stop direct server"
    echo "  restart    - Restart direct server"
    echo "  status     - Check server status"
    echo "  logs       - Tail server logs"
    echo "  test       - Test MCP endpoints"
    echo ""
    echo "PM2 management:"
    echo "  pm2-install  - Install PM2 and create ecosystem configs"
    echo "  pm2-tunnel   - Create tunnel PM2 config (optional: token)"
    echo "  pm2-start    - Start both server and tunnel via PM2"
    echo "  pm2-stop     - Stop both services via PM2"
    exit 1
    ;;
esac