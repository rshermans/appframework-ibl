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

  // Localized dimensions
  const DIMENSIONS = [
    { key: 'currency',   label: t('steps.step5_source_selection.dimensions.currency'),   description: t('steps.step5_source_selection.dimensions.currencyDesc') },
    { key: 'relevance',  label: t('steps.step5_source_selection.dimensions.relevance'),  description: t('steps.step5_source_selection.dimensions.relevanceDesc') },
    { key: 'authority',  label: t('steps.step5_source_selection.dimensions.authority'),  description: t('steps.step5_source_selection.dimensions.authorityDesc') },
    { key: 'accuracy',   label: t('steps.step5_source_selection.dimensions.accuracy'),   description: t('steps.step5_source_selection.dimensions.accuracyDesc') },
    { key: 'purpose',    label: t('steps.step5_source_selection.dimensions.purpose'),    description: t('steps.step5_source_selection.dimensions.purposeDesc') },
  ] as const

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
        stepId="step5_source_selection"
        title={t('steps.step5_source_selection.title')}
        subtitle={t('steps.step5_source_selection.intro')}
      />

      <EthicalTip
        title={t('steps.step5_source_selection.ethicalTip')}
        tip={getIblEthicalTip('step5_source_selection')}
        className="mb-2"
      />

      {sourceIds.length === 0 && (
        <div className="rounded-[var(--radius-xl)] border border-[var(--outline_variant)] bg-[var(--surface_container_low)] p-6 text-center text-sm text-[var(--on_surface_variant)]">
          {t('steps.step5_source_selection.noSources')}
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
              <div className="mb-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold leading-snug line-clamp-2 ${isConfirmed ? 'text-[var(--on_primary_container)]' : 'text-[var(--on_surface)]'}`}>
                    {label}
                  </p>
                  <p className={`mt-1 text-xs ${isConfirmed ? 'text-[var(--on_primary_container)] opacity-70' : 'text-[var(--on_surface_variant)]'}`}>
                    {records.length} {t('steps.step3.evidenceLabel').toLowerCase()}(s)
                  </p>
                </div>

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

              <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-5">
                {DIMENSIONS.map((dim) => (
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
                {isConfirmed 
                  ? t('steps.step5_source_selection.confirmedButton') 
                  : passed 
                    ? t('steps.step5_source_selection.confirmButton') 
                    : t('steps.step5_source_selection.scoreToConfirm')}
              </button>
            </div>
          )
        })}
      </div>

      {sourceIds.length > 0 && (
        <div className="flex flex-col gap-3 rounded-[var(--radius-xl)] border border-[var(--outline_variant)] bg-[var(--surface_container)] p-4">
          <div className="text-sm text-[var(--on_surface_variant)]">
            {t('steps.step5_source_selection.summary', { confirmed: confirmed_count, total: total_count })}
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={confirmed_count === 0}
            className="self-start rounded-[var(--radius-md)] bg-[var(--primary)] px-8 py-3 text-sm font-semibold text-[var(--on_primary)] transition hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('steps.step5_source_selection.continueButton')} →
          </button>
        </div>
      )}
    </div>
  )
}
