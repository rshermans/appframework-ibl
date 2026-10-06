'use client'

import { useI18n } from '@/components/I18nProvider'
import type { EvidenceRecord } from '@/types/research-workflow'

interface EvidenceRecordRowProps {
  record: EvidenceRecord
  /** 0-based position across all pages. */
  index: number
  onOpen: (record: EvidenceRecord) => void
}

/** Compact summary of an evidence record; the full record opens in a drawer. */
export default function EvidenceRecordRow({ record, index, onOpen }: EvidenceRecordRowProps) {
  const { locale, t } = useI18n()
  const isPortuguese = locale === 'pt-PT'

  return (
    <div className="tonal-card flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0 flex-1">
        <div className="font-label text-[10px] uppercase tracking-[0.12em] text-[var(--secondary)]">
          {t('steps.step3.evidenceLabel')} {index + 1}
        </div>
        <div className="mt-1 truncate text-base font-semibold text-[var(--on_surface)]">{record.title}</div>
        <p className="mt-1 line-clamp-2 text-sm text-[var(--on_surface)] opacity-80">{record.claim}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--on_surface)]">
          <span className="rounded-full bg-[var(--surface_container)] px-2 py-0.5">{record.sourceType}</span>
          <span className="rounded-full bg-[var(--surface_container)] px-2 py-0.5">
            {t('steps.step3.relevanceLabel')}: {record.relevanceScore}/5
          </span>
          {record.citation && (
            <span className="max-w-full truncate rounded-full bg-[var(--surface_container)] px-2 py-0.5">{record.citation}</span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onOpen(record)}
        aria-label={`${isPortuguese ? 'Ver detalhes' : 'View details'}: ${record.title}`}
        className="min-h-[44px] shrink-0 rounded-[var(--radius-md)] bg-[var(--surface_container)] px-4 text-sm font-semibold text-[var(--on_surface)] transition hover:bg-[var(--surface_container_high)]"
      >
        {isPortuguese ? 'Ver detalhes' : 'View details'}
      </button>
    </div>
  )
}
