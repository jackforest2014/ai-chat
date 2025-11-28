#!/usr/bin/env node

/**
 * Simple WebSocket Client Test Script
 *
 * Usage: node scripts/test-websocket.js [ws://localhost:8080/ws]
 */

const WebSocket = require('ws');

// Get WebSocket URL from command line or use default
const wsUrl = process.argv[2] || 'ws://localhost:8080/ws';

console.log('🔌 Connecting to:', wsUrl);
console.log('');

// Create WebSocket connection
const ws = new WebSocket(wsUrl);

// Connection opened
ws.on('open', function open() {
  console.log('✅ Connected to WebSocket server');
  console.log('');

  // Send a test message
  const message = {
    type: 'message',
    sessionId: 'test-session-123',
    content: 'Hello from test script!',
    timestamp: new Date().toISOString()
  };

  console.log('📤 Sending message:', JSON.stringify(message, null, 2));
  ws.send(JSON.stringify(message));
});

// Listen for messages
ws.on('message', function message(data) {
  console.log('');
  console.log('📨 Received message:');
  try {
    const parsed = JSON.parse(data);
    console.log(JSON.stringify(parsed, null, 2));
  } catch (e) {
    console.log(data.toString());
  }
});

// Connection closed
ws.on('close', function close() {
  console.log('');
  console.log('🔌 Disconnected from WebSocket server');
  process.exit(0);
});

// Error handling
ws.on('error', function error(err) {
  console.error('');
  console.error('❌ WebSocket error:', err.message);
  process.exit(1);
});

// Send a message every 5 seconds
let messageCount = 1;
const interval = setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    messageCount++;
    const message = {
      type: 'message',
      content: `Test message #${messageCount}`,
      timestamp: new Date().toISOString()
    };
    console.log('');
    console.log('📤 Sending message:', JSON.stringify(message, null, 2));
    ws.send(JSON.stringify(message));
  }
}, 5000);

// Close connection after 30 seconds
setTimeout(() => {
  clearInterval(interval);
  console.log('');
  console.log('⏰ Test duration completed, closing connection...');
  ws.close();
}, 30000);

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  clearInterval(interval);
  console.log('');
  console.log('👋 Closing connection...');
  ws.close();
});
