'use client'

import type { EvidenceAnchor } from '@/types/research-workflow'

interface Props {
  anchors: EvidenceAnchor[]
  compact?: boolean
}

export default function EvidenceWatermark({ anchors, compact = false }: Props) {
  if (anchors.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
        ⚠ ai-needs-validation
      </span>
    )
  }

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--surface_container)] px-2 py-0.5 text-[11px] text-[var(--on_surface_variant)]">
        🔗 {anchors.length} anchor{anchors.length !== 1 ? 's' : ''}
      </span>
    )
  }

  return (
    <div className="mt-2 space-y-1">
      {anchors.map((anchor, i) => (
        <div
          key={i}
          className="flex items-start gap-2 rounded-[var(--radius-sm)] bg-[var(--surface_container_low)] px-3 py-1.5 text-xs"
        >
          <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${anchor.validated ? 'bg-green-500' : 'bg-amber-400'}`} />
          <div>
            <span className="font-medium text-[var(--on_surface)]">{anchor.citationKey}</span>
            <span className="ml-2 text-[var(--on_surface_variant)]">{anchor.claimText}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
