'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import { useI18n } from '@/components/I18nProvider'
import StepHeader from '@/components/StepHeader'
import AudienceSelect from './AudienceSelect'
import GenerateControls from './GenerateControls'
import EvidenceWatermark from './EvidenceWatermark'
import ExportToNotebookButton from '@/components/ExportToNotebookButton'

interface Props {
  onBack: () => void
}

export default function Step10APoster({ onBack }: Props) {
  const { locale } = useI18n()
  const {
    projectId, topic, finalResearchQuestion, evidenceRecords, knowledgeStructure,
    multimodalOutputs,
  } = useWizardStore()
  const draft = multimodalOutputs.poster
  const pt = locale === 'pt-PT'

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
        <AudienceSelect />
        <GenerateControls kind="poster" hasDraft={Boolean(draft)} />
        <ExportToNotebookButton
          projectId={projectId}
          topic={topic}
          researchQuestion={finalResearchQuestion?.question ?? ''}
          evidenceRecords={evidenceRecords}
          artifactType="poster"
          variant="secondary"
          size="sm"
        />
      </div>

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
