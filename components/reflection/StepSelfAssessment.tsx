'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import { useI18n } from '@/components/I18nProvider'
import StepHeader from '@/components/StepHeader'
import RubricSidebar from './RubricSidebar'
import { parseAiJson } from '@/lib/parseAiJson'
import { retryWithBackoff } from '@/lib/retryHelper'
import { safeFetch } from '@/lib/safeFetch'
import type { SelfAssessmentRecord } from '@/types/research-workflow'

interface Props {
  onBack: () => void
}

export default function StepSelfAssessment({ onBack }: Props) {
  const { locale } = useI18n()
  const {
    projectId, topic, finalResearchQuestion, evidenceRecords, explanationDraft,
    selfAssessment, setSelfAssessment,
  } = useWizardStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const pt = locale === 'pt-PT'

  const generate = async () => {
    setLoading(true)
    setError('')
    try {
      const { response, json: payload } = await retryWithBackoff(
        () =>
          safeFetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId, topic, locale,
              stage: 3, promptId: 'self_assessment',
              stepId: 'step7_reflection', stepLabel: 'Self-Assessment',
              rq: finalResearchQuestion?.question ?? '',
              evidence: JSON.stringify(evidenceRecords.slice(0, 8), null, 2),
              explanation: explanationDraft?.argumentCore ?? '',
            }),
          }),
        { maxAttempts: 2, initialDelayMs: 1200, maxDelayMs: 3000 }
      )
      if (!response.ok || !payload?.ok) throw new Error((payload?.details || payload?.error || 'API error') as string)
      const data = payload?.data ?? payload
      const parsed = parseAiJson<SelfAssessmentRecord & { rubricDimensions?: Array<{ dimension: string; score: number; justification: string; improvementHint?: string }> }>(data.output)
      if (!parsed?.rubricDimensions?.length) throw new Error(pt ? 'Resposta inválida da IA.' : 'Invalid AI response.')
      setSelfAssessment({
        rubricDimensions: parsed.rubricDimensions.map((d) => ({
          dimension: d.dimension,
          score: d.score,
          justification: d.justification,
        })),
        overallReflection: parsed.overallReflection ?? '',
        completedAt: new Date().toISOString(),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const scoreMap: Record<string, number> = {}
  selfAssessment?.rubricDimensions.forEach((d) => {
    const key = d.dimension.split(':')[0]?.trim()
    if (key) scoreMap[key] = d.score
  })

  return (
    <div className="space-y-6">
      <StepHeader
        stepId="step7_reflection"
        title={pt ? 'Auto-Avaliação' : 'Self-Assessment'}
        subtitle={pt
          ? 'Mapeamento do trabalho contra as dimensões da rúbrica IBL R1–R8.'
          : 'Map your work against IBL rubric dimensions R1–R8.'}
      />
      <button type="button" onClick={onBack} className="text-sm text-[var(--on_surface_variant)] hover:underline">
        ← {pt ? 'Voltar' : 'Back'}
      </button>

      <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
        <div className="space-y-4">
          <button
            type="button"
            disabled={loading}
            onClick={generate}
            className="rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--on_primary)] transition hover:opacity-90 disabled:opacity-50"
          >
            {loading
              ? (pt ? 'A avaliar…' : 'Assessing…')
              : selfAssessment
                ? (pt ? 'Reavaliar' : 'Re-assess')
                : (pt ? 'Gerar auto-avaliação' : 'Generate self-assessment')}
          </button>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {selfAssessment && (
            <div className="space-y-3">
              {selfAssessment.rubricDimensions.map((dim) => (
                <div key={dim.dimension} className="rounded-[var(--radius-md)] border border-[var(--outline_variant)] bg-[var(--surface_container_lowest)] p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[var(--on_surface)]">{dim.dimension}</p>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span
                          key={n}
                          className={`h-3 w-3 rounded-full ${n <= dim.score ? 'bg-[var(--primary)]' : 'bg-[var(--surface_container_low)]'}`}
                        />
                      ))}
                      <span className="ml-1 text-xs text-[var(--on_surface_variant)]">{dim.score}/5</span>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-[var(--on_surface_variant)]">{dim.justification}</p>
                </div>
              ))}

              {selfAssessment.overallReflection && (
                <div className="rounded-[var(--radius-md)] bg-[var(--surface_container_low)] p-4">
                  <p className="text-xs font-semibold text-[var(--on_surface)]">
                    {pt ? 'Reflexão global' : 'Overall reflection'}
                  </p>
                  <p className="mt-1 text-sm italic text-[var(--on_surface)]">{selfAssessment.overallReflection}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <RubricSidebar scores={scoreMap} pt={pt} />
      </div>
    </div>
  )
}
