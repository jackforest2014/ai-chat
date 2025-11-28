'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AudioMessageProps {
  audioUrl: string
  durationMs?: number
  isFromUser: boolean
}

export function AudioMessage({ audioUrl, durationMs, isFromUser }: AudioMessageProps) {
  // Calculate initial duration from prop (convert ms to seconds)
  const initialDuration = durationMs && durationMs > 0 ? durationMs / 1000 : 0

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(initialDuration)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string>(audioUrl)

  // Keep track of the URL to detect changes
  useEffect(() => {
    urlRef.current = audioUrl
  }, [audioUrl])

  useEffect(() => {
    // Don't do anything if no URL
    if (!audioUrl) {
      console.log('AudioMessage: No audioUrl provided')
      setError('No audio URL')
      setIsLoading(false)
      return
    }

    console.log('AudioMessage: Initializing with URL:', audioUrl.substring(0, 50) + '...')

    // Reset state
    setError(null)
    setIsLoading(true)
    setIsReady(false)
    setCurrentTime(0)
    setIsPlaying(false)

    // Create audio element
    const audio = new Audio()
    audioRef.current = audio

    const handleLoadedMetadata = () => {
      console.log('AudioMessage: Loaded metadata, duration:', audio.duration)
      if (urlRef.current === audioUrl) {
        // Use audio.duration if valid, otherwise fall back to durationMs prop
        const audioDuration = audio.duration
        if (isFinite(audioDuration) && audioDuration > 0) {
          setDuration(audioDuration)
        } else if (durationMs && durationMs > 0) {
          setDuration(durationMs / 1000)
        }
        setIsLoading(false)
        setIsReady(true)
      }
    }

    const handleCanPlay = () => {
      console.log('AudioMessage: Can play')
      if (urlRef.current === audioUrl) {
        setIsLoading(false)
        setIsReady(true)
      }
    }

    const handleTimeUpdate = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime)
      }
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    const handleError = (e: Event) => {
      console.error('AudioMessage: Error event:', e)
      console.error('AudioMessage: Audio error:', audio.error)
      console.error('AudioMessage: URL was:', audioUrl.substring(0, 100))
      if (urlRef.current === audioUrl) {
        setError('Failed to load audio')
        setIsLoading(false)
      }
    }

    // Attach listeners
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    // Set source
    audio.preload = 'metadata'
    audio.src = audioUrl

    return () => {
      console.log('AudioMessage: Cleanup for URL:', audioUrl.substring(0, 50) + '...')
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      audio.pause()
      // Don't clear src immediately - let it be garbage collected
    }
  }, [audioUrl, durationMs])

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current || !isReady) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => {
          console.error('AudioMessage: Play failed:', err)
          setError('Failed to play')
        })
    }
  }, [isPlaying, isReady])

  const formatTime = (seconds: number) => {
    // Handle invalid values
    if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) {
      return '0:00'
    }
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  if (error) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
        isFromUser ? 'bg-indigo-100' : 'bg-gray-100'
      }`}>
        <Volume2 className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-500">Audio unavailable</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg min-w-[200px] ${
      isFromUser
        ? 'bg-indigo-100'
        : 'bg-gray-100'
    }`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={togglePlayPause}
        disabled={isLoading || !isReady}
        className={`h-8 w-8 p-0 rounded-full ${
          isFromUser
            ? 'hover:bg-indigo-200'
            : 'hover:bg-gray-200'
        }`}
      >
        {isLoading ? (
          <div className="h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        ) : isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 ml-0.5" />
        )}
      </Button>

      <div className="flex-1 flex flex-col gap-1">
        {/* Progress bar */}
        <div className="relative h-1 bg-gray-300 rounded-full overflow-hidden">
          <div
            className={`absolute left-0 top-0 h-full transition-all duration-100 ${
              isFromUser ? 'bg-indigo-500' : 'bg-gray-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Time display */}
        <div className="flex justify-between text-xs text-gray-500">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <Volume2 className={`h-4 w-4 ${
        isFromUser ? 'text-indigo-400' : 'text-gray-400'
      }`} />
    </div>
  )
}
