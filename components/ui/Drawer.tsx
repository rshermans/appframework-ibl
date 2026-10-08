'use client'

import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  /** `drawer`: side panel on desktop, full screen on phones. `dialog`: centred card. */
  variant?: 'drawer' | 'dialog'
  /** Tailwind max-width for the panel on >= md screens. */
  size?: 'md' | 'lg' | 'xl' | 'full'
  closeLabel?: string
  /** Rendered pinned below the scrolling body (e.g. action buttons). */
  footer?: React.ReactNode
}

const SIZE_CLASS = { md: 'md:max-w-lg', lg: 'md:max-w-2xl', xl: 'md:max-w-5xl', full: 'md:max-w-[96vw]' } as const

/** Open overlays, oldest first. Only the last one answers to Escape/Tab (e.g. a map opened from a drawer). */
const overlayStack: symbol[] = []
const FOCUSABLE = 'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'

/**
 * Overlay used instead of pushing content down the page: keeps the learner in place.
 * Closes with Esc / backdrop / close button, locks background scroll, traps Tab and
 * restores focus. Rendered in a portal so it is never clipped by the scroll area.
 */
export default function Drawer({
  open,
  onClose,
  title,
  children,
  variant = 'drawer',
  size = 'md',
  closeLabel = 'Close',
  footer,
}: DrawerProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return

    const id = Symbol('overlay')
    overlayStack.push(id)
    const isTop = () => overlayStack[overlayStack.length - 1] === id
    const previouslyFocused = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.body.dataset.overlay = 'open' // lets floating widgets (chat bubble) step aside

    const focusFirst = () => {
      const panel = panelRef.current
      const first = panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel?.querySelector<HTMLElement>(FOCUSABLE)
      ;(first ?? panel)?.focus()
    }
    focusFirst()

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isTop()) return
      if (event.key === 'Escape') {
        event.stopPropagation()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      const position = overlayStack.indexOf(id)
      if (position >= 0) overlayStack.splice(position, 1)
      if (overlayStack.length === 0) {
        document.body.style.overflow = previousOverflow
        delete document.body.dataset.overlay
      }
      previouslyFocused?.focus?.()
    }
  }, [open])

  if (!open || typeof document === 'undefined') return null

  const isDialog = variant === 'dialog'

  return createPortal(
    <div className={`fixed inset-0 z-[60] flex ${isDialog ? 'items-center justify-center p-4' : 'justify-end'}`}>
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" aria-hidden="true" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={
          isDialog
            ? `relative flex max-h-[90dvh] w-full ${SIZE_CLASS[size]} flex-col overflow-hidden rounded-[var(--radius-xl)] bg-[var(--surface)] shadow-2xl outline-none`
            : `relative flex h-dvh w-full ${SIZE_CLASS[size]} flex-col bg-[var(--surface)] shadow-2xl outline-none md:w-[92vw]`
        }
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--outline_variant)] px-4 py-3 md:px-6">
          <h2 id={titleId} className="font-display text-base font-semibold text-[var(--on_surface)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--on_surface)] transition hover:bg-[var(--surface_container_highest)]"
          >
            <X size={20} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-6">{children}</div>
        {footer && (
          <footer className="shrink-0 border-t border-[var(--outline_variant)] bg-[var(--surface)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-6">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  )
}
