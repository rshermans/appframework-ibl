'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import { useI18n } from '@/components/I18nProvider'
import StepHeader from '@/components/StepHeader'
import { parseAiJson } from '@/lib/parseAiJson'
import { retryWithBackoff } from '@/lib/retryHelper'
import { safeFetch } from '@/lib/safeFetch'
import type { ReflectionEntry } from '@/types/research-workflow'

interface Props {
  onBack: () => void
}

export default function StepReflection({ onBack }: Props) {
  const { locale } = useI18n()
  const { projectId, topic, finalResearchQuestion, reflectionJournal, addReflectionEntry } =
    useWizardStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [prompts, setPrompts] = useState<Array<{ id: string; prompt: string }>>([])
  const [responses, setResponses] = useState<Record<string, string>>({})
  const pt = locale === 'pt-PT'

  const generatePrompts = async () => {
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
              stage: 3, promptId: 'reflection_journal',
              stepId: 'step7_reflection', stepLabel: 'Reflection Journal',
              rq: finalResearchQuestion?.question ?? '',
              context: `${reflectionJournal.length} reflection entries completed`,
            }),
          }),
        { maxAttempts: 2, initialDelayMs: 1200, maxDelayMs: 3000 }
      )
      if (!response.ok || !payload?.ok) throw new Error((payload?.details || payload?.error || 'API error') as string)
      const data = payload?.data ?? payload
      const parsed = parseAiJson<{ prompts: Array<{ id: string; prompt: string }> }>(data.output)
      if (!parsed?.prompts?.length) throw new Error(pt ? 'Resposta inválida da IA.' : 'Invalid AI response.')
      setPrompts(parsed.prompts)
      setResponses({})
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const saveEntry = (promptItem: { id: string; prompt: string }) => {
    const text = responses[promptItem.id]?.trim()
    if (!text) return
    const entry: ReflectionEntry = {
      id: Math.random().toString(36).slice(2),
      prompt: promptItem.prompt,
      response: text,
      createdAt: new Date().toISOString(),
    }
    addReflectionEntry(entry)
    setResponses((prev) => ({ ...prev, [promptItem.id]: '' }))
  }

  return (
    <div className="space-y-6">
      <StepHeader
        stepId="step7_reflection"
        title={pt ? 'Diário de Reflexão' : 'Reflection Journal'}
        subtitle={pt
          ? 'Micro-prompts de metacognição gerados pela IA. As respostas são tuas.'
          : 'AI-generated metacognition micro-prompts. The answers are yours.'}
      />
      <button type="button" onClick={onBack} className="text-sm text-[var(--on_surface_variant)] hover:underline">
        ← {pt ? 'Voltar' : 'Back'}
      </button>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={generatePrompts}
          className="rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--on_primary)] transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? (pt ? 'A gerar…' : 'Generating…') : (pt ? 'Gerar micro-prompts' : 'Generate micro-prompts')}
        </button>
        {reflectionJournal.length > 0 && (
          <span className="text-xs text-[var(--on_surface_variant)]">
            {reflectionJournal.length} {pt ? 'entrada(s) guardada(s)' : 'entry/entries saved'}
          </span>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {prompts.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs italic text-amber-700">
            🛡 {pt
              ? 'A reflexão é trabalho humano. A IA convida — as respostas verdadeiras são tuas.'
              : 'Reflection is human work. AI invites — honest answers are yours.'}
          </p>
          {prompts.map((p) => (
            <div key={p.id} className="journal-entry rounded-[var(--radius-md)] border border-[var(--outline_variant)] p-4">
              <p className="text-sm font-medium text-[var(--on_surface)]">{p.prompt}</p>
              <textarea
                value={responses[p.id] ?? ''}
                onChange={(e) => setResponses((prev) => ({ ...prev, [p.id]: e.target.value }))}
                rows={3}
                placeholder={pt ? 'A tua resposta…' : 'Your response…'}
                className="mt-2 w-full rounded-[var(--radius-sm)] border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={!(responses[p.id]?.trim())}
                onClick={() => saveEntry(p)}
                className="mt-2 rounded-[var(--radius-sm)] bg-[var(--secondary_container)] px-3 py-1 text-xs font-medium text-[var(--on_secondary_container)] transition hover:opacity-90 disabled:opacity-50"
              >
                {pt ? 'Guardar entrada' : 'Save entry'}
              </button>
            </div>
          ))}
        </div>
      )}

      {reflectionJournal.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--on_surface)]">
            {pt ? 'Diário guardado' : 'Saved journal'}
          </p>
          {reflectionJournal.map((entry) => (
            <div key={entry.id} className="journal-entry rounded-[var(--radius-sm)] border border-[var(--outline_variant)] bg-[var(--surface_container_lowest)] p-3 text-xs">
              <p className="font-medium text-[var(--on_surface)]">{entry.prompt}</p>
              <p className="mt-1 italic text-[var(--on_surface_variant)]">{entry.response}</p>
              <p className="mt-1 text-[10px] text-[var(--on_surface_variant)]">
                {new Date(entry.createdAt).toLocaleDateString(pt ? 'pt-PT' : 'en-GB')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
