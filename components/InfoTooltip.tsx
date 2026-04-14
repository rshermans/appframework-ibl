interface InfoTooltipProps {
  label: string
  description: string
  className?: string
}

export default function InfoTooltip({ label, description, className }: InfoTooltipProps) {
  return (
    <span className={`group relative inline-flex text-current ${className || ''}`}>
      <span className="inline-flex items-center gap-2 text-current">
        <span className="font-medium text-current">{label}</span>
        <span
          className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--info_soft)] text-[10px] font-bold text-[var(--primary)] ghost-border"
          aria-hidden="true"
        >
          i
        </span>
      </span>
      <span className="pointer-events-none absolute bottom-[calc(100%+12px)] left-1/2 z-30 hidden w-72 -translate-x-1/2 rounded-[var(--radius-xl)] bg-slate-900 px-4 py-3 text-xs font-medium leading-5 text-white shadow-xl ring-1 ring-white/10 group-hover:block group-focus-within:block">
        {description}
        {/* Triangle arrow */}
        <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-slate-900" />
      </span>
    </span>
  )
}
