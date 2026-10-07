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
import { videoScriptText, videoToolPrompt } from '@/lib/outputExports'

interface Props {
  onBack: () => void
}

export default function Step10CVideocast({ onBack }: Props) {
  const { locale } = useI18n()
  const {
    projectId, topic, finalResearchQuestion, evidenceRecords,
    multimodalOutputs, audience,
  } = useWizardStore()
  const draft = multimodalOutputs.videocast
  const pt = locale === 'pt-PT'

  return (
    <div className="space-y-6">
      <StepHeader
        stepId="step6_multimodal"
        title={pt ? 'Storyboard de Videocast' : 'Videocast Storyboard'}
        subtitle={pt
          ? 'Cria o guião e o storyboard por cenas (não o vídeo final), com notas visuais e fontes. Abaixo indicamos onde o transformar em vídeo.'
          : 'Creates the script and scene storyboard (not the final video), with visual notes and sources. Below we point to where to turn it into a video.'}
      />
      <button type="button" onClick={onBack} className="text-sm text-[var(--on_surface_variant)] hover:underline">
        ← {pt ? 'Voltar ao hub' : 'Back to hub'}
      </button>

      <div className="flex flex-wrap items-center gap-3">
        <AudienceSelect />
        <GenerateControls
          kind="video"
          hasDraft={Boolean(draft)}
          labels={{
            generate: pt ? 'Gerar guião do vídeo' : 'Generate video script',
            regenerate: pt ? 'Gerar guião novamente' : 'Regenerate script',
          }}
        />
        <ExportToNotebookButton
          projectId={projectId}
          topic={topic}
          researchQuestion={finalResearchQuestion?.question ?? ''}
          evidenceRecords={evidenceRecords}
          artifactType="video"
          variant="secondary"
          size="sm"
        />
      </div>

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

      {draft && (
        <CreationGuide
          kind="video"
          title={pt ? 'Do guião ao vídeo' : 'From script to video'}
          description={
            pt
              ? 'A app cria o guião; o vídeo faz-se numa ferramenta própria. Copie o guião ou um prompt já preparado e cole-o numa das ferramentas.'
              : 'The app writes the script; the video is made in a dedicated tool. Copy the script or a ready-made prompt and paste it into one of the tools.'
          }
          actions={[
            { id: 'copy-script', label: pt ? 'Copiar guião' : 'Copy script', copyText: videoScriptText(draft, pt), primary: true },
            {
              id: 'copy-prompt',
              label: pt ? 'Copiar prompt para ferramenta de vídeo' : 'Copy prompt for a video tool',
              copyText: videoToolPrompt(draft, { researchQuestion: finalResearchQuestion?.question ?? topic, audienceLabel: AUDIENCE_LABELS[audience][pt ? 'pt' : 'en'], pt }),
            },
            { id: 'download', label: pt ? 'Descarregar guião (.md)' : 'Download script (.md)', download: { filename: 'guiao-video.md', text: videoScriptText(draft, pt) } },
          ]}
        />
      )}
    </div>
  )
}
