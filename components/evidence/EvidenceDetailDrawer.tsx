'use client'

import Drawer from '@/components/ui/Drawer'
import { useI18n } from '@/components/I18nProvider'
import EvidenceRecordCard from './EvidenceRecordCard'
import type { EvidenceRecord } from '@/types/research-workflow'

interface EvidenceDetailDrawerProps {
  /** The (filtered) list the learner is browsing, so Previous/Next stay in context. */
  records: EvidenceRecord[]
  openId: string | null
  onNavigate: (id: string) => void
  onClose: () => void
}

export default function EvidenceDetailDrawer({ records, openId, onNavigate, onClose }: EvidenceDetailDrawerProps) {
  const { locale, t } = useI18n()
  const isPortuguese = locale === 'pt-PT'
  const index = records.findIndex((record) => record.id === openId)
  const record = index >= 0 ? records[index] : null
  if (!record) return null

  const previous = index > 0 ? records[index - 1] : null
  const next = index < records.length - 1 ? records[index + 1] : null

  return (
    <Drawer
      open
      onClose={onClose}
      size="lg"
      title={`${t('steps.step3.evidenceLabel')} ${index + 1} / ${records.length}`}
      closeLabel={isPortuguese ? 'Fechar' : 'Close'}
      footer={
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={!previous}
            onClick={() => previous && onNavigate(previous.id)}
            className="min-h-[44px] rounded-[var(--radius-md)] bg-[var(--surface_container)] px-4 text-sm font-semibold text-[var(--on_surface)] transition hover:bg-[var(--surface_container_high)] disabled:opacity-40"
          >
            ← {isPortuguese ? 'Anterior' : 'Previous'}
          </button>
          <button
            type="button"
            disabled={!next}
            onClick={() => next && onNavigate(next.id)}
            className="min-h-[44px] rounded-[var(--radius-md)] bg-[var(--surface_container)] px-4 text-sm font-semibold text-[var(--on_surface)] transition hover:bg-[var(--surface_container_high)] disabled:opacity-40"
          >
            {isPortuguese ? 'Seguinte' : 'Next'} →
          </button>
        </div>
      }
    >
      <EvidenceRecordCard record={record} index={index} />
    </Drawer>
  )
}
