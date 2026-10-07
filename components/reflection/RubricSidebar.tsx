'use client'

import { RUBRIC_DIMENSIONS } from '@/lib/rubric'

interface Props {
  activeDimensions?: string[]
  scores?: Record<string, number>
  pt?: boolean
}

export default function RubricSidebar({ activeDimensions, scores, pt = true }: Props) {
  const shown = activeDimensions
    ? RUBRIC_DIMENSIONS.filter((d) => activeDimensions.includes(d.id))
    : RUBRIC_DIMENSIONS

  return (
    <aside className="rubric-sidebar rounded-[var(--radius-md)] border border-[var(--outline_variant)] bg-[var(--surface_container)] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--on_surface_variant)]">
        {pt ? 'Rúbrica IBL' : 'IBL Rubric'}
      </p>
      <div className="mt-3 space-y-2">
        {shown.map((dim) => {
          const score = scores?.[dim.id]
          return (
            <div key={dim.id} className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0 rounded bg-[var(--primary_container)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--on_primary_container)]">
                {dim.id}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium leading-tight text-[var(--on_surface)]">
                  {pt ? dim.desc.pt : dim.desc.en}
                </p>
                {typeof score === 'number' && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface_container_low)]">
                      <div
                        className="h-full rounded-full bg-[var(--primary)] transition-all"
                        style={{ width: `${(score / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[var(--on_surface_variant)]">{score}/5</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
