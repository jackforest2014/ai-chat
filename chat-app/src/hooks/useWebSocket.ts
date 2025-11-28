'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { ConnectionStatus, WebSocketState } from '@/types/websocket'
import { WEBSOCKET_CONFIG } from '@/config/websocket'

interface UseWebSocketProps {
  url?: string
  onMessage?: (data: any) => void
  onError?: (error: Event) => void
  enabled?: boolean
}

export function useWebSocket({
  url = WEBSOCKET_CONFIG.url,
  onMessage,
  onError,
  enabled = false,
}: UseWebSocketProps) {
  const [state, setState] = useState<WebSocketState>({
    status: 'disconnected',
    error: null,
    lastConnected: null,
  })

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectDelayRef = useRef(WEBSOCKET_CONFIG.reconnect.delay)

  // Client ID will be set by the backend
  const clientIdRef = useRef<string | null>(null)

  const updateStatus = useCallback((status: ConnectionStatus, error: string | null = null) => {
    setState((prev) => ({
      ...prev,
      status,
      error,
      lastConnected: status === 'connected' ? new Date() : prev.lastConnected,
    }))
  }, [])

  const connect = useCallback(() => {
    if (!enabled) return

    // Clear any existing connection
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    updateStatus('connecting')

    try {
      const ws = new WebSocket(url)

      // Connection timeout
      const timeoutId = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close()
          updateStatus('failed', `Connection timeout after ${WEBSOCKET_CONFIG.connectionTimeout}ms`)
        }
      }, WEBSOCKET_CONFIG.connectionTimeout)

      ws.onopen = () => {
        clearTimeout(timeoutId)
        updateStatus('connected')
        reconnectAttemptsRef.current = 0
        reconnectDelayRef.current = WEBSOCKET_CONFIG.reconnect.delay // Reset backoff delay
        console.log(`WebSocket connected to ${url}`)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          // Extract client ID from welcome message
          if (data.type === 'system' && data.metadata?.client_id && !clientIdRef.current) {
            clientIdRef.current = data.metadata.client_id
            console.log('Received client ID from server:', clientIdRef.current)
          }

          onMessage?.(data)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
          onMessage?.(event.data)
        }
      }

      ws.onerror = (event) => {
        clearTimeout(timeoutId)
        console.error('WebSocket error:', event)
        updateStatus('failed', 'WebSocket connection error')
        onError?.(event)
      }

      ws.onclose = (event) => {
        clearTimeout(timeoutId)
        console.log('WebSocket closed:', event.code, event.reason)

        wsRef.current = null

        // Attempt reconnection if enabled and not manually closed
        if (
          enabled &&
          WEBSOCKET_CONFIG.reconnect.enabled &&
          event.code !== 1000 // 1000 = normal closure
        ) {
          reconnectAttemptsRef.current += 1

          // Exponential backoff with max delay of 30 seconds
          const maxDelay = 30000
          const currentDelay = reconnectDelayRef.current
          const nextDelay = Math.min(currentDelay * 2, maxDelay)
          reconnectDelayRef.current = nextDelay

          const delayInSeconds = Math.round(currentDelay / 1000)
          updateStatus('reconnecting', `Reconnecting in ${delayInSeconds}s... (attempt ${reconnectAttemptsRef.current})`)

          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, currentDelay)
        } else {
          updateStatus('disconnected', event.reason || null)
        }
      }

      wsRef.current = ws
    } catch (error) {
      console.error('Failed to create WebSocket:', error)
      updateStatus('failed', error instanceof Error ? error.message : 'Failed to create WebSocket connection')
    }
  }, [url, enabled, onMessage, onError, updateStatus])

  const disconnect = useCallback(() => {
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    // Close WebSocket connection
    if (wsRef.current) {
      wsRef.current.close(1000, 'User closed chat')
      wsRef.current = null
    }

    // Clear client ID
    clientIdRef.current = null

    updateStatus('disconnected')
    reconnectAttemptsRef.current = 0
    reconnectDelayRef.current = WEBSOCKET_CONFIG.reconnect.delay // Reset backoff delay
  }, [updateStatus])

  const sendMessage = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data)
      wsRef.current.send(message)
      return true
    } else {
      console.warn('WebSocket is not connected')
      return false
    }
  }, [])

  // Connect when enabled
  useEffect(() => {
    if (enabled) {
      connect()
    } else {
      disconnect()
    }

    // Cleanup on unmount
    return () => {
      disconnect()
    }
  }, [enabled, connect, disconnect])

  return {
    state,
    sendMessage,
    connect,
    disconnect,
    isConnected: state.status === 'connected',
    clientId: clientIdRef.current,
  }
}
