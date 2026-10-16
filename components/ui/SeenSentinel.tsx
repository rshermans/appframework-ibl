'use client'

import { useEffect, useRef } from 'react'

/**
 * Invisible marker: calls `onSeen` once, when it scrolls into view. Put it at the END of a
 * section so "seen" means the learner reached the bottom of it.
 */
export default function SeenSentinel({ onSeen }: { onSeen: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        onSeen()
        observer.disconnect()
      }
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [onSeen])

  return <div ref={ref} aria-hidden data-testid="seen-sentinel" className="h-px" />
}
