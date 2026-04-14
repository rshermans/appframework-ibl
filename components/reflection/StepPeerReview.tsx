'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import { useI18n } from '@/components/I18nProvider'
import StepHeader from '@/components/StepHeader'
import RubricSidebar from './RubricSidebar'
import { parseAiJson } from '@/lib/parseAiJson'
import { retryWithBackoff } from '@/lib/retryHelper'
import { safeFetch } from '@/lib/safeFetch'
import type { PeerReview } from '@/types/research-workflow'

interface Props {
  onBack: () => void
}

export default function StepPeerReview({ onBack }: Props) {
  const { locale } = useI18n()
  const { projectId, topic, finalResearchQuestion, peerReviews, addPeerReview } = useWizardStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reviewerTeam, setReviewerTeam] = useState('')
  const [reviewedProjectId, setReviewedProjectId] = useState('')
  const [dimension, setDimension] = useState('R6: Multimodal Communication')
  const [workSample, setWorkSample] = useState('')
  const [strengths, setStrengths] = useState('')
  const [improvements, setImprovements] = useState('')
  const [anonymous, setAnonymous] = useState(true)
  const [aiGuide, setAiGuide] = useState<{ strengths_prompt: string; improvements_prompt: string; evidence_check: string; ethical_note: string } | null>(null)
  const pt = locale === 'pt-PT'

  const generateGuide = async () => {
    if (!workSample.trim()) return
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
              stage: 3, promptId: 'peer_review_guide',
              stepId: 'step7_reflection', stepLabel: 'Peer Review',
              rq: finalResearchQuestion?.question ?? '',
              reviewer: reviewerTeam,
              dimension,
              work_sample: workSample,
            }),
          }),
        { maxAttempts: 2, initialDelayMs: 1200, maxDelayMs: 3000 }
      )
      if (!response.ok || !payload?.ok) throw new Error((payload?.details || payload?.error || 'API error') as string)
      const data = payload?.data ?? payload
      setAiGuide(parseAiJson(data.output))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const submitReview = () => {
    if (!strengths.trim() || !improvements.trim()) return
    const review: PeerReview = {
      id: Math.random().toString(36).slice(2),
      reviewedProjectId: reviewedProjectId || 'unknown',
      reviewerTeam,
      rubricDimension: dimension,
      strengths,
      improvements,
      anonymous,
      submittedAt: new Date().toISOString(),
    }
    addPeerReview(review)
    setStrengths('')
    setImprovements('')
    setWorkSample('')
    setAiGuide(null)
  }

  return (
    <div className="space-y-6">
      <StepHeader
        stepId="step7_reflection"
        title={pt ? 'Revisão por Pares' : 'Peer Review'}
        subtitle={pt
          ? 'Feedback orientado por rúbrica com apoio de IA e anonimato opcional.'
          : 'Rubric-guided feedback with AI support and optional anonymity.'}
      />
      <button type="button" onClick={onBack} className="text-sm text-[var(--on_surface_variant)] hover:underline">
        ← {pt ? 'Voltar' : 'Back'}
      </button>

      <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
        <div className="space-y-4">
          {/* Setup */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[var(--on_surface)]">
                {pt ? 'Equipa revisora' : 'Reviewer team'}
              </label>
              <input
                type="text"
                value={reviewerTeam}
                onChange={(e) => setReviewerTeam(e.target.value)}
                placeholder={pt ? 'Nome da equipa' : 'Team name'}
                className="mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--outline)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--on_surface)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--on_surface)]">
                {pt ? 'Dimensão da rúbrica' : 'Rubric dimension'}
              </label>
              <select
                value={dimension}
                onChange={(e) => setDimension(e.target.value)}
                className="mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--outline)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--on_surface)]"
              >
                {['R1','R2','R3','R4','R5','R6','R7','R8'].map((r) => (
                  <option key={r} value={`${r}`}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Work sample */}
          <div>
            <label className="block text-xs font-medium text-[var(--on_surface)]">
              {pt ? 'Excerto a rever (colar texto)' : 'Work sample (paste text)'}
            </label>
            <textarea
              value={workSample}
              onChange={(e) => setWorkSample(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--on_surface)]"
            />
            <button
              type="button"
              disabled={loading || !workSample.trim()}
              onClick={generateGuide}
              className="mt-2 rounded-[var(--radius-sm)] bg-[var(--secondary_container)] px-4 py-1.5 text-xs font-medium text-[var(--on_secondary_container)] transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? (pt ? 'A gerar guia…' : 'Generating guide…') : (pt ? 'Obter guia IA' : 'Get AI guide')}
            </button>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* AI guide */}
          {aiGuide && (
            <div className="rounded-[var(--radius-md)] border border-[var(--outline_variant)] bg-[var(--surface_container_low)] p-4 text-sm space-y-2">
              <p className="font-medium text-[var(--on_surface)]">🤖 {pt ? 'Guia de Revisão' : 'Review Guide'}</p>
              <p className="text-[var(--on_surface_variant)]"><strong>{pt ? 'Pontos fortes:' : 'Strengths:'}</strong> {aiGuide.strengths_prompt}</p>
              <p className="text-[var(--on_surface_variant)]"><strong>{pt ? 'Melhorias:' : 'Improvements:'}</strong> {aiGuide.improvements_prompt}</p>
              <p className="text-[var(--on_surface_variant)]"><strong>{pt ? 'Verificar evidência:' : 'Evidence check:'}</strong> {aiGuide.evidence_check}</p>
              <p className="text-xs italic text-amber-700">🛡 {aiGuide.ethical_note}</p>
            </div>
          )}

          {/* Human input */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[var(--on_surface)]">
                {pt ? 'Pontos fortes (texto livre)' : 'Strengths (free text)'}
              </label>
              <textarea
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--on_surface)]">
                {pt ? 'Sugestões de melhoria' : 'Improvement suggestions'}
              </label>
              <textarea
                value={improvements}
                onChange={(e) => setImprovements(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="anon"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="anon" className="text-xs text-[var(--on_surface)]">
                {pt ? 'Submeter de forma anónima' : 'Submit anonymously'}
              </label>
            </div>
            <button
              type="button"
              disabled={!strengths.trim() || !improvements.trim()}
              onClick={submitReview}
              className="rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--on_primary)] transition hover:opacity-90 disabled:opacity-50"
            >
              {pt ? 'Submeter revisão' : 'Submit review'}
            </button>
          </div>

          {/* Submitted reviews */}
          {peerReviews.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[var(--on_surface)]">
                {pt ? `${peerReviews.length} revisão(ões) submetida(s)` : `${peerReviews.length} review(s) submitted`}
              </p>
              {peerReviews.map((review) => (
                <div key={review.id} className="rounded-[var(--radius-sm)] border border-[var(--outline_variant)] bg-[var(--surface_container_lowest)] p-3 text-xs">
                  <p className="font-semibold">{review.anonymous ? (pt ? 'Anónimo' : 'Anonymous') : review.reviewerTeam} · {review.rubricDimension}</p>
                  <p className="mt-1 text-[var(--on_surface_variant)]">+ {review.strengths}</p>
                  <p className="text-[var(--on_surface_variant)]">⤴ {review.improvements}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <RubricSidebar activeDimensions={[dimension.split(':')[0]?.trim()]} pt={pt} />
      </div>
    </div>
  )
}
