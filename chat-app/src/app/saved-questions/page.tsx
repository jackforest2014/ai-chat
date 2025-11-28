'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Code, Users, Lightbulb, Puzzle, X, Bookmark } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface SavedQuestion {
  id: number
  user_id: string
  job_id: string
  question_id: string
  question: string
  answer: string
  category: string | null
  difficulty: string | null
  tags: string[]
  job_title: string | null
  company: string | null
  created_at: string
  updated_at: string
}

interface PaginationInfo {
  questions: SavedQuestion[]
  limit: number
  offset: number
  count: number
}

function SavedQuestionsLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading saved questions...</p>
        </div>
      </div>
    </div>
  )
}

export default function SavedQuestionsPage() {
  return (
    <Suspense fallback={<SavedQuestionsLoading />}>
      <SavedQuestionsContent />
    </Suspense>
  )
}

function SavedQuestionsContent() {
  const searchParams = useSearchParams()
  const jobId = searchParams.get('job_id')
  const { user } = useAuth()

  const [questions, setQuestions] = useState<SavedQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set())

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 20

  // Filter state
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [availableTags, setAvailableTags] = useState<Set<string>>(new Set())

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8081'

  // Load saved questions
  useEffect(() => {
    loadQuestions()
  }, [currentPage, selectedTags, jobId, user?.id])

  const loadQuestions = async () => {
    try {
      setLoading(true)
      setError(null)

      // If no jobId and no authenticated user, show error
      if (!jobId && !user?.id) {
        setError('No job selected or not logged in. Please navigate from the interview preparation page or log in.')
        setLoading(false)
        return
      }

      const offset = (currentPage - 1) * itemsPerPage
      const tagsParam = selectedTags.size > 0 ? `&tags=${Array.from(selectedTags).join(',')}` : ''

      // Build the user filter - prefer auth_user_id if logged in, otherwise use jobId
      let userFilter = ''
      if (user?.id) {
        userFilter = `auth_user_id=${user.id}`
      } else if (jobId) {
        userFilter = `user_id=${jobId}`
      }

      // Get saved questions filtered by user
      const response = await fetch(
        `${backendUrl}/api/interview/saved-questions?${userFilter}&limit=${itemsPerPage}&offset=${offset}${tagsParam}`,
        {
          headers: {
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'ChatApp/1.0',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to load saved questions: ${response.statusText}`)
      }

      const data: PaginationInfo = await response.json()
      setQuestions(data.questions || [])
      setTotalCount(data.count)

      // Extract all unique tags from questions
      const tags = new Set<string>()
      data.questions?.forEach(q => {
        if (q.category) tags.add(q.category.toLowerCase())
        if (q.difficulty) tags.add(q.difficulty.toLowerCase())
        q.tags?.forEach(tag => tags.add(tag.toLowerCase()))
      })
      setAvailableTags(tags)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const toggleQuestion = (id: number) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const toggleTagFilter = (tag: string) => {
    setSelectedTags(prev => {
      const newSet = new Set(prev)
      if (newSet.has(tag)) {
        newSet.delete(tag)
      } else {
        newSet.add(tag)
      }
      return newSet
    })
    setCurrentPage(1) // Reset to first page when filter changes
  }

  const clearFilters = () => {
    setSelectedTags(new Set())
    setCurrentPage(1)
  }

  const getDifficultyColor = (difficulty: string) => {
    const lower = difficulty.toLowerCase()
    if (lower === 'easy') return 'bg-green-100 text-green-700 border-green-300'
    if (lower === 'medium') return 'bg-yellow-100 text-yellow-700 border-yellow-300'
    if (lower === 'hard') return 'bg-red-100 text-red-700 border-red-300'
    return 'bg-gray-100 text-gray-700 border-gray-300'
  }

  const getCategoryColor = (category: string) => {
    const lower = category.toLowerCase()
    if (lower === 'technical') return 'bg-blue-100 text-blue-700 border-blue-300'
    if (lower === 'behavioral') return 'bg-purple-100 text-purple-700 border-purple-300'
    if (lower === 'situational') return 'bg-orange-100 text-orange-700 border-orange-300'
    if (lower === 'problem-solving') return 'bg-pink-100 text-pink-700 border-pink-300'
    return 'bg-gray-100 text-gray-700 border-gray-300'
  }

  const getCategoryIcon = (category: string) => {
    const lower = category.toLowerCase()
    if (lower === 'technical') return <Code className="h-3 w-3" />
    if (lower === 'behavioral') return <Users className="h-3 w-3" />
    if (lower === 'situational') return <Lightbulb className="h-3 w-3" />
    if (lower === 'problem-solving') return <Puzzle className="h-3 w-3" />
    return null
  }

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  if (loading && questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading saved questions...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Bookmark className="h-8 w-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900">Saved Interview Questions</h1>
          </div>
          <p className="text-gray-600 ml-11">
            Review your saved interview preparation Q&A pairs
          </p>
        </div>

        {/* Tag Filters */}
        {availableTags.size > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Filter by Tags</h2>
              {selectedTags.size > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <X className="h-4 w-4" />
                  Clear Filters
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from(availableTags).sort().map(tag => {
                const isSelected = selectedTags.has(tag)
                const isDifficulty = ['easy', 'medium', 'hard'].includes(tag)
                const isCategory = ['technical', 'behavioral', 'situational', 'problem-solving'].includes(tag)

                let colorClass = 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                if (isSelected) {
                  if (isDifficulty) {
                    colorClass = getDifficultyColor(tag)
                  } else if (isCategory) {
                    colorClass = getCategoryColor(tag)
                  } else {
                    colorClass = 'bg-indigo-100 text-indigo-700 border-indigo-300'
                  }
                }

                return (
                  <button
                    key={tag}
                    onClick={() => toggleTagFilter(tag)}
                    className={`px-3 py-1 rounded-full text-sm border transition-all ${colorClass} ${
                      isSelected ? 'ring-2 ring-offset-1 ring-indigo-400' : ''
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      {isCategory && getCategoryIcon(tag)}
                      {tag}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Questions List */}
        {questions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Bookmark className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Saved Questions</h3>
            <p className="text-gray-600">
              {selectedTags.size > 0
                ? 'No questions match your selected filters. Try clearing the filters.'
                : 'Start saving interview questions to build your preparation library.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q) => (
              <div key={q.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                {/* Question Header */}
                <div className="mb-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 flex-1">
                      {q.question}
                    </h3>
                  </div>

                  {/* Job Info */}
                  {(q.job_title || q.company) && (
                    <div className="text-sm text-gray-600 mb-3">
                      {q.job_title && <span className="font-medium">{q.job_title}</span>}
                      {q.job_title && q.company && <span className="mx-2">•</span>}
                      {q.company && <span>{q.company}</span>}
                    </div>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {/* Category tag */}
                    {q.category && (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getCategoryColor(q.category)}`}>
                        {getCategoryIcon(q.category)}
                        {q.category}
                      </span>
                    )}

                    {/* Difficulty tag */}
                    {q.difficulty && (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(q.difficulty)}`}>
                        {q.difficulty}
                      </span>
                    )}

                    {/* Other tags */}
                    {q.tags?.filter(tag => {
                      const lowerTag = tag.toLowerCase()
                      return lowerTag !== q.category?.toLowerCase() && lowerTag !== q.difficulty?.toLowerCase()
                    }).map((tag, idx) => (
                      <span key={idx} className="px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-700 border border-gray-300">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Answer Section */}
                <div className="mt-4">
                  <button
                    onClick={() => toggleQuestion(q.id)}
                    className="text-indigo-600 hover:text-indigo-700 font-medium text-sm flex items-center gap-1"
                  >
                    {expandedQuestions.has(q.id) ? 'Hide Answer' : 'Show Answer'}
                    <ChevronRight className={`h-4 w-4 transition-transform ${expandedQuestions.has(q.id) ? 'rotate-90' : ''}`} />
                  </button>

                  {expandedQuestions.has(q.id) && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-gray-800 whitespace-pre-wrap">{q.answer}</p>

                      {/* Metadata */}
                      <div className="mt-4 pt-4 border-t border-blue-200 text-xs text-gray-500">
                        Saved on {new Date(q.created_at).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: true
                        })}
                        {q.updated_at !== q.created_at && (
                          <span> • Updated {new Date(q.updated_at).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true
                          })}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
