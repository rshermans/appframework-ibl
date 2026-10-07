'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import { useI18n } from '@/components/I18nProvider'
import StepHeader from '@/components/StepHeader'
import { RUBRIC_DIMENSIONS } from '@/lib/rubric'
import { parseSelfAssessmentFeedback, type SelfAssessmentFeedback } from '@/lib/stage3'
import { useStage3Ai } from './useStage3Ai'

interface Props {
  onBack: () => void
}

interface Rating {
  score: number
  note: string
}

export default function StepSelfAssessment({ onBack }: Props) {
  const { locale } = useI18n()
  const { selfAssessment, setSelfAssessment } = useWizardStore()
  const { call, friendly } = useStage3Ai()
  const pt = locale === 'pt-PT'

  const [ratings, setRatings] = useState<Record<string, Rating>>(() => {
    const initial: Record<string, Rating> = {}
    selfAssessment?.rubricDimensions.forEach((d) => {
      const id = d.dimension.split(':')[0]?.trim()
      if (id) initial[id] = { score: d.score, note: d.justification }
    })
    return initial
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const rated = RUBRIC_DIMENSIONS.filter((d) => ratings[d.id]?.score)
  const complete = rated.length === RUBRIC_DIMENSIONS.length

  const feedbackById: Record<string, { comment: string; suggestedScore?: number; hint: string }> = {}
  selfAssessment?.rubricDimensions.forEach((d) => {
    const id = d.dimension.split(':')[0]?.trim()
    if (id && (d.aiComment || d.improvementHint)) {
      feedbackById[id] = { comment: d.aiComment ?? '', suggestedScore: d.aiSuggestedScore, hint: d.improvementHint ?? '' }
    }
  })

  const setRating = (id: string, patch: Partial<Rating>) => {
    setSaved(false)
    setRatings((prev) => ({ ...prev, [id]: { score: prev[id]?.score ?? 0, note: prev[id]?.note ?? '', ...patch } }))
  }

  const persist = (feedback?: SelfAssessmentFeedback) => {
    setSelfAssessment({
      rubricDimensions: RUBRIC_DIMENSIONS.filter((d) => ratings[d.id]?.score).map((d) => ({
        dimension: d.label,
        score: ratings[d.id].score,
        justification: ratings[d.id].note,
        aiComment: feedback?.byId[d.id]?.comment || feedbackById[d.id]?.comment || undefined,
        aiSuggestedScore: feedback?.byId[d.id]?.suggestedScore ?? feedbackById[d.id]?.suggestedScore,
        improvementHint: feedback?.byId[d.id]?.hint || feedbackById[d.id]?.hint || undefined,
      })),
      overallReflection: feedback?.overallReflection ?? selfAssessment?.overallReflection ?? '',
      completedAt: new Date().toISOString(),
    })
    setSaved(true)
  }

  const askAi = async () => {
    setLoading(true)
    setError('')
    try {
      const learnerRatings = RUBRIC_DIMENSIONS.filter((d) => ratings[d.id]?.score)
        .map((d) => `${d.id} ${d.desc.en}: ${ratings[d.id].score}/5${ratings[d.id].note ? ` ("${ratings[d.id].note}")` : ''}`)
        .join('\n')
      const feedback = parseSelfAssessmentFeedback(await call('self_assessment', { learnerRatings }))
      persist(feedback)
    } catch (e) {
      // The learner's ratings are kept either way: the AI is a second opinion, not a gate.
      persist()
      setError(friendly(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <StepHeader
        stepId="step7_reflection"
        title={pt ? 'Auto-Avaliação' : 'Self-Assessment'}
        subtitle={pt
          ? 'Avalie o seu próprio trabalho de 1 a 5 em cada dimensão. Depois, se quiser, peça uma segunda opinião à IA.'
          : 'Rate your own work from 1 to 5 on each dimension. Then, if you want, ask the AI for a second opinion.'}
      />
      <button type="button" onClick={onBack} className="text-sm text-[var(--on_surface_variant)] hover:underline">
        ← {pt ? 'Voltar' : 'Back'}
      </button>

      <ol className="space-y-3">
        {RUBRIC_DIMENSIONS.map((dim) => {
          const rating = ratings[dim.id]
          const fb = feedbackById[dim.id]
          return (
            <li key={dim.id} className="rounded-[var(--radius-md)] border border-[var(--outline_variant)] bg-[var(--surface_container_lowest)] p-4">
              <p className="text-sm font-semibold text-[var(--on_surface)]">{dim.id} — {pt ? dim.desc.pt : dim.desc.en}</p>
              <p className="mt-1 text-xs text-[var(--on_surface_variant)]">
                1 = {(pt ? dim.levels.pt : dim.levels.en)[0]} · 3 = {(pt ? dim.levels.pt : dim.levels.en)[1]} · 5 = {(pt ? dim.levels.pt : dim.levels.en)[2]}
              </p>
              <div role="radiogroup" aria-label={`${dim.id} ${pt ? 'avaliação' : 'rating'}`} className="mt-2 flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={rating?.score === n}
                    onClick={() => setRating(dim.id, { score: n })}
                    className={`h-9 w-9 rounded-full border text-sm font-semibold transition ${rating?.score === n
                      ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--on_primary)]'
                      : 'border-[var(--outline_variant)] bg-[var(--surface)] text-[var(--on_surface)] hover:bg-[var(--surface_container)]'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={rating?.note ?? ''}
                onChange={(e) => setRating(dim.id, { note: e.target.value })}
                placeholder={pt ? 'Porquê esta nota? (opcional)' : 'Why this score? (optional)'}
                aria-label={`${dim.id} ${pt ? 'justificação' : 'justification'}`}
                className="mt-2 w-full rounded-[var(--radius-sm)] border border-[var(--outline)] bg-[var(--surface)] px-3 py-1.5 text-sm"
              />
              {fb && (
                <div className="mt-2 rounded-[var(--radius-sm)] bg-[var(--surface_container_low)] p-2 text-xs text-[var(--on_surface)]">
                  <p>🤖 {fb.comment}{typeof fb.suggestedScore === 'number' ? ` (${pt ? 'sugestão' : 'suggested'}: ${fb.suggestedScore}/5)` : ''}</p>
                  {fb.hint && <p className="mt-1 text-[var(--on_surface_variant)]">→ {fb.hint}</p>}
                </div>
              )}
            </li>
          )
        })}
      </ol>

      {selfAssessment?.overallReflection && (
        <div className="rounded-[var(--radius-md)] bg-[var(--surface_container_low)] p-4">
          <p className="text-xs font-semibold text-[var(--on_surface)]">{pt ? 'Síntese da IA' : 'AI summary'}</p>
          <p className="mt-1 text-sm italic text-[var(--on_surface)]">{selfAssessment.overallReflection}</p>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-amber-800">{error}</p>}
      {saved && !error && <p role="status" className="text-sm text-green-700">{pt ? '✓ Auto-avaliação guardada.' : '✓ Self-assessment saved.'}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={rated.length === 0}
          onClick={() => persist()}
          className="rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--on_primary)] transition hover:opacity-90 disabled:opacity-50"
        >
          {pt ? 'Guardar auto-avaliação' : 'Save self-assessment'}
        </button>
        <button
          type="button"
          disabled={!complete || loading}
          title={!complete ? (pt ? 'Avalie as 8 dimensões para pedir feedback.' : 'Rate all 8 dimensions to ask for feedback.') : undefined}
          onClick={askAi}
          className="rounded-[var(--radius-md)] bg-[var(--secondary_container)] px-4 py-2 text-sm font-medium text-[var(--on_secondary_container)] transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? (pt ? 'A pedir feedback…' : 'Asking for feedback…') : (pt ? 'Pedir segunda opinião à IA' : 'Ask the AI for a second opinion')}
        </button>
        <span className="text-xs text-[var(--on_surface_variant)]">{rated.length}/{RUBRIC_DIMENSIONS.length}</span>
      </div>
    </div>
  )
}
