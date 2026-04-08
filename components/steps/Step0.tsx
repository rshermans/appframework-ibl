'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'

interface Question {
  question: string
  epistemic_type: string
  why_researchable: string
  challenges: string
}

export default function Step0() {
  const { projectId, topic, setInput, setOutput } = useWizardStore()
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
          stepId: 'step0',
          stepLabel: 'Candidate Questions',
          topic: localTopic,
          content: `Generate 5 candidate research questions for: ${localTopic}`,
          mode: 'standard',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.details || data?.error || 'Failed to process request')
      }

      setOutput(data.output)
      setInput(localTopic)

      // Parse JSON if possible
      try {
        const parsed = JSON.parse(data.output)
        setQuestions(Array.isArray(parsed) ? parsed : [])
      } catch {
        // If not JSON, just show as text
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
                  <span className="font-semibold">Type:</span> {q.epistemic_type}
                </div>
                <div>
                  <span className="font-semibold">Researchable?</span> {q.why_researchable}
                </div>
                <div>
                  <span className="font-semibold">Challenges:</span> {q.challenges}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
