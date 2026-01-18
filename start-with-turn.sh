#!/bin/bash

# Detect external IP
EXTERNAL_IP=$(curl -s ifconfig.me || wget -qO- ifconfig.me || echo "")

if [ -z "$EXTERNAL_IP" ]; then
  echo "Failed to detect external IP"
  exit 1
fi

echo "Detected external IP: $EXTERNAL_IP"

# Export for docker-compose
export EXTERNAL_IP

# Start services
docker compose -f docker-compose.prod.yml -f docker-compose.turn.yml up -d "$@"

echo ""
echo "Services started with TURN server"
echo "  TURN URL: turn:${EXTERNAL_IP}:3478"
