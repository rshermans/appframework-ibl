'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import { useI18n } from '@/components/I18nProvider'
import StepHeader from '@/components/StepHeader'
import { parseAiJson } from '@/lib/parseAiJson'
import { retryWithBackoff } from '@/lib/retryHelper'
import { safeFetch } from '@/lib/safeFetch'
import type { ExtensionPath } from '@/types/research-workflow'

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
  const {
    projectId, topic, finalResearchQuestion, evidenceRecords, knowledgeStructure, explanationDraft,
    extensionPlan, setExtensionPlan,
  } = useWizardStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [gaps, setGaps] = useState<string[]>([])
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
              stage: 3, promptId: 'inquiry_extension',
              stepId: 'step7_reflection', stepLabel: 'Inquiry Extension',
              rq: finalResearchQuestion?.question ?? '',
              evidence: JSON.stringify(evidenceRecords.slice(0, 10), null, 2),
              knowledge_structure: JSON.stringify(knowledgeStructure, null, 2),
              open_issues: explanationDraft?.openIssues?.join('; ') ?? '',
            }),
          }),
        { maxAttempts: 2, initialDelayMs: 1200, maxDelayMs: 3000 }
      )
      if (!response.ok || !payload?.ok) throw new Error((payload?.details || payload?.error || 'API error') as string)
      const data = payload?.data ?? payload
      const parsed = parseAiJson<{ gapsDetected: string[]; extensionPaths: ExtensionPath[] }>(data.output)
      if (!parsed?.extensionPaths?.length) throw new Error(pt ? 'Resposta inválida da IA.' : 'Invalid AI response.')
      setGaps(parsed.gapsDetected ?? [])
      setExtensionPlan(parsed.extensionPaths)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <StepHeader
        badge="S3-Extend"
        label={pt ? 'Planeador de Extensão' : 'Inquiry Extension Planner'}
        description={pt
          ? 'Deteta lacunas na investigação e propõe 3 caminhos distintos de extensão.'
          : 'Detects research gaps and proposes 3 distinct extension paths.'}
      />
      <button type="button" onClick={onBack} className="text-sm text-[var(--on_surface_variant)] hover:underline">
        ← {pt ? 'Voltar' : 'Back'}
      </button>

      <button
        type="button"
        disabled={loading}
        onClick={generate}
        className="rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--on_primary)] transition hover:opacity-90 disabled:opacity-50"
      >
        {loading
          ? (pt ? 'A detetar lacunas…' : 'Detecting gaps…')
          : extensionPlan
            ? (pt ? 'Regenerar' : 'Regenerate')
            : (pt ? 'Analisar e propor extensões' : 'Analyse and propose extensions')}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {gaps.length > 0 && (
        <div className="rounded-[var(--radius-md)] bg-[var(--surface_container_low)] p-4">
          <p className="text-xs font-semibold text-[var(--on_surface)]">
            {pt ? 'Lacunas identificadas' : 'Identified gaps'}
          </p>
          <ul className="mt-2 space-y-1">
            {gaps.map((gap, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[var(--on_surface_variant)]">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                {gap}
              </li>
            ))}
          </ul>
        </div>
      )}

      {extensionPlan && (
        <div className="grid gap-4 md:grid-cols-3">
          {extensionPlan.map((path, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--outline_variant)] bg-[var(--surface_container_lowest)] p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-[var(--on_surface)]">{path.title}</p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${COMPLEXITY_COLOR[path.complexity] ?? ''}`}>
                  {pt
                    ? path.complexity === 'low' ? 'Baixa' : path.complexity === 'medium' ? 'Média' : 'Alta'
                    : path.complexity.charAt(0).toUpperCase() + path.complexity.slice(1)}
                </span>
              </div>
              <p className="text-xs text-[var(--on_surface_variant)]">{path.description}</p>
              <p className="text-xs italic text-[var(--on_surface_variant)]">
                🎯 {path.gapAddressed}
              </p>
              <div className="mt-auto space-y-1 text-xs">
                {path.suggestedDatabases.length > 0 && (
                  <p><span className="font-medium">{pt ? 'Bases de dados:' : 'Databases:'}</span> {path.suggestedDatabases.join(', ')}</p>
                )}
                {path.potentialMethodologies.length > 0 && (
                  <p><span className="font-medium">{pt ? 'Metodologias:' : 'Methodologies:'}</span> {path.potentialMethodologies.join(', ')}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
