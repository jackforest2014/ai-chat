/**
 * WebSocket Configuration
 *
 * Configure the WebSocket server URL here.
 * Format: ws://IP:PORT or wss://IP:PORT for secure connections
 */

export const WEBSOCKET_CONFIG = {
  // Default WebSocket server URL
  // Change this to your actual WebSocket server address
  url: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:8080',

  // Connection timeout in milliseconds
  connectionTimeout: 5000,

  // Reconnection settings
  reconnect: {
    enabled: true,
    maxAttempts: 3,
    delay: 2000, // milliseconds between attempts
  },
}

/**
 * Get the WebSocket URL from environment or use default
 */
export function getWebSocketUrl(): string {
  return WEBSOCKET_CONFIG.url
}
