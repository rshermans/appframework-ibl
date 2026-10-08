'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import { useI18n } from '@/components/I18nProvider'
import StepHeader from '@/components/StepHeader'
import AudienceSelect from './AudienceSelect'
import GenerateControls from './GenerateControls'
import EvidenceWatermark from './EvidenceWatermark'
import ExportToNotebookButton from '@/components/ExportToNotebookButton'
import CreationGuide from './CreationGuide'
import { AUDIENCE_LABELS } from '@/lib/audience'
import { slidesCanvasPrompt } from '@/lib/outputExports'
import { buildPptxBlob } from '@/lib/pptxExport'

interface Props {
  onBack: () => void
}

export default function Step10EOral({ onBack }: Props) {
  const { locale } = useI18n()
  const {
    projectId, topic, finalResearchQuestion, evidenceRecords,
    multimodalOutputs, audience,
  } = useWizardStore()
  const [duration, setDuration] = useState('10')
  const [activeSlide, setActiveSlide] = useState(0)
  const draft = multimodalOutputs.oral
  const pt = locale === 'pt-PT'

  return (
    <div className="space-y-6">
      <StepHeader
        stepId="step6_multimodal"
        title={pt ? 'Apresentação Oral' : 'Oral Presentation'}
        subtitle={pt
          ? 'Cria os slides com notas do orador e fontes, e descarrega-os em PowerPoint (.pptx) ou prepara um prompt para o Gemini (Canvas).'
          : 'Creates the slides with speaker notes and sources, and downloads them as PowerPoint (.pptx) or prepares a prompt for Gemini (Canvas).'}
      />
      <button type="button" onClick={onBack} className="text-sm text-[var(--on_surface_variant)] hover:underline">
        ← {pt ? 'Voltar ao hub' : 'Back to hub'}
      </button>

      <div className="flex flex-wrap items-center gap-3">
        <AudienceSelect />
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
        <GenerateControls
          kind="oral"
          durationMinutes={Number(duration)}
          hasDraft={Boolean(draft)}
          labels={{ generate: pt ? 'Gerar slides' : 'Generate slides', regenerate: pt ? 'Gerar slides novamente' : 'Regenerate slides' }}
        />
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

      {draft && (
        <CreationGuide
          kind="oral"
          title={pt ? 'Dos slides à apresentação' : 'From slides to presentation'}
          description={
            pt
              ? 'O conteúdo (títulos, tópicos, notas e fontes) é gerado pela IA; o ficheiro PowerPoint é montado aqui, sem chamadas extra. Abre no PowerPoint, no Google Slides e no Canva.'
              : 'The content (headings, bullets, notes and sources) is AI-generated; the PowerPoint file is assembled here with no extra calls. It opens in PowerPoint, Google Slides and Canva.'
          }
          actions={[
            {
              id: 'pptx',
              label: pt ? 'Descarregar PowerPoint (.pptx)' : 'Download PowerPoint (.pptx)',
              primary: true,
              onClick: async () => {
                const blob = await buildPptxBlob(draft, {
                  researchQuestion: finalResearchQuestion?.question ?? topic,
                  audienceLabel: AUDIENCE_LABELS[audience][pt ? 'pt' : 'en'],
                  pt,
                })
                const url = URL.createObjectURL(blob)
                const anchor = document.createElement('a')
                anchor.href = url
                anchor.download = 'apresentacao-ibl.pptx'
                anchor.click()
                URL.revokeObjectURL(url)
              },
            },
            {
              id: 'copy-canvas',
              label: pt ? 'Copiar prompt para o Gemini (Canvas)' : 'Copy prompt for Gemini (Canvas)',
              copyText: slidesCanvasPrompt(draft, { researchQuestion: finalResearchQuestion?.question ?? topic, audienceLabel: AUDIENCE_LABELS[audience][pt ? 'pt' : 'en'], pt }),
            },
          ]}
        />
      )}
    </div>
  )
}
