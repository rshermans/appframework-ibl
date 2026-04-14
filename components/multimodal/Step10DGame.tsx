'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import { useI18n } from '@/components/I18nProvider'
import StepHeader from '@/components/StepHeader'
import { parseAiJson } from '@/lib/parseAiJson'
import { retryWithBackoff } from '@/lib/retryHelper'
import { safeFetch } from '@/lib/safeFetch'
import type { GameScenario } from '@/types/research-workflow'

interface Props {
  onBack: () => void
}

export default function Step10DGame({ onBack }: Props) {
  const { locale } = useI18n()
  const {
    projectId, topic, finalResearchQuestion, evidenceRecords,
    multimodalOutputs, setMultimodalGame, setEvidenceFidelityScore,
  } = useWizardStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeBranch, setActiveBranch] = useState(0)
  const draft = multimodalOutputs.game
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
              stage: 2, promptId: 'multimodal_game',
              stepId: 'step6_multimodal', stepLabel: 'Science Game',
              rq: finalResearchQuestion?.question ?? '',
              evidence: JSON.stringify(evidenceRecords, null, 2),
              audience: 'school',
            }),
          }),
        { maxAttempts: 2, initialDelayMs: 1200, maxDelayMs: 3000 }
      )
      if (!response.ok || !payload?.ok) throw new Error((payload?.details || payload?.error || 'API error') as string)
      const data = payload?.data ?? payload
      const parsed = parseAiJson<GameScenario>(data.output)
      if (!parsed?.branches?.length) throw new Error(pt ? 'Resposta inválida da IA.' : 'Invalid AI response.')
      setMultimodalGame(parsed)
      if (typeof parsed.fidelityScore === 'number') setEvidenceFidelityScore(parsed.fidelityScore)
      setActiveBranch(0)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <StepHeader
        badge="Step 10D"
        label={pt ? 'Jogo de Ciência' : 'Science Game'}
        description={pt
          ? 'Jogo de decisão com ramificações narrativas baseadas em evidência.'
          : 'Decision-based game with evidence-grounded branching narrative.'}
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
          {loading ? (pt ? 'A gerar…' : 'Generating…') : draft ? (pt ? 'Regenerar' : 'Regenerate') : (pt ? 'Gerar jogo' : 'Generate game')}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {draft && (
        <div className="space-y-4">
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
      )}
    </div>
  )
}
