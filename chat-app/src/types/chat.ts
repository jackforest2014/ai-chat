export type MessageType = 'text' | 'audio' | 'image' | 'video'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  msgType?: MessageType
  audioUrl?: string
  metadata?: {
    from_qa?: boolean
    question?: string
    similarity?: number
    duration_ms?: number
    mime_type?: string
    [key: string]: any
  }
}

export interface ChatSession {
  id: string
  messages: Message[]
  isActive: boolean
  createdAt: Date
}
