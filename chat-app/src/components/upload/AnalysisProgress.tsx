'use client'

import { useEffect, useState } from 'react'
import { Loader, CheckCircle, XCircle, FileText, Database, Brain, Sparkles, ChevronDown, ChevronRight } from 'lucide-react'

interface AnalysisStatus {
  job_id: string
  status: string
  progress: number
  current_step: string
  extracted_text?: string
  created_at: string
  updated_at: string
  completed_at?: string
  error_message?: string
}

interface AnalysisProgressProps {
  jobId: string
  onComplete?: (jobId: string) => void
  onError?: (error: string) => void
}

const STATUS_STEPS = [
  { key: 'queued', label: 'Queued', icon: Loader, color: 'text-blue-500' },
  { key: 'extracting_text', label: 'Extracting Text', icon: FileText, color: 'text-purple-500' },
  { key: 'chunking', label: 'Processing', icon: Database, color: 'text-indigo-500' },
  { key: 'generating_embeddings', label: 'Generating Embeddings', icon: Sparkles, color: 'text-pink-500' },
  { key: 'analyzing', label: 'AI Analysis', icon: Brain, color: 'text-green-500' },
  { key: 'completed', label: 'Complete', icon: CheckCircle, color: 'text-emerald-500' },
]

export function AnalysisProgress({ jobId, onComplete, onError }: AnalysisProgressProps) {
  const [status, setStatus] = useState<AnalysisStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(true)
  const [showExtractedText, setShowExtractedText] = useState(false)

  useEffect(() => {
    let pollInterval: NodeJS.Timeout

    const pollStatus = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8081'
        const url = `${backendUrl}/api/analysis/status?job_id=${jobId}`
        console.log('Polling status from:', url)

        const response = await fetch(url, {
          headers: {
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'ChatApp/1.0'
          }
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('Status check failed:', response.status, errorText)
          throw new Error(`Failed to fetch analysis status: ${response.status}`)
        }

        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text()
          console.error('Received non-JSON response:', text.substring(0, 200))
          throw new Error('Server returned non-JSON response')
        }

        const data: AnalysisStatus = await response.json()
        console.log('Status update:', data)
        setStatus(data)

        // Check if completed or failed
        if (data.status === 'completed') {
          setIsPolling(false)
          onComplete?.(jobId)
        } else if (data.status === 'failed') {
          setIsPolling(false)
          const errorMsg = data.error_message || 'Analysis failed'
          setError(errorMsg)
          onError?.(errorMsg)
        }
      } catch (err) {
        console.error('Error polling status:', err)
        setError(err instanceof Error ? err.message : 'Failed to check status')
        setIsPolling(false)
        onError?.(err instanceof Error ? err.message : 'Failed to check status')
      }
    }

    // Initial poll
    pollStatus()

    // Set up polling interval (every 2 seconds)
    if (isPolling) {
      pollInterval = setInterval(pollStatus, 2000)
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [jobId, isPolling, onComplete, onError])

  const getCurrentStepIndex = () => {
    if (!status) return 0
    return STATUS_STEPS.findIndex(step => step.key === status.status)
  }

  const currentStepIndex = getCurrentStepIndex()

  if (error) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-xl animate-fade-in">
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <XCircle className="mt-0.5 h-6 w-6 flex-shrink-0 text-red-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Analysis Failed</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!status) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-xl animate-fade-in">
        <div className="flex items-center justify-center gap-3">
          <Loader className="h-6 w-6 animate-spin text-indigo-600" />
          <p className="text-slate-600">Loading analysis status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white p-8 shadow-xl animate-fade-in">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h3 className="text-2xl font-bold text-slate-900">
            {status.status === 'completed' ? 'Analysis Complete!' : 'Analyzing Your Resume'}
          </h3>
          <p className="mt-2 text-sm text-slate-600">{status.current_step}</p>
        </div>

        {/* Progress Bar */}
        <div className="relative">
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500 ease-out"
              style={{ width: `${status.progress}%` }}
            >
              <div className="h-full w-full animate-pulse bg-white/20" />
            </div>
          </div>
          <div className="mt-2 text-center">
            <span className="text-2xl font-bold text-indigo-600">{status.progress}%</span>
          </div>
        </div>

        {/* Step Indicators */}
        <div className="space-y-3">
          {STATUS_STEPS.filter(step => step.key !== 'queued').map((step, index) => {
            const stepIndex = index + 1 // Skip queued
            const isCompleted = stepIndex < currentStepIndex
            const isCurrent = stepIndex === currentStepIndex
            const Icon = step.icon

            return (
              <div
                key={step.key}
                className={`flex items-center gap-4 rounded-lg p-3 transition-all duration-300 ${
                  isCurrent
                    ? 'bg-indigo-50 border border-indigo-200'
                    : isCompleted
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-slate-50 border border-slate-200'
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    isCurrent
                      ? 'bg-indigo-100'
                      : isCompleted
                      ? 'bg-green-100'
                      : 'bg-slate-200'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <Icon
                      className={`h-6 w-6 ${
                        isCurrent ? 'text-indigo-600 animate-pulse' : 'text-slate-400'
                      }`}
                    />
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className={`text-sm font-semibold ${
                      isCurrent
                        ? 'text-indigo-900'
                        : isCompleted
                        ? 'text-green-900'
                        : 'text-slate-500'
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
                {isCurrent && (
                  <Loader className="h-5 w-5 animate-spin text-indigo-600" />
                )}
              </div>
            )
          })}
        </div>

        {/* Extracted Text (if available) */}
        {status.extracted_text && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
            <button
              onClick={() => setShowExtractedText(!showExtractedText)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                <span className="font-semibold text-slate-900">Extracted Text</span>
                <span className="text-xs text-slate-500">
                  ({status.extracted_text.length} characters)
                </span>
              </div>
              {showExtractedText ? (
                <ChevronDown className="h-5 w-5 text-slate-600" />
              ) : (
                <ChevronRight className="h-5 w-5 text-slate-600" />
              )}
            </button>
            {showExtractedText && (
              <div className="border-t border-slate-200 p-4 bg-white">
                <div className="max-h-96 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <pre className="whitespace-pre-wrap text-sm text-slate-700 font-mono">
                    {status.extracted_text}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Job Info */}
        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-xs text-slate-500">
            Job ID: <span className="font-mono text-slate-700">{status.job_id}</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Started: {new Date(status.created_at).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  )
}
