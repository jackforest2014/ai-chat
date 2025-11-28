export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'failed'
  | 'reconnecting'

export interface WebSocketState {
  status: ConnectionStatus
  error: string | null
  lastConnected: Date | null
}

export interface WebSocketMessage {
  type: 'message' | 'system' | 'error'
  content: string
  timestamp: Date
  sender?: 'user' | 'assistant'
}
