'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import { useI18n } from '@/components/I18nProvider'
import StepHeader from '@/components/StepHeader'
import EvidenceWatermark from './EvidenceWatermark'
import { parseAiJson } from '@/lib/parseAiJson'
import { retryWithBackoff } from '@/lib/retryHelper'
import { safeFetch } from '@/lib/safeFetch'
import type { PodcastScript } from '@/types/research-workflow'

interface Props {
  onBack: () => void
}

export default function Step10BPodcast({ onBack }: Props) {
  const { locale } = useI18n()
  const {
    projectId, topic, finalResearchQuestion, evidenceRecords,
    multimodalOutputs, setMultimodalPodcast, setEvidenceFidelityScore,
  } = useWizardStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [duration, setDuration] = useState('10')
  const draft = multimodalOutputs.podcast
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
              stage: 2, promptId: 'multimodal_podcast',
              stepId: 'step6_multimodal', stepLabel: 'Podcast Script',
              rq: finalResearchQuestion?.question ?? '',
              evidence: JSON.stringify(evidenceRecords, null, 2),
              audience: 'general', duration,
            }),
          }),
        { maxAttempts: 2, initialDelayMs: 1200, maxDelayMs: 3000 }
      )
      if (!response.ok || !payload?.ok) throw new Error((payload?.details || payload?.error || 'API error') as string)
      const data = payload?.data ?? payload
      const parsed = parseAiJson<PodcastScript>(data.output)
      if (!parsed?.segments?.length) throw new Error(pt ? 'Resposta inválida da IA.' : 'Invalid AI response.')
      setMultimodalPodcast(parsed)
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
        title={pt ? 'Script de Podcast' : 'Podcast Script'}
        subtitle={pt
          ? 'Script por segmentos com marcadores de tempo e âncoras de evidência.'
          : 'Segmented script with timestamps and evidence anchors.'}
      />
      <button type="button" onClick={onBack} className="text-sm text-[var(--on_surface_variant)] hover:underline">
        ← {pt ? 'Voltar ao hub' : 'Back to hub'}
      </button>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-[var(--on_surface)]">
          {pt ? 'Duração (min):' : 'Duration (min):'}
        </label>
        <select
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="rounded-[var(--radius-sm)] border border-[var(--outline)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--on_surface)]"
        >
          {['5', '10', '15', '20'].map((d) => <option key={d} value={d}>{d} min</option>)}
        </select>
        <button
          type="button"
          disabled={loading || !finalResearchQuestion?.approvedByUser}
          onClick={generate}
          className="rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--on_primary)] transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? (pt ? 'A gerar…' : 'Generating…') : draft ? (pt ? 'Regenerar' : 'Regenerate') : (pt ? 'Gerar script' : 'Generate script')}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {draft && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[var(--on_surface)]">{draft.title}</h3>
            <span className="text-xs text-[var(--on_surface_variant)]">
              ~{draft.durationEstimateMinutes} min · {pt ? 'Fidelidade' : 'Fidelity'}: {draft.fidelityScore}%
            </span>
          </div>
          <div className="space-y-3">
            {draft.segments.map((seg, i) => (
              <div key={i} className="rounded-[var(--radius-md)] border border-[var(--outline_variant)] bg-[var(--surface_container_lowest)] p-4">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[var(--surface_container)] px-2 py-0.5 font-mono text-xs">{seg.timestamp}</span>
                  <span className="text-xs font-semibold text-[var(--primary)]">{seg.speaker}</span>
                </div>
                <p className="mt-2 text-sm text-[var(--on_surface)]">{seg.text}</p>
                <EvidenceWatermark anchors={seg.anchors ?? []} compact />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
