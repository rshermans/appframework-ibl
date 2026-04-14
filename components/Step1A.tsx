'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import type { ComparisonResult } from '@/types/research-workflow'
import { useI18n } from '@/components/I18nProvider'
import StepHeader from '@/components/StepHeader'
import { parseAiJson } from '@/lib/parseAiJson'
import { safeFetch } from '@/lib/safeFetch'

export default function Step1A() {
  const { locale, t } = useI18n()
  const { selectedRQs, setComparisonResult, setWorkflowStep, setAnalysis } = useWizardStore()
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'quick' | 'advanced'>('quick')
  const [error, setError] = useState('')
  const isPortuguese = locale === 'pt-PT'

  const runAnalysis = async () => {
    if (selectedRQs.length < 2) {
      setError(t('steps.step1A.invalidSelection'))
      return
    }

    setLoading(true)
    setError('')

    try {
      const { response: res, json } = await safeFetch('/api/ai', {
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

      const payload = json?.data ?? json

      if (!res.ok || !json?.ok) {
        throw new Error((json?.details || json?.error || t('api.genericFailure')) as string)
      }

      setAnalysis(payload.output)
      try {
        const parsed = parseAiJson<{
          comparisons?: ComparisonResult['comparisons']
          recommended_question?: string
          recommendation_reason?: string
        }>(payload.output)
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
    <div className="space-y-6">
      <StepHeader stepId="step1a_compare" title={t('steps.step1A.title')} />

      <div className="space-y-3">
        <div className="font-label text-xs font-semibold uppercase tracking-[0.1em] text-[var(--on_surface)] opacity-60">{t('steps.step1A.selectedTitle')}</div>
        {selectedRQs.map((rq, i) => (
          <div key={i} className="tonal-card ghost-border p-3 text-sm">
            {rq}
          </div>
        ))}
      </div>

      {error && (
        <div className="ai-needs-validation rounded-[var(--radius-md)] p-3 text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center gap-6">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="radio"
            value="quick"
            checked={mode === 'quick'}
            onChange={() => setMode('quick')}
          />
          {t('steps.step1A.quick')}
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="radio"
            value="advanced"
            checked={mode === 'advanced'}
            onChange={() => setMode('advanced')}
          />
          {t('steps.step1A.advanced')}
        </label>
      </div>

      <div className="bg-[var(--surface_container_low)] p-4 text-sm text-[var(--on_surface)]">
        <div className="font-semibold">{isPortuguese ? 'Modo selecionado' : 'Selected mode'}: {mode}</div>
        <div className="mt-1 opacity-70">
          {mode === 'quick'
            ? isPortuguese
              ? 'Quick: mais rapido, menos profundidade analitica, bom para iteracoes iniciais.'
              : 'Quick: faster and lighter analysis, useful for early iterations.'
            : isPortuguese
              ? 'Advanced: comparacao profunda, mais detalhe epistemico e riscos de cada pergunta.'
              : 'Advanced: deeper comparison with stronger epistemic analysis and risk breakdown.'}
        </div>
      </div>

      <button
        onClick={runAnalysis}
        disabled={loading}
        className="primary-gradient rounded-[var(--radius-md)] px-5 py-2.5 font-semibold text-[var(--on_primary)] transition hover:brightness-110 disabled:opacity-50"
      >
        {loading ? t('steps.step1A.running') : t('steps.step1A.run')}
      </button>
    </div>
  )
}
