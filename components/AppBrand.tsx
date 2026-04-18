interface AppBrandProps {
  compact?: boolean
}

export default function AppBrand({ compact = false }: AppBrandProps) {
  return (
    <div className={`inline-flex items-center ${compact ? '' : 'py-1'}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/IBL-AI-logo2.png"
        alt="IBL-AI"
        className={compact ? 'h-14 w-auto' : 'h-20 w-auto'}
        width={compact ? 56 : 80}
        height={compact ? 56 : 80}
      />
    </div>
  )
}