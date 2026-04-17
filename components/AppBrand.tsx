interface AppBrandProps {
  compact?: boolean
}

export default function AppBrand({ compact = false }: AppBrandProps) {
  return (
    <div className={`inline-flex items-center gap-3 ${compact ? '' : 'py-1'}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/ibl-ai-logo.svg"
        alt="IBL-AI"
        className={compact ? 'h-8 w-auto' : 'h-10 w-auto'}
        width={compact ? 32 : 40}
        height={compact ? 32 : 40}
      />
      <div className="leading-tight">
        <div className={`font-display text-[var(--on_surface)] ${compact ? 'text-lg' : 'text-2xl'}`}>
          IBL-AI
        </div>
        {!compact && (
          <div className="font-label text-xs uppercase tracking-[0.16em] text-[var(--outline_variant)]">
            Inquiry Based Learning
          </div>
        )}
      </div>
    </div>
  )
}