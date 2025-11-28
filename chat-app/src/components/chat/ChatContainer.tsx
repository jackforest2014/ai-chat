'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { ChatHeader } from './ChatHeader'
import { ChatMessages } from './ChatMessages'
import { ChatInput } from './ChatInput'
import { ResumeSelectorPanel } from './ResumeSelectorPanel'
import { ToastContainer } from '@/components/ui/toast'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useAuth } from '@/contexts/AuthContext'
import { Lock } from 'lucide-react'
import type { Message, ChatSession } from '@/types/chat'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'

export function ChatContainer() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const [session, setSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }>>([])

  const handleWebSocketMessage = useCallback(async (data: any) => {
    console.log('Received WebSocket message:', data)

    // Handle incoming messages from WebSocket
    if (data.type === 'message' && data.content) {
      const tempId = crypto.randomUUID()
      const assistantMessage: Message = {
        id: tempId,
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
        msgType: 'text',
        metadata: data.metadata, // Include metadata (from_qa, similarity, etc.)
      }
      setMessages((prev) => [...prev, assistantMessage])
      setIsLoading(false)

      // Save assistant message to database
      if (user && session) {
        try {
          const saveResponse = await fetch(`${BACKEND_URL}/api/chat/message/system`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to_user_id: user.id,
              text_content: data.content,
              session_id: session.id,
              metadata: data.metadata,
            }),
          })

          if (saveResponse.ok) {
            const savedMsg = await saveResponse.json()
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === tempId ? { ...msg, id: String(savedMsg.id) } : msg
              )
            )
          }
        } catch (error) {
          console.error('Error saving assistant message:', error)
        }
      }
    }
  }, [user, session])

  const handleWebSocketError = useCallback((error: Event) => {
    console.error('WebSocket error:', error)
    addToast('WebSocket connection error occurred', 'error')
  }, [])

  const { state: wsState, sendMessage: wsSendMessage, disconnect, clientId } = useWebSocket({
    onMessage: handleWebSocketMessage,
    onError: handleWebSocketError,
    enabled: !!session,
  })

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, message, type }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  // Show toast notifications based on connection status
  useEffect(() => {
    if (wsState.status === 'connected') {
      addToast('Successfully connected to chat server', 'success')
    } else if (wsState.status === 'failed') {
      addToast(
        `Connection failed: ${wsState.error || 'Unable to connect to server'}`,
        'error'
      )
    }
  }, [wsState.status, wsState.error, addToast])

  const startChat = () => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      messages: [],
      isActive: true,
      createdAt: new Date(),
    }
    setSession(newSession)
    setMessages([
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Hello! I\'m your AI assistant. Connecting to the server...',
        timestamp: new Date(),
      },
    ])
  }

  const closeChat = () => {
    // Disconnect WebSocket
    disconnect()

    // Clear session and messages
    setSession(null)
    setMessages([])

    addToast('Chat session ended', 'info')
  }

  const handleQALoaded = useCallback((count: number) => {
    addToast(`Loaded ${count} Q&A pairs into memory`, 'success')
  }, [addToast])

  const sendMessage = async (content: string) => {
    if (!session || !content.trim() || !user) return

    const tempId = crypto.randomUUID()
    const userMessage: Message = {
      id: tempId,
      role: 'user',
      content,
      timestamp: new Date(),
      msgType: 'text',
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    // Save text message to database
    try {
      const saveResponse = await fetch(`${BACKEND_URL}/api/chat/message/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          to_user_id: 10, // System user ID
          text_content: content,
          session_id: session.id,
        }),
      })

      if (saveResponse.ok) {
        const savedMsg = await saveResponse.json()
        // Update message with server ID
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId ? { ...msg, id: String(savedMsg.id) } : msg
          )
        )
      }
    } catch (error) {
      console.error('Error saving message to database:', error)
    }

    // Try to send via WebSocket first for real-time processing
    if (wsState.status === 'connected') {
      const sent = wsSendMessage({
        type: 'message',
        sessionId: session.id,
        content,
        timestamp: new Date().toISOString(),
      })

      if (sent) {
        console.log('Message sent via WebSocket')
        return
      }
    }

    // Fallback to HTTP API if WebSocket is not connected
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          message: content,
        }),
      })

      if (!response.ok) throw new Error('Failed to send message')

      const data = await response.json()

      const assistantTempId = crypto.randomUUID()
      const assistantMessage: Message = {
        id: assistantTempId,
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        msgType: 'text',
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Save assistant response to database
      try {
        const saveResponse = await fetch(`${BACKEND_URL}/api/chat/message/system`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to_user_id: user.id,
            text_content: data.message,
            session_id: session.id,
          }),
        })

        if (saveResponse.ok) {
          const savedMsg = await saveResponse.json()
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantTempId ? { ...msg, id: String(savedMsg.id) } : msg
            )
          )
        }
      } catch (saveError) {
        console.error('Error saving assistant message:', saveError)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      addToast('Failed to send message', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const sendAudioMessage = async (audioBlob: Blob, durationMs: number) => {
    if (!session || !user) return

    // Convert blob to base64
    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64Audio = (reader.result as string).split(',')[1] // Remove data URL prefix

      // Create optimistic local message
      const tempId = crypto.randomUUID()
      const localAudioUrl = URL.createObjectURL(audioBlob)

      console.log('Created audio message:', {
        tempId,
        localAudioUrl,
        blobSize: audioBlob.size,
        blobType: audioBlob.type,
        durationMs,
      })

      const userMessage: Message = {
        id: tempId,
        role: 'user',
        content: '', // Will be updated with transcript if available
        timestamp: new Date(),
        msgType: 'audio',
        audioUrl: localAudioUrl,
        metadata: {
          duration_ms: durationMs,
          mime_type: audioBlob.type || 'audio/webm',
        },
      }

      console.log('Adding audio message to state:', userMessage)
      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)

      try {
        // Send to backend
        const response = await fetch(`${BACKEND_URL}/api/chat/message/audio`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            to_user_id: 10, // System user ID
            audio_data: base64Audio,
            duration_ms: durationMs,
            mime_type: 'audio/webm',
            session_id: session.id,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to send audio message')
        }

        const data = await response.json()
        console.log('Audio message saved:', data)

        // Update the message with the server-assigned ID
        // Keep the local blob URL for playback (it's already loaded and works)
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId
              ? {
                  ...msg,
                  id: String(data.id),
                  // Keep localAudioUrl - it works and is already loaded
                  // The server URL would require another fetch
                }
              : msg
          )
        )

        addToast('Voice message sent', 'success')
      } catch (error) {
        console.error('Error sending audio message:', error)
        addToast('Failed to send voice message', 'error')
        // Remove the optimistic message on error
        setMessages((prev) => prev.filter((msg) => msg.id !== tempId))
      } finally {
        setIsLoading(false)
      }
    }

    reader.readAsDataURL(audioBlob)
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {session && (
        <ResumeSelectorPanel
          clientId={clientId}
          onQALoaded={handleQALoaded}
        />
      )}
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
        <Card className="w-full max-w-4xl overflow-hidden border-0 shadow-2xl animate-fade-in">
          {session ? (
            <div className="flex h-[700px] flex-col">
              <ChatHeader
                onClose={closeChat}
                connectionStatus={wsState.status}
                connectionError={wsState.error}
              />
              <ChatMessages messages={messages} isLoading={isLoading} />
              <ChatInput
                onSendMessage={sendMessage}
                onSendAudio={sendAudioMessage}
                disabled={isLoading || wsState.status !== 'connected'}
                userId={user?.id}
              />
            </div>
        ) : (
          <div className="flex h-[700px] flex-col items-center justify-center space-y-6 bg-gradient-to-br from-slate-50 to-slate-100 p-12">
            <div className="text-center space-y-4">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg animate-pulse-glow">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="white"
                  className="w-10 h-10"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                  />
                </svg>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                AI Chat Assistant
              </h1>
              <p className="text-lg text-slate-600 max-w-md mx-auto">
                Start a conversation with our intelligent AI assistant. Get instant responses and helpful insights.
              </p>
            </div>

            {/* Login required message */}
            {!authLoading && !isAuthenticated && (
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-700">
                <Lock className="w-4 h-4" />
                <span className="text-sm font-medium">Please sign in to access all features</span>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={startChat}
                disabled={!isAuthenticated || authLoading}
                className={`group relative px-8 py-4 rounded-xl font-semibold text-lg shadow-lg transition-all duration-300 ${
                  isAuthenticated
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-2xl hover:scale-105'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <span className="relative z-10 flex items-center gap-2">
                  {!isAuthenticated && <Lock className="w-4 h-4" />}
                  Start Chatting
                  {isAuthenticated && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                      />
                    </svg>
                  )}
                </span>
                {isAuthenticated && (
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-700 to-purple-700 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
              {isAuthenticated ? (
                <a
                  href="/upload"
                  className="group relative px-8 py-4 bg-white border-2 border-indigo-200 text-indigo-600 rounded-xl font-semibold text-lg shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Upload Resume
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-5 h-5 group-hover:-translate-y-1 transition-transform"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                      />
                    </svg>
                  </span>
                  <div className="absolute inset-0 bg-indigo-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              ) : (
                <button
                  disabled
                  className="group relative px-8 py-4 bg-gray-100 border-2 border-gray-200 text-gray-400 rounded-xl font-semibold text-lg cursor-not-allowed"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Upload Resume
                  </span>
                </button>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
    </>
  )
}
