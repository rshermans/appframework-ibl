'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import type { ComparisonResult } from '@/types/research-workflow'
import { useI18n } from '@/components/I18nProvider'

export default function Step1A() {
  const { locale, t } = useI18n()
  const { selectedRQs, setComparisonResult, setWorkflowStep, setAnalysis } = useWizardStore()
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'quick' | 'advanced'>('quick')
  const [error, setError] = useState('')

  const runAnalysis = async () => {
    if (selectedRQs.length < 2) {
      setError(t('steps.step1A.invalidSelection'))
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
          stepLabel: t('workflow.step1a_compare.label'),
          selectedQuestions: selectedRQs,
          selectedRQs,
          mode,
          locale,
        }),
      })

      const json = await res.json()
      const payload = json?.data ?? json

      if (!res.ok || !json?.ok) {
        throw new Error(json?.details || json?.error || t('api.genericFailure'))
      }

      setAnalysis(payload.output)
      try {
        const parsed = JSON.parse(payload.output)
        const comparisonResult: ComparisonResult = {
          mode,
          comparisons: Array.isArray(parsed?.comparisons) ? parsed.comparisons : [],
          recommendedQuestion: parsed?.recommended_question || '',
          recommendationReason: parsed?.recommendation_reason || '',
        }
        setComparisonResult(comparisonResult)
      } catch {
        setComparisonResult(null)
      }
      setWorkflowStep('step1b_synthesize')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('api.genericFailure'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">{t('steps.step1A.title')}</h2>

      <div className="mb-4 space-y-2">
        <div className="text-sm font-semibold text-slate-700">{t('steps.step1A.selectedTitle')}</div>
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
          {' '}
          {t('steps.step1A.quick')}
        </label>

        <label>
          <input
            type="radio"
            value="advanced"
            checked={mode === 'advanced'}
            onChange={() => setMode('advanced')}
          />
          {' '}
          {t('steps.step1A.advanced')}
        </label>
      </div>

      <button
        onClick={runAnalysis}
        disabled={loading}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {loading ? t('steps.step1A.running') : t('steps.step1A.run')}
      </button>
    </div>
  )
}
