#!/bin/bash

# Detect external IPv4 (prefer IPv4 over IPv6)
EXTERNAL_IP=$(curl -4 -s ifconfig.me 2>/dev/null || wget -4 -qO- ifconfig.me 2>/dev/null || echo "")

if [ -z "$EXTERNAL_IP" ]; then
  echo "Failed to detect external IPv4, trying any IP..."
  EXTERNAL_IP=$(curl -s ifconfig.me || wget -qO- ifconfig.me || echo "")
fi

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
