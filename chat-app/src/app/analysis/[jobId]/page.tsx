'use client'

import { useParams, useRouter } from 'next/navigation'
import { AnalysisResult } from '@/components/upload/AnalysisResult'
import { ArrowLeft, Upload, Bookmark } from 'lucide-react'

export default function AnalysisPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.jobId as string

  const handleUploadAnother = () => {
    router.push('/upload')
  }

  const handleViewSavedQuestions = () => {
    router.push('/saved-questions')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 inline-flex items-center gap-2 text-slate-600 transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </button>
          <div className="text-center">
            <h1 className="mb-2 text-4xl font-bold text-slate-900">
              Resume Analysis Result
            </h1>
            <p className="text-lg text-slate-600">
              Job ID: <span className="font-mono text-sm">{jobId}</span>
            </p>
          </div>
        </div>

        {/* Analysis Result */}
        <AnalysisResult jobId={jobId} />

        {/* Action Buttons */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            onClick={handleUploadAnother}
            className="w-full rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition-all duration-200 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2"
          >
            <span className="flex items-center justify-center gap-2">
              <Upload className="h-5 w-5" />
              Analyze Another Resume
            </span>
          </button>
          <button
            onClick={handleViewSavedQuestions}
            className="w-full rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white transition-all duration-200 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2"
          >
            <span className="flex items-center justify-center gap-2">
              <Bookmark className="h-5 w-5" />
              View Saved Questions
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
