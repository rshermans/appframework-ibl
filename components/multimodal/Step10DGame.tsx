'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import { useI18n } from '@/components/I18nProvider'
import StepHeader from '@/components/StepHeader'
import AudienceSelect from './AudienceSelect'
import GenerateControls from './GenerateControls'
import ExportToNotebookButton from '@/components/ExportToNotebookButton'
import CreationGuide from './CreationGuide'
import GamePlayer from './GamePlayer'
import { gameScriptText } from '@/lib/outputExports'

interface Props {
  onBack: () => void
}

export default function Step10DGame({ onBack }: Props) {
  const { locale } = useI18n()
  const {
    projectId, topic, finalResearchQuestion, evidenceRecords,
    multimodalOutputs,
  } = useWizardStore()
  const [activeBranch, setActiveBranch] = useState(0)
  const draft = multimodalOutputs.game
  const pt = locale === 'pt-PT'

  return (
    <div className="space-y-6">
      <StepHeader
        stepId="step6_multimodal"
        title={pt ? 'Jogo de Ciência' : 'Science Game'}
        subtitle={pt
          ? 'Cenário de decisões com consequências baseadas na evidência. Pode jogá-lo aqui mesmo e levar o guião para o usar na aula.'
          : 'Decision scenario with evidence-grounded consequences. You can play it right here and take the script to use in class.'}
      />
      <button type="button" onClick={onBack} className="text-sm text-[var(--on_surface_variant)] hover:underline">
        ← {pt ? 'Voltar ao hub' : 'Back to hub'}
      </button>

      <div className="flex flex-wrap items-center gap-3">
        <AudienceSelect />
        <GenerateControls
          kind="game"
          hasDraft={Boolean(draft)}
          labels={{ generate: pt ? 'Gerar jogo' : 'Generate game', regenerate: pt ? 'Gerar outro jogo' : 'Generate another game' }}
        />
        <ExportToNotebookButton
          projectId={projectId}
          topic={topic}
          researchQuestion={finalResearchQuestion?.question ?? ''}
          evidenceRecords={evidenceRecords}
          artifactType="game"
          variant="secondary"
          size="sm"
        />
      </div>

      {draft && <GamePlayer scenario={draft} />}

      {draft && (
        <details className="rounded-[var(--radius-md)] border border-[var(--outline_variant)] p-4">
          <summary className="cursor-pointer text-sm font-semibold text-[var(--on_surface)]">
            {pt ? 'Ver a estrutura do jogo (para quem vai conduzir a atividade)' : 'View the game structure (for whoever runs the activity)'}
          </summary>
        <div className="mt-4 space-y-4">
          <div>
            <h3 className="font-semibold text-[var(--on_surface)]">{draft.title}</h3>
            <p className="mt-1 text-sm text-[var(--on_surface_variant)]">
              🎯 {draft.objective}
            </p>
            <p className="mt-1 text-xs text-[var(--on_surface_variant)]">
              {pt ? 'Fidelidade' : 'Fidelity'}: {draft.fidelityScore}%
            </p>
          </div>

          {/* Branch navigation */}
          <div className="flex flex-wrap gap-2">
            {draft.branches.map((branch, i) => (
              <button
                key={branch.id}
                type="button"
                onClick={() => setActiveBranch(i)}
                className={`rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium transition
                  ${activeBranch === i
                    ? 'bg-[var(--primary)] text-[var(--on_primary)]'
                    : 'bg-[var(--surface_container)] text-[var(--on_surface)] hover:bg-[var(--surface_container_low)]'
                  }`}
              >
                {pt ? `Cenário ${i + 1}` : `Scenario ${i + 1}`}
              </button>
            ))}
          </div>

          {draft.branches[activeBranch] && (
            <div className="rounded-[var(--radius-md)] border border-[var(--outline_variant)] bg-[var(--surface_container_lowest)] p-5">
              <p className="font-medium text-[var(--on_surface)]">
                {draft.branches[activeBranch].prompt}
              </p>
              <div className="mt-4 space-y-2">
                {draft.branches[activeBranch].choices.map((choice) => (
                  <details key={choice.id} className="group rounded-[var(--radius-sm)] border border-[var(--outline_variant)] bg-[var(--surface_container)] p-3">
                    <summary className="cursor-pointer text-sm font-medium text-[var(--on_surface)]">
                      {choice.text}
                    </summary>
                    <p className="mt-2 text-xs text-[var(--on_surface_variant)]">
                      → {choice.consequence}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          )}
        </div>
        </details>
      )}

      {draft && (
        <CreationGuide
          title={pt ? 'Levar o jogo para a aula' : 'Take the game to class'}
          description={pt ? 'Copie ou descarregue o cenário completo (decisões e consequências) para o projetar, imprimir ou adaptar.' : 'Copy or download the full scenario (decisions and consequences) to project, print or adapt.'}
          actions={[
            { id: 'copy-script', label: pt ? 'Copiar cenário' : 'Copy scenario', copyText: gameScriptText(draft, pt), primary: true },
            { id: 'download', label: pt ? 'Descarregar cenário (.md)' : 'Download scenario (.md)', download: { filename: 'jogo-cenario.md', text: gameScriptText(draft, pt) } },
          ]}
        />
      )}
    </div>
  )
}
