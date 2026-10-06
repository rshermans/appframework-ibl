'use client'

interface PagerProps {
  page: number
  totalPages: number
  summary: string
  prevLabel: string
  nextLabel: string
  onChange: (page: number) => void
}

/** Prev / next paging control shared by the long lists in the wizard steps. */
export default function Pager({ page, totalPages, summary, prevLabel, nextLabel, onChange }: PagerProps) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between gap-2 pt-2">
      <button
        type="button"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        className="rounded-[var(--radius-md)] border border-[var(--outline_variant)] px-3 py-1.5 text-xs disabled:opacity-40"
      >
        {prevLabel}
      </button>
      <span className="text-xs text-[var(--on_surface_variant)]">{summary}</span>
      <button
        type="button"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        className="rounded-[var(--radius-md)] border border-[var(--outline_variant)] px-3 py-1.5 text-xs disabled:opacity-40"
      >
        {nextLabel}
      </button>
    </div>
  )
}
