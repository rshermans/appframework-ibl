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
      <span className="pointer-events-none absolute left-0 top-[calc(100%+8px)] z-30 hidden w-72 rounded-[var(--radius-xl)] bg-[var(--surface_container_lowest)] px-4 py-3 text-xs font-medium leading-5 text-[var(--on_surface)] ambient-shadow ghost-border group-hover:block group-focus-within:block">
        {description}
      </span>
    </span>
  )
}
