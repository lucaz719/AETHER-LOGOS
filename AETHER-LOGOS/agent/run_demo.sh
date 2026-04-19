#!/bin/bash

# Ensure agent is running in the background before this script runs.
# This script registers a mocked shipment and then polls the carrier until it's delivered.

AGENT_URL="http://localhost:8080"
TRACKING_ID="MOCK-$(date +%s)"

echo "🚀 Registering shipment $TRACKING_ID with Go agent..."

curl -s -X POST "$AGENT_URL/register" \
  -H "Content-Type: application/json" \
  -d '{
    "tracking_id": "'"$TRACKING_ID"'",
    "wallet": "mock-wallet-123",
    "callback_url": "http://localhost:8080/health",
    "carrier": "DHL"
  }'

echo -e "\n\n🔄 Starting poll loop every 3 seconds...\n"

for i in {1..10}; do
  echo "[Loop $i] Polling agent..."
  curl -s -X GET "$AGENT_URL/poll" | jq . || curl -s -X GET "$AGENT_URL/poll"
  echo -e "\n"
  sleep 3
done

echo "✅ Demo loop complete."
