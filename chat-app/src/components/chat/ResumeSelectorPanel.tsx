'use client'

import { useState, useEffect, useRef } from 'react'
import { X, GripVertical, Check, Loader, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface Upload {
  id: number
  file_name: string
  created_at: string
  job_id?: string  // Analysis job ID (UUID-based)
  job_title?: string
}

interface ResumeSelectorPanelProps {
  clientId: string | null
  onQALoaded: (count: number) => void
}

export function ResumeSelectorPanel({ clientId, onQALoaded }: ResumeSelectorPanelProps) {
  const { user } = useAuth()
  const [uploads, setUploads] = useState<Upload[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingQA, setLoadingQA] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Dragging state
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 20, y: 100 })
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Resizing state
  const [isResizing, setIsResizing] = useState(false)
  const [size, setSize] = useState({ width: 320, height: 400 })
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })

  const panelRef = useRef<HTMLDivElement>(null)

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8081'

  // Load uploads when user changes
  useEffect(() => {
    loadUploads()
  }, [user?.id])

  const loadUploads = async () => {
    try {
      setLoading(true)
      setError(null)

      // Include user_id filter if user is authenticated
      const userIdParam = user?.id ? `&user_id=${user.id}` : ''
      const response = await fetch(`${backendUrl}/api/uploads?limit=50${userIdParam}`, {
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'ChatApp/1.0',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to load uploads')
      }

      const data = await response.json()
      setUploads(data.uploads || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load uploads')
    } finally {
      setLoading(false)
    }
  }

  const handleLoadQA = async (jobId: string) => {
    if (!clientId) {
      setError('No WebSocket connection')
      return
    }

    if (!jobId) {
      setError('No analysis found for this resume')
      return
    }

    try {
      setLoadingQA(true)
      setError(null)

      const response = await fetch(`${backendUrl}/api/chat/load-qa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'ChatApp/1.0',
        },
        body: JSON.stringify({
          client_id: clientId,
          user_id: jobId,  // Use job_id as user identifier
          job_id: jobId,
          limit: 20,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to load Q&A pairs')
      }

      const data = await response.json()
      if (data.success) {
        setSelectedJobId(jobId)
        onQALoaded(data.count)
      } else {
        throw new Error(data.message || 'Failed to load Q&A pairs')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Q&A pairs')
    } finally {
      setLoadingQA(false)
    }
  }

  // Dragging handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true)
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      })
    } else if ((e.target as HTMLElement).closest('.resize-handle')) {
      setIsResizing(true)
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        width: size.width,
        height: size.height,
      })
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    } else if (isResizing) {
      const deltaX = e.clientX - resizeStart.x
      const deltaY = e.clientY - resizeStart.y
      setSize({
        width: Math.max(280, resizeStart.width + deltaX),
        height: Math.max(200, resizeStart.height + deltaY),
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setIsResizing(false)
  }

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isResizing, dragStart, resizeStart])

  return (
    <div
      ref={panelRef}
      className="fixed bg-white rounded-lg shadow-2xl border border-gray-200 z-50"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: isCollapsed ? 'auto' : `${size.height}px`,
        cursor: isDragging ? 'grabbing' : isResizing ? 'nwse-resize' : 'default',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div className="drag-handle flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-t-lg cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-2">
          <GripVertical className="h-5 w-5" />
          <h3 className="font-semibold">Tools</h3>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hover:bg-white/20 rounded p-1 transition"
        >
          {isCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
        </button>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <>
          <div className="p-4 overflow-y-auto" style={{ height: `${size.height - 60}px` }}>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="h-6 w-6 animate-spin text-indigo-600" />
              </div>
            ) : uploads.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No uploads found</p>
            ) : (
              <div className="space-y-2">
                {uploads.map((upload) => {
                  const jobId = upload.job_id // Use actual analysis job ID
                  const hasAnalysis = !!jobId
                  const isSelected = selectedJobId === jobId
                  const isLoading = loadingQA

                  return (
                    <button
                      key={upload.id}
                      onClick={() => !isLoading && hasAnalysis && jobId && handleLoadQA(jobId)}
                      disabled={isLoading || !hasAnalysis}
                      className={`w-full text-left p-3 rounded-lg border transition ${
                        isSelected
                          ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-400'
                          : hasAnalysis
                          ? 'bg-white border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                          : 'bg-gray-50 border-gray-200 opacity-60'
                      } ${isLoading || !hasAnalysis ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 truncate">
                            {upload.file_name}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(upload.created_at).toLocaleDateString()}
                            {!hasAnalysis && (
                              <span className="ml-2 text-amber-600">• No analysis</span>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="h-5 w-5 text-indigo-600 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {selectedJobId && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-600">
                Q&A memory loaded. Your messages will be matched against saved questions.
              </p>
            </div>
          )}
        </>
      )}

      {/* Resize Handle */}
      {!isCollapsed && (
        <div className="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize">
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 16 16">
            <path d="M16 16V14l-2 2h2zM16 11v-1l-5 5h1l4-4zM16 6V5l-9 9h1l8-8z" />
          </svg>
        </div>
      )}
    </div>
  )
}
