'use client'

import { useState, useEffect, Suspense, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  User,
  Mail,
  Calendar,
  Shield,
  Bell,
  Palette,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Check,
  Loader2,
  FileText,
  ExternalLink,
  Trash2,
  Upload,
  Brain,
  MessageSquare,
  Clock,
  AlertCircle,
  Play,
  RefreshCw,
  Sparkles,
  Download
} from 'lucide-react'
import Link from 'next/link'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { InterviewPrepModal } from '@/components/interview/InterviewPrepModal'

// Animated Progress Bar Component
function AnimatedProgressBar({ progress, status }: { progress: number; status: string }) {
  const getGradientColors = () => {
    if (status === 'queued') return 'from-gray-400 via-gray-500 to-gray-400'
    return 'from-indigo-500 via-purple-500 to-pink-500'
  }

  return (
    <div className="w-full">
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        {/* Progress fill with gradient and animation */}
        <div
          className={`h-full bg-gradient-to-r ${getGradientColors()} rounded-full transition-all duration-500 ease-out relative`}
          style={{ width: `${Math.max(progress, 2)}%` }}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
        </div>
      </div>
      <div className="flex justify-between items-center mt-1">
        <span className="text-xs text-gray-500">{progress}%</span>
        <span className="text-xs text-indigo-600 font-medium animate-pulse">Processing...</span>
      </div>
    </div>
  )
}

// Pulsing Status Indicator Component
function PulsingStatusIndicator({ status }: { status: string }) {
  const getColors = () => {
    switch (status) {
      case 'queued':
        return { bg: 'bg-gray-400', ring: 'ring-gray-400/30' }
      case 'extracting_text':
        return { bg: 'bg-blue-500', ring: 'ring-blue-500/30' }
      case 'chunking':
        return { bg: 'bg-indigo-500', ring: 'ring-indigo-500/30' }
      case 'generating_embeddings':
        return { bg: 'bg-purple-500', ring: 'ring-purple-500/30' }
      case 'analyzing':
        return { bg: 'bg-pink-500', ring: 'ring-pink-500/30' }
      default:
        return { bg: 'bg-indigo-500', ring: 'ring-indigo-500/30' }
    }
  }

  const colors = getColors()

  return (
    <div className="relative flex items-center justify-center w-8 h-8">
      {/* Outer pulsing ring */}
      <div className={`absolute inset-0 rounded-full ${colors.bg} opacity-20 animate-ping`} />
      {/* Middle ring */}
      <div className={`absolute inset-1 rounded-full ${colors.bg} opacity-40 animate-pulse`} />
      {/* Inner solid circle */}
      <div className={`relative w-4 h-4 rounded-full ${colors.bg} ring-4 ${colors.ring}`}>
        <Sparkles className="w-2.5 h-2.5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
    </div>
  )
}

interface UserUpload {
  id: number
  file_name: string
  file_size: number
  mime_type: string
  linkedin_url?: string
  job_id?: string
  created_at: string
  updated_at: string
}

interface AnalysisJob {
  id: number
  job_id: string
  upload_id: number
  user_id?: number
  status: string
  progress: number
  current_step: string
  error_message?: string
  created_at: string
  updated_at: string
  completed_at?: string
}

function ProfileLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileLoading />}>
      <ProfileContent />
    </Suspense>
  )
}

function ProfileContent() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') || 'profile'

  const [activeTab, setActiveTab] = useState(initialTab)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Uploads state
  const [uploads, setUploads] = useState<UserUpload[]>([])
  const [uploadsLoading, setUploadsLoading] = useState(false)
  const [uploadsExpanded, setUploadsExpanded] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // Delete confirmation modal state (for uploads)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [uploadToDelete, setUploadToDelete] = useState<UserUpload | null>(null)

  // Delete confirmation modal state (for jobs)
  const [deleteJobModalOpen, setDeleteJobModalOpen] = useState(false)
  const [jobToDelete, setJobToDelete] = useState<{ job: AnalysisJob; uploadId: number } | null>(null)
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null)

  // Retry confirmation modal state (for failed jobs)
  const [retryJobModalOpen, setRetryJobModalOpen] = useState(false)
  const [jobToRetry, setJobToRetry] = useState<{ job: AnalysisJob; uploadId: number } | null>(null)
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null)

  // Export dropdown state
  const [exportDropdownOpen, setExportDropdownOpen] = useState<string | null>(null)

  // Batch delete state
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set())
  const [batchDeleteModalOpen, setBatchDeleteModalOpen] = useState(false)
  const [deletingBatch, setDeletingBatch] = useState(false)

  // Interview prep modal state
  const [interviewPrepModalOpen, setInterviewPrepModalOpen] = useState(false)
  const [interviewPrepJobId, setInterviewPrepJobId] = useState<string | null>(null)

  // Jobs state - map of upload_id to jobs
  const [jobsByUpload, setJobsByUpload] = useState<Record<number, AnalysisJob[]>>({})
  const [expandedUploads, setExpandedUploads] = useState<Set<number>>(new Set())
  const [loadingJobs, setLoadingJobs] = useState<Set<number>>(new Set())
  const [analyzingUpload, setAnalyzingUpload] = useState<number | null>(null)

  // Settings state (mock for now)
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    updates: true,
  })
  const [theme, setTheme] = useState('light')

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8081'

  // Polling interval ref
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Helper to check if a job is in progress (not completed or failed)
  const isJobInProgress = useCallback((job: AnalysisJob) => {
    return job.status !== 'completed' && job.status !== 'failed'
  }, [])

  // Get all expanded uploads that have in-progress jobs
  const getExpandedUploadsWithInProgressJobs = useCallback(() => {
    const result: number[] = []
    expandedUploads.forEach(uploadId => {
      const jobs = jobsByUpload[uploadId] || []
      if (jobs.some(isJobInProgress)) {
        result.push(uploadId)
      }
    })
    return result
  }, [expandedUploads, jobsByUpload, isJobInProgress])

  // Fetch status for a single job
  const fetchJobStatus = useCallback(async (jobId: string): Promise<AnalysisJob | null> => {
    try {
      const response = await fetch(`${backendUrl}/api/analysis/status?job_id=${jobId}`, {
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'ChatApp/1.0',
        },
      })
      if (!response.ok) return null
      return await response.json()
    } catch {
      return null
    }
  }, [backendUrl])

  // Update jobs for expanded uploads with in-progress jobs
  const updateInProgressJobs = useCallback(async () => {
    const uploadsToUpdate = getExpandedUploadsWithInProgressJobs()
    if (uploadsToUpdate.length === 0) return

    for (const uploadId of uploadsToUpdate) {
      const jobs = jobsByUpload[uploadId] || []
      const inProgressJobs = jobs.filter(isJobInProgress)

      // Fetch updated status for each in-progress job
      const updatedJobs = await Promise.all(
        jobs.map(async (job) => {
          if (isJobInProgress(job)) {
            const updated = await fetchJobStatus(job.job_id)
            if (updated) {
              return { ...job, ...updated }
            }
          }
          return job
        })
      )

      // Update state with new job data
      setJobsByUpload(prev => ({
        ...prev,
        [uploadId]: updatedJobs
      }))
    }
  }, [getExpandedUploadsWithInProgressJobs, jobsByUpload, isJobInProgress, fetchJobStatus])

  // Auto-polling effect for in-progress jobs
  useEffect(() => {
    const uploadsWithInProgressJobs = getExpandedUploadsWithInProgressJobs()

    if (uploadsWithInProgressJobs.length > 0) {
      // Start polling
      if (!pollingIntervalRef.current) {
        pollingIntervalRef.current = setInterval(() => {
          updateInProgressJobs()
        }, 2000) // Poll every 2 seconds
      }
    } else {
      // Stop polling when no in-progress jobs are visible
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }

    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [getExpandedUploadsWithInProgressJobs, updateInProgressJobs])

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/')
    }
  }, [isLoading, isAuthenticated, router])

  // Load user uploads
  useEffect(() => {
    if (user?.id) {
      loadUploads()
    }
  }, [user?.id])

  // Clear selection when uploads are collapsed
  useEffect(() => {
    setSelectedJobs(prev => {
      const newSet = new Set(prev)
      // Remove jobs from collapsed uploads
      Array.from(newSet).forEach(jobId => {
        const job = Object.values(jobsByUpload)
          .flat()
          .find(j => j.job_id === jobId)
        if (job) {
          const uploadId = Object.keys(jobsByUpload).find(key =>
            jobsByUpload[parseInt(key)].some(j => j.job_id === jobId)
          )
          if (uploadId && !expandedUploads.has(parseInt(uploadId))) {
            newSet.delete(jobId)
          }
        }
      })
      return newSet
    })
  }, [expandedUploads, jobsByUpload])

  const loadUploads = async () => {
    if (!user?.id) return

    try {
      setUploadsLoading(true)
      const response = await fetch(`${backendUrl}/api/uploads?user_id=${user.id}&limit=50`, {
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
      console.error('Failed to load uploads:', err)
    } finally {
      setUploadsLoading(false)
    }
  }

  // Load jobs for a specific upload
  const loadJobsForUpload = async (uploadId: number) => {
    if (loadingJobs.has(uploadId)) return

    try {
      setLoadingJobs(prev => new Set(prev).add(uploadId))
      const response = await fetch(`${backendUrl}/api/analysis/upload-jobs?upload_id=${uploadId}`, {
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'ChatApp/1.0',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to load jobs')
      }

      const data = await response.json()
      setJobsByUpload(prev => ({
        ...prev,
        [uploadId]: data.jobs || []
      }))
    } catch (err) {
      console.error('Failed to load jobs:', err)
    } finally {
      setLoadingJobs(prev => {
        const next = new Set(prev)
        next.delete(uploadId)
        return next
      })
    }
  }

  // Toggle upload expansion and load jobs if needed
  const toggleUploadExpanded = (uploadId: number) => {
    setExpandedUploads(prev => {
      const next = new Set(prev)
      if (next.has(uploadId)) {
        next.delete(uploadId)
      } else {
        next.add(uploadId)
        // Load jobs if not already loaded
        if (!jobsByUpload[uploadId]) {
          loadJobsForUpload(uploadId)
        }
      }
      return next
    })
  }

  // Start a new analysis for an upload
  const handleAnalyze = async (uploadId: number) => {
    if (analyzingUpload) return

    try {
      setAnalyzingUpload(uploadId)
      const params = new URLSearchParams({ id: String(uploadId) })
      if (user?.id) {
        params.append('user_id', String(user.id))
      }

      const response = await fetch(`${backendUrl}/api/analyze?${params.toString()}`, {
        method: 'POST',
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'ChatApp/1.0',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to start analysis')
      }

      // Refresh jobs for this upload
      await loadJobsForUpload(uploadId)

      // Expand to show the new job
      setExpandedUploads(prev => new Set(prev).add(uploadId))
    } catch (err) {
      console.error('Failed to start analysis:', err)
    } finally {
      setAnalyzingUpload(null)
    }
  }

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return { bg: 'bg-green-100', text: 'text-green-700', icon: Check }
      case 'failed':
        return { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle }
      case 'queued':
        return { bg: 'bg-gray-100', text: 'text-gray-700', icon: Clock }
      default:
        return { bg: 'bg-blue-100', text: 'text-blue-700', icon: RefreshCw }
    }
  }

  // Count total jobs across all uploads
  const getTotalJobs = () => {
    return Object.values(jobsByUpload).reduce((sum, jobs) => sum + jobs.length, 0)
  }

  // Count completed jobs
  const getCompletedJobs = () => {
    return Object.values(jobsByUpload).reduce(
      (sum, jobs) => sum + jobs.filter(j => j.status === 'completed').length,
      0
    )
  }

  // Open delete confirmation modal
  const handleDeleteClick = (upload: UserUpload) => {
    setUploadToDelete(upload)
    setDeleteModalOpen(true)
  }

  // Close delete confirmation modal
  const handleDeleteModalClose = () => {
    setDeleteModalOpen(false)
    setUploadToDelete(null)
  }

  // Perform the actual delete
  const handleDeleteConfirm = async () => {
    if (!uploadToDelete) return

    const uploadId = uploadToDelete.id

    try {
      setDeletingId(uploadId)
      const response = await fetch(`${backendUrl}/api/upload/delete?id=${uploadId}`, {
        method: 'DELETE',
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'ChatApp/1.0',
        },
      })

      if (response.ok) {
        // Remove from uploads list
        setUploads(uploads.filter(u => u.id !== uploadId))
        // Remove from jobs state
        setJobsByUpload(prev => {
          const next = { ...prev }
          delete next[uploadId]
          return next
        })
        // Remove from expanded state
        setExpandedUploads(prev => {
          const next = new Set(prev)
          next.delete(uploadId)
          return next
        })
        // Close modal on success
        handleDeleteModalClose()
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Delete failed' }))
        console.error('Failed to delete upload:', errorData.error)
        // Keep modal open and show error - user can try again or cancel
        alert(`Failed to delete: ${errorData.error}`)
      }
    } catch (err) {
      console.error('Failed to delete upload:', err)
      alert('Failed to delete upload. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  // Open job delete confirmation modal
  const handleDeleteJobClick = (job: AnalysisJob, uploadId: number) => {
    setJobToDelete({ job, uploadId })
    setDeleteJobModalOpen(true)
  }

  // Close job delete confirmation modal
  const handleDeleteJobModalClose = () => {
    setDeleteJobModalOpen(false)
    setJobToDelete(null)
  }

  // Perform the actual job delete
  const handleDeleteJobConfirm = async () => {
    if (!jobToDelete) return

    const { job, uploadId } = jobToDelete

    try {
      setDeletingJobId(job.job_id)
      const response = await fetch(`${backendUrl}/api/analysis/delete-job?job_id=${job.job_id}`, {
        method: 'DELETE',
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'ChatApp/1.0',
        },
      })

      if (response.ok) {
        // Remove job from state
        setJobsByUpload(prev => ({
          ...prev,
          [uploadId]: (prev[uploadId] || []).filter(j => j.job_id !== job.job_id)
        }))
        // Close modal on success
        handleDeleteJobModalClose()
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Delete failed' }))
        console.error('Failed to delete job:', errorData.error)
        alert(`Failed to delete: ${errorData.error || errorData.message}`)
      }
    } catch (err) {
      console.error('Failed to delete job:', err)
      alert('Failed to delete job. Please try again.')
    } finally {
      setDeletingJobId(null)
    }
  }

  // Open retry confirmation modal
  const handleRetryJobClick = (job: AnalysisJob, uploadId: number) => {
    setJobToRetry({ job, uploadId })
    setRetryJobModalOpen(true)
  }

  // Close retry confirmation modal
  const handleRetryJobModalClose = () => {
    setRetryJobModalOpen(false)
    setJobToRetry(null)
  }

  // Perform the actual job retry
  const handleRetryJobConfirm = async () => {
    if (!jobToRetry) return

    const { job, uploadId } = jobToRetry

    try {
      setRetryingJobId(job.job_id)
      const response = await fetch(`${backendUrl}/api/analysis/retry-job?job_id=${job.job_id}`, {
        method: 'POST',
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'ChatApp/1.0',
        },
      })

      if (response.ok) {
        // Update job status in state to 'queued'
        setJobsByUpload(prev => ({
          ...prev,
          [uploadId]: (prev[uploadId] || []).map(j =>
            j.job_id === job.job_id
              ? { ...j, status: 'queued', progress: 0, current_step: 'Job queued for processing', error_message: undefined }
              : j
          )
        }))
        // Close modal on success
        handleRetryJobModalClose()
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Retry failed' }))
        console.error('Failed to retry job:', errorData.error)
        alert(`Failed to retry: ${errorData.error || errorData.message}`)
      }
    } catch (err) {
      console.error('Failed to retry job:', err)
      alert('Failed to retry job. Please try again.')
    } finally {
      setRetryingJobId(null)
    }
  }

  // Handle export download
  const handleExport = async (jobId: string, format: string) => {
    try {
      setExportDropdownOpen(null) // Close dropdown
      const response = await fetch(`${backendUrl}/api/analysis/export?job_id=${jobId}&format=${format}`, {
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'ChatApp/1.0',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Export failed' }))
        console.error('Export failed:', errorData.error)
        alert(`Export failed: ${errorData.error || errorData.message}`)
        return
      }

      // Get the filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `resume_analysis_${jobId}.${format}`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename=(.+)/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
      alert('Export failed. Please try again.')
    }
  }

  // Helper function to check if job is deletable (completed or failed)
  const isDeletable = (status: string) => {
    return status === 'completed' || status === 'failed'
  }

  // Get all deletable jobs for an upload
  const getDeletableJobsForUpload = (uploadId: number): AnalysisJob[] => {
    const jobs = jobsByUpload[uploadId] || []
    return jobs.filter(job => isDeletable(job.status))
  }

  // Handle individual job selection
  const handleJobSelection = (jobId: string, checked: boolean) => {
    setSelectedJobs(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(jobId)
      } else {
        newSet.delete(jobId)
      }
      return newSet
    })
  }

  // Handle select all for an upload
  const handleSelectAllForUpload = (uploadId: number, checked: boolean) => {
    const deletableJobs = getDeletableJobsForUpload(uploadId)
    setSelectedJobs(prev => {
      const newSet = new Set(prev)
      if (checked) {
        deletableJobs.forEach(job => newSet.add(job.job_id))
      } else {
        deletableJobs.forEach(job => newSet.delete(job.job_id))
      }
      return newSet
    })
  }

  // Check if all deletable jobs for an upload are selected
  const areAllDeletableSelected = (uploadId: number): boolean => {
    const deletableJobs = getDeletableJobsForUpload(uploadId)
    if (deletableJobs.length === 0) return false
    return deletableJobs.every(job => selectedJobs.has(job.job_id))
  }

  // Get count of selected jobs for an upload
  const getSelectedCountForUpload = (uploadId: number): number => {
    const jobs = jobsByUpload[uploadId] || []
    return jobs.filter(job => selectedJobs.has(job.job_id)).length
  }

  // Handle batch delete button click
  const handleBatchDeleteClick = () => {
    if (selectedJobs.size === 0) return
    setBatchDeleteModalOpen(true)
  }

  // Handle batch delete confirmation
  const handleBatchDeleteConfirm = async () => {
    setDeletingBatch(true)
    setBatchDeleteModalOpen(false)

    try {
      const response = await fetch(`${backendUrl}/api/analysis/batch-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'ChatApp/1.0',
        },
        body: JSON.stringify({
          job_ids: Array.from(selectedJobs)
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Batch deletion failed')
      }

      const result = await response.json()

      // Optimistic UI update: remove deleted jobs from all uploads
      setJobsByUpload(prev => {
        const updated = { ...prev }
        Object.keys(updated).forEach(uploadIdStr => {
          const uploadId = parseInt(uploadIdStr)
          updated[uploadId] = updated[uploadId].filter(
            job => !selectedJobs.has(job.job_id)
          )
        })
        return updated
      })

      // Clear selection
      setSelectedJobs(new Set())

      // Show success message
      alert(`Successfully deleted ${result.deleted_count} job(s)`)
    } catch (error) {
      console.error('Batch delete error:', error)
      alert('Failed to delete jobs. Please try again.')

      // Refresh to show actual state
      const expandedArray = Array.from(expandedUploads)
      expandedArray.forEach(uploadId => {
        loadJobsForUpload(uploadId)
      })
    } finally {
      setDeletingBatch(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Update tab when URL changes
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) {
      setActiveTab(tab)
    }
  }, [searchParams])

  const handleSaveSettings = async () => {
    setSaving(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (isLoading) {
    return <ProfileLoading />
  }

  if (!isAuthenticated || !user) {
    return null
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Shield },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Profile Header Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
          {/* Cover */}
          <div className="h-32 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

          {/* Profile Info */}
          <div className="relative px-6 pb-6">
            {/* Avatar */}
            <div className="absolute -top-12 left-6">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center border-4 border-white shadow-lg">
                <span className="text-white font-bold text-3xl">
                  {user.name?.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>

            {/* User Details */}
            <div className="pt-14">
              <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
              <p className="text-gray-500 flex items-center gap-2 mt-1">
                <Mail className="w-4 h-4" />
                {user.email}
              </p>
              <p className="text-gray-400 text-sm flex items-center gap-2 mt-2">
                <Calendar className="w-4 h-4" />
                Member since {new Date(user.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>

                {/* Profile Fields */}
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                      <User className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-900">{user.name}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-900">{user.email}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      User ID
                    </label>
                    <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                      <Shield className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-900 font-mono text-sm">#{user.id}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Created
                    </label>
                    <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-900">
                        {new Date(user.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-8">
                  <h3 className="text-md font-semibold text-gray-900 mb-4">Activity Overview</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 border border-indigo-200">
                      <p className="text-3xl font-bold text-indigo-600">{uploads.length}</p>
                      <p className="text-sm text-indigo-600/70">Resumes Uploaded</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                      <p className="text-3xl font-bold text-purple-600">{uploads.filter(u => u.job_id).length}</p>
                      <p className="text-sm text-purple-600/70">Resumes Analyzed</p>
                    </div>
                    <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-4 border border-pink-200">
                      <Link href="/saved-questions" className="block hover:opacity-80 transition">
                        <p className="text-3xl font-bold text-pink-600">View</p>
                        <p className="text-sm text-pink-600/70">Saved Questions</p>
                      </Link>
                    </div>
                  </div>
                </div>

                {/* My Resumes Section */}
                <div className="mt-8">
                  <button
                    onClick={() => setUploadsExpanded(!uploadsExpanded)}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <h3 className="text-md font-semibold text-gray-900 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-gray-500" />
                      My Resumes
                      <span className="text-sm font-normal text-gray-500">({uploads.length})</span>
                    </h3>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-500 transition-transform ${
                        uploadsExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {uploadsExpanded && (
                    <div className="mt-4">
                      {uploadsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                        </div>
                      ) : uploads.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-200">
                          <Upload className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500 mb-4">No resumes uploaded yet</p>
                          <Link
                            href="/upload"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                          >
                            <Upload className="w-4 h-4" />
                            Upload Resume
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {uploads.map((upload) => {
                            const isExpanded = expandedUploads.has(upload.id)
                            const jobs = jobsByUpload[upload.id] || []
                            const isLoadingJobs = loadingJobs.has(upload.id)
                            const hasJobs = jobs.length > 0
                            const completedJobs = jobs.filter(j => j.status === 'completed')

                            return (
                              <div
                                key={upload.id}
                                className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden"
                              >
                                {/* Resume Header */}
                                <div className="flex items-center gap-4 p-4">
                                  {/* Expand/Collapse Button */}
                                  <button
                                    onClick={() => toggleUploadExpanded(upload.id)}
                                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded-lg transition"
                                  >
                                    <ChevronRight
                                      className={`w-5 h-5 text-gray-500 transition-transform ${
                                        isExpanded ? 'rotate-90' : ''
                                      }`}
                                    />
                                  </button>

                                  {/* File Icon */}
                                  <div className="flex-shrink-0 w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                                    <FileText className="w-6 h-6 text-indigo-600" />
                                  </div>

                                  {/* File Info */}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 truncate">{upload.file_name}</p>
                                    <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                      <span>{formatFileSize(upload.file_size)}</span>
                                      <span>•</span>
                                      <span>{new Date(upload.created_at).toLocaleDateString()}</span>
                                      {hasJobs && (
                                        <>
                                          <span>•</span>
                                          <span className="text-indigo-600">
                                            {jobs.length} analysis job{jobs.length !== 1 ? 's' : ''}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {/* Actions */}
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleAnalyze(upload.id)}
                                      disabled={analyzingUpload === upload.id}
                                      className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-1"
                                      title="Start new analysis"
                                    >
                                      {analyzingUpload === upload.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Play className="w-4 h-4" />
                                      )}
                                      Analyze
                                    </button>
                                    <button
                                      onClick={() => handleDeleteClick(upload)}
                                      disabled={deletingId === upload.id}
                                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition disabled:opacity-50"
                                      title="Delete"
                                    >
                                      {deletingId === upload.id ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                      ) : (
                                        <Trash2 className="w-5 h-5" />
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {/* Jobs List (Collapsible) */}
                                {isExpanded && (
                                  <div className="border-t border-gray-200 bg-white">
                                    {isLoadingJobs ? (
                                      <div className="flex items-center justify-center py-6">
                                        <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                                        <span className="ml-2 text-sm text-gray-500">Loading analysis jobs...</span>
                                      </div>
                                    ) : jobs.length === 0 ? (
                                      <div className="py-6 text-center text-gray-500 text-sm">
                                        No analysis jobs yet. Click &quot;Analyze&quot; to start one.
                                      </div>
                                    ) : (
                                      <>
                                        {/* Batch Actions Bar - Only show when upload is expanded and has jobs */}
                                        {jobs.length > 0 && (
                                          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                              <input
                                                type="checkbox"
                                                checked={areAllDeletableSelected(upload.id)}
                                                onChange={(e) => handleSelectAllForUpload(upload.id, e.target.checked)}
                                                disabled={getDeletableJobsForUpload(upload.id).length === 0}
                                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                title="Select all deletable jobs"
                                              />
                                              <span className="text-sm text-gray-600">
                                                {getSelectedCountForUpload(upload.id) > 0
                                                  ? `${getSelectedCountForUpload(upload.id)} selected`
                                                  : 'Select all'}
                                              </span>
                                            </div>
                                            {getSelectedCountForUpload(upload.id) > 0 && (
                                              <button
                                                onClick={handleBatchDeleteClick}
                                                disabled={deletingBatch}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition disabled:opacity-50"
                                              >
                                                {deletingBatch ? (
                                                  <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                  <Trash2 className="w-4 h-4" />
                                                )}
                                                Delete Selected ({getSelectedCountForUpload(upload.id)})
                                              </button>
                                            )}
                                          </div>
                                        )}
                                        <div className="divide-y divide-gray-100">
                                        {jobs.map((job) => {
                                          const statusBadge = getStatusBadge(job.status)
                                          const StatusIcon = statusBadge.icon
                                          const jobInProgress = isJobInProgress(job)

                                          return (
                                            <div
                                              key={job.job_id}
                                              className={`pr-4 py-3 transition ${
                                                jobInProgress
                                                  ? 'bg-gradient-to-r from-indigo-50/50 via-purple-50/30 to-pink-50/50'
                                                  : selectedJobs.has(job.job_id)
                                                  ? 'bg-indigo-50'
                                                  : 'hover:bg-gray-50'
                                              }`}
                                            >
                                              <div className="flex items-center gap-4">
                                                {/* Checkbox for batch selection */}
                                                <div className="flex-shrink-0 pl-4">
                                                  <input
                                                    type="checkbox"
                                                    checked={selectedJobs.has(job.job_id)}
                                                    onChange={(e) => handleJobSelection(job.job_id, e.target.checked)}
                                                    disabled={!isDeletable(job.status)}
                                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-30"
                                                    onClick={(e) => e.stopPropagation()}
                                                  />
                                                </div>

                                                {/* Status Icon - Animated for in-progress */}
                                                {jobInProgress ? (
                                                  <PulsingStatusIndicator status={job.status} />
                                                ) : (
                                                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${statusBadge.bg}`}>
                                                    <StatusIcon className={`w-4 h-4 ${statusBadge.text}`} />
                                                  </div>
                                                )}

                                                {/* Job Info */}
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-2">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
                                                      {job.status.replace(/_/g, ' ')}
                                                    </span>
                                                    {jobInProgress && (
                                                      <span className="flex items-center gap-1 text-xs text-indigo-600">
                                                        <RefreshCw className="w-3 h-3 animate-spin" />
                                                        Auto-updating
                                                      </span>
                                                    )}
                                                  </div>
                                                  <p className={`text-sm mt-1 truncate ${
                                                    jobInProgress ? 'text-indigo-700 font-medium' : 'text-gray-600'
                                                  }`}>
                                                    {job.current_step || 'Waiting...'}
                                                  </p>
                                                  <p className="text-xs text-gray-400 mt-0.5">
                                                    {new Date(job.created_at).toLocaleString()}
                                                  </p>
                                                </div>

                                                {/* Job Actions */}
                                                <div className="flex items-center gap-1">
                                                  {job.status === 'completed' && (
                                                    <>
                                                      <Link
                                                        href={`/analysis/${job.job_id}`}
                                                        className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition"
                                                        title="View Analysis"
                                                      >
                                                        <Brain className="w-4 h-4" />
                                                      </Link>
                                                      <button
                                                        onClick={() => {
                                                          setInterviewPrepJobId(job.job_id)
                                                          setInterviewPrepModalOpen(true)
                                                        }}
                                                        className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition"
                                                        title="Interview Prep"
                                                      >
                                                        <MessageSquare className="w-4 h-4" />
                                                      </button>
                                                      <div className="relative">
                                                        <button
                                                          onClick={() => setExportDropdownOpen(exportDropdownOpen === job.job_id ? null : job.job_id)}
                                                          className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition"
                                                          title="Export"
                                                        >
                                                          <Download className="w-4 h-4" />
                                                        </button>
                                                        {exportDropdownOpen === job.job_id && (
                                                          <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
                                                            <button
                                                              onClick={() => handleExport(job.job_id, 'json')}
                                                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 rounded-t-lg"
                                                            >
                                                              JSON
                                                            </button>
                                                            <button
                                                              onClick={() => handleExport(job.job_id, 'csv')}
                                                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                                                            >
                                                              CSV
                                                            </button>
                                                            <button
                                                              onClick={() => handleExport(job.job_id, 'pdf')}
                                                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                                                            >
                                                              PDF
                                                            </button>
                                                            <button
                                                              onClick={() => handleExport(job.job_id, 'docx')}
                                                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 rounded-b-lg"
                                                            >
                                                              DOCX
                                                            </button>
                                                          </div>
                                                        )}
                                                      </div>
                                                      <button
                                                        onClick={() => handleDeleteJobClick(job, upload.id)}
                                                        disabled={deletingJobId === job.job_id}
                                                        className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition disabled:opacity-50"
                                                        title="Delete Job"
                                                      >
                                                        {deletingJobId === job.job_id ? (
                                                          <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                          <Trash2 className="w-4 h-4" />
                                                        )}
                                                      </button>
                                                    </>
                                                  )}
                                                  {job.status === 'failed' && (
                                                    <>
                                                      {job.error_message && (
                                                        <span
                                                          className="text-xs text-red-600 max-w-[100px] truncate"
                                                          title={job.error_message}
                                                        >
                                                          {job.error_message}
                                                        </span>
                                                      )}
                                                      <button
                                                        onClick={() => handleRetryJobClick(job, upload.id)}
                                                        disabled={retryingJobId === job.job_id}
                                                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition disabled:opacity-50"
                                                        title="Retry Job"
                                                      >
                                                        {retryingJobId === job.job_id ? (
                                                          <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                          <RefreshCw className="w-4 h-4" />
                                                        )}
                                                      </button>
                                                      <button
                                                        onClick={() => handleDeleteJobClick(job, upload.id)}
                                                        disabled={deletingJobId === job.job_id}
                                                        className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition disabled:opacity-50"
                                                        title="Delete Job"
                                                      >
                                                        {deletingJobId === job.job_id ? (
                                                          <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                          <Trash2 className="w-4 h-4" />
                                                        )}
                                                      </button>
                                                    </>
                                                  )}
                                                </div>
                                              </div>

                                              {/* Animated Progress Bar for in-progress jobs */}
                                              {jobInProgress && (
                                                <div className="mt-3 ml-16">
                                                  <AnimatedProgressBar
                                                    progress={job.progress}
                                                    status={job.status}
                                                  />
                                                </div>
                                              )}
                                            </div>
                                          )
                                        })}
                                      </div>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}

                          {/* Upload More Button */}
                          <Link
                            href="/upload"
                            className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition"
                          >
                            <Upload className="w-5 h-5" />
                            Upload Another Resume
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-8">
                {/* Notifications */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-gray-500" />
                    Notifications
                  </h2>
                  <div className="space-y-4">
                    <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                      <div>
                        <p className="font-medium text-gray-900">Email Notifications</p>
                        <p className="text-sm text-gray-500">Receive updates via email</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.email}
                        onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                      <div>
                        <p className="font-medium text-gray-900">Push Notifications</p>
                        <p className="text-sm text-gray-500">Receive browser push notifications</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.push}
                        onChange={(e) => setNotifications({ ...notifications, push: e.target.checked })}
                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                      <div>
                        <p className="font-medium text-gray-900">Product Updates</p>
                        <p className="text-sm text-gray-500">Get notified about new features</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.updates}
                        onChange={(e) => setNotifications({ ...notifications, updates: e.target.checked })}
                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                    </label>
                  </div>
                </div>

                {/* Appearance */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Palette className="w-5 h-5 text-gray-500" />
                    Appearance
                  </h2>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setTheme('light')}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                        theme === 'light'
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="w-full h-16 bg-white rounded-lg border border-gray-200 mb-3 flex items-center justify-center">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg"></div>
                      </div>
                      <p className="font-medium text-gray-900">Light</p>
                    </button>

                    <button
                      onClick={() => setTheme('dark')}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                        theme === 'dark'
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="w-full h-16 bg-gray-800 rounded-lg border border-gray-700 mb-3 flex items-center justify-center">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-lg"></div>
                      </div>
                      <p className="font-medium text-gray-900">Dark</p>
                    </button>

                    <button
                      onClick={() => setTheme('system')}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                        theme === 'system'
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="w-full h-16 bg-gradient-to-r from-white to-gray-800 rounded-lg border border-gray-300 mb-3 flex items-center justify-center">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg"></div>
                      </div>
                      <p className="font-medium text-gray-900">System</p>
                    </button>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <button
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-70"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Saving...
                      </>
                    ) : saved ? (
                      <>
                        <Check className="w-5 h-5" />
                        Saved!
                      </>
                    ) : (
                      'Save Settings'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={handleDeleteModalClose}
        onConfirm={handleDeleteConfirm}
        title="Delete Resume"
        message={
          uploadToDelete ? (
            <div className="space-y-2">
              <p>Are you sure you want to delete this resume?</p>
              <p className="font-medium text-gray-900">{uploadToDelete.file_name}</p>
              <p className="text-sm text-gray-500">
                This will also delete all associated analysis jobs and cannot be undone.
              </p>
            </div>
          ) : (
            'Are you sure you want to delete this resume?'
          )
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deletingId !== null}
      />

      {/* Delete Job Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteJobModalOpen}
        onClose={handleDeleteJobModalClose}
        onConfirm={handleDeleteJobConfirm}
        title="Delete Analysis Job"
        message={
          jobToDelete ? (
            <div className="space-y-2">
              <p>Are you sure you want to delete this analysis job?</p>
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="text-gray-600">
                  <span className="font-medium">Status:</span>{' '}
                  <span className={jobToDelete.job.status === 'completed' ? 'text-green-600' : 'text-red-600'}>
                    {jobToDelete.job.status}
                  </span>
                </p>
                <p className="text-gray-600 mt-1">
                  <span className="font-medium">Created:</span>{' '}
                  {new Date(jobToDelete.job.created_at).toLocaleString()}
                </p>
              </div>
              <p className="text-sm text-gray-500">
                This will also delete the associated profile data and cannot be undone.
              </p>
            </div>
          ) : (
            'Are you sure you want to delete this analysis job?'
          )
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deletingJobId !== null}
      />

      {/* Retry Job Confirmation Modal */}
      <ConfirmModal
        isOpen={retryJobModalOpen}
        onClose={handleRetryJobModalClose}
        onConfirm={handleRetryJobConfirm}
        title="Retry Analysis Job"
        message={
          jobToRetry ? (
            <div className="space-y-2">
              <p>Are you sure you want to retry this failed analysis job?</p>
              <div className="bg-blue-50 rounded-lg p-3 text-sm">
                <p className="text-gray-600">
                  <span className="font-medium">Job ID:</span>{' '}
                  <span className="text-blue-600 font-mono text-xs">{jobToRetry.job.job_id}</span>
                </p>
                {jobToRetry.job.error_message && (
                  <p className="text-red-600 mt-2">
                    <span className="font-medium">Previous Error:</span>{' '}
                    {jobToRetry.job.error_message}
                  </p>
                )}
                <p className="text-gray-600 mt-1">
                  <span className="font-medium">Created:</span>{' '}
                  {new Date(jobToRetry.job.created_at).toLocaleString()}
                </p>
              </div>
              <p className="text-sm text-gray-500">
                The job will be reset and reprocessed from the beginning. Previous analysis data will be cleared.
              </p>
            </div>
          ) : (
            'Are you sure you want to retry this analysis job?'
          )
        }
        confirmText="Retry Job"
        cancelText="Cancel"
        variant="info"
        isLoading={retryingJobId !== null}
      />

      {/* Batch Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={batchDeleteModalOpen}
        onClose={() => setBatchDeleteModalOpen(false)}
        onConfirm={handleBatchDeleteConfirm}
        title="Delete Multiple Jobs"
        message={
          <div className="space-y-2">
            <p>Are you sure you want to delete {selectedJobs.size} job(s)? This action cannot be undone.</p>
            <div className="mt-4 max-h-48 overflow-y-auto">
              <p className="text-sm text-gray-600 mb-2">Jobs to be deleted:</p>
              <ul className="space-y-1">
                {Array.from(selectedJobs).slice(0, 10).map(jobId => {
                  // Find the job to show details
                  const job = Object.values(jobsByUpload)
                    .flat()
                    .find(j => j.job_id === jobId)

                  return (
                    <li key={jobId} className="text-sm text-gray-700">
                      • Job {jobId.slice(0, 8)}... {job ? `(${job.status})` : ''}
                    </li>
                  )
                })}
                {selectedJobs.size > 10 && (
                  <li className="text-sm text-gray-500 italic">
                    ...and {selectedJobs.size - 10} more
                  </li>
                )}
              </ul>
            </div>
          </div>
        }
        confirmText="Delete All"
        cancelText="Cancel"
        variant="danger"
        isLoading={deletingBatch}
      />

      {/* Interview Prep Modal */}
      {interviewPrepJobId && (
        <InterviewPrepModal
          isOpen={interviewPrepModalOpen}
          onClose={() => {
            setInterviewPrepModalOpen(false)
            setInterviewPrepJobId(null)
          }}
          jobId={interviewPrepJobId}
        />
      )}
    </div>
  )
}
