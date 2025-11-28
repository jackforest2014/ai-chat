'use client'

import { X, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConnectionStatus } from './ConnectionStatus'
import type { ConnectionStatus as Status } from '@/types/websocket'

interface ChatHeaderProps {
  onClose: () => void
  connectionStatus: Status
  connectionError?: string | null
}

export function ChatHeader({ onClose, connectionStatus, connectionError }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div
            className={`absolute -bottom-1 -right-1 w-3 h-3 border-2 border-white rounded-full ${
              connectionStatus === 'connected'
                ? 'bg-green-400'
                : connectionStatus === 'connecting' || connectionStatus === 'reconnecting'
                ? 'bg-yellow-400'
                : 'bg-red-400'
            }`}
          />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">AI Assistant</h2>
          <ConnectionStatus
            status={connectionStatus}
            error={connectionError}
            className="text-white/90"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          onClick={onClose}
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 transition-colors"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
