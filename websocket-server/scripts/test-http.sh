#!/bin/bash

# HTTP Endpoints Test Script
# Tests all HTTP endpoints of the WebSocket server

set -e

# Configuration
HOST="${1:-localhost}"
PORT="${2:-8080}"
BASE_URL="http://${HOST}:${PORT}"

echo "🧪 Testing WebSocket Server HTTP Endpoints"
echo "============================================"
echo ""
echo "🌐 Server: ${BASE_URL}"
echo ""

# Test health endpoint
echo "1️⃣  Testing Health Endpoint"
echo "   GET ${BASE_URL}/health"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "${BASE_URL}/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" == "200" ]; then
    echo "   ✅ Status: ${HTTP_CODE}"
    echo "   📄 Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    echo "   ❌ Status: ${HTTP_CODE}"
    echo "   📄 Response: ${BODY}"
fi
echo ""

# Test stats endpoint
echo "2️⃣  Testing Statistics Endpoint"
echo "   GET ${BASE_URL}/stats"
STATS_RESPONSE=$(curl -s -w "\n%{http_code}" "${BASE_URL}/stats")
HTTP_CODE=$(echo "$STATS_RESPONSE" | tail -n1)
BODY=$(echo "$STATS_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" == "200" ]; then
    echo "   ✅ Status: ${HTTP_CODE}"
    echo "   📄 Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    echo "   ❌ Status: ${HTTP_CODE}"
    echo "   📄 Response: ${BODY}"
fi
echo ""

# Test root endpoint
echo "3️⃣  Testing Root Endpoint"
echo "   GET ${BASE_URL}/"
ROOT_RESPONSE=$(curl -s -w "\n%{http_code}" "${BASE_URL}/")
HTTP_CODE=$(echo "$ROOT_RESPONSE" | tail -n1)
BODY=$(echo "$ROOT_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" == "200" ]; then
    echo "   ✅ Status: ${HTTP_CODE}"
    echo "   📄 Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    echo "   ❌ Status: ${HTTP_CODE}"
    echo "   📄 Response: ${BODY}"
fi
echo ""

# Test 404
echo "4️⃣  Testing 404 (Non-existent endpoint)"
echo "   GET ${BASE_URL}/nonexistent"
NOT_FOUND_RESPONSE=$(curl -s -w "\n%{http_code}" "${BASE_URL}/nonexistent")
HTTP_CODE=$(echo "$NOT_FOUND_RESPONSE" | tail -n1)

if [ "$HTTP_CODE" == "404" ]; then
    echo "   ✅ Status: ${HTTP_CODE} (Expected)"
else
    echo "   ❌ Status: ${HTTP_CODE} (Expected 404)"
fi
echo ""

echo "============================================"
echo "✅ All HTTP endpoint tests completed!"
echo ""
echo "💡 To test WebSocket endpoint:"
echo "   node scripts/test-websocket.js"
echo "   OR"
echo "   wscat -c ws://${HOST}:${PORT}/ws"
