'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'

export type MenuEntry =
  | { type: 'separator'; key: string }
  | { type: 'heading'; key: string; label: string }
  | { type: 'custom'; key: string; node: React.ReactNode }
  | { type: 'item'; key: string; label: string; onSelect?: () => void; href?: string; danger?: boolean }

interface MenuButtonProps {
  label: string
  entries: MenuEntry[]
}

/** Small popover menu: closes on selection, outside click and Escape. */
export default function MenuButton({ label, entries }: MenuButtonProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const itemClass = (danger?: boolean) =>
    `flex min-h-[44px] w-full items-center rounded-[var(--radius-sm)] px-3 text-left text-sm font-medium transition hover:bg-[var(--surface_container)] ${
      danger ? 'text-red-700' : 'text-[var(--on_surface)]'
    }`

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-10 min-w-[40px] items-center justify-center gap-1 rounded-full bg-[var(--surface_container)] px-3 text-sm font-semibold text-[var(--on_surface)] transition hover:bg-[var(--surface_container_high)]"
      >
        <MoreHorizontal size={18} aria-hidden="true" />
        <span className="hidden lg:inline">{label}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-[min(86vw,18rem)] max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-[var(--radius-xl)] bg-[var(--surface)] p-2 shadow-2xl ring-1 ring-[var(--outline_variant)]"
        >
          {entries.map((entry) => {
            if (entry.type === 'separator') return <div key={entry.key} role="separator" className="my-1 h-px bg-[var(--outline_variant)]" />
            if (entry.type === 'heading') {
              return (
                <div key={entry.key} className="px-3 pb-1 pt-2 font-label text-[10px] uppercase tracking-[0.12em] text-[var(--on_surface_variant)]">
                  {entry.label}
                </div>
              )
            }
            if (entry.type === 'custom') return <div key={entry.key} className="px-3 py-2">{entry.node}</div>
            if (entry.href) {
              return (
                <Link key={entry.key} href={entry.href} role="menuitem" onClick={() => { entry.onSelect?.(); setOpen(false) }} className={itemClass(entry.danger)}>
                  {entry.label}
                </Link>
              )
            }
            return (
              <button
                key={entry.key}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  entry.onSelect?.()
                }}
                className={itemClass(entry.danger)}
              >
                {entry.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
