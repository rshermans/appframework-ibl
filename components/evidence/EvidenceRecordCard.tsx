'use client'

import { useI18n } from '@/components/I18nProvider'
import type { EvidenceRecord } from '@/types/research-workflow'

interface EvidenceRecordCardProps {
  record: EvidenceRecord
  /** 0-based position across all pages. */
  index: number
}

export default function EvidenceRecordCard({ record, index }: EvidenceRecordCardProps) {
  const { t } = useI18n()

  return (
      <div className="tonal-card p-5">
        <div className="mb-1 font-label text-[10px] uppercase tracking-[0.12em] text-[var(--secondary)]">
          {t('steps.step3.evidenceLabel')} {index + 1}
        </div>
        <div className="text-lg font-semibold text-[var(--on_surface)]">{record.title}</div>
        <div className="mt-2 text-sm text-[var(--on_surface)] opacity-70">
          {t('steps.step3.typeLabel')}: {record.sourceType} | {t('steps.step3.relevanceLabel')}:{' '}
          {record.relevanceScore}/5
        </div>

        <div className="mt-4 space-y-4 text-sm text-[var(--on_surface)]">
          <div>
            <div className="mb-1 font-semibold">{t('steps.step3.claim')}</div>
            <div>{record.claim}</div>
          </div>

          <div>
            <div className="mb-1 font-semibold">{t('steps.step3.methodology')}</div>
            <div>{record.methodology}</div>
          </div>

          <div>
            <div className="mb-1 font-semibold">{t('steps.step3.findings')}</div>
            <ul className="space-y-1">
              {record.findings.map((finding) => (
                <li key={finding} className="bg-[var(--surface_container)] px-3 py-2">
                  {finding}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="mb-1 font-semibold">{t('steps.step3.limitations')}</div>
            <ul className="space-y-1">
              {record.limitations.map((limitation) => (
                <li key={limitation} className="bg-[var(--surface_container)] px-3 py-2">
                  {limitation}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="mb-1 font-semibold">{t('steps.step3.citation')}</div>
            <div className="bg-[var(--surface_container)] p-3">{record.citation}</div>
          </div>
        </div>
      </div>
  )
}
