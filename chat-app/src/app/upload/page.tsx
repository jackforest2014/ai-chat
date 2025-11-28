'use client'

import { UploadForm } from '@/components/upload/UploadForm'

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-slate-900">
            Upload Your Resume
          </h1>
          <p className="text-lg text-slate-600">
            Share your resume and LinkedIn profile to get started
          </p>
        </div>

        <UploadForm />
      </div>
    </div>
  )
}
