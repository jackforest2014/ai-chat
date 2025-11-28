'use client'

import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowLeft, Loader, AlertCircle, Sparkles, CheckCircle2, RefreshCw, Filter, ChevronDown, ChevronUp, Code, Users, Lightbulb, Puzzle, Save, Check, Bookmark } from 'lucide-react'

interface InterviewQuestion {
  id: string
  question: string
  category: string
  difficulty: string
  tags: string[]
  answer: string
}

export default function InterviewPrepPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const jobId = params.jobId as string

  const [questions, setQuestions] = useState<InterviewQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'none' | 'difficulty' | 'category'>('none')
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set())
  const [regeneratingAnswers, setRegeneratingAnswers] = useState<Set<string>>(new Set())
  const [savedQuestions, setSavedQuestions] = useState<Set<string>>(new Set())
  const [savingQuestions, setSavingQuestions] = useState<Set<string>>(new Set())

  // Get job details from URL parameters
  const jobTitle = searchParams.get('jobTitle') || ''
  const level = searchParams.get('level') || ''
  const targetCompany = searchParams.get('targetCompany') || ''
  const jobDescription = searchParams.get('jobDescription') || ''
  const jobRequirements = searchParams.get('jobRequirements') || ''

  // Helper function to get difficulty color
  const getDifficultyColor = (tag: string) => {
    const lowerTag = tag.toLowerCase()
    if (lowerTag === 'easy') {
      return 'bg-green-100 text-green-700 border-green-300'
    } else if (lowerTag === 'medium') {
      return 'bg-yellow-100 text-yellow-700 border-yellow-300'
    } else if (lowerTag === 'hard') {
      return 'bg-red-100 text-red-700 border-red-300'
    }
    return null
  }

  // Helper function to get category icon
  const getCategoryIcon = (tag: string) => {
    const lowerTag = tag.toLowerCase()
    if (lowerTag === 'technical') {
      return <Code className="h-3 w-3" />
    } else if (lowerTag === 'behavioral') {
      return <Users className="h-3 w-3" />
    } else if (lowerTag === 'situational') {
      return <Lightbulb className="h-3 w-3" />
    } else if (lowerTag === 'problem-solving') {
      return <Puzzle className="h-3 w-3" />
    }
    return null
  }

  // Helper function to get category color
  const getCategoryColor = (tag: string) => {
    const lowerTag = tag.toLowerCase()
    if (lowerTag === 'technical') {
      return 'bg-blue-100 text-blue-700 border-blue-300'
    } else if (lowerTag === 'behavioral') {
      return 'bg-purple-100 text-purple-700 border-purple-300'
    } else if (lowerTag === 'situational') {
      return 'bg-amber-100 text-amber-700 border-amber-300'
    } else if (lowerTag === 'problem-solving') {
      return 'bg-pink-100 text-pink-700 border-pink-300'
    }
    return 'bg-blue-100 text-blue-700 border-blue-300' // default
  }

  // Helper function to check if tag is difficulty or category
  const isSpecialTag = (tag: string) => {
    const lowerTag = tag.toLowerCase()
    return ['easy', 'medium', 'hard', 'technical', 'behavioral', 'situational', 'problem-solving'].includes(lowerTag)
  }

  useEffect(() => {
    const generateQuestions = async () => {
      try {
        setLoading(true)
        setError(null)

        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8081'
        const response = await fetch(`${backendUrl}/api/interview/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'ChatApp/1.0',
          },
          body: JSON.stringify({
            job_id: jobId,
            job_title: jobTitle,
            level: level,
            target_company: targetCompany,
            job_description: jobDescription,
            job_requirements: jobRequirements,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to generate interview questions')
        }

        const data = await response.json()
        setQuestions(data.questions || [])
      } catch (err) {
        console.error('Error generating questions:', err)
        setError(err instanceof Error ? err.message : 'Failed to generate questions')
      } finally {
        setLoading(false)
      }
    }

    if (jobId && jobTitle && jobRequirements) {
      generateQuestions()
    } else {
      setError('Missing required job information')
      setLoading(false)
    }
  }, [jobId, jobTitle, level, targetCompany, jobDescription, jobRequirements])

  // Get all unique tags from questions
  const allTags = Array.from(
    new Set(questions.flatMap(q => q.tags))
  ).sort()

  // Filter and sort questions
  const filteredQuestions = questions
    .filter(q => {
      if (selectedTags.length === 0) return true
      return selectedTags.some(tag => q.tags.includes(tag))
    })
    .sort((a, b) => {
      if (sortBy === 'difficulty') {
        const difficultyOrder = { 'Easy': 1, 'Medium': 2, 'Hard': 3 }
        return (difficultyOrder[a.difficulty as keyof typeof difficultyOrder] || 0) -
               (difficultyOrder[b.difficulty as keyof typeof difficultyOrder] || 0)
      }
      if (sortBy === 'category') {
        return a.category.localeCompare(b.category)
      }
      return 0
    })

  // Toggle tag selection
  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  // Toggle question expansion
  const toggleQuestion = (id: string) => {
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

  // Regenerate answer for a specific question
  const regenerateAnswer = async (questionId: string, question: string, category: string) => {
    try {
      setRegeneratingAnswers(prev => new Set(prev).add(questionId))

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8081'
      const response = await fetch(`${backendUrl}/api/interview/regenerate-answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'ChatApp/1.0',
        },
        body: JSON.stringify({
          job_id: jobId,
          question: question,
          category: category,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to regenerate answer')
      }

      const data = await response.json()

      // Update the answer for this question
      setQuestions(prev =>
        prev.map(q =>
          q.id === questionId ? { ...q, answer: data.answer } : q
        )
      )

      // Mark as not saved since answer changed
      setSavedQuestions(prev => {
        const newSet = new Set(prev)
        newSet.delete(questionId)
        return newSet
      })
    } catch (err) {
      console.error('Error regenerating answer:', err)
      alert('Failed to regenerate answer. Please try again.')
    } finally {
      setRegeneratingAnswers(prev => {
        const newSet = new Set(prev)
        newSet.delete(questionId)
        return newSet
      })
    }
  }

  // Save question and answer
  const saveQuestion = async (question: InterviewQuestion) => {
    try {
      setSavingQuestions(prev => new Set(prev).add(question.id))

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8081'
      const response = await fetch(`${backendUrl}/api/interview/save-question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'ChatApp/1.0',
        },
        body: JSON.stringify({
          user_id: jobId, // Using jobId as user_id for now
          job_id: jobId,
          question_id: question.id,
          question: question.question,
          answer: question.answer,
          category: question.category,
          difficulty: question.difficulty,
          tags: question.tags,
          job_title: jobTitle,
          company: targetCompany,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save question')
      }

      // Mark as saved
      setSavedQuestions(prev => new Set(prev).add(question.id))
    } catch (err) {
      console.error('Error saving question:', err)
      alert('Failed to save question. Please try again.')
    } finally {
      setSavingQuestions(prev => {
        const newSet = new Set(prev)
        newSet.delete(question.id)
        return newSet
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 inline-flex items-center gap-2 text-slate-600 transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </button>
          <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-8 text-white shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="mb-2 text-4xl font-bold">Interview Preparation</h1>
                <p className="text-lg opacity-95">
                  AI-generated questions for: <span className="font-semibold">{jobTitle}</span>
                  {targetCompany && <> at <span className="font-semibold">{targetCompany}</span></>}
                </p>
                {level && (
                  <p className="mt-2 text-sm opacity-90">
                    Level: <span className="font-semibold capitalize">{level}</span>
                  </p>
                )}
              </div>
              <button
                onClick={() => router.push(`/saved-questions?job_id=${jobId}`)}
                className="flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                <Bookmark className="h-4 w-4" />
                <span className="hidden sm:inline">View Saved</span>
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="rounded-2xl bg-white p-12 shadow-xl animate-fade-in">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="relative">
                <Loader className="h-12 w-12 animate-spin text-indigo-600" />
                <Sparkles className="absolute -right-1 -top-1 h-6 w-6 animate-pulse text-yellow-500" />
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900">Generating Interview Questions...</p>
                <p className="mt-1 text-sm text-slate-600">
                  Our AI is analyzing your profile and the job requirements
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="rounded-2xl bg-white p-8 shadow-xl animate-fade-in">
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <AlertCircle className="mt-0.5 h-6 w-6 flex-shrink-0 text-red-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">Error Generating Questions</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tag Filter & Sort Controls */}
        {!loading && !error && questions.length > 0 && (
          <div className="mb-6 space-y-4 rounded-2xl bg-white p-6 shadow-xl animate-fade-in">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Filter className="h-4 w-4 text-indigo-600" />
              Filter & Sort
            </div>

            {/* Tag Selection */}
            <div>
              <p className="mb-2 text-sm text-slate-600">Filter by tags:</p>
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => {
                  const difficultyColor = getDifficultyColor(tag)
                  const categoryColor = getCategoryColor(tag)
                  const categoryIcon = getCategoryIcon(tag)
                  const isSelected = selectedTags.includes(tag)

                  // Determine the color to use
                  let colorClass = 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  if (difficultyColor) {
                    colorClass = `${difficultyColor} border`
                  } else if (categoryIcon) {
                    colorClass = `${categoryColor} border`
                  }

                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                          : colorClass
                      }`}
                    >
                      {categoryIcon && <span className={isSelected ? 'text-white' : ''}>{categoryIcon}</span>}
                      {tag}
                    </button>
                  )
                })}
              </div>
              {selectedTags.length > 0 && (
                <button
                  onClick={() => setSelectedTags([])}
                  className="mt-2 text-xs text-indigo-600 hover:text-indigo-700"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Sort Selection */}
            <div>
              <p className="mb-2 text-sm text-slate-600">Sort by:</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setSortBy('none')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    sortBy === 'none'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Default
                </button>
                <button
                  onClick={() => setSortBy('difficulty')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    sortBy === 'difficulty'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Difficulty
                </button>
                <button
                  onClick={() => setSortBy('category')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    sortBy === 'category'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Category
                </button>
              </div>
            </div>

            <div className="text-sm text-slate-500">
              Showing {filteredQuestions.length} of {questions.length} questions
            </div>

            {/* Legend */}
            <div className="pt-4 border-t border-slate-200">
              <p className="mb-2 text-xs font-semibold text-slate-600">Legend:</p>
              <div className="flex flex-wrap gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full border border-green-300 bg-green-100 px-2 py-0.5 text-green-700 font-medium">
                    Easy
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-yellow-300 bg-yellow-100 px-2 py-0.5 text-yellow-700 font-medium">
                    Medium
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-red-700 font-medium">
                    Hard
                  </span>
                </div>
                <div className="h-4 w-px bg-slate-300"></div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-blue-300 bg-blue-100 px-2 py-0.5 text-blue-700 font-medium">
                    <Code className="h-3 w-3" />
                    Technical
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-purple-300 bg-purple-100 px-2 py-0.5 text-purple-700 font-medium">
                    <Users className="h-3 w-3" />
                    Behavioral
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-amber-700 font-medium">
                    <Lightbulb className="h-3 w-3" />
                    Situational
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-pink-300 bg-pink-100 px-2 py-0.5 text-pink-700 font-medium">
                    <Puzzle className="h-3 w-3" />
                    Problem-Solving
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Questions List */}
        {!loading && !error && filteredQuestions.length > 0 && (
          <div className="space-y-6 animate-fade-in">
            {filteredQuestions.map((item, index) => {
              const isExpanded = expandedQuestions.has(item.id)
              const isRegenerating = regeneratingAnswers.has(item.id)
              const isSaved = savedQuestions.has(item.id)
              const isSaving = savingQuestions.has(item.id)

              return (
                <div
                  key={item.id}
                  className="rounded-2xl bg-white p-6 shadow-xl transition-all hover:shadow-2xl"
                >
                  {/* Question Header */}
                  <div className="mb-3">
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-lg font-semibold text-slate-900">{item.question}</p>
                      </div>
                      <button
                        onClick={() => toggleQuestion(item.id)}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="ml-11 mb-4 flex flex-wrap gap-2">
                    {/* Always show category with icon */}
                    {item.category && (
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${getCategoryColor(item.category)}`}
                      >
                        {getCategoryIcon(item.category)}
                        {item.category}
                      </span>
                    )}

                    {/* Always show difficulty with color */}
                    {item.difficulty && (
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
                          getDifficultyColor(item.difficulty) || 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {item.difficulty}
                      </span>
                    )}

                    {/* Show other tags (keywords) */}
                    {item.tags.filter(tag => {
                      const lowerTag = tag.toLowerCase()
                      const lowerCategory = item.category.toLowerCase()
                      const lowerDifficulty = item.difficulty.toLowerCase()
                      return lowerTag !== lowerCategory && lowerTag !== lowerDifficulty
                    }).map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium bg-slate-100 text-slate-700 border-slate-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Answer Section (Expandable) */}
                  {isExpanded && (
                    <div className="ml-11 mt-4 animate-fade-in">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-slate-900">Suggested Answer:</h3>
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveQuestion(item)}
                              disabled={isSaved || isSaving}
                              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                                isSaved
                                  ? 'bg-green-600 text-white cursor-not-allowed'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50'
                              }`}
                            >
                              {isSaved ? (
                                <>
                                  <Check className="h-3 w-3" />
                                  Saved
                                </>
                              ) : (
                                <>
                                  <Save className={`h-3 w-3 ${isSaving ? 'animate-pulse' : ''}`} />
                                  {isSaving ? 'Saving...' : 'Save'}
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => regenerateAnswer(item.id, item.question, item.category)}
                              disabled={isRegenerating}
                              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-indigo-700 disabled:opacity-50"
                            >
                              <RefreshCw className={`h-3 w-3 ${isRegenerating ? 'animate-spin' : ''}`} />
                              {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                            </button>
                          </div>
                        </div>
                        <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                          {item.answer}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* No Questions After Filter */}
        {!loading && !error && questions.length > 0 && filteredQuestions.length === 0 && (
          <div className="rounded-2xl bg-white p-12 shadow-xl animate-fade-in">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-slate-400" />
              <p className="mt-4 text-lg font-semibold text-slate-900">No Questions Match Your Filters</p>
              <p className="mt-1 text-sm text-slate-600">
                Try selecting different tags or clearing your filters
              </p>
            </div>
          </div>
        )}

        {/* No Questions */}
        {!loading && !error && questions.length === 0 && (
          <div className="rounded-2xl bg-white p-12 shadow-xl animate-fade-in">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-slate-400" />
              <p className="mt-4 text-lg font-semibold text-slate-900">No Questions Generated</p>
              <p className="mt-1 text-sm text-slate-600">
                Please try again with different job requirements
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
