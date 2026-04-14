'use client'

import { useState } from 'react'

interface EthicalTipProps {
  title: string
  tip: string
  className?: string
}

export default function EthicalTip({ title, tip, className }: EthicalTipProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--secondary_fixed)] px-3 py-1.5 text-xs font-semibold text-[var(--on_secondary_fixed)] transition hover:brightness-95"
        aria-expanded={open}
      >
        <span aria-hidden="true">🛡️</span>
        <span>{title}</span>
        <span className="ml-1 text-[10px] opacity-60" aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="tonal-card mt-3 rounded-[var(--radius-xl)] p-4 text-sm leading-7 text-[var(--on_surface)]">
          {tip}
        </div>
      )}
    </div>
  )
}
