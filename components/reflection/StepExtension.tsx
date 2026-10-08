'use client'

import { useMemo, useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import { useI18n } from '@/components/I18nProvider'
import StepHeader from '@/components/StepHeader'
import { deriveGaps, extensionPlanToMarkdown, normalizeExtensionPlan } from '@/lib/stage3'
import { useStage3Ai } from './useStage3Ai'

interface Props {
  onBack: () => void
}

const COMPLEXITY_COLOR: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-red-100 text-red-800',
}

export default function StepExtension({ onBack }: Props) {
  const { locale } = useI18n()
  const { evidenceRecords, knowledgeStructure, explanationDraft, extensionPlan, setExtensionPlan, finalResearchQuestion } = useWizardStore()
  const { call, friendly } = useStage3Ai()
  const pt = locale === 'pt-PT'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [aiGaps, setAiGaps] = useState<string[]>([])

  const localGaps = useMemo(() => deriveGaps(evidenceRecords, explanationDraft), [evidenceRecords, explanationDraft])
  const gaps = aiGaps.length ? aiGaps : localGaps

  const generate = async () => {
    setLoading(true)
    setError('')
    try {
      const openIssues = gaps.join('; ')
      const structure = knowledgeStructure ? JSON.stringify(knowledgeStructure).slice(0, 2500) : ''
      const plan = normalizeExtensionPlan(await call('inquiry_extension', { knowledge_structure: structure, open_issues: openIssues }))
      setAiGaps(plan.gaps)
      setExtensionPlan(plan.paths)
    } catch (e) {
      setError(friendly(e))
    } finally {
      setLoading(false)
    }
  }

  const download = () => {
    if (!extensionPlan) return
    const blob = new Blob([extensionPlanToMarkdown(extensionPlan, gaps, pt)], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'plano-extensao.md'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <StepHeader
        stepId="step7_reflection"
        title={pt ? 'Planeador de Extensão' : 'Inquiry Extension Planner'}
        subtitle={pt
          ? 'Veja as lacunas do seu trabalho e receba até 3 caminhos para continuar a investigação.'
          : 'See the gaps in your work and get up to 3 paths to continue the inquiry.'}
      />
      <button type="button" onClick={onBack} className="text-sm text-[var(--on_surface_variant)] hover:underline">
        ← {pt ? 'Voltar' : 'Back'}
      </button>

      <div className="rounded-[var(--radius-md)] bg-[var(--surface_container_low)] p-4">
        <p className="text-xs font-semibold text-[var(--on_surface)]">{pt ? 'Lacunas identificadas' : 'Identified gaps'}</p>
        {gaps.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--on_surface_variant)]">
            {pt
              ? 'Ainda não há lacunas registadas no seu trabalho. A IA pode propor caminhos a partir da pergunta e das evidências.'
              : 'No gaps are recorded in your work yet. The AI can propose paths from the question and evidence.'}
          </p>
        ) : (
          <ul className="mt-2 space-y-1">
            {gaps.map((gap, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[var(--on_surface_variant)]">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                {gap}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={loading || !finalResearchQuestion?.question}
          title={!finalResearchQuestion?.question ? (pt ? 'Requer uma questão final no Stage 1.' : 'Requires a final question from Stage 1.') : undefined}
          onClick={generate}
          className="rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--on_primary)] transition hover:opacity-90 disabled:opacity-50"
        >
          {loading
            ? (pt ? 'A propor caminhos…' : 'Proposing paths…')
            : extensionPlan ? (pt ? 'Propor outros caminhos' : 'Propose other paths') : (pt ? 'Propor caminhos de extensão' : 'Propose extension paths')}
        </button>
        {extensionPlan && (
          <button type="button" onClick={download} className="text-xs text-[var(--primary)] hover:underline">
            {pt ? 'Descarregar plano (.md)' : 'Download plan (.md)'}
          </button>
        )}
      </div>

      {error && <p role="alert" className="text-sm text-amber-800">{error}</p>}

      {extensionPlan && (
        <div className="grid gap-4 md:grid-cols-3">
          {extensionPlan.map((path, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--outline_variant)] bg-[var(--surface_container_lowest)] p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-[var(--on_surface)]">{path.title}</p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${COMPLEXITY_COLOR[path.complexity] ?? ''}`}>
                  {pt ? (path.complexity === 'low' ? 'Baixa' : path.complexity === 'medium' ? 'Média' : 'Alta') : path.complexity}
                </span>
              </div>
              <p className="text-xs text-[var(--on_surface_variant)]">{path.description}</p>
              {path.gapAddressed && <p className="text-xs italic text-[var(--on_surface_variant)]">🎯 {path.gapAddressed}</p>}
              <div className="mt-auto space-y-1 text-xs">
                {path.suggestedDatabases.length > 0 && <p><span className="font-medium">{pt ? 'Bases de dados:' : 'Databases:'}</span> {path.suggestedDatabases.join(', ')}</p>}
                {path.potentialMethodologies.length > 0 && <p><span className="font-medium">{pt ? 'Metodologias:' : 'Methodologies:'}</span> {path.potentialMethodologies.join(', ')}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
