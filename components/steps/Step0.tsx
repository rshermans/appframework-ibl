'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import type { CandidateResearchQuestion } from '@/types/research-workflow'

interface Question {
  question: string
  type?: string
  epistemic_type?: string
  rationale?: string
  why_researchable?: string
  challenges?: string
  databases?: string[]
  ibl_score?: number
}

export default function Step0() {
  const {
    projectId,
    topic,
    setCandidates,
    setCandidateResearchQuestions,
    setInput,
    setOutput,
    setWorkflowStep,
  } = useWizardStore()
  const [loading, setLoading] = useState(false)
  const [localTopic, setLocalTopic] = useState(topic)
  const [questions, setQuestions] = useState<Question[]>([])
  const [error, setError] = useState('')

  const runGeneration = async () => {
    if (!localTopic.trim()) {
      setError('Please enter a topic')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          stage: 1,
          promptId: 'rq_generation',
          stepId: 'step0',
          stepLabel: 'Candidate Questions',
          topic: localTopic,
          level: 'higher-education',
        }),
      })

      const data = await response.json()
      const payload = data?.data ?? data

      if (!response.ok || !data?.ok) {
        throw new Error(data?.details || data?.error || 'Failed to process request')
      }

      setOutput(payload.output)
      setInput(localTopic)

      try {
        const parsed = JSON.parse(payload.output)
        const nextQuestions = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.questions)
            ? parsed.questions
            : []
        const structuredQuestions: CandidateResearchQuestion[] = nextQuestions.map(
          (question: Question, index: number) => ({
            id: `rq-${index + 1}`,
            question: question.question,
            epistemicType: question.type || question.epistemic_type || 'unknown',
            rationale: question.rationale || question.why_researchable || '',
            databases: Array.isArray(question.databases) ? question.databases : [],
            iblScore: typeof question.ibl_score === 'number' ? question.ibl_score : 0,
            challenges: question.challenges,
          })
        )

        setQuestions(nextQuestions)
        setCandidates(nextQuestions.map((question: Question) => question.question))
        setCandidateResearchQuestions(structuredQuestions)
      } catch {
        setQuestions([])
        setCandidates([])
        setCandidateResearchQuestions([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold mb-2">Research Topic</label>
        <input
          type="text"
          value={localTopic}
          onChange={(e) => setLocalTopic(e.target.value)}
          placeholder="e.g., 'Gene expression in neural development'"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <button
        onClick={runGeneration}
        disabled={loading}
        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
      >
        {loading ? 'Generating...' : 'Generate Research Questions'}
      </button>

      {questions.length > 0 && (
        <div className="space-y-4 mt-6">
          <h3 className="font-semibold text-lg">Candidate Research Questions</h3>
          {questions.map((q, idx) => (
            <div key={idx} className="p-4 border border-gray-200 rounded-lg hover:border-blue-400 transition">
              <div className="font-semibold text-blue-700 mb-2">Q{idx + 1}: {q.question}</div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-semibold">Type:</span> {q.type || q.epistemic_type || 'Not provided'}
                </div>
                <div>
                  <span className="font-semibold">Researchable?</span> {q.rationale || q.why_researchable || 'Not provided'}
                </div>
                {q.challenges && (
                  <div>
                    <span className="font-semibold">Challenges:</span> {q.challenges}
                  </div>
                )}
                {Array.isArray(q.databases) && q.databases.length > 0 && (
                  <div>
                    <span className="font-semibold">Databases:</span> {q.databases.join(', ')}
                  </div>
                )}
                {typeof q.ibl_score === 'number' && (
                  <div>
                    <span className="font-semibold">IBL score:</span> {q.ibl_score}/5
                  </div>
                )}
              </div>
            </div>
          ))}

          <button
            onClick={() => setWorkflowStep('step1_select')}
            className="w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800"
          >
            Continue to Selection
          </button>
        </div>
      )}
    </div>
  )
}
