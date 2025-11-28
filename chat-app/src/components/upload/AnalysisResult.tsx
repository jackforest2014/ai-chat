'use client'

import { useEffect, useState } from 'react'
import {
  User, MapPin, Calendar, Briefcase, GraduationCap,
  CheckCircle, AlertCircle, Target, TrendingUp, Loader, Linkedin, Sparkles
} from 'lucide-react'
import { InterviewPrepModal } from '@/components/interview/InterviewPrepModal'

interface ExperienceEntry {
  company: string
  role: string
  start_date?: string
  end_date?: string
  years: number
  description?: string
}

interface EducationEntry {
  degree: string
  institution: string
  year?: number
}

interface AnalysisResult {
  job_id: string
  status: string
  upload_id: number
  name?: string
  email?: string
  phone?: string
  linkedin_url?: string
  age?: number
  race?: string
  location?: string
  total_work_years?: number
  skills?: {
    technical?: string[]
    soft?: string[]
  }
  experience?: ExperienceEntry[]
  education?: EducationEntry[]
  summary?: string
  job_recommendations?: string[]
  strengths?: string[]
  weaknesses?: string[]
  created_at: string
  completed_at?: string
}

interface AnalysisResultProps {
  jobId: string
}

export function AnalysisResult({ jobId }: AnalysisResultProps) {
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInterviewModal, setShowInterviewModal] = useState(false)

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8081'
        const response = await fetch(`${backendUrl}/api/analysis/result?job_id=${jobId}`, {
          headers: {
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'ChatApp/1.0'
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch analysis result')
        }

        const data: AnalysisResult = await response.json()
        setResult(data)
      } catch (err) {
        console.error('Error fetching result:', err)
        setError(err instanceof Error ? err.message : 'Failed to load results')
      } finally {
        setLoading(false)
      }
    }

    fetchResult()
  }, [jobId])

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-xl animate-fade-in">
        <div className="flex items-center justify-center gap-3">
          <Loader className="h-6 w-6 animate-spin text-indigo-600" />
          <p className="text-slate-600">Loading analysis results...</p>
        </div>
      </div>
    )
  }

  if (error || !result) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-xl animate-fade-in">
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-6 w-6 flex-shrink-0 text-red-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Error Loading Results</p>
            <p className="text-sm text-red-700">{error || 'No results available'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Summary */}
      {result.summary && (
        <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-8 text-white shadow-xl">
          <h2 className="text-3xl font-bold">Profile Summary</h2>
          <p className="mt-4 text-lg leading-relaxed opacity-95">{result.summary}</p>
        </div>
      )}

      {/* Basic Information - Always Displayed */}
      <div className="rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-xl font-bold text-slate-900">Basic Information</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Name - Always shown */}
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-indigo-600" />
            <div>
              <p className="text-sm text-slate-500">Name</p>
              {result.name ? (
                <p className="font-semibold text-slate-900">{result.name}</p>
              ) : (
                <p className="italic text-slate-400">Not available</p>
              )}
            </div>
          </div>

          {/* Email - Always shown */}
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-indigo-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            <div>
              <p className="text-sm text-slate-500">Email</p>
              {result.email ? (
                <p className="font-semibold text-slate-900">{result.email}</p>
              ) : (
                <p className="italic text-slate-400">Not available</p>
              )}
            </div>
          </div>

          {/* Phone - Always shown */}
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-indigo-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
            <div>
              <p className="text-sm text-slate-500">Phone</p>
              {result.phone ? (
                <p className="font-semibold text-slate-900">{result.phone}</p>
              ) : (
                <p className="italic text-slate-400">Not available</p>
              )}
            </div>
          </div>

          {/* Location - Always shown */}
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-indigo-600" />
            <div>
              <p className="text-sm text-slate-500">Location</p>
              {result.location ? (
                <p className="font-semibold text-slate-900">{result.location}</p>
              ) : (
                <p className="italic text-slate-400">Not available</p>
              )}
            </div>
          </div>

          {/* Total Experience - Always shown */}
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-indigo-600" />
            <div>
              <p className="text-sm text-slate-500">Total Experience</p>
              {result.total_work_years !== null && result.total_work_years !== undefined ? (
                <p className="font-semibold text-slate-900">{result.total_work_years} years</p>
              ) : (
                <p className="italic text-slate-400">Not available</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Additional Information - Only shown if data exists */}
      {(result.linkedin_url || result.age) && (
        <div className="rounded-2xl bg-white p-6 shadow-xl">
          <h3 className="mb-4 text-xl font-bold text-slate-900">Additional Information</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {result.linkedin_url && (
              <div className="flex items-center gap-3">
                <Linkedin className="h-5 w-5 text-indigo-600" />
                <div>
                  <p className="text-sm text-slate-500">LinkedIn</p>
                  <a
                    href={result.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    View Profile
                  </a>
                </div>
              </div>
            )}
            {result.age && (
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-indigo-600" />
                <div>
                  <p className="text-sm text-slate-500">Age</p>
                  <p className="font-semibold text-slate-900">{result.age} years old</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Skills */}
      {result.skills && (result.skills.technical || result.skills.soft) && (
        <div className="rounded-2xl bg-white p-6 shadow-xl">
          <h3 className="mb-4 text-xl font-bold text-slate-900">Skills</h3>
          <div className="space-y-4">
            {result.skills.technical && result.skills.technical.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Technical Skills</p>
                <div className="flex flex-wrap gap-2">
                  {result.skills.technical.map((skill, index) => (
                    <span
                      key={index}
                      className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {result.skills.soft && result.skills.soft.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Soft Skills</p>
                <div className="flex flex-wrap gap-2">
                  {result.skills.soft.map((skill, index) => (
                    <span
                      key={index}
                      className="rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Experience */}
      {result.experience && result.experience.length > 0 && (
        <div className="rounded-2xl bg-white p-6 shadow-xl">
          <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-900">
            <Briefcase className="h-6 w-6 text-indigo-600" />
            Work Experience
          </h3>
          <div className="space-y-4">
            {result.experience.map((exp, index) => (
              <div key={index} className="border-l-4 border-indigo-500 pl-4">
                <p className="font-bold text-slate-900">{exp.role}</p>
                <p className="text-sm text-slate-600">{exp.company}</p>
                <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                  {exp.start_date && exp.end_date && (
                    <span>{exp.start_date} - {exp.end_date}</span>
                  )}
                  {exp.years > 0 && (
                    <span className="text-slate-400">({exp.years} years)</span>
                  )}
                </div>
                {exp.description && (
                  <p className="mt-2 text-sm text-slate-700">{exp.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {result.education && result.education.length > 0 && (
        <div className="rounded-2xl bg-white p-6 shadow-xl">
          <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-900">
            <GraduationCap className="h-6 w-6 text-indigo-600" />
            Education
          </h3>
          <div className="space-y-3">
            {result.education.map((edu, index) => (
              <div key={index} className="rounded-lg bg-slate-50 p-3">
                <p className="font-semibold text-slate-900">{edu.degree}</p>
                <p className="text-sm text-slate-600">{edu.institution}</p>
                {edu.year && <p className="text-sm text-slate-500">{edu.year}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Job Recommendations */}
      {result.job_recommendations && result.job_recommendations.length > 0 && (
        <div className="rounded-2xl bg-white p-6 shadow-xl">
          <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-900">
            <Target className="h-6 w-6 text-indigo-600" />
            Recommended Job Roles
          </h3>
          <div className="space-y-2">
            {result.job_recommendations.map((job, index) => (
              <div key={index} className="flex items-center gap-2 rounded-lg bg-indigo-50 p-3">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
                <span className="font-medium text-slate-900">{job}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Strengths */}
        {result.strengths && result.strengths.length > 0 && (
          <div className="rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-900">
              <CheckCircle className="h-6 w-6 text-green-600" />
              Strengths
            </h3>
            <ul className="space-y-2">
              {result.strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Weaknesses */}
        {result.weaknesses && result.weaknesses.length > 0 && (
          <div className="rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-900">
              <AlertCircle className="h-6 w-6 text-orange-600" />
              Areas for Improvement
            </h3>
            <ul className="space-y-2">
              {result.weaknesses.map((weakness, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-600" />
                  <span>{weakness}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Interview Preparation Button */}
      <div className="rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-6 shadow-xl">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="text-center md:text-left">
            <h3 className="text-2xl font-bold text-white">Ready for the Next Step?</h3>
            <p className="mt-1 text-green-50">
              Get AI-generated interview questions tailored to your profile and target position
            </p>
          </div>
          <button
            onClick={() => setShowInterviewModal(true)}
            className="flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-green-600 transition-all hover:bg-green-50 hover:shadow-lg"
          >
            <Sparkles className="h-5 w-5" />
            Prepare for Interviews
          </button>
        </div>
      </div>

      {/* Interview Preparation Modal */}
      <InterviewPrepModal
        isOpen={showInterviewModal}
        onClose={() => setShowInterviewModal(false)}
        jobId={jobId}
      />
    </div>
  )
}
