interface AppBrandProps {
  compact?: boolean
  /** Small logo for the top bar. */
  bar?: boolean
}

export default function AppBrand({ compact = false, bar = false }: AppBrandProps) {
  return (
    <div className={`inline-flex items-center ${compact ? '' : 'py-1'}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/IBL-AI-logo2.png"
        alt="IBL-AI"
        className={bar ? 'h-9 w-auto' : compact ? 'h-14 w-auto' : 'h-20 w-auto'}
        width={bar ? 36 : compact ? 56 : 80}
        height={bar ? 36 : compact ? 56 : 80}
      />
    </div>
  )
}