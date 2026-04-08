'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'

export default function Step1A() {
  const { selectedRQs, setStep, setAnalysis } = useWizardStore()
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('quick')

  const runAnalysis = async () => {
    setLoading(true)

    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stage: 1,
        stepId: 'step1',
        stepLabel: 'RQ Analysis',
        rq: selectedRQs.join(' | '),
        content: `Compare and analyze these research questions in ${mode} mode:\n${selectedRQs.map((rq, i) => `${i + 1}. ${rq}`).join('\n')}`,
        mode,
      }),
    })

    const json = await res.json()

    setAnalysis(json.output)
    setLoading(false)
    setStep(3)
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">
        Step 1A — Compare Research Questions
      </h2>

      {/* Selected RQs */}
      <div className="mb-4 space-y-2">
        {selectedRQs.map((rq, i) => (
          <div key={i} className="p-2 border rounded">
            {rq}
          </div>
        ))}
      </div>

      {/* Mode toggle */}
      <div className="mb-4">
        <label className="mr-4">
          <input
            type="radio"
            value="quick"
            checked={mode === 'quick'}
            onChange={() => setMode('quick')}
          />
          ⚡ Quick
        </label>

        <label>
          <input
            type="radio"
            value="advanced"
            checked={mode === 'advanced'}
            onChange={() => setMode('advanced')}
          />
          🧠 Advanced
        </label>
      </div>

      {/* Button */}
      <button
        onClick={runAnalysis}
        disabled={loading}
        className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? 'Analysing...' : 'Run Analysis'}
      </button>
    </div>
  )
}
