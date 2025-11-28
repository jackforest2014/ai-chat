'use client'

import { useState, useEffect, Suspense } from 'react'
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
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'

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

  const handleDeleteUpload = async (uploadId: number) => {
    if (!confirm('Are you sure you want to delete this resume and all its analysis jobs?')) return

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
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Delete failed' }))
        console.error('Failed to delete upload:', errorData.error)
        alert(`Failed to delete: ${errorData.error}`)
      }
    } catch (err) {
      console.error('Failed to delete upload:', err)
      alert('Failed to delete upload. Please try again.')
    } finally {
      setDeletingId(null)
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
                                      onClick={() => handleDeleteUpload(upload.id)}
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
                                      <div className="divide-y divide-gray-100">
                                        {jobs.map((job) => {
                                          const statusBadge = getStatusBadge(job.status)
                                          const StatusIcon = statusBadge.icon

                                          return (
                                            <div
                                              key={job.job_id}
                                              className="flex items-center gap-4 pl-12 pr-4 py-3 hover:bg-gray-50 transition"
                                            >
                                              {/* Status Icon */}
                                              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${statusBadge.bg}`}>
                                                <StatusIcon className={`w-4 h-4 ${statusBadge.text}`} />
                                              </div>

                                              {/* Job Info */}
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
                                                    {job.status}
                                                  </span>
                                                  {job.status !== 'completed' && job.status !== 'failed' && (
                                                    <span className="text-xs text-gray-500">
                                                      {job.progress}%
                                                    </span>
                                                  )}
                                                </div>
                                                <p className="text-sm text-gray-600 mt-1 truncate">
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
                                                    <Link
                                                      href={`/interview/${job.job_id}`}
                                                      className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition"
                                                      title="Interview Prep"
                                                    >
                                                      <MessageSquare className="w-4 h-4" />
                                                    </Link>
                                                  </>
                                                )}
                                                {job.status === 'failed' && job.error_message && (
                                                  <span
                                                    className="text-xs text-red-600 max-w-[150px] truncate"
                                                    title={job.error_message}
                                                  >
                                                    {job.error_message}
                                                  </span>
                                                )}
                                                {job.status !== 'completed' && job.status !== 'failed' && (
                                                  <button
                                                    onClick={() => loadJobsForUpload(upload.id)}
                                                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition"
                                                    title="Refresh status"
                                                  >
                                                    <RefreshCw className="w-4 h-4" />
                                                  </button>
                                                )}
                                              </div>
                                            </div>
                                          )
                                        })}
                                      </div>
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
    </div>
  )
}
