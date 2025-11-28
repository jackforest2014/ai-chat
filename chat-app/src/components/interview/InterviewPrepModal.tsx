'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { X, Briefcase, Award, Building2, FileText, ListChecks } from 'lucide-react'

interface InterviewPrepModalProps {
  isOpen: boolean
  onClose: () => void
  jobId: string
}

export function InterviewPrepModal({ isOpen, onClose, jobId }: InterviewPrepModalProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    jobTitle: '',
    level: 'mid',
    targetCompany: '',
    jobDescription: '',
    jobRequirements: '',
  })

  if (!isOpen) return null

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    // Encode form data as URL parameters
    const params = new URLSearchParams({
      jobTitle: formData.jobTitle,
      level: formData.level,
      ...(formData.targetCompany && { targetCompany: formData.targetCompany }),
      ...(formData.jobDescription && { jobDescription: formData.jobDescription }),
      jobRequirements: formData.jobRequirements,
    })

    // Navigate to interview prep page
    router.push(`/interview/${jobId}?${params.toString()}`)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl animate-slide-in">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Prepare for Interview</h2>
            <p className="mt-1 text-sm text-slate-600">
              Tell us about the position you&apos;re applying for
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Job Title */}
          <div>
            <label htmlFor="jobTitle" className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Briefcase className="h-4 w-4 text-indigo-600" />
              Job Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="jobTitle"
              name="jobTitle"
              value={formData.jobTitle}
              onChange={handleChange}
              required
              placeholder="e.g., Backend Engineer, Marketing Manager"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-slate-900 placeholder-slate-400 transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Level */}
          <div>
            <label htmlFor="level" className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Award className="h-4 w-4 text-indigo-600" />
              Level <span className="text-red-500">*</span>
            </label>
            <select
              id="level"
              name="level"
              value={formData.level}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-slate-900 transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="intern">Intern</option>
              <option value="junior">Junior</option>
              <option value="mid">Mid-Level</option>
              <option value="senior">Senior</option>
              <option value="staff">Staff</option>
              <option value="principal">Principal</option>
              <option value="lead">Lead</option>
              <option value="manager">Manager</option>
              <option value="director">Director</option>
              <option value="vp">VP</option>
              <option value="c-level">C-Level</option>
            </select>
          </div>

          {/* Target Company */}
          <div>
            <label htmlFor="targetCompany" className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Building2 className="h-4 w-4 text-indigo-600" />
              Target Company <span className="text-sm font-normal text-slate-500">(Optional)</span>
            </label>
            <input
              type="text"
              id="targetCompany"
              name="targetCompany"
              value={formData.targetCompany}
              onChange={handleChange}
              placeholder="e.g., Google, Apple, Amazon"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-slate-900 placeholder-slate-400 transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Job Description */}
          <div>
            <label htmlFor="jobDescription" className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <FileText className="h-4 w-4 text-indigo-600" />
              Job Description <span className="text-sm font-normal text-slate-500">(Optional)</span>
            </label>
            <textarea
              id="jobDescription"
              name="jobDescription"
              value={formData.jobDescription}
              onChange={handleChange}
              rows={4}
              placeholder="Paste the job description here..."
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-slate-900 placeholder-slate-400 transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Job Requirements */}
          <div>
            <label htmlFor="jobRequirements" className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <ListChecks className="h-4 w-4 text-indigo-600" />
              Job Requirements <span className="text-red-500">*</span>
            </label>
            <textarea
              id="jobRequirements"
              name="jobRequirements"
              value={formData.jobRequirements}
              onChange={handleChange}
              required
              rows={4}
              placeholder="List the key skills and requirements for this position..."
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-slate-900 placeholder-slate-400 transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border-2 border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition-all hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.jobTitle || !formData.jobRequirements}
              className="flex-1 rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-indigo-600"
            >
              Prepare Interview
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
