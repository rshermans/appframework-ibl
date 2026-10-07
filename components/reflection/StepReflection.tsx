'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import { useI18n } from '@/components/I18nProvider'
import StepHeader from '@/components/StepHeader'
import { defaultJournalPrompts, journalToMarkdown, normalizeJournalPrompts, type JournalPrompt } from '@/lib/stage3'
import { useStage3Ai } from './useStage3Ai'
import type { ReflectionEntry } from '@/types/research-workflow'

interface Props {
  onBack: () => void
}

export default function StepReflection({ onBack }: Props) {
  const { locale } = useI18n()
  const { reflectionJournal, addReflectionEntry, finalResearchQuestion } = useWizardStore()
  const { call, friendly } = useStage3Ai()
  const pt = locale === 'pt-PT'
  const [prompts, setPrompts] = useState<JournalPrompt[]>(() => defaultJournalPrompts(pt))
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [aiUsed, setAiUsed] = useState(false)

  const answered = new Set(reflectionJournal.map((entry) => entry.prompt))

  const personalise = async () => {
    setLoading(true)
    setError('')
    try {
      const next = normalizeJournalPrompts(await call('reflection_journal'))
      if (next.length === 0) throw new Error(pt ? 'resposta vazia' : 'empty response')
      setPrompts(next)
      setResponses({})
      setAiUsed(true)
    } catch (e) {
      setError(friendly(e))
    } finally {
      setLoading(false)
    }
  }

  const saveEntry = (item: JournalPrompt) => {
    const response = responses[item.id]?.trim()
    if (!response) return
    const entry: ReflectionEntry = {
      id: Math.random().toString(36).slice(2),
      prompt: item.prompt,
      response,
      createdAt: new Date().toISOString(),
    }
    addReflectionEntry(entry)
    setResponses((prev) => ({ ...prev, [item.id]: '' }))
  }

  const download = () => {
    const blob = new Blob([journalToMarkdown(reflectionJournal, pt)], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'diario-reflexivo.md'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <StepHeader
        stepId="step7_reflection"
        title={pt ? 'Diário Reflexivo' : 'Reflective Journal'}
        subtitle={pt
          ? 'Escreva, por palavras suas, o que aprendeu e o que mudaria. Três perguntas simples — as respostas são só suas.'
          : 'Write, in your own words, what you learned and what you would change. Three simple questions — the answers are yours alone.'}
      />
      <button type="button" onClick={onBack} className="text-sm text-[var(--on_surface_variant)] hover:underline">
        ← {pt ? 'Voltar' : 'Back'}
      </button>

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs italic text-amber-700">
          🛡 {pt ? 'A reflexão é trabalho humano: a IA só pode sugerir perguntas.' : 'Reflection is human work: the AI can only suggest questions.'}
        </p>
        <button
          type="button"
          disabled={loading || !finalResearchQuestion?.question}
          onClick={personalise}
          className="rounded-[var(--radius-sm)] bg-[var(--secondary_container)] px-3 py-1.5 text-xs font-medium text-[var(--on_secondary_container)] transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? (pt ? 'A adaptar…' : 'Tailoring…') : aiUsed ? (pt ? 'Outras perguntas' : 'Other questions') : (pt ? 'Adaptar perguntas ao meu projeto (IA)' : 'Tailor questions to my project (AI)')}
        </button>
      </div>

      {error && <p role="alert" className="text-sm text-amber-800">{error}</p>}

      <div className="space-y-4">
        {prompts.map((item) => (
          <div key={item.id} className="journal-entry rounded-[var(--radius-md)] border border-[var(--outline_variant)] p-4">
            <p className="text-sm font-medium text-[var(--on_surface)]">{item.prompt}</p>
            {answered.has(item.prompt) && (
              <p className="mt-1 text-xs text-green-700">✓ {pt ? 'Já respondida (pode acrescentar mais)' : 'Already answered (you can add more)'}</p>
            )}
            <textarea
              value={responses[item.id] ?? ''}
              onChange={(e) => setResponses((prev) => ({ ...prev, [item.id]: e.target.value }))}
              rows={3}
              aria-label={item.prompt}
              placeholder={pt ? 'Escreva a sua resposta…' : 'Write your answer…'}
              className="mt-2 w-full rounded-[var(--radius-sm)] border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={!responses[item.id]?.trim()}
              onClick={() => saveEntry(item)}
              className="mt-2 rounded-[var(--radius-sm)] bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--on_primary)] transition hover:opacity-90 disabled:opacity-50"
            >
              {pt ? 'Guardar resposta' : 'Save answer'}
            </button>
          </div>
        ))}
      </div>

      {reflectionJournal.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[var(--on_surface)]">
              {pt ? 'O meu diário' : 'My journal'} ({reflectionJournal.length})
            </p>
            <button type="button" onClick={download} className="text-xs text-[var(--primary)] hover:underline">
              {pt ? 'Descarregar (.md)' : 'Download (.md)'}
            </button>
          </div>
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
