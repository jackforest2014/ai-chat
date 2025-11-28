'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Send, Mic, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ChatInputProps {
  onSendMessage: (message: string) => void
  onSendAudio?: (audioBlob: Blob, durationMs: number) => void
  disabled?: boolean
  userId?: number
}

// Get supported mime type for audio recording
function getSupportedMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/mpeg',
  ]

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }

  return 'audio/webm' // fallback
}

export function ChatInput({ onSendMessage, onSendAudio, disabled, userId }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [isInitializing, setIsInitializing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingStartTimeRef = useRef<number>(0)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || disabled) return

    onSendMessage(message)
    setMessage('')
  }

  const startRecording = useCallback(async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault() // Prevent default to avoid UI shake

    if (!onSendAudio || isInitializing || isRecording) return

    setIsInitializing(true)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        }
      })

      streamRef.current = stream

      const mimeType = getSupportedMimeType()
      console.log('Using audio mime type:', mimeType)

      const mediaRecorder = new MediaRecorder(stream, { mimeType })

      audioChunksRef.current = []
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
        const durationMs = Date.now() - recordingStartTimeRef.current

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }

        // Only send if we have audio data and a meaningful duration
        if (audioBlob.size > 0 && durationMs > 300) {
          console.log('Sending audio:', audioBlob.size, 'bytes,', durationMs, 'ms')
          onSendAudio(audioBlob, durationMs)
        }

        // Clear interval
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current)
          durationIntervalRef.current = null
        }
        setRecordingDuration(0)
      }

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
        stopRecording()
      }

      recordingStartTimeRef.current = Date.now()
      mediaRecorder.start(100) // Collect data every 100ms
      setIsRecording(true)
      setIsInitializing(false)

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - recordingStartTimeRef.current) / 1000))
      }, 1000)
    } catch (err) {
      console.error('Failed to start recording:', err)
      setIsInitializing(false)

      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          alert('Microphone access denied. Please allow microphone access in your browser settings.')
        } else if (err.name === 'NotFoundError') {
          alert('No microphone found. Please connect a microphone and try again.')
        } else {
          alert(`Could not access microphone: ${err.message}`)
        }
      } else {
        alert('Could not access microphone. Please ensure you have granted microphone permissions.')
      }
    }
  }, [onSendAudio, isInitializing, isRecording])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
    setIsInitializing(false)
  }, [])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    if (isRecording) {
      stopRecording()
    }
  }, [isRecording, stopRecording])

  const handleMouseLeave = useCallback((e: React.MouseEvent) => {
    if (isRecording) {
      stopRecording()
    }
  }, [isRecording, stopRecording])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    if (isRecording) {
      stopRecording()
    }
  }, [isRecording, stopRecording])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const isButtonBusy = isRecording || isInitializing

  return (
    <div className="border-t bg-white p-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={isRecording ? `Recording... ${formatDuration(recordingDuration)}` : "Type your message..."}
          disabled={disabled || isButtonBusy}
          className="flex-1 focus-visible:ring-indigo-500"
        />

        {/* Microphone button */}
        {onSendAudio && (
          <Button
            type="button"
            variant={isButtonBusy ? "destructive" : "outline"}
            disabled={disabled}
            onMouseDown={startRecording}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onTouchStart={startRecording}
            onTouchEnd={handleTouchEnd}
            className={`transition-all duration-300 select-none ${
              isButtonBusy
                ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                : 'hover:bg-indigo-50 hover:border-indigo-300'
            }`}
            title={isRecording ? "Release to send" : "Hold to record"}
          >
            {isInitializing ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isRecording ? (
              <Square className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
        )}

        {/* Send button */}
        <Button
          type="submit"
          disabled={disabled || !message.trim() || isButtonBusy}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-300"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>

      {isRecording && (
        <div className="mt-2 text-center text-sm text-red-500 animate-pulse">
          🎤 Recording... Release to send
        </div>
      )}

      {isInitializing && (
        <div className="mt-2 text-center text-sm text-gray-500">
          Accessing microphone...
        </div>
      )}
    </div>
  )
}
