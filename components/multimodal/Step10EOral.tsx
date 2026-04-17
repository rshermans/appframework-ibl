'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import { useI18n } from '@/components/I18nProvider'
import StepHeader from '@/components/StepHeader'
import EvidenceWatermark from './EvidenceWatermark'
import ExportToNotebookButton from '@/components/ExportToNotebookButton'
import { parseAiJsonWithOptions } from '@/lib/parseAiJson'
import { retryWithBackoff } from '@/lib/retryHelper'
import { safeFetch } from '@/lib/safeFetch'
import { isValidMultimodalArtifact } from '@/lib/multimodalContract'
import type { OralPresentation } from '@/types/research-workflow'

interface Props {
  onBack: () => void
}

export default function Step10EOral({ onBack }: Props) {
  const { locale } = useI18n()
  const {
    projectId, topic, finalResearchQuestion, evidenceRecords,
    multimodalOutputs, setMultimodalOral, setEvidenceFidelityScore,
  } = useWizardStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [duration, setDuration] = useState('10')
  const [activeSlide, setActiveSlide] = useState(0)
  const draft = multimodalOutputs.oral
  const pt = locale === 'pt-PT'
  const generationSoonLabel = pt
    ? 'Geração direta no app em breve. Use "Exportar para NotebookLM".'
    : 'Direct generation in-app is coming soon. Use "Export to NotebookLM".'

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
              stage: 2, promptId: 'multimodal_oral',
              stepId: 'step6_multimodal', stepLabel: 'Oral Presentation',
              rq: finalResearchQuestion?.question ?? '',
              evidence: JSON.stringify(evidenceRecords, null, 2),
              audience: 'academic', duration,
            }),
          }),
        { maxAttempts: 2, initialDelayMs: 1200, maxDelayMs: 3000 }
      )
      if (!response.ok || !payload?.ok) throw new Error((payload?.details || payload?.error || 'API error') as string)
      const data = payload?.data ?? payload
      const parsed = parseAiJsonWithOptions<OralPresentation>(data.output, {
        validate: (value) => isValidMultimodalArtifact('oral', value),
        errorMessage: pt ? 'Resposta invalida para o contrato de apresentacao oral.' : 'Invalid oral contract response.',
      })
      if (!parsed?.slides?.length) throw new Error(pt ? 'Resposta inválida da IA.' : 'Invalid AI response.')
      setMultimodalOral(parsed)
      if (typeof parsed.fidelityScore === 'number') setEvidenceFidelityScore(parsed.fidelityScore)
      setActiveSlide(0)
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
        title={pt ? 'Apresentação Oral' : 'Oral Presentation'}
        subtitle={pt
          ? 'Outline de slides com notas de orador e âncoras de evidência.'
          : 'Slide outline with speaker notes and evidence anchors.'}
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
          {['5', '10', '15', '20', '30'].map((d) => <option key={d} value={d}>{d} min</option>)}
        </select>
        <span title={generationSoonLabel} className="inline-flex cursor-not-allowed">
          <button
            type="button"
            onClick={generate}
            disabled
            className="rounded-[var(--radius-md)] bg-[var(--surface_container_high)] px-4 py-2 text-sm font-medium text-[var(--on_surface_variant)] opacity-80"
          >
            {pt ? 'Em breve' : 'Coming soon'}
          </button>
        </span>
        <ExportToNotebookButton
          projectId={projectId}
          topic={topic}
          researchQuestion={finalResearchQuestion?.question ?? ''}
          evidenceRecords={evidenceRecords}
          artifactType="presentation"
          variant="secondary"
          size="sm"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {draft && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[var(--on_surface)]">{draft.title}</h3>
            <span className="text-xs text-[var(--on_surface_variant)]">
              ~{draft.totalDurationMinutes} min · {pt ? 'Fidelidade' : 'Fidelity'}: {draft.fidelityScore}%
            </span>
          </div>

          {/* Slide tabs */}
          <div className="flex flex-wrap gap-1">
            {draft.slides.map((slide, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveSlide(i)}
                className={`rounded-[var(--radius-sm)] px-3 py-1 text-xs transition
                  ${activeSlide === i
                    ? 'bg-[var(--primary)] text-[var(--on_primary)]'
                    : 'bg-[var(--surface_container)] text-[var(--on_surface)] hover:bg-[var(--surface_container_low)]'
                  }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {draft.slides[activeSlide] && (
            <div className="rounded-[var(--radius-md)] border border-[var(--outline_variant)] bg-[var(--surface_container_lowest)] p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
                {pt ? 'Slide' : 'Slide'} {draft.slides[activeSlide].slideNumber}
              </p>
              <h4 className="mt-1 text-base font-semibold text-[var(--on_surface)]">
                {draft.slides[activeSlide].heading}
              </h4>
              <ul className="mt-2 space-y-1">
                {draft.slides[activeSlide].bulletPoints.map((point, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-[var(--on_surface)]">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]" />
                    {point}
                  </li>
                ))}
              </ul>
              <div className="mt-3 rounded-[var(--radius-sm)] bg-[var(--surface_container)] p-3">
                <p className="text-xs font-medium text-[var(--on_surface_variant)]">
                  🎙 {pt ? 'Notas de orador' : 'Speaker notes'}
                </p>
                <p className="mt-1 text-sm italic text-[var(--on_surface)]">
                  {draft.slides[activeSlide].speakerNotes}
                </p>
              </div>
              <EvidenceWatermark anchors={draft.slides[activeSlide].anchors ?? []} compact />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
