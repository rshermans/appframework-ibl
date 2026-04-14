'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import type { EvidenceRecord, SearchArticle } from '@/types/research-workflow'
import { useI18n } from '@/components/I18nProvider'
import StepHeader from '@/components/StepHeader'
import EthicalTip from '@/components/EthicalTip'
import { getIblEthicalTip } from '@/lib/iblFramework'

// CRAAP dimensions with labels
const CRAAP_DIMENSIONS = [
  { key: 'currency',   label: 'Currency',   description: 'Is the information current / recently published?' },
  { key: 'relevance',  label: 'Relevance',  description: 'Does it directly answer the research question?' },
  { key: 'authority',  label: 'Authority',  description: 'Is the author/publisher credible and accountable?' },
  { key: 'accuracy',   label: 'Accuracy',   description: 'Is it evidence-based, peer-reviewed, verifiable?' },
  { key: 'purpose',    label: 'Purpose',    description: 'Is the intent to inform/research (not persuade/sell)?' },
] as const

type CraapKey = typeof CRAAP_DIMENSIONS[number]['key']

interface CraapScore {
  currency: boolean
  relevance: boolean
  authority: boolean
  accuracy: boolean
  purpose: boolean
}

function defaultCraap(): CraapScore {
  return { currency: false, relevance: false, authority: false, accuracy: false, purpose: false }
}

function craapTotal(score: CraapScore): number {
  return Object.values(score).filter(Boolean).length
}

function sourceSummary(record: EvidenceRecord, articles: SearchArticle[]): string {
  if (record.sourceArticleId) {
    const art = articles.find((a) => a.id === record.sourceArticleId)
    if (art) {
      const year = art.year ? ` (${art.year})` : ''
      const authors = art.authors.slice(0, 2).join(', ') || 'Unknown authors'
      return `${authors}${year}. ${art.title}`
    }
  }
  return record.sourceArticleTitle ?? record.title
}

export default function Step5SourceSelection() {
  const { t } = useI18n()
  const {
    evidenceRecords,
    searchArticles,
    selectedSearchArticleIds,
    setSelectedSearchArticleIds,
    setWorkflowStep,
  } = useWizardStore()

  // Build a deduplicated list of source article IDs from evidenceRecords
  const sourceIds = Array.from(
    new Set(evidenceRecords.map((r) => r.sourceArticleId ?? r.id))
  )

  // CRAAP scores keyed by source ID
  const [craap, setCraap] = useState<Record<string, CraapScore>>(() =>
    Object.fromEntries(sourceIds.map((id) => [id, defaultCraap()]))
  )

  // Initialise confirmed set from store; fall back to none
  const [confirmed, setConfirmed] = useState<Set<string>>(
    () => new Set(selectedSearchArticleIds)
  )

  function toggleDimension(sourceId: string, key: CraapKey) {
    setCraap((prev) => ({
      ...prev,
      [sourceId]: { ...prev[sourceId], [key]: !prev[sourceId]?.[key] },
    }))
  }

  function toggleConfirmed(sourceId: string) {
    setConfirmed((prev) => {
      const next = new Set(prev)
      if (next.has(sourceId)) {
        next.delete(sourceId)
      } else {
        next.add(sourceId)
      }
      return next
    })
  }

  function handleSave() {
    setSelectedSearchArticleIds(Array.from(confirmed))
    setWorkflowStep('step4_knowledge_structure')
  }

  // Group evidence records by source so the user sees one card per unique source
  const sourceGroups: Record<string, EvidenceRecord[]> = {}
  for (const record of evidenceRecords) {
    const key = record.sourceArticleId ?? record.id
    if (!sourceGroups[key]) sourceGroups[key] = []
    sourceGroups[key].push(record)
  }

  const confirmed_count = confirmed.size
  const total_count = sourceIds.length

  return (
    <div className="space-y-6">
      <StepHeader
        badge="Step 5"
        title="Source Selection & CRAAP Analysis"
        description="Evaluate each source using CRAAP criteria. Tick the sources you want to carry forward into knowledge structuring."
      />

      <EthicalTip
        title="Ethical tip — Source Credibility"
        tip={getIblEthicalTip('step5_source_selection')}
        className="mb-2"
      />

      {sourceIds.length === 0 && (
        <div className="rounded-[var(--radius-xl)] border border-[var(--outline_variant)] bg-[var(--surface_container_low)] p-6 text-center text-sm text-[var(--on_surface_variant)]">
          No evidence sources found. Complete Step 3 (Evidence Extraction) first.
        </div>
      )}

      <div className="space-y-4">
        {sourceIds.map((sourceId) => {
          const records = sourceGroups[sourceId] ?? []
          const firstRecord = records[0]
          if (!firstRecord) return null

          const label = sourceSummary(firstRecord, searchArticles)
          const score = craap[sourceId] ?? defaultCraap()
          const total = craapTotal(score)
          const passed = total >= 3
          const isConfirmed = confirmed.has(sourceId)

          return (
            <div
              key={sourceId}
              className={`rounded-[var(--radius-xl)] border p-5 transition-all ${
                isConfirmed
                  ? 'border-[var(--primary)] bg-[var(--primary_container)]'
                  : 'border-[var(--outline_variant)] bg-[var(--surface_container_low)]'
              }`}
            >
              {/* Source header */}
              <div className="mb-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--on_surface)] leading-snug line-clamp-2">
                    {label}
                  </p>
                  <p className="mt-1 text-xs text-[var(--on_surface_variant)]">
                    {records.length} evidence record{records.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* CRAAP badge */}
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    passed
                      ? 'bg-[var(--tertiary_container)] text-[var(--on_tertiary_container)]'
                      : 'bg-[var(--error_container)] text-[var(--on_error_container)]'
                  }`}
                >
                  {total}/5
                </span>
              </div>

              {/* CRAAP checkboxes */}
              <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-5">
                {CRAAP_DIMENSIONS.map((dim) => (
                  <label
                    key={dim.key}
                    title={dim.description}
                    className="flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--outline_variant)] bg-[var(--surface_container)] px-2 py-1.5 text-xs transition hover:bg-[var(--surface_container_high)]"
                  >
                    <input
                      type="checkbox"
                      className="accent-[var(--primary)]"
                      checked={score[dim.key]}
                      onChange={() => toggleDimension(sourceId, dim.key)}
                    />
                    <span className="font-medium text-[var(--on_surface)]">{dim.label}</span>
                  </label>
                ))}
              </div>

              {/* Confirm toggle */}
              <button
                type="button"
                onClick={() => toggleConfirmed(sourceId)}
                disabled={!passed && !isConfirmed}
                className={`w-full rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold transition ${
                  isConfirmed
                    ? 'bg-[var(--primary)] text-[var(--on_primary)] hover:brightness-90'
                    : passed
                    ? 'bg-[var(--secondary_container)] text-[var(--on_secondary_container)] hover:brightness-95'
                    : 'cursor-not-allowed bg-[var(--surface_container_high)] text-[var(--on_surface_variant)] opacity-50'
                }`}
              >
                {isConfirmed ? '✓ Confirmed — carry forward' : passed ? 'Confirm this source' : 'Score ≥ 3/5 to confirm'}
              </button>
            </div>
          )
        })}
      </div>

      {/* Summary + proceed */}
      {sourceIds.length > 0 && (
        <div className="flex flex-col gap-3 rounded-[var(--radius-xl)] border border-[var(--outline_variant)] bg-[var(--surface_container)] p-4">
          <p className="text-sm text-[var(--on_surface_variant)]">
            <strong className="text-[var(--on_surface)]">{confirmed_count}</strong> of{' '}
            <strong className="text-[var(--on_surface)]">{total_count}</strong> sources confirmed for knowledge structuring.
          </p>
          <button
            type="button"
            onClick={handleSave}
            disabled={confirmed_count === 0}
            className="self-start rounded-[var(--radius-md)] bg-[var(--primary)] px-6 py-2 text-sm font-semibold text-[var(--on_primary)] transition hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Proceed to Knowledge Structuring →
          </button>
        </div>
      )}
    </div>
  )
}
