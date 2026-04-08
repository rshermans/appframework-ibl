'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'

export default function Step1A() {
  const { selectedRQs, setStep, setAnalysis } = useWizardStore()
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'quick' | 'advanced'>('quick')
  const [error, setError] = useState('')

  const runAnalysis = async () => {
    if (selectedRQs.length < 2) {
      setError('Select at least two research questions before running the comparison.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 1,
          promptId: 'rq_analysis',
          stepId: 'step1',
          stepLabel: 'RQ Analysis',
          selectedRQs,
          mode,
        }),
      })

      const json = await res.json()
      const payload = json?.data ?? json

      if (!res.ok || !json?.ok) {
        throw new Error(json?.details || json?.error || 'Failed to compare questions')
      }

      setAnalysis(payload.output)
      setStep(3)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compare questions')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Step 1A - Compare Research Questions</h2>

      <div className="mb-4 space-y-2">
        {selectedRQs.map((rq, i) => (
          <div key={i} className="rounded border p-2">
            {rq}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label className="mr-4">
          <input
            type="radio"
            value="quick"
            checked={mode === 'quick'}
            onChange={() => setMode('quick')}
          />
          {' '}Quick
        </label>

        <label>
          <input
            type="radio"
            value="advanced"
            checked={mode === 'advanced'}
            onChange={() => setMode('advanced')}
          />
          {' '}Advanced
        </label>
      </div>

      <button
        onClick={runAnalysis}
        disabled={loading}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {loading ? 'Analysing...' : 'Run Analysis'}
      </button>
    </div>
  )
}
