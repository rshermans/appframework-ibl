'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import { useI18n } from '@/components/I18nProvider'
import StepHeader from '@/components/StepHeader'
import EvidenceWatermark from './EvidenceWatermark'
import { parseAiJson } from '@/lib/parseAiJson'
import { retryWithBackoff } from '@/lib/retryHelper'
import { safeFetch } from '@/lib/safeFetch'
import type { VideostoryBoard } from '@/types/research-workflow'

interface Props {
  onBack: () => void
}

export default function Step10CVideocast({ onBack }: Props) {
  const { locale } = useI18n()
  const {
    projectId, topic, finalResearchQuestion, evidenceRecords,
    multimodalOutputs, setMultimodalVideocast, setEvidenceFidelityScore,
  } = useWizardStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const draft = multimodalOutputs.videocast
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
              stage: 2, promptId: 'multimodal_video',
              stepId: 'step6_multimodal', stepLabel: 'Videocast Storyboard',
              rq: finalResearchQuestion?.question ?? '',
              evidence: JSON.stringify(evidenceRecords, null, 2),
              audience: 'general',
            }),
          }),
        { maxAttempts: 2, initialDelayMs: 1200, maxDelayMs: 3000 }
      )
      if (!response.ok || !payload?.ok) throw new Error((payload?.details || payload?.error || 'API error') as string)
      const data = payload?.data ?? payload
      const parsed = parseAiJson<VideostoryBoard>(data.output)
      if (!parsed?.scenes?.length) throw new Error(pt ? 'Resposta inválida da IA.' : 'Invalid AI response.')
      setMultimodalVideocast(parsed)
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
        title={pt ? 'Storyboard de Videocast' : 'Videocast Storyboard'}
        subtitle={pt
          ? 'Storyboard por cenas com notas visuais e âncoras de evidência.'
          : 'Scene-by-scene storyboard with visual notes and evidence anchors.'}
      />
      <button type="button" onClick={onBack} className="text-sm text-[var(--on_surface_variant)] hover:underline">
        ← {pt ? 'Voltar ao hub' : 'Back to hub'}
      </button>

      <div>
        <button
          type="button"
          disabled={loading || !finalResearchQuestion?.approvedByUser}
          onClick={generate}
          className="rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--on_primary)] transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? (pt ? 'A gerar…' : 'Generating…') : draft ? (pt ? 'Regenerar' : 'Regenerate') : (pt ? 'Gerar storyboard' : 'Generate storyboard')}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {draft && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[var(--on_surface)]">{draft.title}</h3>
            <span className="text-xs text-[var(--on_surface_variant)]">{pt ? 'Fidelidade' : 'Fidelity'}: {draft.fidelityScore}%</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {draft.scenes.map((scene, i) => (
              <div key={i} className="rounded-[var(--radius-md)] border border-[var(--outline_variant)] bg-[var(--surface_container_lowest)] p-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[var(--primary)] px-2.5 py-0.5 text-xs font-bold text-[var(--on_primary)]">
                    {pt ? 'Cena' : 'Scene'} {scene.sceneNumber}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[var(--on_surface)]">{scene.description}</p>
                <p className="mt-1 text-xs italic text-[var(--on_surface_variant)]">🎨 {scene.visualNote}</p>
                <EvidenceWatermark anchors={scene.anchors ?? []} compact />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
