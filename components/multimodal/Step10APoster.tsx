'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import { useI18n } from '@/components/I18nProvider'
import StepHeader from '@/components/StepHeader'
import EvidenceWatermark from './EvidenceWatermark'
import { parseAiJson } from '@/lib/parseAiJson'
import { retryWithBackoff } from '@/lib/retryHelper'
import { safeFetch } from '@/lib/safeFetch'
import type { PosterDraft } from '@/types/research-workflow'

interface Props {
  onBack: () => void
}

export default function Step10APoster({ onBack }: Props) {
  const { locale } = useI18n()
  const {
    projectId, topic, finalResearchQuestion, evidenceRecords, knowledgeStructure,
    multimodalOutputs, setMultimodalPoster, setEvidenceFidelityScore,
  } = useWizardStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [audience, setAudience] = useState('general')
  const draft = multimodalOutputs.poster
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
              stage: 2, promptId: 'multimodal_poster',
              stepId: 'step6_multimodal', stepLabel: 'Poster / Infographic',
              rq: finalResearchQuestion?.question ?? '',
              evidence: JSON.stringify(evidenceRecords, null, 2),
              audience,
            }),
          }),
        { maxAttempts: 2, initialDelayMs: 1200, maxDelayMs: 3000 }
      )
      if (!response.ok || !payload?.ok) {
        throw new Error((payload?.details || payload?.error || 'API error') as string)
      }
      const data = payload?.data ?? payload
      const parsed = parseAiJson<PosterDraft>(data.output)
      if (!parsed?.sections?.length) throw new Error(pt ? 'Resposta inválida da IA.' : 'Invalid AI response.')
      setMultimodalPoster(parsed)
      if (typeof parsed.fidelityScore === 'number') setEvidenceFidelityScore(parsed.fidelityScore)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <StepHeader
        stepId="step6_multimodal"
        title={pt ? 'Poster / Infográfico' : 'Poster / Infographic'}
        subtitle={pt
          ? 'Scaffolding de poster científico com âncoras de evidência por secção.'
          : 'Scientific poster scaffold with per-section evidence anchors.'}
      />

      <button type="button" onClick={onBack} className="text-sm text-[var(--on_surface_variant)] hover:underline">
        ← {pt ? 'Voltar ao hub' : 'Back to hub'}
      </button>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-[var(--on_surface)]">
          {pt ? 'Audiência:' : 'Audience:'}
        </label>
        <select
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          className="rounded-[var(--radius-sm)] border border-[var(--outline)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--on_surface)]"
        >
          <option value="general">{pt ? 'Público geral' : 'General public'}</option>
          <option value="academic">{pt ? 'Académico' : 'Academic'}</option>
          <option value="school">{pt ? 'Escola (12-18 anos)' : 'School (12-18 yrs)'}</option>
        </select>
        <button
          type="button"
          disabled={loading || !finalResearchQuestion?.approvedByUser}
          onClick={generate}
          className="rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--on_primary)] transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? (pt ? 'A gerar…' : 'Generating…') : draft ? (pt ? 'Regenerar' : 'Regenerate') : (pt ? 'Gerar poster' : 'Generate poster')}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {draft && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[var(--on_surface)]">{draft.title}</h3>
            <span className="text-xs text-[var(--on_surface_variant)]">
              {pt ? 'Fidelidade:' : 'Fidelity:'} {draft.fidelityScore}%
            </span>
          </div>
          <p className="text-xs italic text-[var(--on_surface_variant)]">{draft.layoutSuggestion}</p>
          <div className="space-y-3">
            {draft.sections.map((section, i) => (
              <div key={i} className="rounded-[var(--radius-md)] border border-[var(--outline_variant)] bg-[var(--surface_container_lowest)] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">{section.label}</p>
                <p className="mt-1 text-sm text-[var(--on_surface)]">{section.content}</p>
                <EvidenceWatermark anchors={section.anchors ?? []} compact />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
