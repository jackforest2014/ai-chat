'use client'

import { useState, useRef, ChangeEvent, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, Link2, CheckCircle, AlertCircle, Loader, Brain } from 'lucide-react'
import { AnalysisProgress } from './AnalysisProgress'
import { useAuth } from '@/contexts/AuthContext'

interface UploadResponse {
  id: number
  file_name: string
  file_size: number
  linkedin_url?: string
  message: string
}

export function UploadForm() {
  const router = useRouter()
  const { user } = useAuth()
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [showProgress, setShowProgress] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ]

      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Please upload a PDF or Word document (.pdf, .doc, .docx)')
        setFile(null)
        return
      }

      // Validate file size (10MB)
      const maxSize = 10 * 1024 * 1024
      if (selectedFile.size > maxSize) {
        setError('File size must be less than 10MB')
        setFile(null)
        return
      }

      setFile(selectedFile)
      setError(null)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!file) {
      setError('Please select a resume file')
      return
    }

    // Validate LinkedIn URL if provided
    if (linkedinUrl && !linkedinUrl.match(/^https?:\/\/(www\.)?linkedin\.com\/.+/)) {
      setError('Please enter a valid LinkedIn URL')
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('resume', file)
      if (linkedinUrl) {
        formData.append('linkedin_url', linkedinUrl)
      }
      if (user?.id) {
        formData.append('user_id', String(user.id))
      }

      // Get backend URL from environment or use default
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8081'
      const response = await fetch(`${backendUrl}/api/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(errorData.error || 'Failed to upload file')
      }

      const data: UploadResponse = await response.json()
      setUploadResponse(data)
      setSuccess(true)

      // Don't reset form immediately - allow user to analyze the uploaded resume
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during upload')
    } finally {
      setUploading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!uploadResponse) return

    setError(null)

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8081'
      const params = new URLSearchParams({ id: String(uploadResponse.id) })
      if (user?.id) {
        params.append('user_id', String(user.id))
      }
      const response = await fetch(`${backendUrl}/api/analyze?${params.toString()}`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Analysis failed' }))
        throw new Error(errorData.error || 'Failed to analyze resume')
      }

      const data = await response.json()

      // Show progress tracking
      setJobId(data.job_id)
      setShowProgress(true)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during analysis')
    }
  }

  const handleAnalysisComplete = (completedJobId: string) => {
    console.log('Analysis completed:', completedJobId)
    // Redirect to the dedicated analysis result page
    router.push(`/analysis/${completedJobId}`)
  }

  const handleAnalysisError = (errorMsg: string) => {
    console.error('Analysis error:', errorMsg)
    setError(errorMsg)
    setShowProgress(false)
  }

  const resetForm = () => {
    setFile(null)
    setLinkedinUrl('')
    setUploadResponse(null)
    setSuccess(false)
    setError(null)
    setJobId(null)
    setShowProgress(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  // If showing progress, render only the progress component
  if (showProgress && jobId) {
    return (
      <div className="space-y-6">
        <AnalysisProgress
          jobId={jobId}
          onComplete={handleAnalysisComplete}
          onError={handleAnalysisError}
        />
        <button
          onClick={resetForm}
          className="w-full rounded-xl border-2 border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-50"
        >
          Cancel & Upload Another
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white p-8 shadow-xl animate-fade-in">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* LinkedIn URL Input */}
        <div>
          <label htmlFor="linkedin" className="mb-2 block text-sm font-semibold text-slate-700">
            LinkedIn Profile URL (Optional)
          </label>
          <div className="relative">
            <Link2 className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="url"
              id="linkedin"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/your-profile"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-11 pr-4 text-slate-900 placeholder-slate-400 transition-all duration-200 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* File Upload */}
        <div>
          <label htmlFor="resume" className="mb-2 block text-sm font-semibold text-slate-700">
            Resume File <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="file"
              id="resume"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center transition-all duration-200 hover:border-indigo-400 hover:bg-indigo-50 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <Upload className="mx-auto mb-3 h-12 w-12 text-slate-400" />
              <p className="mb-1 text-sm font-medium text-slate-700">
                {file ? 'Change file' : 'Click to upload resume'}
              </p>
              <p className="text-xs text-slate-500">
                PDF, DOC, DOCX (Max 10MB)
              </p>
            </button>
          </div>

          {/* Selected File Display */}
          {file && (
            <div className="mt-3 flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3 animate-slide-in">
              <FileText className="h-5 w-5 text-indigo-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">{file.name}</p>
                <p className="text-xs text-slate-600">{formatFileSize(file.size)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 animate-slide-in">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">Upload Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && uploadResponse && (
          <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 animate-slide-in">
            <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">Upload Successful!</p>
              <p className="text-sm text-green-700">{uploadResponse.message}</p>
              <p className="mt-1 text-xs text-green-600">
                File: {uploadResponse.file_name} ({formatFileSize(uploadResponse.file_size)})
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Upload Button */}
          {!uploadResponse && (
            <button
              type="submit"
              disabled={!file || uploading}
              className="w-full rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition-all duration-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2"
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader className="h-5 w-5 animate-spin" />
                  Uploading...
                </span>
              ) : (
                'Upload Resume'
              )}
            </button>
          )}

          {/* Analyze Button - Only shown after successful upload */}
          {uploadResponse && (
            <>
              <button
                type="button"
                onClick={handleAnalyze}
                className="w-full rounded-xl bg-green-600 px-6 py-3 font-semibold text-white transition-all duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:ring-offset-2"
              >
                <span className="flex items-center justify-center gap-2">
                  <Brain className="h-5 w-5" />
                  Analyze Resume
                </span>
              </button>

              {/* Upload Another Button */}
              <button
                type="button"
                onClick={resetForm}
                className="w-full rounded-xl border-2 border-indigo-200 bg-white px-6 py-3 font-semibold text-indigo-600 transition-all duration-200 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2"
              >
                Upload Another Resume
              </button>
            </>
          )}
        </div>

        {/* Info Text */}
        <p className="text-center text-xs text-slate-500">
          Your information is securely stored and will only be used for application purposes.
        </p>
      </form>
    </div>
  )
}
