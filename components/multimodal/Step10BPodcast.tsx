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
import { podcastScriptText } from '@/lib/outputExports'

interface Props {
  onBack: () => void
}

export default function Step10BPodcast({ onBack }: Props) {
  const { locale } = useI18n()
  const {
    projectId, topic, finalResearchQuestion, evidenceRecords,
    multimodalOutputs,
  } = useWizardStore()
  const [duration, setDuration] = useState('10')
  const draft = multimodalOutputs.podcast
  const pt = locale === 'pt-PT'

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
        <AudienceSelect />
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
        <GenerateControls kind="podcast" durationMinutes={Number(duration)} hasDraft={Boolean(draft)} />
        <ExportToNotebookButton
          projectId={projectId}
          topic={topic}
          researchQuestion={finalResearchQuestion?.question ?? ''}
          evidenceRecords={evidenceRecords}
          artifactType="podcast"
          variant="secondary"
          size="sm"
        />
      </div>

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

      {draft && (
        <CreationGuide
          kind="podcast"
          title={pt ? 'Do guião ao episódio' : 'From script to episode'}
          description={pt ? 'Copie ou descarregue o guião e grave-o numa destas ferramentas.' : 'Copy or download the script and record it in one of these tools.'}
          actions={[
            { id: 'copy-script', label: pt ? 'Copiar guião' : 'Copy script', copyText: podcastScriptText(draft, pt), primary: true },
            { id: 'download', label: pt ? 'Descarregar guião (.md)' : 'Download script (.md)', download: { filename: 'guiao-podcast.md', text: podcastScriptText(draft, pt) } },
          ]}
        />
      )}
    </div>
  )
}
