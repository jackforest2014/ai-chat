'use client'

import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { Message } from '@/types/chat'
import { Bot, User, CheckCircle, ChevronDown, ChevronUp, Mic } from 'lucide-react'
import { AudioMessage } from './AudioMessage'

interface ChatMessagesProps {
  messages: Message[]
  isLoading: boolean
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set())

  const toggleQuestion = (messageId: string) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(messageId)) {
        newSet.delete(messageId)
      } else {
        newSet.add(messageId)
      }
      return newSet
    })
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <ScrollArea className="flex-1 bg-gradient-to-b from-slate-50 to-white p-6" ref={scrollRef}>
      <div className="space-y-6">
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-3 animate-fade-in',
              message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            )}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                message.role === 'user'
                  ? 'bg-gradient-to-br from-indigo-500 to-purple-600'
                  : 'bg-gradient-to-br from-slate-200 to-slate-300'
              )}
            >
              {message.role === 'user' ? (
                <User className="h-5 w-5 text-white" />
              ) : (
                <Bot className="h-5 w-5 text-slate-700" />
              )}
            </div>
            <div
              className={cn(
                'flex max-w-[80%] flex-col gap-2 rounded-2xl px-4 py-3 shadow-md',
                message.role === 'user'
                  ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                  : 'bg-white text-slate-900 border border-slate-200'
              )}
            >
              {message.metadata?.from_qa && message.role === 'assistant' && message.metadata.question && (
                <div className="mb-2">
                  {/* Badge and similarity score */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-green-50 border border-green-200 rounded-full">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span className="text-xs font-medium text-green-700">from Q&A</span>
                    </div>
                    {message.metadata.similarity !== undefined && (
                      <span className="text-xs text-slate-400">
                        {Math.round(message.metadata.similarity * 100)}% match
                      </span>
                    )}
                  </div>

                  {/* Collapsible matched question */}
                  <div className="border border-amber-200 bg-amber-50 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleQuestion(message.id)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-amber-100 transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-xs font-semibold text-amber-800 uppercase tracking-wide flex-shrink-0">
                          Matched Question
                        </span>
                        {!expandedQuestions.has(message.id) && (
                          <span className="text-xs text-amber-600 truncate">
                            {message.metadata.question}
                          </span>
                        )}
                      </div>
                      {expandedQuestions.has(message.id) ? (
                        <ChevronUp className="h-4 w-4 text-amber-600 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-amber-600 flex-shrink-0" />
                      )}
                    </button>

                    {expandedQuestions.has(message.id) && (
                      <div className="px-3 pb-3 pt-1">
                        <p className="text-sm text-amber-900 leading-relaxed">
                          {message.metadata.question}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Audio message */}
              {message.msgType === 'audio' ? (
                (() => {
                  console.log('Rendering audio message:', { id: message.id, audioUrl: message.audioUrl, msgType: message.msgType })
                  return message.audioUrl ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Mic className={cn(
                          "h-4 w-4",
                          message.role === 'user' ? 'text-white/70' : 'text-slate-400'
                        )} />
                        <span className={cn(
                          "text-xs",
                          message.role === 'user' ? 'text-white/70' : 'text-slate-400'
                        )}>
                          Voice message
                        </span>
                      </div>
                      <AudioMessage
                        audioUrl={message.audioUrl}
                        durationMs={message.metadata?.duration_ms}
                        isFromUser={message.role === 'user'}
                      />
                      {/* Transcript if available */}
                      {message.content && (
                        <p className={cn(
                          "text-xs italic mt-1",
                          message.role === 'user' ? 'text-white/70' : 'text-slate-400'
                        )}>
                          {message.content}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-500">Audio message (no URL)</span>
                    </div>
                  )
                })()
              ) : (
                /* Text message */
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
              )}
              <span
                className={cn(
                  'text-xs',
                  message.role === 'user' ? 'text-white/70' : 'text-slate-500'
                )}
              >
                {format(new Date(message.timestamp), 'HH:mm')}
              </span>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 animate-fade-in">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300">
              <Bot className="h-5 w-5 text-slate-700" />
            </div>
            <div className="flex items-center gap-1 rounded-2xl bg-white px-4 py-3 shadow-md border border-slate-200">
              <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '0s' }} />
              <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '0.2s' }} />
              <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
