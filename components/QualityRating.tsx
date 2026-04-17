'use client'

interface QualityRatingProps {
  label: string
  helperText?: string
  value: number | null
  onChange: (value: number) => void
}

export default function QualityRating({
  label,
  helperText,
  value,
  onChange,
}: QualityRatingProps) {
  return (
    <div className="space-y-2 rounded-[var(--radius-md)] bg-[var(--surface_container_low)] p-4">
      <div className="text-sm font-semibold text-[var(--on_surface)]">{label}</div>
      {helperText && (
        <div className="text-xs text-[var(--on_surface)] opacity-70">{helperText}</div>
      )}
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((rating) => {
          const isActive = value === rating
          return (
            <button
              key={rating}
              type="button"
              onClick={() => onChange(rating)}
              className={`rounded-[var(--radius-md)] px-3 py-2 text-sm font-semibold transition ${
                isActive
                  ? 'primary-gradient text-[var(--on_primary)]'
                  : 'bg-[var(--surface_container)] text-[var(--on_surface)] hover:bg-[var(--surface_container_high)]'
              }`}
            >
              {rating}
            </button>
          )
        })}
      </div>
    </div>
  )
}